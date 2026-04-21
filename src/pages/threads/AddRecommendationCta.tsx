// src/pages/threads/AddRecommendationCta.tsx
import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import FileUploader, { type UploadedFile } from "../../components/FileUploader";
import type { ParticipantIdentity, ThreadParticipantDTO } from "../../types/threads";

import "../../css/add-referral-cta.css"; // shared styles

type CtaAttachment = {
  id: string; // storage path/key
  url: string;
  name: string;
  mime: string;
  sizeBytes: number;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
};

type RecommendationRequestConfig = {
  message: string;
  requestedCount: number;
  referralDefaults: {
    suggestedNote: string | null;
    attachments: CtaAttachment[];
  };
};

type Schedule = {
  dueAt: string | null; // ISO string
  expiresAt: string | null; // ISO string
};

type Props = {
  open: boolean;
  onClose: () => void;

  // identity of the requester ("createdBy")
  viewingAs: ParticipantIdentity;

  // must be a direct thread (2 participants)
  participants: ThreadParticipantDTO[];

  // needed for uploads
  uploaderUserId: string;

  // helps make upload paths stable/organized
  threadId: string;

  onCreate: (
    assignedTo: ParticipantIdentity,
    config: RecommendationRequestConfig,
    schedule: Schedule
  ) => Promise<void>;
};

function pickOtherParticipant(
  viewingAs: ParticipantIdentity,
  participants: ThreadParticipantDTO[]
): ParticipantIdentity | null {
  if (participants.length !== 2) return null;
  const other = participants.find(
    (p) => !(p.participantType === viewingAs.participantType && p.participantId === viewingAs.participantId)
  );
  if (!other) return null;
  return {
    participantType: other.participantType as any,
    participantId: other.participantId as any,
  };
}

