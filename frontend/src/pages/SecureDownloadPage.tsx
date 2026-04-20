import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
    // importPrivateKey // À décommenter pour la prod si la clé est stockée en Base64
} from '../services/crypto.service';
import { getTemporaryPrivateKey } from '../services/temp-e2ee-key.service';

interface DownloadMetadata {
    presigned_url: string;
    encrypted_dek: string;
    iv: string;
    encrypted_filename: string;
}

export default function SecureDownloadPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [fileId, setFileId] = useState(() => searchParams.get("fileId") ?? "");
    const [status, setStatus] = useState<string>("");
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 Mo
    const CIPHER_CHUNK_SIZE = CHUNK_SIZE + 16; // 5 Mo + 16 octets de tag d'authentification AES-GCM

    const handleDownload = async () => {
        if (!fileId)
            return;

        const token = localStorage.getItem("token");
        if (!token) {
            setStatus("❌ Session expirée. Veuillez vous reconnecter.");
            navigate("/login");
            return;
        }

        setIsDownloading(true);
        setStatus("1/4 : Récupération des métadonnées sécurisées...");

        try {
            // ====================================================================
            // ÉTAPE 1 : RÉCUPÉRATION DES MÉTADONNÉES DEPUIS LE BACKEND
            // ====================================================================
            const metaRes = await fetch(`/api/files/${fileId}/download`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!metaRes.ok) {
                if (metaRes.status === 404)
                    throw new Error("Fichier introuvable sur le serveur.");
                throw new Error("Impossible de récupérer les métadonnées du fichier.");
            }

            const { presigned_url, encrypted_dek, iv, encrypted_filename }: DownloadMetadata = await metaRes.json();

            // ====================================================================
            // ÉTAPE 2 : PRÉPARATION DES CLÉS (RSA & AES)
            // ====================================================================
            setStatus("2/4 : Déchiffrement de la clé de session (Zero-Knowledge)...");

            // [PROD : RÉCUPÉRATION CLÉ PRIVÉE]
            /*
            const b64PrivKey = sessionStorage.getItem("encrypted_private_key");
            const tempPrivateKey = await decryptAndImportPrivateKey(b64PrivKey, masterKey);
            */

            // [DEV] Utilisation de la clé temporaire stockée en RAM par l'UploadPage
            const tempPrivateKey = getTemporaryPrivateKey();
            if (!tempPrivateKey)
                throw new Error("Clé privée de session introuvable. (Ne pas rafraîchir la page entre l'upload et le download pour ce test).");

            // Déchiffrement RSA de la DEK (La clé AES qui a chiffré le fichier)
            const encryptedDekBytes = base64ToUint8Array(encrypted_dek);
            const dek = await decryptDEKWithPrivateKey(encryptedDekBytes, tempPrivateKey);

            // Importation de la clé AES pour WebCrypto
            const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                dek as unknown as BufferSource,
                { name: "AES-GCM" },
                false,
                ["decrypt"] as KeyUsage[]
            );

            const baseIv = base64ToUint8Array(iv);
            const filename = new TextDecoder().decode(base64ToUint8Array(encrypted_filename));

            // ====================================================================
            // ÉTAPE 3 : INITIALISATION DU FLUX DE SORTIE (Chrome vs Firefox)
            // ====================================================================
            setStatus("3/4 : Initialisation du flux de téléchargement...");

            const supportsFileSystemAccess = 'showSaveFilePicker' in window;
            let writable: any = null;
            let firefoxFallbackChunks: Uint8Array[] = [];

            if (supportsFileSystemAccess) {
                try {
                    // Chrome/Edge : On écrit directement sur le disque pour économiser la RAM
                    // @ts-ignore
                    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
                    writable = await fileHandle.createWritable();
                } catch (err) {
                    throw new Error("Sauvegarde annulée par l'utilisateur.");
                }
            }

            // ====================================================================
            // ÉTAPE 4 : TÉLÉCHARGEMENT ET DÉCHIFFREMENT EN STREAMING
            // ====================================================================
            setStatus("4/4 : Déchiffrement des données à la volée...");

            const response = await fetch(presigned_url);
            if (!response.ok)
                throw new Error("Accès refusé au stockage distant (MinIO).");
            if (!response.body)
                throw new Error("Le flux de données est vide ou non supporté.");

            const reader = response.body.getReader();
            let buffer = new Uint8Array(0); // Accumulateur pour gérer les paquets réseau asymétriques
            let chunkIndex = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (value) {
                    // On concatène les nouvelles données reçues au buffer existant
                    const newBuffer = new Uint8Array(buffer.length + value.length);
                    newBuffer.set(buffer, 0);
                    newBuffer.set(value, buffer.length);
                    buffer = newBuffer;
                }

                // Pourquoi cette boucle ? Le réseau peut nous envoyer 10 Ko, alors qu'AES attend 5 Mo + 16 octets.
                // On attend donc d'avoir un bloc chiffré COMPLET avant de tenter le déchiffrement.
                while (buffer.length >= CIPHER_CHUNK_SIZE) {
                    const chunkToDecrypt = buffer.slice(0, CIPHER_CHUNK_SIZE);
                    buffer = buffer.slice(CIPHER_CHUNK_SIZE); // On garde le surplus pour le prochain tour

                    // Recalcul de l'IV spécifique à ce bloc (Compteur)
                    const chunkIv = new Uint8Array(12);
                    chunkIv.set(baseIv);
                    const view = new DataView(chunkIv.buffer);
                    view.setUint32(8, view.getUint32(8) + chunkIndex);

                    const decryptedBuffer = await window.crypto.subtle.decrypt(
                        { name: "AES-GCM", iv: chunkIv },
                        cryptoKey,
                        chunkToDecrypt
                    );

                    if (writable) await writable.write(decryptedBuffer);
                    else firefoxFallbackChunks.push(new Uint8Array(decryptedBuffer));

                    chunkIndex++;
                }

                if (done) {
                    // Gestion du dernier bloc (souvent inférieur à CHUNK_SIZE)
                    if (buffer.length > 0) {
                        const chunkIv = new Uint8Array(12);
                        chunkIv.set(baseIv);
                        const view = new DataView(chunkIv.buffer);
                        view.setUint32(8, view.getUint32(8) + chunkIndex);

                        const decryptedBuffer = await window.crypto.subtle.decrypt(
                            { name: "AES-GCM", iv: chunkIv },
                            cryptoKey,
                            buffer
                        );

                        if (writable) await writable.write(decryptedBuffer);
                        else firefoxFallbackChunks.push(new Uint8Array(decryptedBuffer));
                    }
                    break;
                }
            }

            // ====================================================================
            // ÉTAPE 5 : FINALISATION ET NETTOYAGE
            // ====================================================================
            if (writable) {
                await writable.close();
            } else {
                // Fallback Firefox : Création du fichier final en RAM
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

            setStatus(`✅ Succès ! "${filename}" a été déchiffré et sauvegardé.`);

        } catch (err: any) {
            console.error("Erreur de téléchargement :", err);
            setStatus(`❌ ${err.message}`);
        } finally {
            setIsDownloading(false);
        }
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
                        width: '100%',
                        padding: '12px',
                        marginBottom: '20px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontFamily: 'monospace'
                    }}
                />

                <button
                    onClick={handleDownload}
                    disabled={!fileId || isDownloading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: (fileId && !isDownloading) ? '#e67e22' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (fileId && !isDownloading) ? 'pointer' : 'not-allowed',
                        width: '100%',
                        fontWeight: 'bold',
                        fontSize: '16px'
                    }}
                >
                    {isDownloading ? 'Déchiffrement sécurisé en cours...' : 'Télécharger et Déchiffrer'}
                </button>
            </div>

            {status && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: status.includes('❌') ? '#fdecea' : '#e8f5e9',
                    color: status.includes('❌') ? '#c0392b' : '#2e7d32',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    border: `1px solid ${status.includes('❌') ? '#fadbd8' : '#c8e6c9'}`
                }}>
                    {status}
                </div>
            )}
        </div>
    );
}