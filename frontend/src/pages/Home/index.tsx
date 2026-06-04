import { NavBar } from "./NavBar";
import { HeroSection } from "./HeroSection";
import { SocialProof } from "./SocialProof";
import { Features } from "./Features";
import { CtaSection } from "./CtaSection";
import styles from "./home.module.css";

export default function HomePage() {
    return (
        <div className={styles.page}>
            <NavBar />
            <main className={styles.main}>
                <HeroSection />
                <SocialProof />
                <Features />
                <CtaSection />
            </main>
        </div>
    );
}
