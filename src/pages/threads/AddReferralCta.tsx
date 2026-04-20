// src/pages/threads/AddReferralCta.tsx
import { useMemo, useState } from "react";
import Modal from "../../components/Modal";
import FileUploader, { type UploadedFile } from "../../components/FileUploader";
import type { ParticipantIdentity, ThreadParticipantDTO } from "../../types/threads";

import "../../css/add-referral-cta.css";
import "../../css/broadcast-offer-item-panel.css";

type CtaAttachment = {
  id: string; // storage path/key
  url: string;
  name: string;
  mime: string;
  sizeBytes: number;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
};

type ReferralAddRequestConfig = {
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

export type OfferTemplateLite = {
  id: string;
  name: string;
  description?: string | null;
  maxRedemptions?: number | null;
};

export type ReferralCtaRewardDraft = {
  enabled: boolean;
  offerTemplateId: string;
  maxRedemptionsOverrideText: string;
  notes: string;
};

export type ReferralCtaRewardsDraft = {
  assigneeOnCompletion: ReferralCtaRewardDraft;
  prospectOnReferralCreation: ReferralCtaRewardDraft;
  referrerOnReferralCreation: ReferralCtaRewardDraft;
};

export type CreateReferralCtaPayload = {
  assignedTo: ParticipantIdentity;
  config: ReferralAddRequestConfig;
  schedule: Schedule;
  rewards: ReferralCtaRewardsDraft;
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

  // offer rewards support
  offerTemplates?: OfferTemplateLite[];
  offerTemplatesLoading?: boolean;
  enableOfferRewards?: boolean;

  onCreate: (payload: CreateReferralCtaPayload) => Promise<void>;
};

function sameIdentity(a: ParticipantIdentity, b: ParticipantIdentity) {
  return a.participantType === b.participantType && a.participantId === b.participantId;
}

function pickOtherParticipant(
  viewingAs: ParticipantIdentity,
  participants: ThreadParticipantDTO[]
): ParticipantIdentity | null {
  if (participants.length !== 2) return null;
  const other = participants.find(
    (p) =>
      !(
        p.participantType === viewingAs.participantType &&
        p.participantId === viewingAs.participantId
      )
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
    (p) =>
      !(
        p.participantType === viewingAs.participantType &&
        p.participantId === viewingAs.participantId
      )
  );
  const name =
    other?.displayName ||
    other?.businessMini?.name ||
    [other?.userMini?.firstName, other?.userMini?.lastName].filter(Boolean).join(" ").trim();

  return name?.trim() ? name.trim() : "them";
}

/**
 * Convert <input type="datetime-local" /> value ("YYYY-MM-DDTHH:mm")
 * into a UTC ISO string, interpreting the input as local time.
 */
function toIsoOrNull(v: string): string | null {
  if (!v) return null;

  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;

  const [y, m, d] = datePart.split("-").map((x) => Number(x));
  const [hh, mm] = timePart.split(":").map((x) => Number(x));

  if (!y || !m || !d) return null;

  const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0); // local time
  if (Number.isNaN(dt.getTime())) return null;

  return dt.toISOString();
}

function toLocalDateTimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function oneWeekFromNowLocalInput() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toLocalDateTimeInputValue(d);
}

function emptyRewardDraft(): ReferralCtaRewardDraft {
  return {
    enabled: false,
    offerTemplateId: "",
    maxRedemptionsOverrideText: "",
    notes: "",
  };
}

function emptyRewardsDraft(): ReferralCtaRewardsDraft {
  return {
    assigneeOnCompletion: emptyRewardDraft(),
    prospectOnReferralCreation: emptyRewardDraft(),
    referrerOnReferralCreation: emptyRewardDraft(),
  };
}

