import { FileCard } from "../components/filecard"
import { ActionButtons } from "../components/actionbuttons"
import { ProfileDropdown } from "../components/profiledropdown"
import { LeftSidebar } from "../components/leftsidebar";
import { Search, User } from "lucide-react";
import { useState } from "react";
import styles from "../styles/dashboard.module.css";

export default function DashboardPage() {
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const files = [
        { id: 1, name: "January invoice" },
        { id: 2, name: "February report" },
        { id: 3, name: "March invoice" },
        { id: 4, name: "March report" },
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

            <ActionButtons />

            {/* Main content area */}
            <div className={styles.contentArea}>
                <h1 className={styles.title}>
                    Personnal space
                </h1>
                <h2 className={styles.subtitle}>
                    All files
                </h2>

                {/* Files grid */}
                <div className={styles.fileGrid}>
                    {files.map((file) => (
                        <FileCard key={file.id} name={file.name} />
                    ))}
                </div>
            </div>
        </div>
    );
}