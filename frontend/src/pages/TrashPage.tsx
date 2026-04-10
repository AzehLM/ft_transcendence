import { LeftSidebar } from "../components/leftsidebar";
import { ProfileDropdown } from "../components/profiledropdown";
import { Search, User } from "lucide-react";
import { useState } from "react";
import styles from "../styles/dashboard.module.css";

export default function TrashPage() {
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const trashedFiles = [
        { id: 1, name: "Deleted document" },
        { id: 2, name: "Old report" },
    ];

    return (
        <div className={styles.page}>
            <LeftSidebar foldersExpanded={foldersExpanded} setFoldersExpanded={setFoldersExpanded} />

            {/* Search bar */}
            <div className={styles.searchContainer}>
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search"
                        className={styles.searchInput}
                    />
                </div>
            </div>

            {/* User's profile image */}
            <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={styles.profileButton}
            >
                <User className={styles.profileIcon} strokeWidth={2.5} />
            </button>

            <ProfileDropdown isOpen={profileDropdownOpen} onClose={() => setProfileDropdownOpen(false)} />

            {/* Main content area */}
            <div className={styles.contentArea}>
                <h1 className={styles.title}>
                    Trash
                </h1>
                <h2 className={styles.subtitle}>
                    Deleted items
                </h2>

                {/* Files grid */}
                <div className={styles.fileGrid}>
                    {trashedFiles.map((file) => (
                        <div key={file.id} style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "12px", textAlign: "center" }}>
                            {file.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
