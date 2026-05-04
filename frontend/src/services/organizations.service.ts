import { wrapPrivateKey, getPublicKeyFromSession, generateRSAKeyPair, exportPublicKey, uint8ArrayToBase64 } from "./crypto.service";

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
    org_public_key: uint8ArrayToBase64(orgPublicKey),
    encrypted_org_private_key: uint8ArrayToBase64(encryptedPrivateKey),
    encrypted_aes_key: uint8ArrayToBase64(new Uint8Array(encryptedAesKey)),
    iv: uint8ArrayToBase64(iv),
  };
}