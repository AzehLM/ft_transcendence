import { Search } from "lucide-react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
    placeholder?: string;
    onSearch?: (value: string) => void;
}

export function SearchBar({ placeholder = "Search", onSearch }: SearchBarProps) {
    return (
        <div className={styles.searchContainer}>
            <div className={styles.searchBox}>
                <Search className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder={placeholder}
                    className={styles.searchInput}
                    onChange={(e) => onSearch?.(e.target.value)}
                />
            </div>
        </div>
    );
}
