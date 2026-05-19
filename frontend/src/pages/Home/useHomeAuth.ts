import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../../services/api.service";
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
        const token = localStorage.getItem("token");
        if (!token) return;

        fetchWithRefresh("/api/auth/me")
            .then((res) => {
                if (!res.ok) return null;
                return res.json();
            })
            .then((data) => {
                if (data?.email) {
                    setUser({
                        name: data.display_name ?? data.email,
                        email: data.email,
                    });
                }
            })
            .catch(() => setUser(null));
    }, []);

    const logout = () => {
        authLogout(navigate);
        setUser(null);
    };

    return { user, logout };
}
