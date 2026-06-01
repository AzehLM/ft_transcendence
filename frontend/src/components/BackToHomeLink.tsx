import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../styles/legal.module.css";

export function BackToHomeLink() {
    return (
        <div style={{ marginBottom: "30px" }}>
            <Link to="/" className={styles.backLink}>
                <ArrowLeft size={16} /> Back to Home
            </Link>
        </div>
    );
}

export default BackToHomeLink;
