import { toArrayBuffer, wrapPrivateKey, getPublicKeyFromSession, generateRSAKeyPair, exportPublicKey, uint8ArrayToBase64, base64ToUint8Array, getPrivateKeyFromSession } from "./crypto.service";
import { fetchWithRefresh } from "./api.service";

export async function generateOrganization(name: string) {
  const keyPair = await generateRSAKeyPair();

  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const { encryptedPrivateKey, iv } = await wrapPrivateKey(keyPair.privateKey, aesKey);

  const userPublicKey = await getPublicKeyFromSession();
  if (!userPublicKey) throw new Error("No public key in session");

  const aesKeyRaw = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    userPublicKey,
    aesKeyRaw
  );

  const orgPublicKey = await exportPublicKey(keyPair.publicKey);

  return {
    name,
    public_key: uint8ArrayToBase64(orgPublicKey),
    enc_org_priv_key: uint8ArrayToBase64(encryptedPrivateKey),
    enc_aes_key: uint8ArrayToBase64(new Uint8Array(encryptedAesKey)),
    iv: uint8ArrayToBase64(iv),
  };
}

export async function encryptOrgKeyForMember(
  encOrgPrivKey: string,
  encAesKey: string,
  iv: string,
  memberPublicKeyB64: string
): Promise<{
  enc_org_priv_key: string;
  enc_aes_key: string;
  iv: string;
}> {
  const userPrivateKey = await getPrivateKeyFromSession();
  if (!userPrivateKey) throw new Error("No private key in session");


  const encAesKeyBuffer = base64ToUint8Array(encAesKey);
  const aesKeyRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    userPrivateKey,
    toArrayBuffer(encAesKeyBuffer)
  );


  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );


  const encOrgPrivKeyBuffer = base64ToUint8Array(encOrgPrivKey);
  const ivBuffer = base64ToUint8Array(iv);
  const orgPrivKeyRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ivBuffer) },
    aesKey,
    toArrayBuffer(encOrgPrivKeyBuffer)
  );


  const memberPublicKeyBuffer = base64ToUint8Array(memberPublicKeyB64);
  const memberPublicKey = await crypto.subtle.importKey(
    "spki",
    toArrayBuffer(memberPublicKeyBuffer),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );


  const newAesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );


  const newIv = crypto.getRandomValues(new Uint8Array(12));
  const newEncOrgPrivKey = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: newIv },
    newAesKey,
    orgPrivKeyRaw
  );


  const newAesKeyRaw = await crypto.subtle.exportKey("raw", newAesKey);
  const newEncAesKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    memberPublicKey,
    newAesKeyRaw
  );

  return {
    enc_org_priv_key: uint8ArrayToBase64(new Uint8Array(newEncOrgPrivKey)),
    enc_aes_key: uint8ArrayToBase64(new Uint8Array(newEncAesKey)),
    iv: uint8ArrayToBase64(newIv),
  };
}

export async function decryptOrgPrivateKey(
  encOrgPrivKey: string,
  encAesKey: string,
  iv: string
): Promise<string> {
  // Get user private key
  const userPrivateKey = await getPrivateKeyFromSession();
  if (!userPrivateKey) throw new Error("No private key in session");

  // Decrypt AES key
  const aesKeyRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    userPrivateKey,
    toArrayBuffer(base64ToUint8Array(encAesKey))
  );

  // Import AES key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt Orga private key
  const orgPrivKeyRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64ToUint8Array(iv)) },
    aesKey,
    toArrayBuffer(base64ToUint8Array(encOrgPrivKey))
  );

  return uint8ArrayToBase64(new Uint8Array(orgPrivKeyRaw));
}

export async function addMemberToOrg(
  orgId: string,
  memberEmail: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const keysRes = await fetchWithRefresh(`/api/orgs/${orgId}/members/keys`);
    if (!keysRes.ok) {
      if (keysRes.status === 502 || keysRes.status === 503) {
        return { success: false, error: "Network error, please try again later." };
      }
      throw new Error("Failed to get org keys");
    }
    const { enc_org_priv_key, enc_aes_key, iv } = await keysRes.json();

    const pubKeyRes = await fetchWithRefresh(`/api/auth/public-key?email=${encodeURIComponent(memberEmail)}`);

    if (pubKeyRes.status === 404) {
      return { success: false, error: "User not found." };
    }

    if (!pubKeyRes.ok) {
      if (pubKeyRes.status === 502 || pubKeyRes.status === 503) {
        return { success: false, error: "Network error, please try again later." };
      }
      return { success: false, error: "Failed to retrieve user public key." };
    }

    const { public_key } = await pubKeyRes.json();

    const encryptedData = await encryptOrgKeyForMember(
      enc_org_priv_key,
      enc_aes_key,
      iv,
      public_key
    );

    const response = await fetchWithRefresh(`/api/orgs/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_email: memberEmail, ...encryptedData }),
    });

    if (!response.ok) {
      if (response.status === 502 || response.status === 503) {
          return { success: false, error: "Network error, please try again later." };
      } else {
          const body = await response.json().catch(() => null);
          return { success: false, error: body?.error || body?.message || "Failed to add member." };
      }
  }

    return { success: true };
  } catch (err) {
    console.error("Error:", err);
    return { success: false, error: "An error occurred, please try again." };
  }
}