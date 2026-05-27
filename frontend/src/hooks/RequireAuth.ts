import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../services/api.service";
import { logout } from "../services/auth.service";

export function useRequireAuth() {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWithRefresh("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          logout((path) => navigate(path));
        } else {
          setIsReady(true);
        }
      })
      .catch(() => {
        logout((path) => navigate(path));
      });
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
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => {
            localStorage.setItem("token", data.access_token);
            navigate("/dashboard");
          });
        } else {
          setIsReady(true);
        }
      })
      .catch(() => {
        setIsReady(true);
      });
  }, []);

  return { isReady };
}