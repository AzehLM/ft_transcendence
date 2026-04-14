import { FileCard } from "../components/filecard"
import { ProfileDropdown } from "../components/profiledropdown"
import { LeftSidebar } from "../components/leftsidebar";
import { SearchBar } from "../components/searchbar";
import { UserProfileButton } from "../components/userprofilebutton";
import { useState } from "react";
import styles from "../styles/dashboard.module.css";

export default function TrashPage() {
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [trashedFiles, setTrashedFiles] = useState([
        { id: 1, name: "Deleted document" },
        { id: 2, name: "Old report" },
    ]);

    const handlePermanentDelete = (fileName: string) => {
        // Permanently delete file from trash
        setTrashedFiles(trashedFiles.filter(file => file.name !== fileName));
        // TODO: When DB is linked, permanently delete file from the database
    };

    return (
        <div className={styles.page}>
            <LeftSidebar foldersExpanded={foldersExpanded} setFoldersExpanded={setFoldersExpanded} />

            <SearchBar />

            <UserProfileButton
                isOpen={profileDropdownOpen}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            />

            <ProfileDropdown isOpen={profileDropdownOpen} onClose={() => setProfileDropdownOpen(false)} />

            {/* Main content area - positioned higher without action buttons */}
            <div className={styles.contentAreaNoButtons}>
                <h1 className={styles.title}>
                    Trash
                </h1>
                <h2 className={styles.subtitle}>
                    Deleted items
                </h2>

                {/* Files grid */}
                <div className={styles.fileGrid}>
                    {trashedFiles.map((file) => (
                        <FileCard key={file.id} name={file.name} isTrash={true} onDelete={handlePermanentDelete} />
                    ))}
                </div>
            </div>
        </div>
    );
}
