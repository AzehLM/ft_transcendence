import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { fetchWithRefresh } from "../services/api.service";


export interface NotificationItem {
  id: string;
  event: string;
  message: string;
  data?: unknown;
  timestamp: Date;
  isRead: boolean;
}

export interface ToastItem {
  id: string;
  event: string;
  message: string;
  data?: unknown;
}

type ListenerCallback = (data: unknown) => void;

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastItem[];
  status: "connecting" | "connected" | "disconnected";
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  removeToast: (id: string) => void;
  registerListener: (event: string, callback: ListenerCallback) => void;
  unregisterListener: (event: string, callback: ListenerCallback) => void;
  reconnect: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return [];
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<{ [event: string]: Set<ListenerCallback> }>({});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);

  const reconnectRef = useRef<() => void>(() => {});

  const registerListener = useCallback((event: string, callback: ListenerCallback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = new Set();
    }
    listenersRef.current[event].add(callback);
  }, []);

  const unregisterListener = useCallback((event: string, callback: ListenerCallback) => {
    if (listenersRef.current[event]) {
      listenersRef.current[event].delete(callback);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("disconnected");
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    setStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        const eventType = payload.event || payload.type || "UNKNOWN";
        const actorId = payload.data?.actor_id || payload.data?.user_id || payload.data?.owner_id;
        const isActorMe = currentUserIdRef.current && actorId && currentUserIdRef.current.toLowerCase() === actorId.toLowerCase();

        const isTechnicalEvent = eventType === "USER_ONLINE" || eventType === "USER_OFFLINE" || eventType === "USER_PROFILE_UPDATED";
        const shouldNotify = eventType !== "file_moved" && eventType !== "folder_moved";

        if (!isActorMe && !isTechnicalEvent && shouldNotify) {
          const newNotification: NotificationItem = {
            id: crypto.randomUUID(),
            event: eventType,
            message: payload.message || "New event received",
            data: payload.data,
            timestamp: new Date(),
            isRead: false,
          };

          setNotifications((prev) => [newNotification, ...prev]);

          const newToast: ToastItem = {
            id: newNotification.id,
            event: newNotification.event,
            message: newNotification.message,
            data: newNotification.data,
          };
          setToasts((prev) => [...prev, newToast]);
        }

        if (eventType && listenersRef.current[eventType]) {
          const callbacks = Array.from(listenersRef.current[eventType]);
          callbacks.forEach((cb) => {
            try {
              cb(payload.data);
            } catch (err) {
              console.error("[WS] Error in event listener callback:", err);
            }
          });
        }

        if (eventType === "ADDED_TO_NEW_ORGA" || eventType === "REMOVED_FROM_ORGA") {
          setTimeout(() => {
            reconnectRef.current();
          }, 100);
        }
      } catch (err) {
        console.error("[WS] Failed to parse websocket message:", err, event.data);
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;

      if (localStorage.getItem("token")) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] Error encountered:", error);
    };
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    reconnectRef.current = reconnect;
  }, [reconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    connect();

    const token = localStorage.getItem("token");
    if (token) {
      fetchWithRefresh("/api/auth/me")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          currentUserIdRef.current = data.id;
        })
        .catch((err) => {
          console.error("[WS] Failed to fetch user profile for filtering:", err);
        });
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        if (e.newValue) {
          connect();
          fetchWithRefresh("/api/auth/me")
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error();
            })
            .then((data) => {
              currentUserIdRef.current = data.id;
            })
            .catch((err) => {
              console.error("[WS] Failed to fetch user profile for filtering:", err);
            });
        } else {
          disconnect();
          currentUserIdRef.current = null;
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      disconnect();
    };
  }, [connect, disconnect]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    toasts,
    status,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    removeToast,
    registerListener,
    unregisterListener,
    reconnect,
  }), [
    notifications,
    unreadCount,
    toasts,
    status,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    removeToast,
    registerListener,
    unregisterListener,
    reconnect,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
