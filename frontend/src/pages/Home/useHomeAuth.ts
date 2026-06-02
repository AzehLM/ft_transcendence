import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout as authLogout } from "../../services/auth.service";

interface HomeUser {
    name: string;
    email: string;
}

/**
 * Soft auth check for the public HomePage.
 * Unlike useRequireAuth, this never redirects to /login — it simply resolves
 * to null when the visitor is not authenticated, so the page can render the
 * logged-out variant of the NavBar.
 */
export function useHomeAuth(): { user: HomeUser | null; logout: () => void } {
    const [user, setUser] = useState<HomeUser | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const checkAuth = async () => {
            let token = localStorage.getItem("token");
            if (!token) return;

            let res = await fetch("/api/auth/me", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (res.status === 401) {
                const refreshRes = await fetch("/api/auth/refresh", {
                    method: "POST",
                    credentials: "include",
                });

                if (!refreshRes.ok) {
                    if (!cancelled) setUser(null);
                    return;
                }

                const data = await refreshRes.json();
                token = data.access_token as string;
                localStorage.setItem("token", token);

                res = await fetch("/api/auth/me", {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });
            }

            if (!res.ok) {
                if (!cancelled) setUser(null);
                return;
            }

            const data = await res.json();
            if (!cancelled && data?.email) {
                setUser({
                    name: data.display_name ?? data.email,
                    email: data.email,
                });
            }
        };

        checkAuth().catch(() => {
            if (!cancelled) setUser(null);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const logout = () => {
        authLogout(navigate);
        setUser(null);
    };

    return { user, logout };
}
