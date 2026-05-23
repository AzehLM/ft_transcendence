import { useState, useEffect } from 'react';
import {
    decryptFilenameAsymmetric,
    base64ToUint8Array,
    getPrivateKeyFromSession
} from '../services/crypto.service';
import { decryptOrgPrivateKey } from '../services/organizations.service';
import { fetchWithRefresh } from '../services/api.service';

export function useDecryptFilename(encryptedName: string | null, orgId?: string) {
    const [decryptedName, setDecryptedName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
         if (!encryptedName) {
             setLoading(false);
             setError(null);
             setDecryptedName("");
             return;
         }
        
        let isMounted = true;

        const decryptName = async () => {
            try {
                setLoading(true);
                setError(null);

                let decrypted = "";

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

                    decrypted = await decryptFilenameAsymmetric(encryptedName, orgPrivateKey);

                } else {
                    const privateKey = await getPrivateKeyFromSession();
                    if (!privateKey) {
                        throw new Error("Private key not found in session");
                    }

                    decrypted = await decryptFilenameAsymmetric(encryptedName, privateKey);
                }

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

        if (encryptedName) {
            decryptName();
        }

        return () => {
            isMounted = false;
        };
    }, [encryptedName, orgId]);

    return { decryptedName, loading, error };
}