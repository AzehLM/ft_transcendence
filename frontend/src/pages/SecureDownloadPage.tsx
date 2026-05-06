import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
    getPrivateKeyFromSession,
} from '../services/crypto.service';


const CHUNK_SIZE = 5 * 1024 * 1024; // 5 Mo
const CIPHER_CHUNK_SIZE = CHUNK_SIZE + 16;

interface DownloadMetadata {
    presigned_url: string;
    encrypted_dek: string;
    iv: string;
    encrypted_filename: string;
}


function useSecureDownload() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<string>("");
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    const downloadAndDecrypt = async (fileId: string) => {
        const token = localStorage.getItem("token");
        if (!token) {
            setStatus(" Session expirée. Veuillez vous reconnecter.");
            navigate("/login");
            return;
        }

        setIsDownloading(true);
        try {
            setStatus("1/4 : Récupération des métadonnées sécurisées...");
            const metaRes = await fetch(`/api/files/${fileId}/download`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!metaRes.ok) {
                throw new Error(metaRes.status === 404 ? "Fichier introuvable sur le serveur." : "Impossible de récupérer les métadonnées.");
            }
            const metadata: DownloadMetadata = await metaRes.json();

            setStatus("2/4 : Déchiffrement de la clé de session (Zero-Knowledge)...");

            // [PROD : RÉCUPÉRATION CLÉ PRIVÉE]
            /*
            const b64PrivKey = sessionStorage.getItem("encrypted_private_key");
            const tempPrivateKey = await decryptAndImportPrivateKey(b64PrivKey, masterKey);
            */

            const tempPrivateKey = await getPrivateKeyFromSession();
            if (!tempPrivateKey) throw new Error("Clé privée introuvable. Ne rafraîchissez pas la page.");

            const encryptedDekBytes = base64ToUint8Array(metadata.encrypted_dek);
            const dek = await decryptDEKWithPrivateKey(encryptedDekBytes, tempPrivateKey);
            const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                dek as unknown as BufferSource,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            const baseIv = base64ToUint8Array(metadata.iv);
            const filename = new TextDecoder().decode(base64ToUint8Array(metadata.encrypted_filename));

            setStatus("3/4 : Initialisation du flux de téléchargement...");
            const supportsFileSystemAccess = 'showSaveFilePicker' in window;
            let writable: FileSystemWritableFileStream | null = null;
            const firefoxFallbackChunks: BlobPart[] = [];

            if (supportsFileSystemAccess) {
                try {
                    // @ts-ignore :
                    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
                    writable = await fileHandle.createWritable();
                } catch (err) {
                    throw new Error("Sauvegarde annulée par l'utilisateur.");
                }
            }

            setStatus("4/4 : Déchiffrement des données à la volée...");
            const response = await fetch(metadata.presigned_url);
            if (!response.ok || !response.body) throw new Error("Erreur d'accès au stockage distant (MinIO).");

            const reader = response.body.getReader();
            let buffer = new Uint8Array(0);
            let chunkIndex = 0;

            const processDecryption = async (dataToDecrypt: Uint8Array, isLastChunk: boolean = false) => {
                const chunkIv = new Uint8Array(12);
                chunkIv.set(baseIv);
                const view = new DataView(chunkIv.buffer);
                view.setUint32(8, view.getUint32(8) + chunkIndex);

                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: chunkIv },
                    cryptoKey,
                    dataToDecrypt as BufferSource
                );

                if (writable) await writable.write(decryptedBuffer);
                else firefoxFallbackChunks.push(new Uint8Array(decryptedBuffer));

                if (!isLastChunk) chunkIndex++;
            };

            while (true) {
                const { done, value } = await reader.read();

                if (value) {
                    const newBuffer = new Uint8Array(buffer.length + value.length);
                    newBuffer.set(buffer, 0);
                    newBuffer.set(value, buffer.length);
                    buffer = newBuffer;
                }

                while (buffer.length >= CIPHER_CHUNK_SIZE) {
                    await processDecryption(buffer.slice(0, CIPHER_CHUNK_SIZE));
                    buffer = buffer.slice(CIPHER_CHUNK_SIZE);
                }

                if (done) {
                    if (buffer.length > 0) await processDecryption(buffer, true);
                    break;
                }
            }

            if (writable) {
                await writable.close();
            } else {
                const blob = new Blob(firefoxFallbackChunks, { type: 'application/octet-stream' });
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
            }

            setStatus(`Succès ! "${filename}" a été déchiffré et sauvegardé.`);
        } catch (err) {
            console.error("Erreur de téléchargement :", err);
            const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
            setStatus(`${errorMessage}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return { downloadAndDecrypt, status, isDownloading };
}


export default function SecureDownloadPage() {
    const [searchParams] = useSearchParams();
    const [fileId, setFileId] = useState(() => searchParams.get("fileId") ?? "");

    // Utilisation de notre Hook métier
    const { downloadAndDecrypt, status, isDownloading } = useSecureDownload();

    const onDownloadClick = () => {
        if (fileId) downloadAndDecrypt(fileId);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
                🔓 Déchiffrement et Récupération
            </h1>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', background: '#f8f9fa', marginTop: '20px' }}>
                <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '10px' }}>
                    Identifiant du fichier (UUID) :
                </p>
                <input
                    type="text"
                    placeholder="ex: d20f74d6-9920-47ad-9a54-7fe7e46e0ce8"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    disabled={isDownloading}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '20px',
                        borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace'
                    }}
                />

                <button
                    onClick={onDownloadClick}
                    disabled={!fileId || isDownloading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: (fileId && !isDownloading) ? '#e67e22' : '#95a5a6',
                        color: 'white', border: 'none', borderRadius: '6px',
                        cursor: (fileId && !isDownloading) ? 'pointer' : 'not-allowed',
                        width: '100%', fontWeight: 'bold', fontSize: '16px'
                    }}
                >
                    {isDownloading ? 'Déchiffrement sécurisé en cours...' : 'Télécharger et Déchiffrer'}
                </button>
            </div>

            {status && (
                <div style={{
                    marginTop: '20px', padding: '15px',
                    backgroundColor: status.includes('❌') ? '#fdecea' : '#e8f5e9',
                    color: status.includes('❌') ? '#c0392b' : '#2e7d32',
                    borderRadius: '6px', fontWeight: 'bold',
                    border: `1px solid ${status.includes('❌') ? '#fadbd8' : '#c8e6c9'}`
                }}>
                    {status}
                </div>
            )}
        </div>
    );
}