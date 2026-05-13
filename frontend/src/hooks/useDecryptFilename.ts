import { useState, useEffect } from 'react';
import { decryptFilename, base64ToUint8Array, decryptDEKWithPrivateKey, getPrivateKeyFromSession } from '../services/crypto.service';
import { FilesService, DownloadResponse } from '../services/files.service';

export function useDecryptFilename(fileId: string) {
    const [decryptedName, setDecryptedName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const decryptName = async () => {
            try {
                setLoading(true);
                setError(null);

                const downloadInfo: DownloadResponse = await FilesService.getDownloadUrl(fileId);

                const privateKey = await getPrivateKeyFromSession();
                if (!privateKey) {
                    throw new Error("Private key not found in session");
                }

                const encryptedDek = base64ToUint8Array(downloadInfo.encrypted_dek);
                const dek = await decryptDEKWithPrivateKey(encryptedDek, privateKey);

                const iv = base64ToUint8Array(downloadInfo.iv);
                const decrypted = await decryptFilename(
                    downloadInfo.encrypted_filename,
                    dek,
                    iv
                );

                setDecryptedName(decrypted);
            } catch (err) {
                console.error("Failed to decrypt filename:", err);
                setError("Failed to decrypt filename");
                setDecryptedName("[Encrypted]");
            } finally {
                setLoading(false);
            }
        };

        decryptName();
    }, [fileId]);

    return { decryptedName, loading, error };
}

