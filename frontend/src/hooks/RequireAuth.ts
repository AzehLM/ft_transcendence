import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../services/api.service";

export function useRequireAuth() {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchWithRefresh("/api/auth/me")
      .then((res) => {
        if (!res.ok) navigate("/login");
        else setIsReady(true);
      })
      .catch(() => navigate("/login"));
  }, []);

  return { isReady };
}