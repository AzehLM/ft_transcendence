import styles from "./FeedbackMessageContainer.module.css";
import { Message } from "../../hooks/useFeedbackMessage";

interface FeedbackMessageProps {
  messages: Message[];
  onRemove: (id: string) => void;
}

const icons = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.3"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.3"/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.3"/>
      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

export function FeedbackMessageContainer({ messages, onRemove }: FeedbackMessageProps) {
  if (messages.length === 0) return null;

  return (
    <div className={styles.container}>
      {messages.map(message => (
        <div
          key={message.id}
          className={`${styles.message} ${styles[message.type]} ${message.hiding ? styles.hiding : ""}`}
        >
          <span className={styles.icon}>{icons[message.type]}</span>
          <span className={styles.text}>{message.message}</span>
          <button
            className={styles.close}
            onClick={() => onRemove(message.id)}
            aria-label="Fermer"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
