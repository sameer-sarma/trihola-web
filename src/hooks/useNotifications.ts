import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

export function useNotifications(limit = 20, offset = 0) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  // Always get token one time on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setToken(session?.access_token ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", { limit, offset }],
    enabled: !!token,                         // DO NOT run without token
    queryFn: () => fetchNotifications(limit, offset, token!),
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread-count"],
    enabled: !!token,                         // DO NOT run without token
    queryFn: () => fetchUnreadCount(token!),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  return {
    token,
    notifications: notificationsQuery.data?.items ?? [],
    unreadCount: unreadQuery.data ?? 0,
    loading: notificationsQuery.isLoading || unreadQuery.isLoading,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}
