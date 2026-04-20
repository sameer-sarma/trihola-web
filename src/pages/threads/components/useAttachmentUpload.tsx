// src/pages/threads/components/useAttachmentUpload.ts
import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "../../../supabaseClient";
import type { UiAttachment } from "../../../types/threads";

function safeSegment(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);
}

function randomId() {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function kindFromMime(mime: string): UiAttachment["kind"] {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

type AuthResult = { token: string; userId: string } | null;

type Params = {
  threadIdParam?: string | null;
  getAuth: () => Promise<AuthResult>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useAttachmentUpload({
  threadIdParam,
  getAuth,
  setError,
}: Params) {
  const photoVideoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingAttachments, setPendingAttachments] = useState<UiAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const ATTACH_BUCKET = useMemo(
    () =>
      (import.meta as any).env?.VITE_SUPABASE_BUCKET ||
      (import.meta as any).env?.VITE_STORAGE_BUCKET ||
      "profile-pictures",
    []
  );

  const ATTACH_FOLDER = "thread-attachments";

  const uploadAttachments = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const auth = await getAuth();
      if (!auth?.userId) return;

      setUploadingAttachments(true);
      setError(null);

      try {
        const uid = safeSegment(auth.userId);
        const threadSeg = safeSegment(String(threadIdParam ?? "thread"));
        const out: UiAttachment[] = [];

        for (const f of files) {
          const safeName = safeSegment(f.name || "file");
          const path = `${ATTACH_FOLDER}/user_${uid}/${threadSeg}/${randomId()}_${safeName}`;

          const { error: upErr } = await supabase.storage
            .from(ATTACH_BUCKET)
            .upload(path, f, {
              upsert: false,
              contentType: f.type || undefined,
            });

          if (upErr) throw upErr;

          const { data } = supabase.storage.from(ATTACH_BUCKET).getPublicUrl(path);
          const url = data?.publicUrl;
          if (!url) throw new Error("Failed to resolve public URL for attachment");

          out.push({
            kind: kindFromMime(f.type || ""),
            url,
            name: f.name || "file",
            mime: f.type || "application/octet-stream",
            sizeBytes: f.size || 0,
            path,
          });
        }

        setPendingAttachments((prev) => [...prev, ...out]);
      } catch (e: any) {
        setError(e?.message ?? "Attachment upload failed");
      } finally {
        setUploadingAttachments(false);
      }
    },
    [getAuth, threadIdParam, ATTACH_BUCKET, setError]
  );

  const onPickPhotosVideos = useCallback(() => {
    photoVideoInputRef.current?.click();
  }, []);

  const onPickDocument = useCallback(() => {
    docInputRef.current?.click();
  }, []);

  const onPhotoVideoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (!files.length) return;
      await uploadAttachments(files);
    },
    [uploadAttachments]
  );

  const onDocSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (!files.length) return;
      await uploadAttachments(files);
    },
    [uploadAttachments]
  );

  const removePendingAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const restorePendingAttachments = useCallback((items: UiAttachment[]) => {
    setPendingAttachments(items);
  }, []);

  return {
    photoVideoInputRef,
    docInputRef,
    pendingAttachments,
    setPendingAttachments,
    clearPendingAttachments,
    restorePendingAttachments,
    uploadingAttachments,
    uploadAttachments,
    onPickPhotosVideos,
    onPickDocument,
    onPhotoVideoSelected,
    onDocSelected,
    removePendingAttachment,
  };
}