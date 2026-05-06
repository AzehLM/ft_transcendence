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
                <input type="email" style={{ display: "none" }} />
                <Search className={styles.searchIcon} />
                <input
                    type="search"
                    name="search-ostrom"
                    placeholder={placeholder}
                    className={styles.searchInput}
                    autoComplete="off"
                    onChange={(e) => onSearch?.(e.target.value)}
                />
            </div>
        </div>
    );
}
