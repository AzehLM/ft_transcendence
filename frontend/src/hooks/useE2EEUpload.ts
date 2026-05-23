import { useState } from 'react';
import { fetchWithRefresh } from '../services/api.service';
import { encryptDEKWithPublicKey, uint8ArrayToBase64, getPublicKeyFromSession, encryptFilenameAsymmetric } from '../services/crypto.service';
import { UPLOAD_CONFIG, UPLOAD_MESSAGES } from '../config/uploadConfig';
import { validateFile, formatFileSize, getFileTypeLabel } from '../services/fileValidation.service';

export interface UploadProgress {
    uploadedBytes: number;
    totalBytes: number;
    percentage: number;
    speed: number;
    remainingTime: number;
}

export interface UploadTask {
    id: string;
    file: File;
    fileInfo: { name: string; size: string; type: string };
    status: string;
    progress: UploadProgress | null;
    isUploading: boolean;
    error: string | null;
}

interface PartURL {
    part_number: number;
    presigned_url: string;
}

interface CompletedPart {
    part_number: number;
    etag: string;
}

async function getOrgPublicKey(orgId: string): Promise<CryptoKey> {
    const res = await fetchWithRefresh(`/api/orgs/${orgId}/public-key`);
    if (!res.ok) {
        throw new Error("Failed to fetch organization public key");
    }
    const data = await res.json();
    const publicKeyBase64 = data.public_key;
    const keyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
        "spki",
        keyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

/**
 * Derive a chunk IV from the base IV and a 1-indexed chunk number (up to 100).
 * Must match the decryption logic in useE2EEDownload.ts.
 */
function deriveChunkIv(baseIv: Uint8Array, chunkNumber: number): Uint8Array<ArrayBuffer> {
    const chunkIv = new Uint8Array(12);
    chunkIv.set(baseIv);
    const view = new DataView(chunkIv.buffer);
    view.setUint32(8, view.getUint32(8) + chunkNumber);
    return chunkIv;
}

export function useE2EEUpload(onSuccess: () => void, orgId?: string, folderId?: string) {
    const [uploads, setUploads] = useState<Record<string, UploadTask>>({});

    const updateUpload = (id: string, updates: Partial<UploadTask>) => {
        setUploads(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    };

    /**
     * Single-PUT upload path: encrypt the whole file as one chunk and PUT it directly.
     */
    const uploadSinglePut = async (
        id: string,
        file: File,
        cryptoKey: CryptoKey,
        baseIv: Uint8Array,
        encryptedDEK: Uint8Array,
        publicKey: CryptoKey,
    ) => {
        const numChunks = Math.ceil(file.size / UPLOAD_CONFIG.CHUNK_SIZE);
        const totalEncryptedSize = file.size + numChunks * 16;

        const initRes = await fetchWithRefresh("/api/files/upload-url", {
            method: "POST",
            body: JSON.stringify({
                file_size: totalEncryptedSize,
                folder_id: folderId || null,
                org_id: orgId || null,
            })
        });
        if (!initRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_SERVER_AUTH);
        const { presigned_url, object_id } = await initRes.json();

        updateUpload(id, { status: UPLOAD_MESSAGES.ENCRYPTING });

        const encryptedChunks: Uint8Array[] = [];
        for (let i = 0; i < numChunks; i++) {
            const offset = i * UPLOAD_CONFIG.CHUNK_SIZE;
            const slice = file.slice(offset, offset + UPLOAD_CONFIG.CHUNK_SIZE);
            const buffer = await slice.arrayBuffer();

            const chunkIv = deriveChunkIv(baseIv, i + 1);
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: chunkIv },
                cryptoKey,
                buffer
            );
            encryptedChunks.push(new Uint8Array(encrypted));
        }

        // Concatenate all encrypted chunks into one body for the single PUT
        const body = new Blob(encryptedChunks as BlobPart[], { type: "application/octet-stream" });

        updateUpload(id, { status: UPLOAD_MESSAGES.UPLOADING });

        const uploadRes = await fetch(presigned_url, {
            method: "PUT",
            body
        });
        if (!uploadRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_STORAGE_REJECTED);

        updateUpload(id, { status: UPLOAD_MESSAGES.FINALIZING });

        const finalizeRes = await fetchWithRefresh("/api/files/finalize", {
            method: "POST",
            body: JSON.stringify({
                object_id,
                encrypted_filename: await encryptFilenameAsymmetric(file.name, publicKey),
                encrypted_dek: uint8ArrayToBase64(new Uint8Array(encryptedDEK)),
                iv: uint8ArrayToBase64(baseIv),
                org_id: orgId || null,
            })
        });
        if (!finalizeRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_FINALIZE_FAILED);
    };

    /**
     * Multipart upload path: split the file into chunks, encrypt + PUT each part in parallel,
     * collect ETags, then ask the backend to finalize the assembly.
     */
    const uploadMultipart = async (
        id: string,
        file: File,
        cryptoKey: CryptoKey,
        baseIv: Uint8Array,
        encryptedDEK: Uint8Array,
        startTime: number,
        publicKey: CryptoKey,
    ) => {
        const numChunks = Math.ceil(file.size / UPLOAD_CONFIG.CHUNK_SIZE);
        const totalEncryptedSize = file.size + numChunks * 16; // 1 GCM tag per chunk

        const initRes = await fetchWithRefresh("/api/files/multipart/init", {
            method: "POST",
            body: JSON.stringify({
                file_size: totalEncryptedSize,
                folder_id: folderId || null,
                org_id: orgId || null,
                part_count: numChunks,
            })
        });
        if (!initRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_SERVER_AUTH);
        const { object_id, upload_id, parts } = await initRes.json() as {
            object_id: string;
            upload_id: string;
            parts: PartURL[];
        };

        updateUpload(id, { status: UPLOAD_MESSAGES.ENCRYPTING });

        let completedParts: CompletedPart[];
        try {
            completedParts = await uploadPartsInParallel(
                file,
                cryptoKey,
                baseIv,
                parts,
                UPLOAD_CONFIG.PARALLEL_UPLOADS,
                (uploadedBytes) => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
                    const remainingBytes = file.size - uploadedBytes;
                    const remainingTime = speed > 0 ? remainingBytes / speed : 0;
                    const percentage = Math.round((uploadedBytes / file.size) * 100);

                    updateUpload(id, {
                        progress: {
                            uploadedBytes,
                            totalBytes: file.size,
                            percentage,
                            speed,
                            remainingTime,
                        }
                    });
                }
            );
        } catch (err) {
            // abort in the backend to free MinIO parts
            await fetchWithRefresh("/api/files/multipart/abort", {
                method: "POST",
                body: JSON.stringify({ object_id, upload_id })
            }).catch(() => { /* swallow: the sweep will catch leftovers */ });
            throw err;
        }

        updateUpload(id, { status: UPLOAD_MESSAGES.FINALIZING });

        const finalizeRes = await fetchWithRefresh("/api/files/multipart/finalize", {
            method: "POST",
            body: JSON.stringify({
                object_id,
                upload_id,
                encrypted_filename: await encryptFilenameAsymmetric(file.name, publicKey),
                encrypted_dek: uint8ArrayToBase64(new Uint8Array(encryptedDEK)),
                iv: uint8ArrayToBase64(baseIv),
                org_id: orgId || null,
                parts: completedParts,
            })
        });
        if (!finalizeRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_FINALIZE_FAILED);
    };

    const uploadFile = async (file: File) => {
        const id = crypto.randomUUID();

        const fileInfo = {
            name: file.name,
            size: formatFileSize(file.size),
            type: getFileTypeLabel(file.type)
        };

        setUploads(prev => ({
            ...prev,
            [id]: { id, file, fileInfo, status: UPLOAD_MESSAGES.INITIALIZING(file.name), progress: null, isUploading: true, error: null }
        }));

        const startTime = Date.now();

        try {
            const validation = await validateFile(file);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            let publicKey: CryptoKey;
            if (orgId) {
                publicKey = await getOrgPublicKey(orgId);
            } else {
                const key = await getPublicKeyFromSession();
                if (!key) throw new Error(UPLOAD_MESSAGES.ERROR_PUBLIC_KEY);
                publicKey = key;
            }

            const dek = window.crypto.getRandomValues(new Uint8Array(32));
            const baseIv = window.crypto.getRandomValues(new Uint8Array(12));

            const cryptoKey = await window.crypto.subtle.importKey(
                "raw", dek, "AES-GCM", false, ["encrypt"]
            );
            const encryptedDEK = await encryptDEKWithPublicKey(dek, publicKey);

            updateUpload(id, { status: UPLOAD_MESSAGES.REQUESTING_AUTH });

            // Branch by file size: single PUT vs multipart
            if (file.size <= UPLOAD_CONFIG.MULTIPART_THRESHOLD) {
                await uploadSinglePut(id, file, cryptoKey, baseIv, new Uint8Array(encryptedDEK), publicKey);
            } else {
                await uploadMultipart(id, file, cryptoKey, baseIv, new Uint8Array(encryptedDEK), startTime, publicKey);
            }

            updateUpload(id, { status: UPLOAD_MESSAGES.SUCCESS(file.name), progress: null, isUploading: false });

            setTimeout(() => {
                setUploads(prev => { const next = { ...prev }; delete next[id]; return next; });
            }, 4000);

            onSuccess();

        } catch (err: any) {
            updateUpload(id, { status: `Erreur d'upload: ${err.message}`, progress: null, isUploading: false, error: err.message });
            setTimeout(() => {
                setUploads(prev => { const next = { ...prev }; delete next[id]; return next; });
            }, 5000);
        }
    };

    return { uploadFile, uploads };
}

