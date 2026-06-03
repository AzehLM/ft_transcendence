import { useState, useRef } from 'react';
import {
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
    decryptFilenameAsymmetric,
} from '../services/crypto.service';
import { decryptOrgPrivateKey } from '../services/organizations.service';
import { fetchWithRefresh } from '../services/api.service';
import { useMessages } from './useFeedbackMessage';
import { UPLOAD_CONFIG } from '../config/uploadConfig';

const CIPHER_CHUNK_SIZE = UPLOAD_CONFIG.CHUNK_SIZE + 16;

interface DownloadMetadata {
    presigned_url: string;
    encrypted_dek: string;
    iv: string;
    encrypted_filename: string;
}

export function useE2EEDownloadOrg() {
    const [isDownloading, setIsDownloading] = useState(false);
    const { messages, addMessage, removeMessage } = useMessages();
    const statusIdRef = useRef<string | null>(null);

    const updateStatus = (msg: string) => {
        if (statusIdRef.current) removeMessage(statusIdRef.current);
        statusIdRef.current = addMessage(msg, "info", 60000);
    };

    const downloadAndDecryptOrg = async (fileId: string, orgId: string) => {
        const token = localStorage.getItem("token");
        if (!token) {
            addMessage("Session expired. Please log in again.", "error");
            return;
        }

        setIsDownloading(true);
        statusIdRef.current = addMessage("1/5 : Fetching organization keys...", "info", 60000);

        try {
            const keysRes = await fetchWithRefresh(`/api/orgs/${orgId}/members/keys`);
            if (!keysRes.ok) throw new Error("Unable to fetch organization keys.");
            const { enc_org_priv_key, enc_aes_key, iv: orgIv } = await keysRes.json();

            updateStatus("2/5 : Decrypting organization private key...");
            const orgPrivKeyB64 = await decryptOrgPrivateKey(enc_org_priv_key, enc_aes_key, orgIv);
            const orgPrivKeyBuffer = base64ToUint8Array(orgPrivKeyB64);
            const orgPrivateKey = await window.crypto.subtle.importKey(
                "pkcs8",
                orgPrivKeyBuffer.buffer as ArrayBuffer,
                { name: "RSA-OAEP", hash: "SHA-256" },
                false,
                ["decrypt"]
            );

            updateStatus("3/5 : Fetching secure metadata...");
            const metaRes = await fetchWithRefresh(`/api/files/${fileId}/download`);
            if (!metaRes.ok) {
                throw new Error(metaRes.status === 404 ? "File not found on server." : `Unable to fetch metadata (${metaRes.status}).`);
            }
            const metadata: DownloadMetadata = await metaRes.json();

            updateStatus("4/5 : Decrypting session key (Zero-Knowledge)...");
            const encryptedDekBytes = base64ToUint8Array(metadata.encrypted_dek);
            const dek = await decryptDEKWithPrivateKey(encryptedDekBytes, orgPrivateKey);
            const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                dek as unknown as BufferSource,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            const baseIv = base64ToUint8Array(metadata.iv);

            let filename: string;
            try {
                filename = await decryptFilenameAsymmetric(metadata.encrypted_filename, orgPrivateKey);
            } catch (err) {
                console.error("Failed to decrypt filename:", err);
                filename = "downloaded_file";
            }

            updateStatus("5/5 : Initializing download stream...");
            const supportsFileSystemAccess = 'showSaveFilePicker' in window;
            let writable: FileSystemWritableFileStream | null = null;
            const firefoxFallbackChunks: BlobPart[] = [];

            if (supportsFileSystemAccess) {
                try {
                    // @ts-ignore
                    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
                    writable = await fileHandle.createWritable();
                } catch {
                    throw new Error("Save cancelled by user.");
                }
            }

            updateStatus("Decrypting data on the fly...");
            const response = await fetch(metadata.presigned_url);
            if (!response.ok || !response.body) {
                throw new Error("Error accessing remote storage (MinIO).");
            }

            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let bufferedBytes = 0;
            let chunkIndex = 1;

            const processDecryption = async (dataToDecrypt: Uint8Array) => {
                const chunkIv = new Uint8Array(12);
                chunkIv.set(baseIv);
                const view = new DataView(chunkIv.buffer);
                // NOTE: Mutates only lower 4 bytes of IV. Silent 32-bit overflow wraps without carry propagation.
                // Strictly identical to encryption side logic in useE2EEUpload.ts (deriveChunkIv).
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
                    chunks.push(new Uint8Array(value));
                    bufferedBytes += value.length;
                }

                while (bufferedBytes >= CIPHER_CHUNK_SIZE) {
                    const dataToDecrypt = new Uint8Array(CIPHER_CHUNK_SIZE);
                    let offset = 0;
                    let remaining = CIPHER_CHUNK_SIZE;

                    while (offset < CIPHER_CHUNK_SIZE && chunks.length > 0) {
                        const chunk = chunks[0];
                        const toCopy = Math.min(remaining, chunk.length);
                        dataToDecrypt.set(chunk.subarray(0, toCopy), offset);

                        if (toCopy === chunk.length) {
                            chunks.shift();
                        } else {
                            chunks[0] = chunk.subarray(toCopy);
                        }

                        offset += toCopy;
                        remaining -= toCopy;
                    }

                    await processDecryption(dataToDecrypt);
                    bufferedBytes -= CIPHER_CHUNK_SIZE;
                }

                if (done) {
                    if (bufferedBytes > 0) {
                        const dataToDecrypt = new Uint8Array(bufferedBytes);
                        let offset = 0;
                        while (chunks.length > 0) {
                            const chunk = chunks.shift()!;
                            dataToDecrypt.set(chunk, offset);
                            offset += chunk.length;
                        }
                        await processDecryption(dataToDecrypt);
                    }
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

            if (statusIdRef.current) removeMessage(statusIdRef.current);
            addMessage(`"${filename}" decrypted and saved successfully.`, "success");

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            if (statusIdRef.current) removeMessage(statusIdRef.current);
            addMessage(errorMessage, "error");
        } finally {
            setIsDownloading(false);
            statusIdRef.current = null;
        }
    };

    return { downloadAndDecryptOrg, isDownloading, messages, addMessage, removeMessage };
}