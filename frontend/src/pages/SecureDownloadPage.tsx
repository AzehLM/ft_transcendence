import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
} from '../services/crypto.service';
import { getTemporaryPrivateKey } from '../services/temp-e2ee-key.service';

export default function SecureDownloadPage() {
    const [searchParams] = useSearchParams();
    const [fileId, setFileId] = useState(() => searchParams.get("fileId") ?? "");
    const [status, setStatus] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 Mo
    const CIPHER_CHUNK_SIZE = CHUNK_SIZE + 16; // 5 Mo + tag GCM

const handleDownload = async () => {
        if (!fileId) return;
        setIsDownloading(true);
        setStatus("1/4 : Récupération des métadonnées et clés...");

        const token = localStorage.getItem("token");
        if (!token) {
            setStatus("❌ Session expirée. Reconnecte-toi.");
            setIsDownloading(false);
            return;
        }

        try {
            // 1. APPEL AU BACKEND GO
            const metaRes = await fetch(`/api/files/${fileId}/download`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!metaRes.ok) throw new Error("Erreur Backend lors de la récupération des métadonnées");
            const { presigned_url, encrypted_dek, iv, encrypted_filename } = await metaRes.json();

            // 2. DÉCHIFFREMENT DE LA CLÉ (DEBUG RSA)
            let dek: Uint8Array;
            try {
                const tempPrivateKey = getTemporaryPrivateKey();
                if (!tempPrivateKey) throw new Error("Clé introuvable en RAM.");

                const encryptedDekBytes = base64ToUint8Array(encrypted_dek);
                dek = await decryptDEKWithPrivateKey(encryptedDekBytes, tempPrivateKey);
            } catch (err: any) {
                console.error("Erreur RSA:", err);
                throw new Error("Déchiffrement RSA impossible. (Avez-vous rafraîchi la page F5 ou pris un ancien UUID ? Vous devez uploader et télécharger dans la même session sans F5).");
            }

            const baseIv = base64ToUint8Array(iv);
            const cryptoKey = await window.crypto.subtle.importKey(
                "raw", dek as unknown as BufferSource, { name: "AES-GCM" }, false, ["decrypt"] as KeyUsage[]
            );
            const filename = new TextDecoder().decode(base64ToUint8Array(encrypted_filename));

            // 3. DÉTECTION DU NAVIGATEUR ET PRÉPARATION DU FLUX
            setStatus("2/4 : Préparation du téléchargement...");
            const supportsFileSystemAccess = 'showSaveFilePicker' in window;
            let writable: any = null;
            let firefoxFallbackChunks: Uint8Array[] = [];

            if (supportsFileSystemAccess) {
                try {
                    // @ts-ignore
                    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
                    writable = await fileHandle.createWritable();
                } catch (err) {
                    throw new Error("Sauvegarde annulée par l'utilisateur.");
                }
            }

            // 4. TÉLÉCHARGEMENT (DEBUG MINIO ET AES)
            setStatus("3/4 : Téléchargement et déchiffrement à la volée...");
            const response = await fetch(presigned_url);

            // LE FIX EST ICI : On empêche le code d'essayer de déchiffrer un message d'erreur XML !
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MinIO a refusé l'accès au fichier (${response.status}) : ${errorText}`);
            }
            if (!response.body) throw new Error("Le navigateur ne supporte pas les streams");

            const reader = response.body.getReader();
            let buffer = new Uint8Array(0);
            let chunkIndex = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (value) {
                    const newBuffer = new Uint8Array(buffer.length + value.length);
                    newBuffer.set(buffer, 0);
                    newBuffer.set(value, buffer.length);
                    buffer = newBuffer;
                }

                while (buffer.length >= CIPHER_CHUNK_SIZE) {
                    const chunkToDecrypt = buffer.slice(0, CIPHER_CHUNK_SIZE);
                    buffer = buffer.slice(CIPHER_CHUNK_SIZE);

                    const chunkIv = new Uint8Array(12);
                    chunkIv.set(baseIv);
                    const view = new DataView(chunkIv.buffer);
                    view.setUint32(8, view.getUint32(8) + chunkIndex);

                    try {
                        const decryptedBuffer = await window.crypto.subtle.decrypt(
                            { name: "AES-GCM", iv: chunkIv }, cryptoKey, chunkToDecrypt
                        );
                        if (writable) await writable.write(decryptedBuffer);
                        else firefoxFallbackChunks.push(new Uint8Array(decryptedBuffer));
                    } catch (err) {
                        throw new Error(`Déchiffrement AES planté au bloc ${chunkIndex}. Fichier corrompu ou mauvaise clé.`);
                    }
                    chunkIndex++;
                }

                if (done) {
                    if (buffer.length > 0) {
                        const chunkIv = new Uint8Array(12);
                        chunkIv.set(baseIv);
                        const view = new DataView(chunkIv.buffer);
                        view.setUint32(8, view.getUint32(8) + chunkIndex);

                        try {
                            const decryptedBuffer = await window.crypto.subtle.decrypt(
                                { name: "AES-GCM", iv: chunkIv }, cryptoKey, buffer
                            );
                            if (writable) await writable.write(decryptedBuffer);
                            else firefoxFallbackChunks.push(new Uint8Array(decryptedBuffer));
                        } catch (err) {
                            throw new Error("Déchiffrement AES planté sur le tout dernier bloc.");
                        }
                    }
                    break;
                }
            }

            // 5. FINALISATION
            setStatus("4/4 : Finalisation de la sauvegarde...");
            if (writable) {
                await writable.close();
            } else {
                const blob = new Blob(firefoxFallbackChunks as BlobPart[], { type: 'application/octet-stream' });
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
            }

            setStatus(`✅ Succès ! Fichier "${filename}" téléchargé et déchiffré.`);

        } catch (err: any) {
            console.error(err);
            setStatus(`❌ ${err.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '600px', margin: 'auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: '#2c3e50' }}>Coffre-fort E2EE - Téléchargement</h2>

            <div style={{ border: '2px solid #bdc3c7', padding: '30px', borderRadius: '10px' }}>
                <input
                    type="text"
                    placeholder="Entrez l'UUID du fichier..."
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    disabled={isDownloading}
                    style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
                />

                <button
                    onClick={handleDownload}
                    disabled={!fileId || isDownloading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: (fileId && !isDownloading) ? '#2980b9' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (fileId && !isDownloading) ? 'pointer' : 'not-allowed',
                        width: '100%',
                        fontWeight: 'bold'
                    }}
                >
                    {isDownloading ? 'Déchiffrement en cours...' : 'Télécharger et Déchiffrer'}
                </button>
            </div>

            {status && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ecf0f1', borderRadius: '5px', fontWeight: 'bold' }}>
                    {status}
                </div>
            )}
        </div>
    );
}