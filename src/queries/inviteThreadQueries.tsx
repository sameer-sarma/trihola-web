// src/queries/inviteThreadQueries.ts
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInviteThread,
  postInviteThreadMessage,
  makeInviteThreadWebSocketUrl,
} from "../api/campaignapi";
import type {
  InviteThreadEventDTO,
  InviteThreadMessageReq,
} from "../types/invites";

// Optional: keep your keys in one place like you do for campaigns
export const inviteThreadKeys = {
  base: ["inviteThread"] as const,
  thread: (campaignId: string, inviteId: string) =>
    [...inviteThreadKeys.base, campaignId, inviteId] as const,
};

type InviteUpdatedMsgPayload = {
  type: "invite-updated";
  inviteId: string;
  payload?: Record<string, string>;
};

type UseInviteThreadOpts = {
  enabled?: boolean;
  // how many events to load at first; you can add pagination later
  initialLimit?: number;
  // NEW: callback when we receive an invite-updated WS message
  onInviteUpdated?: (msg: InviteUpdatedMsgPayload) => void;
};

/**
 * Hook that:
 * 1) loads the existing invite thread via HTTP
 * 2) opens a WebSocket for live events
 * 3) exposes a sendMessage helper
 */
export function useInviteThread(
  campaignId: string | undefined,
  inviteId: string | undefined,
  accessToken: string | null | undefined,
  opts: UseInviteThreadOpts = {}
) {
  const { enabled: enabledProp, initialLimit = 50, onInviteUpdated } = opts;

  const enabled =
    enabledProp ??
    (Boolean(campaignId) && Boolean(inviteId) && Boolean(accessToken));

  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 1) Load existing events
  const {
    data: events,
    isLoading,
    isFetching,
    error,
  } = useQuery<InviteThreadEventDTO[]>({
    queryKey:
      campaignId && inviteId
        ? inviteThreadKeys.thread(campaignId, inviteId)
        : inviteThreadKeys.base,
    enabled,
    queryFn: () =>
      getInviteThread(campaignId!, inviteId!, {
        limit: initialLimit,
      }),
    staleTime: 10_000,
  });

  // 2) Open WebSocket for live updates
  useEffect(() => {
    if (!enabled || !campaignId || !inviteId || !accessToken) return;

    const url = makeInviteThreadWebSocketUrl(
      campaignId,
      inviteId,
      accessToken
    );

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);

        // 1) invite-updated -> let caller refetch header etc.
        if (payload?.type === "invite-updated") {
          if (onInviteUpdated) {
            onInviteUpdated(payload as InviteUpdatedMsgPayload);
          }
          return;
        }

        // 2) typing frames (optional)
        if (payload?.type === "typing") {
          return;
        }

        // 3) Regular thread event
        const incoming = payload as InviteThreadEventDTO;

        queryClient.setQueryData<InviteThreadEventDTO[]>(
          inviteThreadKeys.thread(campaignId, inviteId),
          (old) => {
            const existing = old ?? [];
            if (existing.some((e) => e.id === incoming.id)) {
              return existing;
            }
            return [...existing, incoming].sort((a, b) =>
              a.createdAt.localeCompare(b.createdAt)
            );
          }
        );
      } catch (e) {
        console.warn("Failed to parse invite thread WS message", e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [
    enabled,
    campaignId,
    inviteId,
    accessToken,
    queryClient,
    onInviteUpdated, // ✅ now a proper dependency
  ]);

  // 3) send helpers
  const sendMessage = async (
    message: string,
    attachmentUrls?: string[] | null
  ) => {
    if (!campaignId || !inviteId || !accessToken) return;

    const trimmed = message.trim();
    if (!trimmed && (!attachmentUrls || attachmentUrls.length === 0)) return;

    const req: InviteThreadMessageReq = {
      message: trimmed,
      attachmentUrls:
        attachmentUrls && attachmentUrls.length > 0 ? attachmentUrls : undefined,
    };

    await postInviteThreadMessage(campaignId, inviteId, req);
  };

  const sendTyping = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "typing" }));
  };

  return {
    events: events ?? [],
    isLoading,
    isFetching,
    error,
    wsConnected,
    isSending: false,
    sendMessage,
    sendTyping,
  };
}