// src/hooks/useNotifications.ts
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

  // Get token once on mount and keep it in sync with auth changes
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Failed to get session for notifications", error);
        if (!cancelled) setToken(null);
        return;
      }
      if (!cancelled) {
        setToken(data.session?.access_token ?? null);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setToken(session?.access_token ?? null);

        // Clear old data when user changes
        queryClient.removeQueries({ queryKey: ["notifications"] });
        queryClient.removeQueries({ queryKey: ["notifications-unread-count"] });
      }
    );

    return () => {
      cancelled = true;
      authListener?.subscription.unsubscribe();
    };
  }, [queryClient]);

  const enabled = !!token;

  const notificationsQuery = useQuery({
    queryKey: ["notifications", { limit, offset }],
    queryFn: () => fetchNotifications(limit, offset, token!),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => fetchUnreadCount(token!),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  return {
    token,
    notifications: notificationsQuery.data?.items ?? [],
    unreadCount: unreadQuery.data ?? 0,
    loading: notificationsQuery.isLoading || unreadQuery.isLoading,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
    isMarkingRead: markRead.isPending,
    isMarkingAllRead: markAllRead.isPending,
  };
}
