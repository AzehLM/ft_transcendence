import { useState, useEffect } from 'react';
import {
    decryptFilename,
    base64ToUint8Array,
    decryptDEKWithPrivateKey,
    getPrivateKeyFromSession
} from '../services/crypto.service';
import { decryptOrgPrivateKey } from '../services/organizations.service';
import { FilesService, DownloadResponse } from '../services/files.service';
import { fetchWithRefresh } from '../services/api.service';

export function useDecryptFilename(fileId: string, orgId?: string) {
    const [decryptedName, setDecryptedName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const decryptName = async () => {
            try {
                setLoading(true);
                setError(null);

                const downloadInfo: DownloadResponse = await FilesService.getDownloadUrl(fileId);
                const encryptedDek = base64ToUint8Array(downloadInfo.encrypted_dek);
                const fileIv = base64ToUint8Array(downloadInfo.iv);

                let dek: Uint8Array;

                if (orgId) {
                    const keysRes = await fetchWithRefresh(`/api/orgs/${orgId}/members/keys`);
                    if (!keysRes.ok) {
                        throw new Error("Failed to fetch organization keys");
                    }
                    const { enc_org_priv_key, enc_aes_key, iv: orgIv } = await keysRes.json();

                    const orgPrivKeyB64 = await decryptOrgPrivateKey(enc_org_priv_key, enc_aes_key, orgIv);
                    const orgPrivKeyBuffer = base64ToUint8Array(orgPrivKeyB64);

                    const orgPrivateKey = await window.crypto.subtle.importKey(
                        "pkcs8",
                        orgPrivKeyBuffer.buffer as ArrayBuffer,
                        { name: "RSA-OAEP", hash: "SHA-256" },
                        false,
                        ["decrypt"]
                    );

                    dek = await decryptDEKWithPrivateKey(encryptedDek, orgPrivateKey);

                } else {
                    const privateKey = await getPrivateKeyFromSession();
                    if (!privateKey) {
                        throw new Error("Private key not found in session");
                    }

                    dek = await decryptDEKWithPrivateKey(encryptedDek, privateKey);
                }

                const decrypted = await decryptFilename(
                    downloadInfo.encrypted_filename,
                    dek,
                    fileIv
                );

                if (isMounted) {
                    setDecryptedName(decrypted);
                }

            } catch (err) {
                console.error("Failed to decrypt filename:", err);
                if (isMounted) {
                    setError("Failed to decrypt filename");
                    setDecryptedName("[Encrypted]");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (fileId) {
            decryptName();
        }

        return () => {
            isMounted = false;
        };
    }, [fileId, orgId]);

    return { decryptedName, loading, error };
}