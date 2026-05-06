import { toArrayBuffer, wrapPrivateKey, getPublicKeyFromSession, generateRSAKeyPair, exportPublicKey, uint8ArrayToBase64, base64ToUint8Array, getPrivateKeyFromSession } from "./crypto.service";
import { fetchWithRefresh } from "./api.service";

export async function generateOrganization(name: string) {
  console.log("1 - Génération de la paire RSA-OAEP pour Organization...");
  const keyPair = await generateRSAKeyPair();

  console.log("2 - Génération d'une clé AES temporaire...");
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  console.log("3 - Wrap de la clé privée org avec la clé AES...");
  const { encryptedPrivateKey, iv } = await wrapPrivateKey(keyPair.privateKey, aesKey);

  console.log("4 - Chiffrement de la clé AES avec la clé publique user (RSA)...");
  const userPublicKey = await getPublicKeyFromSession();
  if (!userPublicKey) throw new Error("No public key in session");

  const aesKeyRaw = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    userPublicKey,
    aesKeyRaw
  );

  console.log("5 - Export de la clé publique org...");
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
  console.log("Encrypt Key for orga member (1) - get private key")
  const userPrivateKey = await getPrivateKeyFromSession();
  if (!userPrivateKey) throw new Error("No private key in session");

  console.log("Encrypt Key for orga member (2) - decrypt aes")

  const encAesKeyBuffer = base64ToUint8Array(encAesKey);
  const aesKeyRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    userPrivateKey,
    toArrayBuffer(encAesKeyBuffer)
  );

  console.log("Encrypt Key for orga member (3) - import aes")

  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  console.log("Encrypt Key for orga member (4) - derypt private key of orga")

  // console.log("encOrgPrivKey raw:", encOrgPrivKey);
  // console.log("iv raw:", iv); 
  const encOrgPrivKeyBuffer = base64ToUint8Array(encOrgPrivKey);
  const ivBuffer = base64ToUint8Array(iv);
  const orgPrivKeyRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ivBuffer) },
    aesKey,
    toArrayBuffer(encOrgPrivKeyBuffer)
  );

  console.log("Encrypt Key for orga member (5) - get public key from inviting user")

  const memberPublicKeyBuffer = base64ToUint8Array(memberPublicKeyB64);
  const memberPublicKey = await crypto.subtle.importKey(
    "spki",
    toArrayBuffer(memberPublicKeyBuffer),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  console.log("Encrypt Key for orga member (6) - generate aes for new user")

  const newAesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  console.log("Encrypt Key for orga member (7) - encrypt private key")

  const newIv = crypto.getRandomValues(new Uint8Array(12));
  const newEncOrgPrivKey = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: newIv },
    newAesKey,
    orgPrivKeyRaw
  );

  console.log("Encrypt Key for orga member (8) - encrypt aes")

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
    if (!keysRes.ok) throw new Error("Failed to get org keys");
    const { enc_org_priv_key, enc_aes_key, iv } = await keysRes.json();

    const pubKeyRes = await fetchWithRefresh(`/api/auth/public-key?email=${encodeURIComponent(memberEmail)}`);
    if (pubKeyRes.status === 404) {
      return { success: false, error: "User not found" };
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
      const err = await response.json();
      return { success: false, error: err.error || err.message || "Failed to add member." };
    }

    return { success: true };
  } catch (err) {
    console.error("Error:", err);
    return { success: false, error: "An error occurred, please try again." };
  }
}