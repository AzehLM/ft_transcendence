import { useState } from 'react';
import { fetchWithRefresh } from '../services/api.service';
import { encryptDEKWithPublicKey, uint8ArrayToBase64, getPublicKeyFromSession, encryptFilename } from '../services/crypto.service';
import { FileValidationService } from '../services/fileValidation.service';
import { UPLOAD_CONFIG, UPLOAD_MESSAGES } from '../config/uploadConfig';

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

export function useE2EEUpload(onSuccess: () => void, orgId?: string) {
    const [uploads, setUploads] = useState<Record<string, UploadTask>>({});

    const updateUpload = (id: string, updates: Partial<UploadTask>) => {
        setUploads(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    };

    const validateFile = (file: File): string | null => {
        if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
            const max = FileValidationService.formatFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE);
            const current = FileValidationService.formatFileSize(file.size);
            return UPLOAD_MESSAGES.ERROR_VALIDATION_SIZE(max, current);
        }

        if (!UPLOAD_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
            return UPLOAD_MESSAGES.ERROR_VALIDATION_TYPE();
        }

        return null;
    };

    const uploadFile = async (file: File) => {
        const id = Math.random().toString(36).substring(2, 9);

        const fileInfo = {
            name: file.name,
            size: FileValidationService.formatFileSize(file.size),
            type: FileValidationService.getFileTypeLabel(file.type) || 'Fichier'
        };

        const error = validateFile(file);
        if (error) {
            setUploads(prev => ({
                ...prev,
                [id]: { id, file, fileInfo, status: `Erreur: ${error}`, progress: null, isUploading: false, error }
            }));
            setTimeout(() => {
                setUploads(prev => { const next = { ...prev }; delete next[id]; return next; });
            }, 5000);
            return;
        }

        setUploads(prev => ({
            ...prev,
            [id]: { id, file, fileInfo, status: UPLOAD_MESSAGES.INITIALIZING(file.name), progress: null, isUploading: true, error: null }
        }));

        const startTime = Date.now();

        try {
            const magicNumberValidation = await FileValidationService.validateMagicNumber(file);
            if (!magicNumberValidation.valid) {
                throw new Error(magicNumberValidation.error);
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

            const numChunks = Math.ceil(file.size / UPLOAD_CONFIG.CHUNK_SIZE);
            const totalEncryptedSize = file.size + (numChunks * 16);

            const initRes = await fetchWithRefresh("/api/files/upload-url", {
                method: "POST",
                body: JSON.stringify({
                    file_size: totalEncryptedSize,
                    folder_id: null,
                    org_id: orgId || null
                })
            });

            if (!initRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_SERVER_AUTH);
            const { presigned_url, object_id } = await initRes.json();

            updateUpload(id, { status: UPLOAD_MESSAGES.ENCRYPTING });

            let offset = 0;
            let chunkIndex = 1;
            const encryptedChunks: ArrayBuffer[] = [];
            let uploadedBytes = 0;

            while (offset < file.size) {
                const slice = file.slice(offset, offset + UPLOAD_CONFIG.CHUNK_SIZE);
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
                uploadedBytes += buffer.byteLength;

                const elapsed = (Date.now() - startTime) / 1000;
                const speed = uploadedBytes / elapsed;
                const remainingBytes = file.size - uploadedBytes;
                const remainingTime = remainingBytes / speed;
                const percentage = Math.round((uploadedBytes / file.size) * 100);

                updateUpload(id, {
                    progress: {
                        uploadedBytes,
                        totalBytes: file.size,
                        percentage,
                        speed,
                        remainingTime
                    }
                });

                offset += UPLOAD_CONFIG.CHUNK_SIZE;
                chunkIndex++;
            }

            const finalBlob = new Blob(encryptedChunks, { type: "application/octet-stream" });

            updateUpload(id, { status: UPLOAD_MESSAGES.UPLOADING });
            await new Promise(resolve => setTimeout(resolve, 500));

            const uploadRes = await fetch(presigned_url, {
                method: "PUT",
                body: finalBlob
            });

            if (!uploadRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_STORAGE_REJECTED);

            updateUpload(id, { status: UPLOAD_MESSAGES.FINALIZING });

            const finalizeRes = await fetchWithRefresh("/api/files/finalize", {
                method: "POST",
                body: JSON.stringify({
                    object_id: object_id,
                    encrypted_filename: await encryptFilename(file.name, dek, baseIv),
                    encrypted_dek: uint8ArrayToBase64(new Uint8Array(encryptedDEK)),
                    iv: uint8ArrayToBase64(baseIv),
                    org_id: orgId || null
                })
            });

            if (!finalizeRes.ok) throw new Error(UPLOAD_MESSAGES.ERROR_FINALIZE_FAILED);

            updateUpload(id, { status: UPLOAD_MESSAGES.SUCCESS(file.name), progress: null, isUploading: false });
            onSuccess();

            setTimeout(() => {
                setUploads(prev => { const next = { ...prev }; delete next[id]; return next; });
            }, 4000);

        } catch (err: any) {
            updateUpload(id, { status: `Erreur d'upload: ${err.message}`, progress: null, isUploading: false, error: err.message });
            setTimeout(() => {
                setUploads(prev => { const next = { ...prev }; delete next[id]; return next; });
            }, 5000);
        }
    };

    return { uploadFile, uploads };
}