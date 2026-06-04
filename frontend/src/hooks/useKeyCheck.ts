import { useState } from "react";
import { getPublicKeyFromSession, getPrivateKeyFromSession } from "../services/crypto.service";
import { resetKeys } from "../services/auth.service";
import { fetchWithRefresh } from "../services/api.service";

export function useKeyCheck() {
  const [keyMissing, setKeyMissing] = useState(false);
  const [password, setPassword] = useState("");
  const [keyModalError, setKeyModalError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const checkKeys = async (): Promise<boolean> => {
    const privateKey = await getPrivateKeyFromSession();
    const publicKey = await getPublicKeyFromSession();

    if (!privateKey || !publicKey) {
      setKeyMissing(true);
      return false;
    }
    return true;
  };

const handleResetKeys = async () => {
    setKeyModalError(null);
    if (!password) return;

    setIsResetting(true);
    try {
      const userRes = await fetchWithRefresh("/api/auth/me");
      if (!userRes.ok) {
        throw new Error("Failed to fetch user info.");
      }
      const userData = await userRes.json();
      
      if (!userData.email) {
        throw new Error("User email not found.");
      }

      const { success, error } = await resetKeys(userData.email, password);

      if (!success) {
        setKeyModalError(error ?? "An error has occurred, please try again.");
        return;
      }

      setPassword("");
      setKeyMissing(false);
      setKeyModalError(null);
    } catch (err: any) {
      setKeyModalError(err.message ?? "Network Error.");
    } finally {
      setIsResetting(false);
    }
  };

  return {
    keyMissing,
    setKeyMissing,
    password,
    setPassword,
    keyModalError,
    isResetting,
    setKeyModalError,
    checkKeys,
    handleResetKeys,
  };
}