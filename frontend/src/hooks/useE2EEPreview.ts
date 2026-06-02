import { useState } from 'react';
import {
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
    getPrivateKeyFromSession,
    decryptFilenameAsymmetric,
} from '../services/crypto.service';
import { decryptOrgPrivateKey } from '../services/organizations.service';
import { fetchWithRefresh } from '../services/api.service';
import { UPLOAD_CONFIG } from '../config/uploadConfig';

interface DownloadMetadata {
    presigned_url: string;
    encrypted_dek: string;
    iv: string;
    encrypted_filename: string;
}

export function useE2EEPreview() {
    const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(false);

    const getMimeTypeByExtension = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        switch (ext) {
            case 'pdf': return 'application/pdf';
            case 'png': return 'image/png';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'svg': return 'image/svg+xml';
            case 'bmp': return 'image/bmp';
            case 'json': return 'application/json';
            case 'txt':
            case 'md':
            case 'html':
            case 'css':
            case 'js':
            case 'ts':
            case 'tsx':
            case 'py':
            case 'go':
            case 'sh':
            case 'yaml':
            case 'yml':
                return 'text/plain';
            default:
                return 'application/octet-stream';
        }
    };

    const decryptForPreview = async (fileId: string, orgId?: string): Promise<{ blob: Blob; filename: string } | null> => {
        setIsDownloading(true);
        setDownloadStatus(null);
        setDownloadError(false);

        try {
            let activePrivateKey: CryptoKey;

            if (orgId) {
                setDownloadStatus("Fetching organization keys...");
                const keysRes = await fetchWithRefresh(`/api/orgs/${orgId}/members/keys`);
                if (!keysRes.ok) {
                    throw new Error("Unable to fetch organization keys.");
                }
                const { enc_org_priv_key, enc_aes_key, iv: orgIv } = await keysRes.json();

                setDownloadStatus("Decrypting organization key...");
                const orgPrivKeyB64 = await decryptOrgPrivateKey(enc_org_priv_key, enc_aes_key, orgIv);
                const orgPrivKeyBuffer = base64ToUint8Array(orgPrivKeyB64);

                activePrivateKey = await window.crypto.subtle.importKey(
                    "pkcs8",
                    orgPrivKeyBuffer.buffer as ArrayBuffer,
                    { name: "RSA-OAEP", hash: "SHA-256" },
                    false,
                    ["decrypt"]
                );
            } else {
                setDownloadStatus("Fetching session key...");
                const tempPrivateKey = await getPrivateKeyFromSession();
                if (!tempPrivateKey) {
                    throw new Error("Private key not found. Please make sure you are logged in.");
                }
                activePrivateKey = tempPrivateKey;
            }

            setDownloadStatus("Fetching secure metadata...");
            const metaRes = await fetchWithRefresh(`/api/files/${fileId}/download`);

            if (!metaRes.ok) {
                throw new Error(metaRes.status === 404 ? "File not found on server." : `Unable to fetch metadata (${metaRes.status}).`);
            }
            const metadata: DownloadMetadata = await metaRes.json();

            setDownloadStatus("Decrypting session key...");
            const encryptedDekBytes = base64ToUint8Array(metadata.encrypted_dek);
            const dek = await decryptDEKWithPrivateKey(encryptedDekBytes, activePrivateKey);
            const cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                dek as unknown as BufferSource,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            const baseIv = base64ToUint8Array(metadata.iv);
            const encryptedFilenameBase64 = metadata.encrypted_filename;
            let filename: string;
            try {
                filename = await decryptFilenameAsymmetric(encryptedFilenameBase64, activePrivateKey);
            } catch (err) {
                console.error("Failed to decrypt filename:", err);
                filename = "preview_file";
            }

            setDownloadStatus("Decrypting data...");
            const response = await fetch(metadata.presigned_url);
            if (!response.ok || !response.body) {
                throw new Error("Error accessing remote storage.");
            }

            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let bufferedBytes = 0;
            let chunkIndex = 1;
            const decryptedChunks: BlobPart[] = [];

            const chunkSize = UPLOAD_CONFIG.CHUNK_SIZE;
            const cipherChunkSize = chunkSize + 16;

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

                decryptedChunks.push(new Uint8Array(decryptedBuffer));
                chunkIndex++;
            };

            while (true) {
                const { done, value } = await reader.read();

                if (value) {
                    chunks.push(new Uint8Array(value));
                    bufferedBytes += value.length;
                }

                while (bufferedBytes >= cipherChunkSize) {
                    const dataToDecrypt = new Uint8Array(cipherChunkSize);
                    let offset = 0;
                    let remaining = cipherChunkSize;

                    while (offset < cipherChunkSize && chunks.length > 0) {
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
                    bufferedBytes -= cipherChunkSize;
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

            const mimeType = getMimeTypeByExtension(filename);
            const blob = new Blob(decryptedChunks, { type: mimeType });

            return { blob, filename };
        } catch (err) {
            console.error("Preview decryption failed:", err);
            setDownloadError(true);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setDownloadStatus(`Error: ${errorMessage}`);
            return null;
        } finally {
            setIsDownloading(false);
        }
    };

    return { decryptForPreview, downloadStatus, isDownloading, downloadError };
}
