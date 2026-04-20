// import styles from "../../styles/auth.module.css"
import styles from "./Profile.module.css";
// import { Link } from "react-router-dom";
// import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { SearchBar } from "../../components/SearchBar";
import { LeftSidebar } from "../../components/LeftSidebarProfile";
import { ProfileDropdown } from "../../components/ProfileDropdown"
import { UserProfileButton } from "../../components/UserProfileButton";



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

        let data: any;
        try {
            data = await refreshResponse.json();
        } catch {
            const text = await refreshResponse.text();
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
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetchWithRefresh("/api/users/me");

                let data: any;
                try {
                    data = await response.json();
                } catch {
                    const text = await response.text();
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
        // <div>
        //     <div className={styles.logo_section}>
        //         <Link to="/" className={styles.logo_container} style={{ textDecoration: "none" }}>
        //             <div className={styles.logo_box}>
        //                 <Package className="w-11 h-11 text-white" strokeWidth={2} />
        //             </div>
        //             <span className={styles.logo_title}>
        //                 ft_box
        //             </span>
        //         </Link>
        //     </div>
        //     <div>{user ? JSON.stringify(user) : "Loading..."}</div>
        // </div>
        <div className={styles.page}>
            <LeftSidebar />
            <SearchBar />
            <UserProfileButton
                isOpen={profileDropdownOpen}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            />
            <ProfileDropdown isOpen={profileDropdownOpen} onClose={() => setProfileDropdownOpen(false)} />
        </div>
    )
}