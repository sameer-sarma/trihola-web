// src/context/ThreadStoreContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../supabaseClient";

import {
  listMyThreads,
  getThreadParticipants,
  listThreadActivities,
} from "../services/threadService";

import type {
  ThreadSummaryDTO,
  ThreadParticipantDTO,
  ThreadActivityDTO,
  ThreadCtaBroadcastDTO,
  ThreadBroadcastDTO,
  UUID,
} from "../types/threads";

type ThreadId = string;
type AsType = "USER" | "BUSINESS";

export type ThreadScope = { asType: AsType; asId: UUID };

type ScopeKey = string; // `${asType}:${asId}`

type ScopeState = {
  threads: ThreadSummaryDTO[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  offset: number;
};

type ThreadStore = {
  selectedScope: ThreadScope | null;
  setSelectedScope: (scope: ThreadScope | null) => void;

  getThreadsFor: (scope: ThreadScope) => ThreadSummaryDTO[];
  getLoadingFor: (scope: ThreadScope) => boolean;
  getLoadingMoreFor: (scope: ThreadScope) => boolean;
  getHasMoreFor: (scope: ThreadScope) => boolean;

  refreshThreadsFor: (scope: ThreadScope, limit?: number) => Promise<void>;
  loadMoreThreadsFor: (scope: ThreadScope, limit?: number) => Promise<void>;

  participantsByThreadId: Map<ThreadId, ThreadParticipantDTO[]>;
  activitiesByThreadId: Map<ThreadId, ThreadActivityDTO[]>;

  ctasByThreadId: Map<ThreadId, ThreadCtaBroadcastDTO[]>;
  setCtas: (threadId: ThreadId, ctas: ThreadCtaBroadcastDTO[]) => void;
  upsertCta: (threadId: ThreadId, cta: ThreadCtaBroadcastDTO) => void;
  removeCta: (threadId: ThreadId, ctaId: UUID) => void;

  hydrateThread: (threadId: ThreadId, limit?: number) => Promise<void>;
  setParticipants: (threadId: ThreadId, participants: ThreadParticipantDTO[]) => void;
  setActivities: (threadId: ThreadId, activities: ThreadActivityDTO[]) => void;
  appendActivity: (threadId: ThreadId, a: ThreadActivityDTO) => void;

  ensureThreadWS: (threadId: ThreadId) => Promise<void>;
  closeThreadWS: (threadId: ThreadId) => void;
  closeAllThreadWS: () => void;

  upsertThreadSummary: (t: ThreadSummaryDTO) => void;

  contextVersionByThreadId: Map<ThreadId, number>;
  bumpContextVersion: (threadId: ThreadId) => void;
};

const Ctx = createContext<ThreadStore>({
  selectedScope: null,
  setSelectedScope: () => {},
  getThreadsFor: () => [],
  getLoadingFor: () => false,
  getLoadingMoreFor: () => false,
  getHasMoreFor: () => false,

  ctasByThreadId: new Map(),
  setCtas: () => {},
  upsertCta: () => {},
  removeCta: () => {},

  refreshThreadsFor: async () => {},
  loadMoreThreadsFor: async () => {},

  participantsByThreadId: new Map(),
  activitiesByThreadId: new Map(),

  hydrateThread: async () => {},
  setParticipants: () => {},
  setActivities: () => {},
  appendActivity: () => {},

  ensureThreadWS: async () => {},
  closeThreadWS: () => {},
  closeAllThreadWS: () => {},

  upsertThreadSummary: () => {},
  contextVersionByThreadId: new Map(),
  bumpContextVersion: () => {},
});

const WS_BASE = import.meta.env.VITE_WS_BASE as string;
const SELECTED_SCOPE_KEY = "threads.selectedScope.v1";

async function getToken(): Promise<string | null> {
  const session = (await supabase.auth.getSession()).data.session;
  return session?.access_token ?? null;
}

function scopeKey(scope: ThreadScope): ScopeKey {
  return `${scope.asType}:${String(scope.asId)}`;
}

function sortThreads(list: ThreadSummaryDTO[]) {
  return [...list].sort((a: any, b: any) => {
    const aa = (a.lastMessageAt ?? a.updatedAt ?? "") as string;
    const bb = (b.lastMessageAt ?? b.updatedAt ?? "") as string;
    return String(bb).localeCompare(String(aa));
  });
}

function getActivityTimeValue(a: any): number {
  const raw = a?.updatedAt ?? a?.createdAt ?? a?.timestamp ?? "";
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : 0;
}

function sortActivities(list: ThreadActivityDTO[]) {
  return [...list].sort((a: any, b: any) => {
    const diff = getActivityTimeValue(a) - getActivityTimeValue(b);
    if (diff !== 0) return diff;

    const aid = String((a as any)?.id ?? "");
    const bid = String((b as any)?.id ?? "");
    return aid.localeCompare(bid);
  });
}

function mergeUnique(prev: ThreadSummaryDTO[], next: ThreadSummaryDTO[]) {
  const seen = new Set(prev.map((t) => String(t.threadId)));
  const merged = [...prev];
  for (const r of next) {
    const id = String(r.threadId);
    if (!seen.has(id)) merged.push(r);
  }
  return merged;
}

function safeJsonParse(s: string): any | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function loadSelectedScope(): ThreadScope | null {
  try {
    const raw = localStorage.getItem(SELECTED_SCOPE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const asType = String(obj?.asType ?? "").toUpperCase();
    const asId = String(obj?.asId ?? "").trim();
    if ((asType !== "USER" && asType !== "BUSINESS") || !asId) return null;
    return { asType: asType as AsType, asId: asId as any };
  } catch {
    return null;
  }
}

function persistSelectedScope(scope: ThreadScope | null) {
  try {
    if (!scope) localStorage.removeItem(SELECTED_SCOPE_KEY);
    else localStorage.setItem(SELECTED_SCOPE_KEY, JSON.stringify(scope));
  } catch {
    // ignore storage errors
  }
}

function unwrapWsPayload(obj: any): any | null {
  if (!obj) return null;
  if (obj.data && typeof obj.data === "object") return obj.data;
  return obj;
}

function isThreadBroadcastDTO(obj: any): obj is ThreadBroadcastDTO {
  return !!obj && typeof obj === "object" && typeof obj.eventType === "string" && !!obj.threadId;
}

/*function summarizeWsPayload(payload: any) {
  return {
    eventType: payload?.eventType ?? null,
    threadId: payload?.threadId ?? null,
    hasActivity: !!payload?.activity,
    activityId: payload?.activity?.id ?? null,
    activityType: payload?.activity?.type ?? null,

    hasCta: !!payload?.cta,
    ctaId: payload?.cta?.id ?? payload?.ctaId ?? null,
    ctaState: payload?.cta?.state ?? null,

    hasReferral: !!payload?.referral,
    referralId: payload?.referral?.referralId ?? null,
    referralSlug: payload?.referral?.referralSlug ?? null,
    referralStatus: payload?.referral?.status ?? null,
    targetAcceptanceStatus: payload?.referral?.targetAcceptanceStatus ?? null,
    prospectAcceptanceStatus: payload?.referral?.prospectAcceptanceStatus ?? null,

    hasParticipantSnapshot: !!payload?.participantSnapshot,
    participantCount: Array.isArray(payload?.participantSnapshot?.items)
      ? payload.participantSnapshot.items.length
      : Array.isArray(payload?.participants)
      ? payload.participants.length
      : null,

    activeCtaCount: payload?.activeCtaCount ?? null,
    contextInvalidated: payload?.contextInvalidated ?? null,
    occurredAt: payload?.occurredAt ?? null,
  };
}
*/

function sameParticipants(
  a?: ThreadParticipantDTO[],
  b?: ThreadParticipantDTO[]
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const aa: any = a[i];
    const bb: any = b[i];
    if (
      String(aa?.participantType ?? "") !== String(bb?.participantType ?? "") ||
      String(aa?.participantId ?? "") !== String(bb?.participantId ?? "") ||
      String(aa?.role ?? "") !== String(bb?.role ?? "") ||
      String(aa?.state ?? "") !== String(bb?.state ?? "") ||
      String(aa?.referralRole ?? "") !== String(bb?.referralRole ?? "") ||
      String(aa?.joinedAt ?? "") !== String(bb?.joinedAt ?? "") ||
      String(aa?.leftAt ?? "") !== String(bb?.leftAt ?? "")
    ) {
      return false;
    }
  }
  return true;
}

function sameActivities(
  a?: ThreadActivityDTO[],
  b?: ThreadActivityDTO[]
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const aa: any = a[i];
    const bb: any = b[i];
    if (
      String(aa?.id ?? i) !== String(bb?.id ?? i) ||
      String(aa?.updatedAt ?? aa?.createdAt ?? aa?.timestamp ?? "") !==
        String(bb?.updatedAt ?? bb?.createdAt ?? bb?.timestamp ?? "") ||
      String(aa?.type ?? aa?.activityType ?? "") !==
        String(bb?.type ?? bb?.activityType ?? "")
    ) {
      return false;
    }
  }
  return true;
}

