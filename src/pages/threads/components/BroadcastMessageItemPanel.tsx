// src/pages/threads/components/BroadcastMessageItemPanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../supabaseClient";

import type { UiAttachment, AttachmentDTO } from "../../../types/threads";
import type { BroadcastMessageItemCreateDTO } from "../../../types/broadcasts";

import DrawerSubmodal from "./DrawerSubModal";

import "../../../css/add-referral-cta.css";
import "../../../css/thread-page.css";
import "../../../css/broadcast-composer.css";

type Props = {
  open: boolean;
  onClose: () => void;

  initialValue: BroadcastMessageItemCreateDTO | null;

  onSave: (item: BroadcastMessageItemCreateDTO) => void;

  uploaderUserId: string;
  uploadContextId: string;

  title?: string;
};

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function formatBytes(n?: number | null) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  const dp = i === 0 ? 0 : i === 1 ? 0 : 1;
  return `${x.toFixed(dp)} ${units[i]}`;
}

function attachmentKindFromMime(mime: string): UiAttachment["kind"] {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

function toUiAttachment(a: AttachmentDTO): UiAttachment {
  return {
    url: a.url,
    name: a.name,
    mime: a.mime,
    sizeBytes: a.sizeBytes ?? null,
    kind: attachmentKindFromMime(a.mime || "application/octet-stream"),
    path: a.path ?? null,
    isPrimary: a.isPrimary ?? null,
  };
}

function toAttachmentDto(a: UiAttachment): AttachmentDTO {
  return {
    url: a.url,
    name: a.name,
    mime: a.mime,
    sizeBytes: a.sizeBytes ?? null,
    kind: a.kind ?? null,
    path: a.path ?? null,
    isPrimary: a.isPrimary ?? null,
  };
}

export default function BroadcastMessageItemPanel({
  open,
  onClose,
  initialValue,
  onSave,
  uploaderUserId,
  uploadContextId,
  title = "Message item",
}: Props) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const photoVideoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const [draftText, setDraftText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<UiAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* ---------------- initialize editor ---------------- */

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      setDraftText(initialValue.messageText ?? "");
      setPendingAttachments(
        (initialValue.payload?.attachments ?? []).map(toUiAttachment)
      );
    } else {
      setDraftText("");
      setPendingAttachments([]);
    }

    setErr(null);
    setUploadingAttachments(false);
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;

    const id = window.setTimeout(() => {
      textAreaRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(id);
  }, [open]);

  const canSave = useMemo(() => {
    return draftText.trim().length > 0 || pendingAttachments.length > 0;
  }, [draftText, pendingAttachments]);

  /* ---------------- uploads ---------------- */

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const bucket =
        (import.meta as any).env?.VITE_SUPABASE_BUCKET || "public";

      const folderRoot = "broadcast-item-attachments";
      const owner = clean(uploaderUserId) || "anonymous";
      const context = clean(uploadContextId) || "broadcast";

      setUploadingAttachments(true);
      setErr(null);

      try {
        const uploaded: UiAttachment[] = [];

        for (const file of files) {
          const ext = file.name.includes(".")
            ? file.name.split(".").pop()
            : "";

          const unique =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

          const path = `${folderRoot}/${owner}/${context}/${unique}${
            ext ? `.${ext}` : ""
          }`;

          const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });

          if (error) throw error;

          const { data } = supabase.storage.from(bucket).getPublicUrl(path);

          uploaded.push({
            kind: attachmentKindFromMime(file.type || ""),
            url: data.publicUrl,
            name: file.name,
            mime: file.type || "application/octet-stream",
            sizeBytes: file.size,
            path,
          });
        }

        setPendingAttachments((prev) => [...prev, ...uploaded]);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to upload attachment");
      } finally {
        setUploadingAttachments(false);
      }
    },
    [uploaderUserId, uploadContextId]
  );

  const onPhotoVideoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      await uploadFiles(files);
    },
    [uploadFiles]
  );

  const onDocSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      await uploadFiles(files);
    },
    [uploadFiles]
  );

  const removePendingAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /* ---------------- save ---------------- */

  const handleSave = useCallback(() => {
    if (!canSave) {
      setErr("Please add a message or at least one attachment.");
      return;
    }

    const payload =
      pendingAttachments.length > 0
        ? { attachments: pendingAttachments.map(toAttachmentDto) }
        : null;

    onSave({
      itemType: "MESSAGE",
      messageText: draftText.trim() || null,
      payload,
    });

    onClose();
  }, [canSave, pendingAttachments, draftText, onSave, onClose]);

  /* ---------------- render ---------------- */

  return (
    <DrawerSubmodal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="th-ctaFooter">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!canSave || uploadingAttachments}
          >
            {uploadingAttachments ? "Uploading…" : "Save item"}
          </button>
        </div>
      }
    >
      <div className="th-ctaGrid">

        <input
          ref={photoVideoInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={onPhotoVideoSelected}
        />

        <input
          ref={docInputRef}
          type="file"
          accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          multiple
          style={{ display: "none" }}
          onChange={onDocSelected}
        />

        <div className="th-ctaField">
          <div className="th-ctaLabel">Message</div>

          {pendingAttachments.length > 0 && (
            <div className="pendingRow">
              {pendingAttachments.map((a, i) => (
                <div className="pendingChip" key={`${a.url}-${i}`}>
                  <span className="pendingIcon">
                    {a.kind === "IMAGE"
                      ? "🖼️"
                      : a.kind === "VIDEO"
                      ? "🎬"
                      : a.kind === "AUDIO"
                      ? "🎤"
                      : "📎"}
                  </span>

                  <span className="pendingName">{a.name}</span>

                  <span className="pendingSize">
                    {a.sizeBytes ? formatBytes(a.sizeBytes) : ""}
                  </span>

                  <button
                    type="button"
                    className="pendingRemove"
                    onClick={() => removePendingAttachment(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="broadcastComposerMessageRow">
            <div className="broadcastComposerMain">
              <textarea
                ref={textAreaRef}
                className="threadTextarea"
                value={draftText}
                placeholder={
                  uploadingAttachments
                    ? "Uploading attachment…"
                    : "Write your announcement message…"
                }
                onChange={(e) => setDraftText(e.target.value)}
                rows={6}
              />
            </div>

            <button
              type="button"
              className="btn btn-quiet attachBtn"
              onClick={() => photoVideoInputRef.current?.click()}
              disabled={uploadingAttachments}
              title="Attach"
            >
              ＋
            </button>
          </div>

          <div className="threadHint">
            {uploadingAttachments
              ? "Uploading…"
              : "Use + to attach images, videos, or documents"}
          </div>
        </div>

        {err ? <div className="th-ctaError">{err}</div> : null}
      </div>
    </DrawerSubmodal>
  );
}