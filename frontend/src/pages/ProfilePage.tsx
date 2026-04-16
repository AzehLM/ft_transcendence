import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/auth.module.css"
import { Package} from "lucide-react";
import { useEffect, useState } from "react";

async function getPrivateKeyFromSession(): Promise<CryptoKey | null> {
    const base64Key = sessionStorage.getItem("privateKey");
    if (!base64Key) return null;

    const keyBuffer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    
    return crypto.subtle.importKey(
        "pkcs8",
        keyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
    );
}

async function fetchWithRefresh(url: string, options: RequestInit = {}) {
    let token = localStorage.getItem("token") || "";

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include", // cookie HttpOnly
        });

                const text = await refreshResponse.text();
                let data: any;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { error: text || "Invalid JSON" };
                }

                if (!refreshResponse.ok) {
                    console.error("Error backend:", data);
                }

        if (!refreshResponse.ok) {
            throw new Error("Session Expired, cannot refresh token");
        }

        token = data.access_token;

        localStorage.setItem("token", token);

        const newHeaders = {
            ...options.headers,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        response = await fetch(url, { ...options, headers: newHeaders });
    }

    return response;
}

export default function ProfilePage() {

    const [user, setUser] = useState(null);
    const navigate = useNavigate()

    function logout() {
        sessionStorage.removeItem("privateKey");
        localStorage.removeItem("token");
        navigate("/login");
    }

    const [privateKey, setPrivateKey] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const key = await getPrivateKeyFromSession();
                if (!key) {
                    navigate("/login");
                    return;
                }
                
                const exported = await crypto.subtle.exportKey("pkcs8", key);
                const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
                setPrivateKey(base64);

                
                const response = await fetchWithRefresh("/api/auth/me");
                const text = await response.text();
                let data: any;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { error: text || "Invalid JSON" };
                }

                if (response.ok) {
                    setUser(data);
                } else {
                    console.error("Error backend:", data);
                }
            } catch (err) {
                console.error("Error:", err);
            }
        };

        fetchUser();
    }, []);

    return (
        <div>
            <div className={styles.logo_section}>
                <Link to="/" className={styles.logo_container} style={{ textDecoration: "none" }}>
                    <div className={styles.logo_box}>
                        <Package className="w-11 h-11 text-white" strokeWidth={2} />
                    </div>
                    <span className={styles.logo_title}>
                        ft_box
                    </span>
                </Link>
            </div>
            <div>{user ? JSON.stringify(user) : "Loading..."}</div>
           <div style={{ wordBreak: "break-all", fontSize: "12px" }}>
                {privateKey ? `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----` : "Clé non trouvée"}
            </div>
            <button onClick={logout}>
                Déconnexion
            </button>
        </div>
    )
}