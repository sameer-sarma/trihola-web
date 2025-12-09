import React, { ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

type NotificationsWSProviderProps = {
  children: ReactNode;
};

export const NotificationsWSProvider: React.FC<NotificationsWSProviderProps> = ({
  children,
}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    (async () => {
      // 1) Get access token from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      const token = session?.access_token;
      if (!token) {
        return;
      }

      // 2) Build WS URL
      // Example: VITE_KTOR_WS_BASE = "ws://127.0.0.1:8080"
      const base = import.meta.env.VITE_WS_BASE as string;

      const url = `${base}/notifications/ws?token=${encodeURIComponent(token)}`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        // console.log("Notifications WS connected");
      };

      ws.onmessage = (event) => {
        try {
          // You’re currently sending raw NotificationDTO from Ktor.
          // If you later wrap it, adjust this parsing.
          JSON.parse(event.data);

          // Optional toast:
          // toast(payload.title, { description: payload.body });

          // 3) Keep queries in sync
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        } catch (e) {
          console.error("Invalid notification WS payload", e);
        }
      };

      ws.onerror = (err) => {
        console.error("Notifications WS error", err);
      };

      ws.onclose = () => {
        // console.log("Notifications WS closed");
      };
    })();

    return () => {
      cancelled = true;
      if (ws) {
        ws.close();
      }
    };
  }, [queryClient]);

  return <>{children}</>;
};
