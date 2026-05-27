import { generateLoginData, base64ToUint8Array, unwrapPrivateKey, storePrivateKey, storePublicKey } from "./crypto.service";

import { clearAllKeys } from "./idb.service";

export async function logout(navigate: (path: string) => void) {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    localStorage.removeItem("token");
    await clearAllKeys();

    navigate("/login");
  }
}

export async function resetKeys(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { masterKey, loginData } = await generateLoginData(email, password);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return { success: false, error: responseData.message || "Error !" };
    }

    const encryptedPrivateKey = base64ToUint8Array(responseData.encrypted_private_key);
    const iv = base64ToUint8Array(responseData.iv);
    const privateKey = await unwrapPrivateKey(encryptedPrivateKey, masterKey, iv);
    await storePrivateKey(privateKey);
    const publicKeyArray = base64ToUint8Array(responseData.public_key);
    const publicKey = await crypto.subtle.importKey(
        "spki",
        new Uint8Array(publicKeyArray),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
    await storePublicKey(publicKey);

    return { success: true };
  } catch {
    return { success: false, error: "Network error, please try again." };
  }
}