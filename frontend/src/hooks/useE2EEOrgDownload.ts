import { useState } from 'react';
import { fetchWithRefresh } from '../services/api.service';
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

export function useE2EEOrgDownload() {
    const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadAndDecrypt = async (fileId: string) => {
        setIsDownloading(true);
        setDownloadStatus(null);
        try {
            setDownloadStatus("1/4 : Récupération des métadonnées sécurisées...");
            const metaRes = await fetchWithRefresh(`/api/files/${fileId}/download`);

            if (!metaRes.ok) {
                throw new Error(metaRes.status === 404 ? "Fichier introuvable sur le serveur." : `Impossible de récupérer les métadonnées (${metaRes.status}).`);
            }
            const metadata: DownloadMetadata = await metaRes.json();

            setDownloadStatus("2/4 : Déchiffrement de la clé de session (Zero-Knowledge)...");

            const tempPrivateKey = await getPrivateKeyFromSession();
            if (!tempPrivateKey) throw new Error("Clé privée introuvable. Assurez-vous d'être connecté.");

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
            const filename = metadata.encrypted_filename;

            setDownloadStatus("3/4 : Initialisation du flux de téléchargement...");
            const supportsFileSystemAccess = 'showSaveFilePicker' in window;
            let writable: FileSystemWritableFileStream | null = null;
            const firefoxFallbackChunks: BlobPart[] = [];

            if (supportsFileSystemAccess) {
                try {
                    // @ts-ignore
                    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
                    writable = await fileHandle.createWritable();
                } catch (err) {
                    throw new Error("Sauvegarde annulée par l'utilisateur.");
                }
            }

            setDownloadStatus("4/4 : Déchiffrement des données à la volée...");
            const response = await fetch(metadata.presigned_url);
            if (!response.ok || !response.body) throw new Error("Erreur d'accès au stockage distant (MinIO).");

            const reader = response.body.getReader();
            let buffer = new Uint8Array(0);
            let chunkIndex = 1;

            const processDecryption = async (dataToDecrypt: Uint8Array) => {
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

                chunkIndex++;
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
                    if (buffer.length > 0) await processDecryption(buffer);
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

            setDownloadStatus(`Succès ! "${filename}" a été déchiffré et sauvegardé.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
            setDownloadStatus(`❌ ${errorMessage}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return { downloadAndDecrypt, downloadStatus, isDownloading };
}
