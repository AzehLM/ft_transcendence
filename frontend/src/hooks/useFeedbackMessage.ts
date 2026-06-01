import { useState, useCallback } from "react";

export type MessageType = "success" | "error" | "info";

export interface Message {
  id: string;
  message: string;
  type: MessageType;
  hiding?: boolean;
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((message: string, type: MessageType = "info", duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setMessages(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setMessages(prev =>
        prev.map(t => (t.id === id ? { ...t, hiding: true } : t))
      );
      setTimeout(() => {
        setMessages(prev => prev.filter(t => t.id !== id));
      }, 400);
    }, duration);

    return id;
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev =>
      prev.map(t => (t.id === id ? { ...t, hiding: true } : t))
    );
    setTimeout(() => {
      setMessages(prev => prev.filter(t => t.id !== id));
    }, 400);
  }, []);

  return { messages, addMessage, removeMessage };
}