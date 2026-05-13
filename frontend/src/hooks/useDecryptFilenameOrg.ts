import { useState, useEffect } from 'react';
import { decryptFilename, base64ToUint8Array, decryptDEKWithPrivateKey } from '../services/crypto.service';
import { decryptOrgPrivateKey } from '../services/organizations.service';
import { FilesService, DownloadResponse } from '../services/files.service';
import { fetchWithRefresh } from '../services/api.service';

export function useDecryptFilenameOrg(fileId: string, orgId: string) {
    const [decryptedName, setDecryptedName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const decryptName = async () => {
            try {
                setLoading(true);
                setError(null);

                const downloadInfo: DownloadResponse = await FilesService.getDownloadUrl(fileId);

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

                const encryptedDek = base64ToUint8Array(downloadInfo.encrypted_dek);
                const dek = await decryptDEKWithPrivateKey(encryptedDek, orgPrivateKey);

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
    }, [fileId, orgId]);

    return { decryptedName, loading, error };
}