/**
 * Upload multipart parts in parallel.
 * Each worker picks the next available part, encrypts it, PUTs it, and records the ETag.
 * Results are indexed by part position to preserve PartNumber ordering.
 */
async function uploadPartsInParallel(
    file: File,
    cryptoKey: CryptoKey,
    baseIv: Uint8Array,
    parts: PartURL[],
    poolSize: number,
    onProgress: (uploadedBytes: number) => void,
): Promise<CompletedPart[]> {

    const results: CompletedPart[] = new Array(parts.length);
    let nextIndex = 0;
    let totalUploaded = 0;

    const worker = async (): Promise<void> => {
        while (true) {
            const i = nextIndex++;
            if (i >= parts.length) return;

            const part = parts[i];
            const offset = i * UPLOAD_CONFIG.CHUNK_SIZE;
            const slice = file.slice(offset, offset + UPLOAD_CONFIG.CHUNK_SIZE);
            const buffer = await slice.arrayBuffer();

            const chunkIv = deriveChunkIv(baseIv, part.part_number);
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: chunkIv },
                cryptoKey,
                buffer
            );

            const putRes = await fetch(part.presigned_url, {
                method: "PUT",
                body: encrypted,
            });
            if (!putRes.ok) {
                throw new Error(`${UPLOAD_MESSAGES.ERROR_PART_FAILED} (part ${part.part_number})`);
            }

            const etag = putRes.headers.get("ETag");
            if (!etag) {
                throw new Error(`missing ETag on part ${part.part_number}`);
            }

            results[i] = {
                part_number: part.part_number,
                etag: etag.replace(/"/g, ""),
            };

            totalUploaded += buffer.byteLength;
            onProgress(totalUploaded);
        }
    };

    const workers = Array.from(
        { length: Math.min(poolSize, parts.length) },
        () => worker()
    );
    await Promise.all(workers);

    return results;
}
