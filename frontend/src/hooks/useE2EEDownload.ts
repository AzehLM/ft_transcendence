import { useState } from 'react';
import {
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
    getPrivateKeyFromSession,
    decryptFilenameAsymmetric,
} from '../services/crypto.service';
import { fetchWithRefresh } from '../services/api.service';
import { UPLOAD_CONFIG } from '../config/uploadConfig';
import { useMessages } from './useFeedbackMessage';

const CIPHER_CHUNK_SIZE = UPLOAD_CONFIG.CHUNK_SIZE + 16;

interface DownloadMetadata {
    presigned_url: string;
    encrypted_dek: string;
    iv: string;
    encrypted_filename: string;
}

export function useE2EEDownload() {
    const [isDownloading, setIsDownloading] = useState(false);
    const { messages, addMessage, removeMessage } = useMessages();

    let statusMessageId: string | null = null;

    const downloadAndDecrypt = async (fileId: string) => {
        setIsDownloading(true);

        statusMessageId = addMessage("1/4 : Fetching secure metadata...", "info", 60000);

        const updateStatus = (msg: string) => {
            if (statusMessageId) removeMessage(statusMessageId);
            statusMessageId = addMessage(msg, "info", 60000);
        };

        try {
            const metaRes = await fetchWithRefresh(`/api/files/${fileId}/download`);

            if (!metaRes.ok) {
                throw new Error(metaRes.status === 404 ? "File not found on server." : `Unable to fetch metadata (${metaRes.status}).`);
            }
            const metadata: DownloadMetadata = await metaRes.json();

            updateStatus("2/4 : Decrypting session key (Zero-Knowledge)...");

            const tempPrivateKey = await getPrivateKeyFromSession();
            if (!tempPrivateKey) {
                throw new Error("Private key not found. Please make sure you are logged in.");
            }

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

            let filename: string;
            try {
                filename = await decryptFilenameAsymmetric(metadata.encrypted_filename, tempPrivateKey);
            } catch (err) {
                console.error("Failed to decrypt filename:", err);
                filename = "downloaded_file";
            }

            updateStatus("3/4 : Initializing download stream...");
            const supportsFileSystemAccess = 'showSaveFilePicker' in window;
            let writable: FileSystemWritableFileStream | null = null;
            const firefoxFallbackChunks: BlobPart[] = [];

            if (supportsFileSystemAccess) {
                try {
                    // @ts-ignore
                    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
                    writable = await fileHandle.createWritable();
                } catch (err) {
                    throw new Error("Save cancelled by user.");
                }
            }

            updateStatus("4/4 : Decrypting data on the fly...");
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

            if (statusMessageId) removeMessage(statusMessageId);
            addMessage(`"${filename}" decrypted and saved successfully.`, "success");

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            if (statusMessageId) removeMessage(statusMessageId);
            addMessage(errorMessage, "error");
        } finally {
            setIsDownloading(false);
        }
    };

    return { downloadAndDecrypt, isDownloading, messages, addMessage, removeMessage };
}