function sameCtas(
  a?: ThreadCtaBroadcastDTO[],
  b?: ThreadCtaBroadcastDTO[]
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const aa: any = a[i];
    const bb: any = b[i];
    if (
      String(aa?.id ?? i) !== String(bb?.id ?? i) ||
      String(aa?.updatedAt ?? aa?.createdAt ?? "") !==
        String(bb?.updatedAt ?? bb?.createdAt ?? "") ||
      String(aa?.state ?? "") !== String(bb?.state ?? "")
    ) {
      return false;
    }
  }
  return true;
}

function sameThreadSummary(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    String(a.threadId ?? "") === String(b.threadId ?? "") &&
    String(a.updatedAt ?? "") === String(b.updatedAt ?? "") &&
    String(a.lastMessageAt ?? "") === String(b.lastMessageAt ?? "") &&
    String(a.lastMessagePreview ?? "") === String(b.lastMessagePreview ?? "") &&
    Number(a.activeCtaCount ?? 0) === Number(b.activeCtaCount ?? 0) &&
    String(a.status ?? "") === String(b.status ?? "") &&
    String(a.title ?? "") === String(b.title ?? "")
  );
}

function sameThreadList(a?: ThreadSummaryDTO[], b?: ThreadSummaryDTO[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (!sameThreadSummary(a[i], b[i])) return false;
  }
  return true;
}

