// src/context/NotificationsWSProvider.tsx
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export type NotificationDTO = {
  id?: string;
  userId?: string;
  kind?: string;
  title?: string;
  body?: string;
  contextType?: string | null;
  contextId?: string | null;
  contextSlug?: string | null;
  createdAt?: string;
  readAt?: string | null;
  metadata?: any;
};

type NotificationsWSState = {
  connected: boolean;
  seq: number;
  lastNotification: NotificationDTO | null;
};

const NotificationsWSCtx = createContext<NotificationsWSState>({
  connected: false,
  seq: 0,
  lastNotification: null,
});

export function useNotificationsWS() {
  return useContext(NotificationsWSCtx);
}

type NotificationsWSProviderProps = {
  children: ReactNode;
};

export const NotificationsWSProvider: React.FC<NotificationsWSProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  const [connected, setConnected] = useState(false);
  const [seq, setSeq] = useState(0);
  const [lastNotification, setLastNotification] = useState<NotificationDTO | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const cancelledRef = useRef(false);
  const connectingRef = useRef(false);
  const currentTokenRef = useRef<string | null>(null);

  const closeWs = useCallback((code?: number, reason?: string) => {
    const ws = wsRef.current;
    wsRef.current = null;
    connectingRef.current = false;

    if (ws) {
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close(code, reason);
      } catch {
        // ignore
      }
    }

    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (cancelledRef.current || connectingRef.current) return;

    connectingRef.current = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelledRef.current) {
        connectingRef.current = false;
        return;
      }

      const token = session?.access_token ?? null;

      // No token: ensure socket is closed and stop here.
      if (!token) {
        currentTokenRef.current = null;
        closeWs();
        return;
      }

      // If we already have an open socket for the same token, do nothing.
      const existing = wsRef.current;
      if (
        existing &&
        existing.readyState === WebSocket.OPEN &&
        currentTokenRef.current === token
      ) {
        connectingRef.current = false;
        setConnected(true);
        return;
      }

      // Replace any existing socket before opening a new one.
      closeWs();

      const base = import.meta.env.VITE_WS_BASE as string;
      const url = `${base}/notifications/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);

      wsRef.current = ws;
      currentTokenRef.current = token;

      ws.onopen = () => {
        // Ignore stale socket callbacks
        if (cancelledRef.current || wsRef.current !== ws) return;
        connectingRef.current = false;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (cancelledRef.current || wsRef.current !== ws) return;

        try {
          const payload = JSON.parse(event.data) as NotificationDTO;

          setLastNotification(payload);
          setSeq((n) => n + 1);

          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        } catch (e) {
          console.error("Invalid notification WS payload", e);
        }
      };

      ws.onerror = (err) => {
        if (wsRef.current !== ws) return;
        console.error("Notifications WS error", err);
      };

      ws.onclose = () => {
        if (cancelledRef.current || wsRef.current !== ws) return;

        wsRef.current = null;
        connectingRef.current = false;
        setConnected(false);
      };
    } catch (e) {
      connectingRef.current = false;
      console.error("Failed to connect notifications websocket", e);
      setConnected(false);
    }
  }, [closeWs, queryClient]);

  useEffect(() => {
    cancelledRef.current = false;

    connect();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextToken = session?.access_token ?? null;

      // Only reconnect if the token actually changed.
      if (nextToken !== currentTokenRef.current) {
        void connect();
      } else if (!nextToken) {
        closeWs();
      }
    });

    return () => {
      cancelledRef.current = true;
      sub.subscription.unsubscribe();
      closeWs();
    };
  }, [connect, closeWs]);

  const value = useMemo(
    () => ({
      connected,
      seq,
      lastNotification,
    }),
    [connected, seq, lastNotification]
  );

  return <NotificationsWSCtx.Provider value={value}>{children}</NotificationsWSCtx.Provider>;
};