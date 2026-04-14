import { FileCard } from "../components/filecard"
import { ActionButtons } from "../components/actionbuttons"
import { ProfileDropdown } from "../components/profiledropdown"
import { LeftSidebar } from "../components/leftsidebar";
import { SearchBar } from "../components/searchbar";
import { UserProfileButton } from "../components/userprofilebutton";
import { useState } from "react";
import styles from "../styles/dashboard.module.css";

export default function DashboardPage() {
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [files, setFiles] = useState([
        { id: 1, name: "January invoice" },
        { id: 2, name: "February report" },
        { id: 3, name: "March invoice" },
        { id: 4, name: "March report and invoice from Vic" },
    ]);

    const handleDelete = (fileName: string) => {
        // Move file to trash by removing it from the current list
        setFiles(files.filter(file => file.name !== fileName));
        // TODO: When DB is linked, move file to trash in the database instead
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

            <ActionButtons />

            {/* Main content area */}
            <div className={styles.contentArea}>
                <h1 className={styles.title}>
                    Personal space
                </h1>
                <h2 className={styles.subtitle}>
                    All files
                </h2>

                {/* Files grid */}
                <div className={styles.fileGrid}>
                    {files.map((file) => (
                        <FileCard key={file.id} name={file.name} isTrash={false} onDelete={handleDelete} />
                    ))}
                </div>
            </div>
        </div>
    );
}