function validateRewardDraft(
  reward: ReferralCtaRewardDraft,
  label: string
): string | null {
  if (!reward.enabled) return null;

  if (!reward.offerTemplateId.trim()) {
    return `Please choose an offer for "${label}".`;
  }

  if (reward.maxRedemptionsOverrideText.trim()) {
    const parsed = Number(reward.maxRedemptionsOverrideText.trim());
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return `Max redemptions for "${label}" must be a whole number greater than 0.`;
    }
  }

  return null;
}

type RewardCardProps = {
  title: string;
  hint: string;
  value: ReferralCtaRewardDraft;
  onChange: (patch: Partial<ReferralCtaRewardDraft>) => void;
  offerTemplates: OfferTemplateLite[];
  disabled?: boolean;
};

function RewardCard({
  title,
  hint,
  value,
  onChange,
  offerTemplates,
  disabled = false,
}: RewardCardProps) {
  const selectedTemplate = useMemo(
    () => offerTemplates.find((t) => t.id === value.offerTemplateId) ?? null,
    [offerTemplates, value.offerTemplateId]
  );

  return (
    <div className="th-section">
      <label
        className="th-checkRow"
        style={{ cursor: disabled ? "default" : "pointer" }}
      >
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          disabled={disabled}
        />
        <span>{title}</span>
      </label>

      <div className="th-help" style={{ marginTop: 6 }}>
        {hint}
      </div>

      {value.enabled ? (
        <div className="th-form" style={{ marginTop: 12 }}>
          <div className="th-field">
            <label className="th-label">Offer</label>
            <select
              className="th-select"
              value={value.offerTemplateId}
              onChange={(e) => onChange({ offerTemplateId: e.target.value })}
              disabled={disabled}
            >
              <option value="">Select an offer…</option>
              {offerTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate ? (
            <div className="boip-templateCard">
              <div className="boip-templateCard__title">{selectedTemplate.name}</div>

              {selectedTemplate.description ? (
                <div className="boip-templateCard__desc">
                  {selectedTemplate.description}
                </div>
              ) : null}

              {typeof selectedTemplate.maxRedemptions === "number" &&
              selectedTemplate.maxRedemptions > 0 ? (
                <div className="boip-templateCard__meta">
                  Default max redemptions: {selectedTemplate.maxRedemptions}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="th-help">
              Choose the offer template to assign for this reward.
            </div>
          )}

          <div className="th-form-row--2">
            <div className="th-field">
              <label className="th-label">Max redemptions (optional)</label>
              <input
                className="th-input"
                type="number"
                min={1}
                step={1}
                value={value.maxRedemptionsOverrideText}
                onChange={(e) =>
                  onChange({ maxRedemptionsOverrideText: e.target.value })
                }
                placeholder="Leave blank to use template default"
                disabled={disabled}
              />
              <div className="th-help">
                Override the template default only when needed.
              </div>
            </div>

            <div className="th-field">
              <label className="th-label">Notes (optional)</label>
              <textarea
                className="th-textarea th-textarea--compact"
                rows={2}
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Add a note for this reward assignment…"
                disabled={disabled}
              />
              <div className="th-help">
                Stored with the offer assignment created from this CTA.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="th-help" style={{ marginTop: 8 }}>
          Not enabled for this CTA.
        </div>
      )}
    </div>
  );
}

export default function AddReferralCta({
  open,
  onClose,
  viewingAs,
  participants,
  uploaderUserId,
  threadId,
  offerTemplates = [],
  offerTemplatesLoading = false,
  enableOfferRewards = false,
  onCreate,
}: Props) {
  const isDirectThread = participants.length === 2;

  const assignedTo = useMemo(
    () => pickOtherParticipant(viewingAs, participants),
    [viewingAs, participants]
  );

  const [message, setMessage] = useState("");
  const [requestedCount, setRequestedCount] = useState<number>(5);
  const [suggestedNote, setSuggestedNote] = useState("");
  const [attachments, setAttachments] = useState<CtaAttachment[]>([]);

  const [startFrom, setStartFrom] = useState<string>(""); // datetime-local
  const [expiresAt, setExpiresAt] = useState<string>(oneWeekFromNowLocalInput());

  const [rewards, setRewards] = useState<ReferralCtaRewardsDraft>(emptyRewardsDraft());

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canConfigureOfferRewards =
    enableOfferRewards &&
    viewingAs.participantType === "BUSINESS";

  const hasOfferTemplates = offerTemplates.length > 0;

  const canSubmit =
    !!assignedTo &&
    isDirectThread &&
    message.trim().length > 0 &&
    requestedCount >= 1 &&
    requestedCount <= 50 &&
    !!expiresAt &&
    !submitting;

  const otherName = useMemo(
    () => otherParticipantName(viewingAs, participants),
    [viewingAs, participants]
  );

  function updateReward(
    key: keyof ReferralCtaRewardsDraft,
    patch: Partial<ReferralCtaRewardDraft>
  ) {
    setRewards((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  }

  function addUploaded(files: UploadedFile[]) {
    const mapped: CtaAttachment[] = files.map((f) => ({
      id: f.path,
      url: f.publicUrl,
      name: f.fileName,
      mime: f.mimeType,
      sizeBytes: f.size,
      kind: f.kind,
    }));

    // de-dupe by storage path
    setAttachments((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const a of mapped) {
        if (!seen.has(a.id)) next.push(a);
      }
      return next;
    });
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function submit() {
    setErr(null);

    if (!isDirectThread) {
      setErr("This option is only available in direct threads for now.");
      return;
    }

    if (!assignedTo) {
      setErr("Could not resolve the other participant in this thread.");
      return;
    }

    if (sameIdentity(assignedTo, viewingAs)) {
      setErr("You can’t send a referral request to yourself.");
      return;
    }

    const cfg: ReferralAddRequestConfig = {
      message: message.trim(),
      requestedCount: Math.max(1, Math.min(50, Number(requestedCount) || 1)),
      referralDefaults: {
        suggestedNote: suggestedNote.trim() ? suggestedNote.trim() : null,
        attachments,
      },
    };

    const dueAtIso = toIsoOrNull(startFrom);
    const expiresAtIso = toIsoOrNull(expiresAt);

    if (!expiresAtIso) {
      setErr("Please choose an expiry time.");
      return;
    }

    if (dueAtIso && expiresAtIso && new Date(dueAtIso) > new Date(expiresAtIso)) {
      setErr("Start time must be before expiry time.");
      return;
    }

    if (canConfigureOfferRewards && hasOfferTemplates) {
      const rewardErrors = [
        validateRewardDraft(
          rewards.assigneeOnCompletion,
          "Offer to assignee on completion"
        ),
        validateRewardDraft(
          rewards.prospectOnReferralCreation,
          "Offer to prospect when referral is created"
        ),
        validateRewardDraft(
          rewards.referrerOnReferralCreation,
          "Offer to referrer when referral is created"
        ),
      ].filter(Boolean);

      if (rewardErrors.length > 0) {
        setErr(rewardErrors[0] ?? "Please correct the offer rewards section.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onCreate({
        assignedTo,
        config: cfg,
        schedule: { dueAt: dueAtIso, expiresAt: expiresAtIso },
        rewards,
      });

      // reset + close
      setMessage("");
      setRequestedCount(5);
      setSuggestedNote("");
      setAttachments([]);
      setStartFrom("");
      setExpiresAt("");
      setRewards(emptyRewardsDraft());
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
    <Modal
      open={open}
      onClose={onClose}
      title={`Ask ${otherName} for referrals`}
      footer={footer}
      maxWidth={720}
    >
      {!isDirectThread ? (
        <div className="th-ctaInfo">
          This option is only available in a <b>direct thread</b> (exactly 2 participants) for now.
        </div>
      ) : null}
      
      <div className="th-form">
        <div className="th-field">
          <label className="th-label">Message</label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {[
              `Hi ${otherName}, can you refer me to a few people who might benefit from this?`,
              `Would you be open to introducing me to 3 people who may be interested?`,
              `Can you help spread the word to your network?`,
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

          <textarea
            className="th-textarea th-textarea--compact"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi Tuffy — can you refer me to 5 friends who might benefit from us?"
            disabled={submitting || !isDirectThread}
          />
          <div className="th-help">This is what they’ll see in the thread.</div>
        </div>

        <div className="th-field th-ctaCount">
          <label className="th-label">Target referrals</label>
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
            We’ll track completion against this goal. (1–50)
          </div>

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
              <b>You asked for {requestedCount} referral{requestedCount > 1 ? "s" : ""}.</b>
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
                Expires at: {new Date(toIsoOrNull(expiresAt) || "").toLocaleString()}
              </div>
            ) : null}
          </div>
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
            <div className="th-help">Defaults to one week from now.</div>
          </div>
        </div>

        <div className="th-field">
          <label className="th-label">Referral note to prefill (optional)</label>
          <textarea
            className="th-textarea th-textarea--compact"
            rows={2}
            value={suggestedNote}
            onChange={(e) => setSuggestedNote(e.target.value)}
            placeholder="A short intro they can reuse when making a referral…"
            disabled={submitting || !isDirectThread}
          />
          <div className="th-help">
            This will pre-fill when they create a referral from this request.
          </div>
        </div>

        <div className="th-section">
          <div className="th-field">
            <FileUploader
              userId={uploaderUserId}
              bucket={(import.meta as any).env?.VITE_SUPABASE_BUCKET || "public"}
              folder="cta-attachments"
              filenameBase={`referral_request_${threadId}`}
              accept="image/*,application/pdf"
              label="Attachments (optional)"
              help="Attach something they can forward. These will be shared with the request."
              multiple
              strategy="unique"
              onComplete={addUploaded}
            />
          </div>

          {attachments.length ? (
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
                    <a className="btn btn--ghost btn--sm" href={a.url} target="_blank" rel="noreferrer">
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

        {canConfigureOfferRewards ? (
          <div className="th-section">
            <div className="th-section-header">
              <div>
                <h3 className="th-section-title">Incentives</h3>
                <div className="th-section-subtitle">
                  Optionally reward people when this request leads to completed referrals.
                </div>
              </div>
            </div>

            {offerTemplatesLoading ? (
              <div className="th-help">Loading offers…</div>
            ) : !hasOfferTemplates ? (
              <div className="th-ctaInfo">
                No offer templates are available for this business yet. Create offer templates to
                reward assignees, prospects, or referrers from this CTA.
              </div>
            ) : (
              <div className="th-form">
                <RewardCard
                  title="Offer to assignee on completion"
                  hint="Assign this offer to the CTA assignee when they complete this referral ask."
                  value={rewards.assigneeOnCompletion}
                  onChange={(patch) => updateReward("assigneeOnCompletion", patch)}
                  offerTemplates={offerTemplates}
                  disabled={submitting}
                />

                <RewardCard
                  title="Offer to prospect when referral is created"
                  hint="Assign this offer to the prospect created from a referral that comes from this CTA."
                  value={rewards.prospectOnReferralCreation}
                  onChange={(patch) => updateReward("prospectOnReferralCreation", patch)}
                  offerTemplates={offerTemplates}
                  disabled={submitting}
                />

                <RewardCard
                  title="Offer to referrer when referral is created"
                  hint="Assign this offer to the referrer when a referral is created from this CTA."
                  value={rewards.referrerOnReferralCreation}
                  onChange={(patch) => updateReward("referrerOnReferralCreation", patch)}
                  offerTemplates={offerTemplates}
                  disabled={submitting}
                />
              </div>
            )}
          </div>
        ) : null}

        {err ? <div className="th-ctaError">{err}</div> : null}
      </div>
    </Modal>
  );
}