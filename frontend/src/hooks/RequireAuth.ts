import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../services/api.service";
import { logout } from "../services/auth.service";
import { getPublicKeyFromSession, getPrivateKeyFromSession } from "../services/crypto.service";
import { clearAllKeys } from "../services/idb.service";

export function useRequireAuth() {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetchWithRefresh("/api/auth/me");
        if (!res.ok) {
          logout((path) => navigate(path));
          return;
        }

        const privateKey = await getPrivateKeyFromSession();
        const publicKey = await getPublicKeyFromSession();

        if (!privateKey || !publicKey) {
          logout((path) => navigate(path));
          return;
        }

        setIsReady(true);
      } catch {
        logout((path) => navigate(path));
      }
    };

    verify();
  }, []);

  return { isReady };
}


export function useRequireUnauth() {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();

          const privateKey = await getPrivateKeyFromSession();
          const publicKey = await getPublicKeyFromSession();

          if (!privateKey || !publicKey) {
            logout(() => {
              setIsReady(true);
            });
            return;
          }

          localStorage.setItem("token", data.access_token);
          navigate("/dashboard");
        } else {
            localStorage.removeItem("token");
          await clearAllKeys();
          setIsReady(true);
        }
      })
      .catch(async () => {
        localStorage.removeItem("token");
        await clearAllKeys();
        setIsReady(true);
      });
  }, [navigate]);

  return { isReady };
}