export const ThreadStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scopes, setScopes] = useState<Record<ScopeKey, ScopeState>>({});
  const [selectedScope, _setSelectedScope] = useState<ThreadScope | null>(() => loadSelectedScope());

  const [participantsByThreadId, setParticipantsByThreadId] = useState(
    () => new Map<ThreadId, ThreadParticipantDTO[]>()
  );

  const [activitiesByThreadId, setActivitiesByThreadId] = useState(
    () => new Map<ThreadId, ThreadActivityDTO[]>()
  );

  const [ctasByThreadId, setCtasByThreadId] = useState(
    () => new Map<ThreadId, ThreadCtaBroadcastDTO[]>()
  );

  const [contextVersionByThreadId, setContextVersionByThreadId] = useState(
    () => new Map<ThreadId, number>()
  );

  const wsByThreadIdRef = useRef<Map<ThreadId, WebSocket>>(new Map());
  const wsClosingRef = useRef<Set<ThreadId>>(new Set());
  const wsRetryTimerRef = useRef<Map<ThreadId, number>>(new Map());
  const wsRetryCountRef = useRef<Map<ThreadId, number>>(new Map());
  const wsConnectPromiseRef = useRef<Map<ThreadId, Promise<void>>>(new Map());

  const setSelectedScope = useCallback((scope: ThreadScope | null) => {
    _setSelectedScope((prev) => {
      const prevKey = prev ? `${prev.asType}:${String(prev.asId)}` : "";
      const nextKey = scope ? `${scope.asType}:${String(scope.asId)}` : "";

      if (prevKey === nextKey) return prev;

      persistSelectedScope(scope);
      return scope;
    });
  }, []);

  const getScope = useCallback(
    (scope: ThreadScope): ScopeState => {
      const k = scopeKey(scope);
      return (
        scopes[k] ?? {
          threads: [],
          loading: false,
          loadingMore: false,
          hasMore: true,
          offset: 0,
        }
      );
    },
    [scopes]
  );

  const setScope = useCallback(
    (scope: ThreadScope, patch: Partial<ScopeState> | ((prev: ScopeState) => ScopeState)) => {
      const k = scopeKey(scope);

      setScopes((prev) => {
        const cur = prev[k] ?? {
          threads: [],
          loading: false,
          loadingMore: false,
          hasMore: true,
          offset: 0,
        };

        const next = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };

        if (
          cur === next ||
          (
            cur.loading === next.loading &&
            cur.loadingMore === next.loadingMore &&
            cur.hasMore === next.hasMore &&
            cur.offset === next.offset &&
            sameThreadList(cur.threads, next.threads)
          )
        ) {
          return prev;
        }

        return { ...prev, [k]: next };
      });
    },
    []
  );

  const getThreadsFor = useCallback(
    (scope: ThreadScope) => getScope(scope).threads,
    [getScope]
  );

  const getLoadingFor = useCallback(
    (scope: ThreadScope) => getScope(scope).loading,
    [getScope]
  );

  const getLoadingMoreFor = useCallback(
    (scope: ThreadScope) => getScope(scope).loadingMore,
    [getScope]
  );

  const getHasMoreFor = useCallback(
    (scope: ThreadScope) => getScope(scope).hasMore,
    [getScope]
  );

  const bumpContextVersion = useCallback((threadId: ThreadId) => {
    const id = String(threadId);

    setContextVersionByThreadId((prev) => {
      const next = new Map(prev);
      next.set(id, (prev.get(id) ?? 0) + 1);
      return next;
    });
  }, []);

  const refreshThreadsFor = useCallback(
    async (scope: ThreadScope, limit = 30) => {
      setScope(scope, { loading: true });

      try {
        const token = await getToken();
        if (!token) {
          setScope(scope, { loading: false, loadingMore: false });
          return;
        }

        const rows = await listMyThreads(token, {
          limit,
          offset: 0,
          identity: { asType: scope.asType, asId: scope.asId } as any,
        });

        const sorted = sortThreads(rows);

        setScope(scope, (prev) => {
          const next: ScopeState = {
            ...prev,
            threads: sorted,
            offset: rows.length,
            hasMore: rows.length === limit,
            loading: false,
            loadingMore: false,
          };

          if (
            prev.loading === next.loading &&
            prev.loadingMore === next.loadingMore &&
            prev.hasMore === next.hasMore &&
            prev.offset === next.offset &&
            sameThreadList(prev.threads, next.threads)
          ) {
            return prev;
          }

          return next;
        });
      } catch {
        setScope(scope, { loading: false, loadingMore: false });
        throw new Error("Failed to load threads.");
      }
    },
    [setScope]
  );

  const loadMoreThreadsFor = useCallback(
    async (scope: ThreadScope, limit = 30) => {
      const cur = getScope(scope);
      if (cur.loading || cur.loadingMore || !cur.hasMore) return;

      setScope(scope, { loadingMore: true });

      try {
        const token = await getToken();
        if (!token) {
          setScope(scope, { loadingMore: false });
          return;
        }

        const rows = await listMyThreads(token, {
          limit,
          offset: cur.offset,
          identity: { asType: scope.asType, asId: scope.asId } as any,
        });

        setScope(scope, (prev) => {
          const merged = sortThreads(mergeUnique(prev.threads, rows));
          const next: ScopeState = {
            ...prev,
            threads: merged,
            offset: prev.offset + rows.length,
            hasMore: rows.length === limit,
            loadingMore: false,
          };

          if (
            prev.loading === next.loading &&
            prev.loadingMore === next.loadingMore &&
            prev.hasMore === next.hasMore &&
            prev.offset === next.offset &&
            sameThreadList(prev.threads, next.threads)
          ) {
            return prev;
          }

          return next;
        });
      } catch {
        setScope(scope, { loadingMore: false });
        throw new Error("Failed to load more threads.");
      }
    },
    [getScope, setScope]
  );

  const upsertThreadSummary = useCallback((t: ThreadSummaryDTO) => {
    const id = String(t.threadId);

    setScopes((prev) => {
      let changed = false;
      const next: Record<ScopeKey, ScopeState> = { ...prev };

      for (const k of Object.keys(next)) {
        const s = next[k];
        const idx = s.threads.findIndex((x) => String(x.threadId) === id);
        if (idx === -1) continue;

        const existing = s.threads[idx];
        const updated = { ...existing, ...t };

        if (sameThreadSummary(existing, updated)) continue;

        const copy = s.threads.slice();
        copy[idx] = updated;
        next[k] = { ...s, threads: sortThreads(copy) };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, []);

  const setParticipants = useCallback((threadId: ThreadId, participants: ThreadParticipantDTO[]) => {
    const id = String(threadId);

    setParticipantsByThreadId((prev) => {
      const cur = prev.get(id);
      if (sameParticipants(cur, participants)) return prev;

      const next = new Map(prev);
      next.set(id, participants);
      return next;
    });
  }, []);

  const setActivities = useCallback((threadId: ThreadId, activities: ThreadActivityDTO[]) => {
    const id = String(threadId);
    const sorted = sortActivities(activities ?? []);

    setActivitiesByThreadId((prev) => {
      const cur = prev.get(id);
      if (sameActivities(cur, sorted)) return prev;

      const next = new Map(prev);
      next.set(id, sorted);
      return next;
    });
  }, []);

  const setCtas = useCallback((threadId: ThreadId, ctas: ThreadCtaBroadcastDTO[]) => {
    const id = String(threadId);

    setCtasByThreadId((prev) => {
      const cur = prev.get(id);
      if (sameCtas(cur, ctas)) return prev;

      const next = new Map(prev);
      next.set(id, ctas);
      return next;
    });
  }, []);

  const upsertCta = useCallback((threadId: ThreadId, cta: ThreadCtaBroadcastDTO) => {
    const id = String(threadId);
    const ctaId = String(cta.id);

    setCtasByThreadId((prev) => {
      const list = prev.get(id) ?? [];
      const idx = list.findIndex((x) => String(x.id) === ctaId);

      if (idx === -1) {
        const next = new Map(prev);
        next.set(id, [cta, ...list]);
        return next;
      }

      const cur = list[idx] as any;
      if (
        cur === cta ||
        (
          String(cur?.updatedAt ?? cur?.createdAt ?? "") ===
            String((cta as any)?.updatedAt ?? (cta as any)?.createdAt ?? "") &&
          String(cur?.state ?? "") === String((cta as any)?.state ?? "")
        )
      ) {
        return prev;
      }

      const copy = list.slice();
      copy[idx] = cta;
      const next = new Map(prev);
      next.set(id, copy);
      return next;
    });
  }, []);

  const removeCta = useCallback((threadId: ThreadId, ctaId: UUID) => {
    const id = String(threadId);
    const targetId = String(ctaId);

    setCtasByThreadId((prev) => {
      const list = prev.get(id) ?? [];
      const filtered = list.filter((x) => String(x.id) !== targetId);
      if (filtered.length === list.length) return prev;

      const next = new Map(prev);
      next.set(id, filtered);
      return next;
    });
  }, []);

  const appendActivity = useCallback((threadId: ThreadId, a: ThreadActivityDTO) => {
    const id = String(threadId);

    const maybeUpdatedAt =
      (a as any).updatedAt ??
      (a as any).createdAt ??
      (a as any).timestamp ??
      null;

    const maybePreview =
      (a as any).preview ??
      (a as any).content ??
      null;

    let wasAdded = false;

    setActivitiesByThreadId((prev) => {
      const list = prev.get(id) ?? [];

      const aid = String((a as any).id ?? "");
      const ts = String(
        (a as any).updatedAt ??
        (a as any).createdAt ??
        (a as any).timestamp ??
        ""
      );
      const type = String((a as any).type ?? (a as any).activityType ?? "");
      const content = String((a as any).content ?? "");

      const exists = list.some((x: any) => {
        const xid = String((x as any).id ?? "");
        if (aid && xid && xid === aid) return true;

        return (
          !aid &&
          String(
            (x as any).updatedAt ??
              (x as any).createdAt ??
              (x as any).timestamp ??
              ""
          ) === ts &&
          String((x as any).type ?? (x as any).activityType ?? "") === type &&
          String((x as any).content ?? "") === content
        );
      });

      if (exists) return prev;

      wasAdded = true;

      const next = new Map(prev);
      next.set(id, sortActivities([...list, a]));
      return next;
    });

    if (!wasAdded) return;

    if (maybeUpdatedAt || maybePreview) {
      setScopes((prev) => {
        let changed = false;
        const next: Record<ScopeKey, ScopeState> = { ...prev };

        for (const k of Object.keys(next)) {
          const s = next[k];
          const idx = s.threads.findIndex((x) => String(x.threadId) === id);
          if (idx === -1) continue;

          const cur = s.threads[idx] as any;
          const updated: ThreadSummaryDTO = {
            ...cur,
            lastMessageAt: maybeUpdatedAt ?? cur.lastMessageAt,
            lastMessagePreview: maybePreview ?? cur.lastMessagePreview,
            updatedAt: maybeUpdatedAt ?? cur.updatedAt,
          } as any;

          if (sameThreadSummary(cur, updated)) continue;

          const copy = s.threads.slice();
          copy[idx] = updated;
          next[k] = { ...s, threads: sortThreads(copy) };
          changed = true;
        }

        return changed ? next : prev;
      });
    }
  }, []);

  const hydrateThread = useCallback(
    async (threadId: ThreadId, limit = 60) => {
      const id = String(threadId);
      const token = await getToken();
      if (!token) return;

      const [participants, activities] = await Promise.all([
        getThreadParticipants(token, id),
        listThreadActivities(token, id, { limit }),
      ]);

      setParticipants(id, participants ?? []);
      setActivities(id, activities ?? []);
    },
    [setParticipants, setActivities]
  );

  const clearRetryTimer = useCallback((threadId: ThreadId) => {
    const id = String(threadId);
    const t = wsRetryTimerRef.current.get(id);
    if (t) window.clearTimeout(t);
    wsRetryTimerRef.current.delete(id);
  }, []);

  const closeThreadWS = useCallback(
    (threadId: ThreadId) => {
      const id = String(threadId);

      wsClosingRef.current.add(id);
      clearRetryTimer(id);
      wsRetryCountRef.current.delete(id);
      wsConnectPromiseRef.current.delete(id);

      const ws = wsByThreadIdRef.current.get(id);

      console.log("[closeThreadWS]", id);

      wsByThreadIdRef.current.delete(id);

      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;

          if (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
          ) {
            ws.close();
          }
        } catch {
          // ignore
        }
      }

      window.setTimeout(() => {
        wsClosingRef.current.delete(id);
      }, 0);
    },
    [clearRetryTimer]
  );

  const closeAllThreadWS = useCallback(() => {
    const ids = Array.from(wsByThreadIdRef.current.keys());
    for (const id of ids) closeThreadWS(id);
  }, [closeThreadWS]);

  const ensureThreadWS = useCallback(
    async (threadId: ThreadId) => {
      const id = String(threadId);

      const existing = wsByThreadIdRef.current.get(id);
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN ||
          existing.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const inFlight = wsConnectPromiseRef.current.get(id);
      if (inFlight) {
        return inFlight;
      }

      const connectPromise = (async () => {
        clearRetryTimer(id);

        const current = wsByThreadIdRef.current.get(id);
        if (
          current &&
          (current.readyState === WebSocket.OPEN ||
            current.readyState === WebSocket.CONNECTING)
        ) {
          return;
        }

        const token = await getToken();
        if (!token) return;

        const stillCurrent = wsByThreadIdRef.current.get(id);
        if (
          stillCurrent &&
          (stillCurrent.readyState === WebSocket.OPEN ||
            stillCurrent.readyState === WebSocket.CONNECTING)
        ) {
          return;
        }

        const url = `${WS_BASE}/threads/${encodeURIComponent(id)}/ws?token=${encodeURIComponent(token)}`;

        wsClosingRef.current.delete(id);

        console.log("[ensureThreadWS] opening", { id, url });

        const ws = new WebSocket(url);
        wsByThreadIdRef.current.set(id, ws);

        ws.onopen = () => {
          if (wsByThreadIdRef.current.get(id) !== ws) return;

          console.log("[WS open]", id);
          wsRetryCountRef.current.delete(id);
          clearRetryTimer(id);
        };

        ws.onmessage = (ev) => {
          if (wsByThreadIdRef.current.get(id) !== ws) return;

          const parsed = safeJsonParse(String(ev.data));
          const payload = unwrapWsPayload(parsed);

          if (!payload || typeof payload !== "object") return;

          if (isThreadBroadcastDTO(payload)) {
            console.log("[WS event]", {
              threadId: id,
              eventType: payload.eventType,
              activityId: payload.activity?.id ?? null,
              ctaId: payload.cta?.id ?? payload.ctaId ?? null,
              referralId: payload.referral?.referralId ?? null,
              participantCount: Array.isArray(payload.participantSnapshot?.items)
                ? payload.participantSnapshot.items.length
                : null,
            });

            switch (payload.eventType) {
              case "THREAD_ACTIVITY_CREATED": {

                if (payload.activity) appendActivity(id, payload.activity);
                return;
              }

              case "THREAD_CTA_UPSERTED": {

                if (payload.cta) upsertCta(id, payload.cta);

                if (payload.activeCtaCount !== undefined || payload.occurredAt || payload.cta) {
                  setScopes((prev) => {
                    let changed = false;
                    const next: Record<ScopeKey, ScopeState> = { ...prev };

                    for (const k of Object.keys(next)) {
                      const s = next[k];
                      const idx = s.threads.findIndex((x) => String(x.threadId) === id);
                      if (idx === -1) continue;

                      const cur = s.threads[idx];
                      const updated: ThreadSummaryDTO = {
                        ...cur,
                        activeCtaCount: payload.activeCtaCount ?? cur.activeCtaCount ?? 0,
                        updatedAt: payload.occurredAt ?? cur.updatedAt,
                      };

                      if (sameThreadSummary(cur, updated)) continue;

                      const copy = s.threads.slice();
                      copy[idx] = updated;
                      next[k] = { ...s, threads: sortThreads(copy) };
                      changed = true;
                    }

                    return changed ? next : prev;
                  });
                }
                return;
              }

              case "THREAD_CTA_REMOVED": {

                if (payload.ctaId) removeCta(id, payload.ctaId);

                if (payload.activeCtaCount !== undefined || payload.occurredAt) {
                  setScopes((prev) => {
                    let changed = false;
                    const next: Record<ScopeKey, ScopeState> = { ...prev };

                    for (const k of Object.keys(next)) {
                      const s = next[k];
                      const idx = s.threads.findIndex((x) => String(x.threadId) === id);
                      if (idx === -1) continue;

                      const cur = s.threads[idx];
                      const updated: ThreadSummaryDTO = {
                        ...cur,
                        activeCtaCount: payload.activeCtaCount ?? cur.activeCtaCount ?? 0,
                        updatedAt: payload.occurredAt ?? cur.updatedAt,
                      };

                      if (sameThreadSummary(cur, updated)) continue;

                      const copy = s.threads.slice();
                      copy[idx] = updated;
                      next[k] = { ...s, threads: sortThreads(copy) };
                      changed = true;
                    }

                    return changed ? next : prev;
                  });
                }
                return;
              }

              case "THREAD_CONTEXT_INVALIDATED":
              case "THREAD_CONTEXT_UPDATED": {

                bumpContextVersion(id);

                if (payload.activeCtaCount !== undefined || payload.occurredAt) {
                  setScopes((prev) => {
                    let changed = false;
                    const next: Record<ScopeKey, ScopeState> = { ...prev };

                    for (const k of Object.keys(next)) {
                      const s = next[k];
                      const idx = s.threads.findIndex((x) => String(x.threadId) === id);
                      if (idx === -1) continue;

                      const cur = s.threads[idx];
                      const updated: ThreadSummaryDTO = {
                        ...cur,
                        activeCtaCount: payload.activeCtaCount ?? cur.activeCtaCount ?? 0,
                        updatedAt: payload.occurredAt ?? cur.updatedAt,
                      };

                      if (sameThreadSummary(cur, updated)) continue;

                      const copy = s.threads.slice();
                      copy[idx] = updated;
                      next[k] = { ...s, threads: sortThreads(copy) };
                      changed = true;
                    }

                    return changed ? next : prev;
                  });
                }
                return;
              }

              case "REFERRAL_STATE_UPDATED": {

                setScopes((prev) => {
                  let changed = false;
                  const next: Record<ScopeKey, ScopeState> = { ...prev };

                  for (const k of Object.keys(next)) {
                    const s = next[k];
                    const idx = s.threads.findIndex((x) => String(x.threadId) === id);
                    if (idx === -1) continue;

                    const cur = s.threads[idx];
                    if (!cur.referral || !payload.referral) continue;

                    const updated: ThreadSummaryDTO = {
                      ...cur,
                      referral: {
                        ...cur.referral,
                        referralId: payload.referral.referralId,
                        referralSlug: payload.referral.referralSlug,
                        referralStatus: payload.referral.status,
                        targetAcceptanceStatus: payload.referral.targetAcceptanceStatus ?? null,
                        prospectAcceptanceStatus: payload.referral.prospectAcceptanceStatus ?? null,
                      },
                      updatedAt: payload.occurredAt ?? cur.updatedAt,
                    };

                    const copy = s.threads.slice();
                    copy[idx] = updated;
                    next[k] = { ...s, threads: sortThreads(copy) };
                    changed = true;
                  }

                  return changed ? next : prev;
                });

                return;
              }

              case "THREAD_PARTICIPANTS_UPDATED": {
                const items = payload.participantSnapshot?.items ?? [];

                setParticipants(id, items);
                return;
              }

              default:
                return;
            }
          }

          const looksLikeActivity =
            "content" in payload ||
            "createdAt" in payload ||
            "timestamp" in payload ||
            "activityType" in payload ||
            "type" in payload;

          if (looksLikeActivity) {

            appendActivity(id, payload as ThreadActivityDTO);
            return;
          }

/*          if ((payload as any).participants && Array.isArray((payload as any).participants)) {
            console.log("[WS dispatch] fallback participants", {
              threadId: id,
              count: (payload as any).participants.length,
            });

            setParticipants(id, (payload as any).participants as ThreadParticipantDTO[]);
            return;
          }
*/
          };

        ws.onerror = (e) => {
          if (wsByThreadIdRef.current.get(id) !== ws) return;
          console.log("[WS error]", id, e);
        };

        ws.onclose = (e) => {
          console.log("[WS close]", id, {
            code: e.code,
            reason: e.reason,
            wasClean: e.wasClean,
            closing: wsClosingRef.current.has(id),
          });

          const currentWs = wsByThreadIdRef.current.get(id);
          if (currentWs === ws) {
            wsByThreadIdRef.current.delete(id);
          }

          if (!wsClosingRef.current.has(id)) {
            const attempt = (wsRetryCountRef.current.get(id) ?? 0) + 1;
            wsRetryCountRef.current.set(id, attempt);

            const delay = Math.min(8000, 500 * Math.pow(2, attempt - 1));

            clearRetryTimer(id);

            const timer = window.setTimeout(() => {
              if (!wsByThreadIdRef.current.get(id)) {
                ensureThreadWS(id).catch(() => {});
              }
            }, delay);

            wsRetryTimerRef.current.set(id, timer);
          }
        };
      })();

      wsConnectPromiseRef.current.set(id, connectPromise);

      try {
        await connectPromise;
      } finally {
        const currentPromise = wsConnectPromiseRef.current.get(id);
        if (currentPromise === connectPromise) {
          wsConnectPromiseRef.current.delete(id);
        }
      }
    },
    [
      appendActivity,
      bumpContextVersion,
      clearRetryTimer,
      removeCta,
      setParticipants,
      upsertCta,
    ]
  );

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        console.log("[auth state change] SIGNED_OUT");
        closeAllThreadWS();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [closeAllThreadWS]);

  useEffect(() => {
    return () => {
      closeAllThreadWS();
    };
  }, [closeAllThreadWS]);

  const value: ThreadStore = useMemo(
    () => ({
      selectedScope,
      setSelectedScope,
      getThreadsFor,
      getLoadingFor,
      getLoadingMoreFor,
      getHasMoreFor,

      refreshThreadsFor,
      loadMoreThreadsFor,

      participantsByThreadId,
      activitiesByThreadId,

      hydrateThread,
      setParticipants,
      setActivities,
      appendActivity,

      ensureThreadWS,
      closeThreadWS,
      closeAllThreadWS,

      ctasByThreadId,
      setCtas,
      upsertCta,
      removeCta,

      upsertThreadSummary,
      contextVersionByThreadId,
      bumpContextVersion,
    }),
    [
      selectedScope,
      setSelectedScope,
      getThreadsFor,
      getLoadingFor,
      getLoadingMoreFor,
      getHasMoreFor,
      refreshThreadsFor,
      loadMoreThreadsFor,
      participantsByThreadId,
      activitiesByThreadId,
      hydrateThread,
      setParticipants,
      setActivities,
      appendActivity,
      ensureThreadWS,
      closeThreadWS,
      closeAllThreadWS,
      ctasByThreadId,
      setCtas,
      upsertCta,
      removeCta,
      upsertThreadSummary,
      contextVersionByThreadId,
      bumpContextVersion,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useThreadStore = () => useContext(Ctx);