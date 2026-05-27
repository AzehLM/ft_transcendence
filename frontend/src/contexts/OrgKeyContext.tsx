import React, { createContext, useContext, useState, useEffect } from 'react';
import { base64ToUint8Array } from '../services/crypto.service';
import { decryptOrgPrivateKey } from '../services/organizations.service';
import { fetchWithRefresh } from '../services/api.service';

interface OrgKeyContextType {
  orgPrivateKey: CryptoKey | null;
  loading: boolean;
  error: string | null;
}

const OrgKeyContext = createContext<OrgKeyContextType | undefined>(undefined);

export function OrgKeyProvider({ orgId, children }: { orgId: string | undefined; children: React.ReactNode }) {
  const [orgPrivateKey, setOrgPrivateKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setOrgPrivateKey(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAndDecrypt = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const keysRes = await fetchWithRefresh(`/api/orgs/${orgId}/members/keys`);
        if (!keysRes.ok) {
          throw new Error("Failed to fetch organization keys");
        }
        const { enc_org_priv_key, enc_aes_key, iv: orgIv } = await keysRes.json();

        const orgPrivKeyB64 = await decryptOrgPrivateKey(enc_org_priv_key, enc_aes_key, orgIv);
        const orgPrivKeyBuffer = base64ToUint8Array(orgPrivKeyB64);

        const importedKey = await window.crypto.subtle.importKey(
          "pkcs8",
          orgPrivKeyBuffer.buffer as ArrayBuffer,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["decrypt"]
        );

        if (isMounted) {
          setOrgPrivateKey(importedKey);
        }
      } catch (err: any) {
        console.error("Failed to load organization private key:", err);
        if (isMounted) {
          setError(err.message || "Failed to load organization keys");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAndDecrypt();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  return (
    <OrgKeyContext.Provider value={{ orgPrivateKey, loading, error }}>
      {children}
    </OrgKeyContext.Provider>
  );
}

export function useOrgKey() {
  return useContext(OrgKeyContext);
}
