// src/pages/threads/components/ThreadEmailComposerModal.tsx
import React, { useEffect, useRef } from "react";
import type { AllowedActionsDTO } from "../../../types/threads";

export type EmailComposerRecipient = {
  participantType: "USER" | "BUSINESS";
  participantId: string;
  name: string;
  imageUrl?: string | null;
  subtitle?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;

  title?: string;
  description?: string | null;

  recipients: EmailComposerRecipient[];

  subject: string;
  setSubject: React.Dispatch<React.SetStateAction<string>>;

  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;

  attachments?: File[];
  setAttachments?: React.Dispatch<React.SetStateAction<File[]>>;

  sending: boolean;
  canSend: boolean;
  allowedActions?: AllowedActionsDTO | null;

  sendLabel?: string;
  onSend: () => void;
};

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•";
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

export default function ThreadEmailComposerModal({
  open,
  onClose,
  title = "Send email",
  description = null,
  recipients,
  subject,
  setSubject,
  body,
  setBody,
  attachments = [],
  setAttachments,
  sending,
  canSend,
  allowedActions,
  sendLabel = "Send email",
  onSend,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => bodyRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!setAttachments) return;

    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    if (!setAttachments) return;
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalSheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{title}</div>
            {description ? (
              <div className="threadHint" style={{ marginTop: 6, textAlign: "left" }}>
                {description}
              </div>
            ) : null}
          </div>

          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modalBody">
          <div className="emailFieldRow">
            <div className="emailFieldLabel">To</div>
            <div className="emailComposerRecipients">
              {recipients.map((r) => (
                <div
                  key={`${r.participantType}:${r.participantId}`}
                  className="identity-chip"
                  style={{ width: "auto", minWidth: 0, maxWidth: 320 }}
                >
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" />
                  ) : (
                    <span className="avatar-fallback">{initials(r.name)}</span>
                  )}

                  <span className="identity-chip-text">
                    <span className="identity-title">{r.name}</span>
                    {r.subtitle ? <span className="identity-subtitle">{r.subtitle}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="emailFieldRow">
            <div className="emailFieldLabel">Subject</div>
            <input
              className="threadInput"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick introduction"
            />
          </div>

          <div className="formRow">
            <label className="emailFieldLabel" style={{ display: "block", marginBottom: 8 }}>
              Message
            </label>
            <textarea
              ref={bodyRef}
              className="threadTextarea emailComposerTextarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
            />
          </div>

          {setAttachments ? (
            <div className="formRow">
              <label className="emailFieldLabel" style={{ display: "block", marginBottom: 8 }}>
                Attachments
              </label>

              <div className="emailComposerAttachments">
                {attachments.length > 0 ? (
                  <div className="pendingRow" style={{ marginBottom: 0 }}>
                    {attachments.map((file, index) => (
                      <div className="pendingChip" key={`${file.name}-${file.size}-${index}`}>
                        <span className="pendingIcon">📎</span>
                        <span className="pendingName">{file.name}</span>
                        <span className="pendingSize">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          className="pendingRemove"
                          onClick={() => removeAttachment(index)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Add files
                  </button>

                  <span className="threadHint" style={{ textAlign: "left", marginTop: 0 }}>
                    Files are attached to the email directly.
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={onFilesSelected}
              />
            </div>
          ) : null}

          {!canSend && (
            <div className="threadHint" style={{ textAlign: "left" }}>
              {allowedActions?.reason ?? "Email is not allowed for this thread."}
            </div>
          )}

          {allowedActions?.remainingIntroEmails !== null &&
            allowedActions?.remainingIntroEmails !== undefined && (
              <div className="threadHint emailComposerQuota">
                Remaining intro emails: {allowedActions.remainingIntroEmails}
              </div>
            )}

          <div className="emailComposerFooter">
            <div className="emailComposerActions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={onSend}
                disabled={!canSend || sending}
                title={!canSend ? allowedActions?.reason ?? "Not allowed" : ""}
              >
                {sending ? "Sending…" : sendLabel}
              </button>

              <button className="btn" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}