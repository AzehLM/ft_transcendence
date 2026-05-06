import { useState } from 'react';
import { fetchWithRefresh } from '../services/api.service';
import { encryptDEKWithPublicKey, uint8ArrayToBase64, getPublicKeyFromSession } from '../services/crypto.service';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 Mo

export function useE2EEUpload(onSuccess: () => void) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>("");

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadStatus(`Initializing encryption for "${file.name}"...`);

        try {

            const publicKey = await getPublicKeyFromSession();
            if (!publicKey) throw new Error("Clé publique introuvable. Assurez-vous d'être connecté.");

            const dek = window.crypto.getRandomValues(new Uint8Array(32)); // Clé AES 256
            const baseIv = window.crypto.getRandomValues(new Uint8Array(12)); // IV de base

            const cryptoKey = await window.crypto.subtle.importKey(
                "raw", dek, "AES-GCM", false, ["encrypt"]
            );
            const encryptedDEK = await encryptDEKWithPublicKey(dek, publicKey);


            setUploadStatus("Requesting upload authorization from the server...");

            const numChunks = Math.ceil(file.size / CHUNK_SIZE);
            const totalEncryptedSize = file.size + (numChunks * 16);

            const initRes = await fetchWithRefresh("/api/files/upload-url", {
                method: "POST",
                body: JSON.stringify({
                    file_size: totalEncryptedSize,
                    folder_id: null,
                    org_id: null
                })
            });

            if (!initRes.ok) throw new Error("Impossible de préparer l'upload sur le serveur.");
            const { presigned_url, object_id } = await initRes.json();


            setUploadStatus("Encrypting file chunks and uploading");

            let offset = 0;
            let chunkIndex = 1;
            const encryptedChunks: ArrayBuffer[] = [];

            while (offset < file.size) {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                const buffer = await slice.arrayBuffer();

                const chunkIv = new Uint8Array(12);
                chunkIv.set(baseIv);
                const view = new DataView(chunkIv.buffer);
                view.setUint32(8, view.getUint32(8) + chunkIndex);

                const encryptedChunk = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: chunkIv },
                    cryptoKey,
                    buffer
                );

                encryptedChunks.push(encryptedChunk);
                offset += CHUNK_SIZE;
                chunkIndex++;
            }

            const finalBlob = new Blob(encryptedChunks, { type: "application/octet-stream" });

            const uploadRes = await fetch(presigned_url, {
                method: "PUT",
                body: finalBlob
            });

            if (!uploadRes.ok) throw new Error("The encrypted file was rejected by object storage.");


            setUploadStatus("Saving upload metadata...");

            const finalizeRes = await fetchWithRefresh("/api/files/finalize", {
                method: "POST",
                body: JSON.stringify({
                    object_id: object_id,
                    encrypted_filename: file.name,
                    encrypted_dek: uint8ArrayToBase64(new Uint8Array(encryptedDEK)),
                    iv: uint8ArrayToBase64(baseIv),
                    org_id: null
                })
            });

            if (!finalizeRes.ok) throw new Error("The server failed to finalize the upload.");

            setUploadStatus(`"${file.name}" has been securely uploaded.`);
            onSuccess();

        } catch (err: any) {
            console.error("E2EE upload error:", err);
            setUploadStatus(`Upload failed: ${err.message}`);
        } finally {
            setTimeout(() => {
                setIsUploading(false);
                setUploadStatus("");
            }, 4000);
        }
    };

    return { uploadFile, isUploading, uploadStatus };
}