function otherParticipantName(
  viewingAs: ParticipantIdentity,
  participants: ThreadParticipantDTO[]
): string {
  if (participants.length !== 2) return "them";
  const other = participants.find(
    (p) => !(p.participantType === viewingAs.participantType && p.participantId === viewingAs.participantId)
  );
  const name =
    other?.displayName ||
    other?.businessMini?.name ||
    [other?.userMini?.firstName, other?.userMini?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name?.trim() ? name.trim() : "them";
}

/**
 * Convert <input type="datetime-local" /> value ("YYYY-MM-DDTHH:mm")
 * into a UTC ISO string, interpreting the input as local time.
 */
function toIsoFromLocalDatetimeLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(v); // local time parse
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function defaultExpiryLocalDatetime(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);

  // format as "YYYY-MM-DDTHH:mm" in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AddRecommendationCta({
  open,
  onClose,
  viewingAs,
  participants,
  uploaderUserId,
  threadId,
  onCreate,
}: Props) {
  const isDirectThread = participants.length === 2;

  const assignedTo = useMemo(
    () => (isDirectThread ? pickOtherParticipant(viewingAs, participants) : null),
    [isDirectThread, viewingAs, participants]
  );

  const otherName = useMemo(() => otherParticipantName(viewingAs, participants), [viewingAs, participants]);

  const [message, setMessage] = useState("");
  const [requestedCount, setRequestedCount] = useState<number>(2);
  const [suggestedNote, setSuggestedNote] = useState<string>("");
  const [attachments, setAttachments] = useState<CtaAttachment[]>([]);
  const [startFrom, setStartFrom] = useState<string>(""); // datetime-local
  const [expiresAt, setExpiresAt] = useState<string>(() => defaultExpiryLocalDatetime(14)); // datetime-local
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setExpiresAt((prev) => (prev?.trim() ? prev : defaultExpiryLocalDatetime(14)));
  }, [open]);

  const canSubmit = useMemo(() => {
    if (!isDirectThread) return false;
    if (!assignedTo) return false;
    if (!message.trim()) return false;
    if (!requestedCount || requestedCount < 1) return false;
    return true;
  }, [isDirectThread, assignedTo, message, requestedCount]);

  function onUploadComplete(files: UploadedFile[]) {
    setAttachments((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const mapped = files
        .map<CtaAttachment>((f) => ({
          id: f.path,
          url: f.publicUrl,
          name: f.fileName,
          mime: f.mimeType,
          sizeBytes: f.size,
          kind: f.kind,
        }))
        .filter((a) => !seen.has(a.id));

      return [...prev, ...mapped];
    });
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function submit() {
    setErr(null);
    if (!assignedTo) return;

    const cfg: RecommendationRequestConfig = {
      message: message.trim(),
      requestedCount: Math.max(1, Math.min(50, Number(requestedCount) || 1)),
      referralDefaults: {
        suggestedNote: suggestedNote.trim() ? suggestedNote.trim() : null,
        attachments,
      },
    };

    const dueAtIso = toIsoFromLocalDatetimeLocal(startFrom);
    const expiresAtIso = toIsoFromLocalDatetimeLocal(expiresAt);

    if (startFrom && !dueAtIso) {
      setErr("Invalid start date/time.");
      return;
    }
    if (expiresAt && !expiresAtIso) {
      setErr("Invalid expiry date/time.");
      return;
    }
    if (dueAtIso && expiresAtIso && new Date(dueAtIso) > new Date(expiresAtIso)) {
      setErr("Start time must be before expiry time.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(assignedTo, cfg, { dueAt: dueAtIso, expiresAt: expiresAtIso });

      // reset + close
      setMessage("");
      setRequestedCount(2);
      setSuggestedNote("");
      setAttachments([]);
      setStartFrom("");
      setExpiresAt(defaultExpiryLocalDatetime(14));
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <div className="th-ctaFooter">
      <button className="btn btn--ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      <button className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
        {submitting ? "Sending…" : "Send request"}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={`Ask ${otherName} for recommendations`} footer={footer} maxWidth={720}>
      {!isDirectThread ? (
        <div className="th-ctaInfo">
          This option is only available in a <b>direct thread</b> (exactly 2 participants) for now.
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {[
          "Can you recommend 2 good businesses for this?",
          "Do you know anyone reliable for this?",
          "Could you suggest a few good options nearby?",
        ].map((preset) => (
          <button
            key={preset}
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setMessage(preset)}
            disabled={submitting}
          >
            Use
          </button>
        ))}
      </div>

      <div className="th-form">
        <div className="th-field">
          <label className="th-label">Message</label>
          <textarea
            className="th-textarea th-textarea--compact"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi — can you recommend 2 good businesses for this? (e.g., plumbers near Whitefield)"
            disabled={submitting || !isDirectThread}
          />
          <div className="th-help">This is what they’ll see in the thread.</div>
        </div>

        <div className="th-section">
          <div className="th-section-header">
            <h3 className="th-section-title">Preview</h3>
          </div>

          <div
            style={{
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 14,
              padding: 12,
              background: "#fafbff",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {otherName} will see:
            </div>

            <div style={{ fontSize: 14, marginBottom: 6 }}>
              <b>You asked for {requestedCount} recommendation{requestedCount > 1 ? "s" : ""}.</b>
            </div>

            {message ? (
              <div style={{ fontSize: 14, color: "#374151" }}>{message}</div>
            ) : (
              <div style={{ fontSize: 14, color: "#9ca3af" }}>
                Your message will appear here…
              </div>
            )}

            {expiresAt ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                Expires at: {new Date(toIsoFromLocalDatetimeLocal(expiresAt) || "").toLocaleString()}
              </div>
            ) : null}
          </div>
        </div>

        <div className="th-field th-ctaCount">
          <label className="th-label">Target recommendations</label>
          <input
            className="th-input"
            type="number"
            min={1}
            max={50}
            value={requestedCount}
            onChange={(e) => setRequestedCount(Number(e.target.value))}
            disabled={submitting || !isDirectThread}
          />
          <div className="th-help">
            Set how many good options you’d like them to send. (1–50)
          </div>
        </div>

        <div className="th-field">
          <label className="th-label">Context for better recommendations (optional)</label>
          <textarea
            className="th-textarea th-textarea--compact"
            rows={2}
            value={suggestedNote}
            onChange={(e) => setSuggestedNote(e.target.value)}
            placeholder="Location, timing, budget, preferences…"
            disabled={submitting || !isDirectThread}
          />
          <div className="th-help">
            This helps the other person recommend more relevant businesses.
          </div>
        </div>

        <div className="th-section">
          <div className="th-field">
            <FileUploader
              userId={uploaderUserId}
              bucket={(import.meta as any).env?.VITE_SUPABASE_BUCKET || "public"}
              folder="cta-attachments"
              filenameBase={`recommendation_request_${threadId}`}
              accept="image/*,application/pdf"
              label="Attachments (optional)"
              help="Attach photos, requirements, or other details to share with this request."
              multiple
              strategy="unique"
              onComplete={onUploadComplete}
            />
          </div>

          {attachments.length > 0 ? (
            <div className="th-ctaAttachments">
              {attachments.map((a) => (
                <div className="th-ctaAttachment" key={a.id}>
                  <div className="th-ctaAttachment__main">
                    <div className="th-ctaAttachment__name">{a.name}</div>
                    <div className="th-ctaAttachment__meta">
                      {a.kind} · {a.mime} · {Math.round(a.sizeBytes / 1024)} KB
                    </div>
                  </div>

                  <div className="th-ctaAttachment__actions">
                    <a
                      className="btn btn--ghost btn--sm"
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="th-form-row--2">
          <div className="th-field">
            <label className="th-label">Schedule start (optional)</label>
            <input
              className="th-input"
              type="datetime-local"
              value={startFrom}
              onChange={(e) => setStartFrom(e.target.value)}
              disabled={submitting || !isDirectThread}
            />
            <div className="th-help">Leave empty to start now.</div>
          </div>

          <div className="th-field">
            <label className="th-label">Expires at</label>
            <input
              className="th-input"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={submitting || !isDirectThread}
            />
            <div className="th-help">Defaults to two weeks from now.</div>
          </div>
        </div>
      </div>

      {err ? <div className="th-ctaError">{err}</div> : null}
    </Modal>
  );
}