import { generateLoginData, base64ToUint8Array, unwrapPrivateKey, storePrivateKey } from "./crypto.service";

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

  sessionStorage.removeItem("passwordChanged");
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
    sessionStorage.setItem("publicKey", responseData.public_key);

    return { success: true };
  } catch {
    return { success: false, error: "Network error, please try again." };
  }
}