import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import {
  getThreadParticipants,
  listThreadActivities,
  getThreadContext,
} from "../../../services/threadService";
import { getReferralBySlug } from "../../../services/referralService";
import type {
  ParticipantIdentity,
  ThreadActivityDTO,
  ThreadContextType,
  ThreadParticipantDTO,
  UUID,
} from "../../../types/threads";

type GetAuthResult = { token: string; userId: string } | null;

type Params = {
  threadId: UUID;
  threadIdParam?: string | null;
  getAuth: () => Promise<GetAuthResult>;
  normalizeThreadType: (ctx: any) => ThreadContextType | null;

  currentIdentityRef?: RefObject<{ participantType: string; participantId: string } | null>;

  participantsByThreadId: Map<string, ThreadParticipantDTO[]>;
  activitiesByThreadId: Map<string, ThreadActivityDTO[]>;

  storeSetParticipants: (threadId: string, participants: ThreadParticipantDTO[]) => void;
  storeSetActivities: (threadId: string, activities: ThreadActivityDTO[]) => void;

  ensureThreadWS: (threadId: string) => Promise<any>;
  closeThreadWS: (threadId: string) => void;

  onResolvedMyUserId?: (userId: string) => void;
  onDefaultIdentity?: (identity: ParticipantIdentity) => void;
  contextVersionByThreadId: Map<string, number>;
};

export function useThreadData({
  threadId,
  threadIdParam,
  getAuth,
  normalizeThreadType,
  participantsByThreadId,
  activitiesByThreadId,
  storeSetParticipants,
  storeSetActivities,
  contextVersionByThreadId,
  ensureThreadWS,
  closeThreadWS,
  onResolvedMyUserId,
  onDefaultIdentity,
  currentIdentityRef,
}: Params) {
  const [participants, setParticipants] = useState<ThreadParticipantDTO[]>(
    () => participantsByThreadId.get(String(threadId)) ?? []
  );
  const [activities, setActivities] = useState<ThreadActivityDTO[]>(
    () => activitiesByThreadId.get(String(threadId)) ?? []
  );
  const [threadType, setThreadType] = useState<ThreadContextType | null>(null);
  const [threadCtx, setThreadCtx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [referralNote, setReferralNote] = useState<string | null>(null);
  const [referralDetailsLoading, setReferralDetailsLoading] = useState(false);
  const contextVersion = contextVersionByThreadId.get(String(threadId)) ?? 0;
  
  useEffect(() => {
    if (!threadId) return;

    console.log("[useThreadData effect open]", threadId);
    ensureThreadWS(String(threadId)).catch(() => {});

    return () => {
      console.log("[useThreadData effect cleanup close]", threadId);
      closeThreadWS(String(threadId));
    };
  }, [threadId, ensureThreadWS, closeThreadWS]);

  useEffect(() => {
    const nextParticipants = participantsByThreadId.get(String(threadId)) ?? [];
    setParticipants(nextParticipants);
  }, [participantsByThreadId, threadId]);

  useEffect(() => {
    const nextActivities = activitiesByThreadId.get(String(threadId)) ?? [];
    setActivities(nextActivities);
  }, [activitiesByThreadId, threadId]);

  useEffect(() => {
    if (!threadId || !threadIdParam) return;

    const ident =
      currentIdentityRef?.current
        ? {
            participantType: currentIdentityRef.current.participantType as any,
            participantId: String(currentIdentityRef.current.participantId) as any,
          }
        : null;

    if (!ident) return;

    let cancelled = false;

    (async () => {
      const auth = await getAuth();
      if (!auth?.token || cancelled) return;

      try {
        const ctx = await getThreadContext(auth.token, threadId, ident);
        if (cancelled) return;

        setThreadCtx(ctx);
        setThreadType(normalizeThreadType(ctx));
      } catch {
        // ignore transient refresh errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId, threadIdParam, contextVersion, getAuth, normalizeThreadType, currentIdentityRef]);

  const loadThread = useCallback(
    async (asIdentityOverride?: ParticipantIdentity) => {
      if (!threadIdParam) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const auth = await getAuth();
      if (!auth) {
        setLoading(false);
        return;
      }

      onResolvedMyUserId?.(auth.userId);

      if (!currentIdentityRef?.current) {
        onDefaultIdentity?.({
          participantType: "USER",
          participantId: auth.userId as any,
        });
      }

      try {
        const ident: ParticipantIdentity =
          asIdentityOverride ??
          (currentIdentityRef?.current
            ? ({
                participantType: currentIdentityRef.current.participantType as any,
                participantId: String(currentIdentityRef.current.participantId) as any,
              } as any)
            : ({
                participantType: "USER",
                participantId: auth.userId,
              } as any));

        const [ctx, ps, acts] = await Promise.all([
          getThreadContext(auth.token, threadId, ident),
          getThreadParticipants(auth.token, threadId),
          listThreadActivities(auth.token, threadId, { limit: 60 }),
        ]);

        const nextParticipants = ps ?? [];
        const nextActivities = acts ?? [];

        setThreadCtx(ctx);
        setThreadType(normalizeThreadType(ctx));
        setParticipants(nextParticipants);
        setActivities(nextActivities);

        storeSetParticipants(String(threadId), nextParticipants);
        storeSetActivities(String(threadId), nextActivities);
      } finally {
        setLoading(false);
      }
    },
    [
      threadId,
      threadIdParam,
      getAuth,
      normalizeThreadType,
      onResolvedMyUserId,
      onDefaultIdentity,
      currentIdentityRef,
      storeSetParticipants,
      storeSetActivities,
    ]
  );

  const refreshThreadContextOnly = useCallback(
    async (ident: ParticipantIdentity) => {
      const auth = await getAuth();
      if (!auth?.token) return;

      try {
        const ctx = await getThreadContext(auth.token, threadId, ident);
        setThreadCtx(ctx);
        setThreadType(normalizeThreadType(ctx));
      } catch {
        // ignore
      }
    },
    [getAuth, threadId, normalizeThreadType]
  );

  useEffect(() => {
    const slug = threadCtx?.referralSlug as string | undefined;
    if (!slug) {
      setReferralNote(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setReferralDetailsLoading(true);
      try {
        const auth = await getAuth();
        if (!auth?.token) return;

        const dto = await getReferralBySlug(auth.token, slug);
        if (cancelled) return;

        setReferralNote((dto?.note ?? "").trim() || null);
      } catch {
        if (!cancelled) setReferralNote(null);
      } finally {
        if (!cancelled) setReferralDetailsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadCtx?.referralSlug, getAuth]);

  return {
    participants,
    activities,
    threadType,
    threadCtx,
    loading,
    referralNote,
    referralDetailsLoading,

    setParticipants,
    setActivities,
    setThreadType,
    setThreadCtx,

    loadThread,
    refreshThreadContextOnly,
  };
}