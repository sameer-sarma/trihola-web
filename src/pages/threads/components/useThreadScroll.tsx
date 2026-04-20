// src/pages/threads/useThreadScroll.ts
import { useCallback, useEffect, useMemo, useRef } from "react";

export function useThreadScroll(threadId?: string | null, activities?: Array<{ id?: string | null }>, loading?: boolean) {
  const streamRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const didInitScrollRef = useRef(false);
  const prevThreadIdRef = useRef<string | null>(null);
  const prevActivityFingerprintRef = useRef<string>("");

  const updateStickinessFromStream = useCallback(() => {
    const el = streamRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom <= 120;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = streamRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }, []);

  const activityFingerprint = useMemo(() => {
    return (activities ?? []).map((a) => String(a.id ?? "")).join("|");
  }, [activities]);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;

    updateStickinessFromStream();

    const onScroll = () => updateStickinessFromStream();
    const onResize = () => updateStickinessFromStream();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [updateStickinessFromStream]);

  useEffect(() => {
    const currentThreadId = String(threadId ?? "");
    if (!currentThreadId) return;

    if (prevThreadIdRef.current !== currentThreadId) {
      prevThreadIdRef.current = currentThreadId;
      didInitScrollRef.current = false;
      prevActivityFingerprintRef.current = "";
      shouldStickToBottomRef.current = true;
    }
  }, [threadId]);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    if (loading) return;
    if (!threadId) return;
    if (!(activities?.length ?? 0)) return;
    if (didInitScrollRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
        didInitScrollRef.current = true;
        prevActivityFingerprintRef.current = activityFingerprint;
        shouldStickToBottomRef.current = true;
      });
    });
  }, [loading, threadId, activityFingerprint, activities?.length, scrollToBottom]);

  useEffect(() => {
    if (loading) return;
    if (!didInitScrollRef.current) return;

    const prev = prevActivityFingerprintRef.current;
    const next = activityFingerprint;

    if (!prev) {
      prevActivityFingerprintRef.current = next;
      return;
    }

    if (prev === next) return;

    const prevIds = prev ? prev.split("|").filter(Boolean) : [];
    const nextIds = next ? next.split("|").filter(Boolean) : [];

    const appended =
      nextIds.length > prevIds.length &&
      prevIds.every((id, idx) => nextIds[idx] === id);

    if (appended && shouldStickToBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    }

    prevActivityFingerprintRef.current = next;
  }, [activityFingerprint, loading, scrollToBottom]);

  return {
    streamRef,
    scrollToBottom,
    shouldStickToBottomRef,
    updateStickinessFromStream,
  };
}