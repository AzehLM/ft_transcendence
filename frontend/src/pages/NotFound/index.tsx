import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, cubicBezier } from "framer-motion";
import styles from "./NotFound.module.css";

const P = "#de7356";
const D = "#2b1008"; 

const CHARSET = "01█▓░▒╔╗╚╝║═!@#$%ABCDEF?><~";
const rchar = () => CHARSET[~~(Math.random() * CHARSET.length)];


function BinaryField({ count = 55 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, id) => ({
      id,
      x: Math.random() * 96 + 2,
      y: Math.random() * 96 + 2,
      fontSize: [10, 11, 12, 13][~~(Math.random() * 4)],
      maxOpacity: Math.random() * 0.22 + 0.04,
      accent: Math.random() > 0.88,
      pFlip: 120 / (250 + Math.random() * 700),
      pBlink: 120 / (1200 + Math.random() * 3500),
    })), [count]);

  const [states, setStates] = useState(() =>
    particles.map(() => ({
      val: Math.random() > 0.5 ? "1" : "0",
      visible: Math.random() > 0.35,
    }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setStates(prev => prev.map((s, i) => {
        const p = particles[i];
        return {
          val: Math.random() < p.pFlip ? (s.val === "0" ? "1" : "0") : s.val,
          visible: Math.random() < p.pBlink ? !s.visible : s.visible,
        };
      }));
    }, 120);
    return () => clearInterval(id);
  }, [particles]);

  return (
    <div aria-hidden className={styles.binaryField}>
      {particles.map((p, i) => (
        <span
          key={p.id}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.fontSize,
            color: p.accent ? P : D,
            opacity: states[i].visible ? p.maxOpacity : 0,
          }}
          className={styles.particle}
        >
          {states[i].val}
        </span>
      ))}
    </div>
  );
}

function useScramble(target: string, delay = 0, duration = 1000) {
  const [out, setOut] = useState(() =>
    [...target].map(c => (c === " " ? " " : rchar())).join("")
  );

  useEffect(() => {
    let raf: number;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) { raf = requestAnimationFrame(tick); return; }
      const progress = Math.min((now - t0) / duration, 1);
      const resolved = Math.floor(progress * target.length);
      setOut([...target].map((c, i) => (c === " " ? " " : i < resolved ? c : rchar())).join(""));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay, duration]);

  return out;
}


export default function NotFound() {
  const navigate = useNavigate();
  const badge = useScramble("ERR_404  ·  RESOURCE_NOT_FOUND", 80, 900);
  const title = useScramble("Page introuvable", 550, 1100);

  const up = (delay: number, y = 8) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: cubicBezier(0.16, 1, 0.3, 1) },
  });

  return (
    <div className={styles.container}>
      <BinaryField count={55} />

      <motion.div aria-hidden className={styles.ghostWrapper} initial={{ opacity: 0 }} animate={{ opacity: 0.04 }} transition={{ duration: 1.4 }}>
        <span className={styles.glitch} data-text="404">404</span>
      </motion.div>

      <div className={styles.content}>
        <motion.div {...up(0.08, 4)} className={styles.errorBadge}>
          <span className={styles.terminalPrompt}>$</span>
          <span>{badge}</span>
          <span className={styles.cursor}>▌</span>
        </motion.div>

        <motion.h1 {...up(0.25, 8)} className={styles.mainTitle}>{title}</motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.48 }} transition={{ delay: 1.4, duration: 0.7 }} className={styles.description}>
          La page que vous recherchez semble avoir été déplacée, supprimée ou n'a jamais existé.
        </motion.p>

        <motion.div {...up(1.6, 6)}>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            ← Retourner à l'accueil
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.18 }} transition={{ delay: 2.0, duration: 0.8 }} className={styles.cryptoFooter}>
          {["AES-256-GCM", "·", "Argon2id", "·", "ECDH", "·", "E2EE"].map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}