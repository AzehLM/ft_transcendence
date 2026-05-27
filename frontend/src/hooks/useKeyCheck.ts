import { useState, useEffect } from "react";
import { getPublicKeyFromSession, getPrivateKeyFromSession } from "../services/crypto.service";
import { resetKeys } from "../services/auth.service";
import { fetchWithRefresh } from "../services/api.service";

export function useKeyCheck() {
  const [keyMissing, setKeyMissing] = useState(false);
  const [password, setPassword] = useState("");
  const [keyModalError, setKeyModalError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    fetchWithRefresh("/api/auth/me")
      .then(res => res.json())
      .then(data => setEmail(data.email));
  }, []);

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
    const { success, error } = await resetKeys(email, password);
    if (!success) {
      setKeyModalError(error ?? "Error, try again");
      return;
    }
    setPassword("");
    setKeyMissing(false);
    setKeyModalError(null);
  };

  return {
    keyMissing,
    setKeyMissing,
    password,
    setPassword,
    keyModalError,
    setKeyModalError,
    checkKeys,
    handleResetKeys,
  };
}