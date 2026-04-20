import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "../../../supabaseClient";

import type { AttachmentDTO, UiAttachment } from "../../../types/threads";
import type {
  BroadcastCtaItemDraft,
  BroadcastCtaRewardDraft,
  BroadcastCtaRewardsDraft,
  ThreadCtaKind,
} from "../../../types/broadcasts";
import type { OfferTemplateResponse } from "../../../types/offerTemplateTypes";

import DrawerSubmodal from "./DrawerSubModal";

import "../../../css/form.css";
import "../../../css/add-referral-cta.css";
import "../../../css/thread-page.css";
import "../../../css/broadcast-composer.css";

type Props = {
  open: boolean;
  onClose: () => void;
  initialValue: BroadcastCtaItemDraft | null;
  onSave: (item: BroadcastCtaItemDraft) => void;
  uploaderUserId: string;
  uploadContextId: string;
  offerTemplates: OfferTemplateResponse[];
  offerTemplatesLoading?: boolean;
  enableOfferRewards?: boolean;
  canAskForReferrals?: boolean;
  canAskForRecommendations?: boolean;
  title?: string;
};

type RewardCardProps = {
  title: string;
  hint: string;
  value: BroadcastCtaRewardDraft;
  onChange: (patch: Partial<BroadcastCtaRewardDraft>) => void;
  offerTemplates: OfferTemplateResponse[];
  disabled?: boolean;
};

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

function toUiAttachment(a: AttachmentDTO): UiAttachment {
  return {
    url: a.url,
    name: a.name,
    mime: a.mime,
    sizeBytes: a.sizeBytes ?? null,
    kind: a.kind ?? attachmentKindFromMime(a.mime || "application/octet-stream"),
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

function promptPlaceholder(kind: ThreadCtaKind): string {
  switch (kind) {
    case "REFERRAL_ADD":
      return "Do you know someone who might be interested?";
    case "RECOMMEND_BUSINESS":
      return "Do you know a business we should connect with?";
  }
}

function suggestedNotePlaceholder(kind: ThreadCtaKind): string {
  switch (kind) {
    case "REFERRAL_ADD":
      return "Write a note that can be copied into each referral…";
    case "RECOMMEND_BUSINESS":
      return "Write a note that can be copied into each recommendation…";
  }
}

function toLocalDateTimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function defaultLocalDatetime(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return toLocalDateTimeInputValue(d);
}

function toIsoFromLocalDatetimeLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function templateLabel(t: OfferTemplateResponse): string {
  return String(
    (t as any).templateTitle ||
      (t as any).name ||
      (t as any).title ||
      (t as any).description ||
      "Offer template"
  ).trim();
}

function templateIdOf(t: OfferTemplateResponse): string {
  return String((t as any).offerTemplateId ?? (t as any).id ?? "");
}

function templateDescription(t: OfferTemplateResponse): string | null {
  const v = String((t as any).description ?? "").trim();
  return v || null;
}

function templateMaxRedemptions(t: OfferTemplateResponse): number | null {
  const raw = (t as any).maxRedemptions;
  return typeof raw === "number" && raw > 0 ? raw : null;
}

function emptyRewardDraft(): BroadcastCtaRewardDraft {
  return {
    enabled: false,
    offerTemplateId: "",
    maxRedemptionsOverrideText: "",
    notes: "",
  };
}

function emptyRewardsDraft(): BroadcastCtaRewardsDraft {
  return {
    assigneeOnCompletion: emptyRewardDraft(),
    prospectOnReferralCreation: emptyRewardDraft(),
    referrerOnReferralCreation: emptyRewardDraft(),
  };
}

function validateRewardDraft(
  reward: BroadcastCtaRewardDraft,
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

function hasAnyRewardEnabled(rewards: BroadcastCtaRewardsDraft): boolean {
  return (
    rewards.assigneeOnCompletion.enabled ||
    rewards.prospectOnReferralCreation.enabled ||
    rewards.referrerOnReferralCreation.enabled
  );
}

function RewardCard({
  title,
  hint,
  value,
  onChange,
  offerTemplates,
  disabled = false,
}: RewardCardProps) {
  const [isOpen, setIsOpen] = useState<boolean>(!!value.enabled);

  useEffect(() => {
    setIsOpen(!!value.enabled);
  }, [value.enabled]);

  const selectedTemplate = useMemo(
    () => offerTemplates.find((t) => templateIdOf(t) === value.offerTemplateId) ?? null,
    [offerTemplates, value.offerTemplateId]
  );

  const statusText = !value.enabled
    ? "Add reward"
    : selectedTemplate
    ? "Configured"
    : "Choose offer";

  const handleHeaderClick = useCallback(() => {
    if (disabled) return;

    if (!value.enabled) {
      onChange({ enabled: true });
      setIsOpen(true);
      return;
    }

    setIsOpen((prev) => !prev);
  }, [disabled, value.enabled, onChange]);

  const handleRemoveReward = useCallback(() => {
    if (disabled) return;

    onChange({
      enabled: false,
      offerTemplateId: "",
      maxRedemptionsOverrideText: "",
      notes: "",
    });
    setIsOpen(false);
  }, [disabled, onChange]);

  return (
    <div className={"th-ctaRewardCard" + (value.enabled ? " is-enabled" : "")}>
      <button
        type="button"
        className={"th-ctaRewardCard__headerButton" + (isOpen ? " is-open" : "")}
        onClick={handleHeaderClick}
        disabled={disabled}
        aria-expanded={value.enabled ? isOpen : false}
      >
        <div className="th-ctaRewardCard__headerMain">
          <div className="th-ctaRewardCard__titleRow">
            <div className="th-ctaRewardCard__title">{title}</div>
            <div
              className={
                "th-ctaRewardCard__status " +
                (value.enabled ? "is-enabled" : "is-disabled")
              }
            >
              {statusText}
            </div>
          </div>

          <div className="th-ctaRewardCard__hint">{hint}</div>
        </div>

        <div className="th-ctaRewardCard__chevron" aria-hidden="true">
          {value.enabled && isOpen ? "▾" : "▸"}
        </div>
      </button>

      {value.enabled && isOpen ? (
        <div className="th-ctaRewardCard__body">
          <div className="th-field">
            <div className="th-label">Offer template</div>
            <select
              className="th-ctaInput"
              value={value.offerTemplateId}
              onChange={(e) => onChange({ offerTemplateId: e.target.value })}
              disabled={disabled}
            >
              <option value="">Select an offer…</option>
              {offerTemplates.map((template) => {
                const id = templateIdOf(template);
                return (
                  <option key={id} value={id}>
                    {templateLabel(template)}
                  </option>
                );
              })}
            </select>
            {!selectedTemplate ? (
              <div className="th-ctaHint">
                Choose the offer template to assign for this reward.
              </div>
            ) : null}
          </div>

          {selectedTemplate ? (
            <div className="boip-templateCard">
              <div className="boip-templateCard__title">
                {templateLabel(selectedTemplate)}
              </div>

              {templateDescription(selectedTemplate) ? (
                <div className="boip-templateCard__desc">
                  {templateDescription(selectedTemplate)}
                </div>
              ) : null}

              {typeof templateMaxRedemptions(selectedTemplate) === "number" ? (
                <div className="boip-templateCard__meta">
                  Default max redemptions: {templateMaxRedemptions(selectedTemplate)}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="th-ctaTwoCol">
            <div className="th-field">
              <div className="th-label">Max redemptions</div>
              <input
                className="th-ctaInput"
                type="number"
                min={1}
                step={1}
                value={value.maxRedemptionsOverrideText}
                onChange={(e) =>
                  onChange({ maxRedemptionsOverrideText: e.target.value })
                }
                placeholder="Use template default"
                disabled={disabled}
              />
              <div className="th-ctaHint">Optional override.</div>
            </div>

            <div className="th-field">
              <div className="th-label">Notes</div>
              <textarea
                className="th-ctaInput th-ctaTextarea th-ctaRewardCard__notes"
                rows={3}
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Add an internal note for this reward…"
                disabled={disabled}
              />
              <div className="th-ctaHint">
                Stored with the resulting offer assignment.
              </div>
            </div>
          </div>

          <div className="th-ctaRewardCard__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleRemoveReward}
              disabled={disabled}
            >
              Remove reward
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BroadcastCtaItemPanel({
  open,
  onClose,
  initialValue,
  onSave,
  uploaderUserId,
  uploadContextId,
  offerTemplates,
  offerTemplatesLoading = false,
  enableOfferRewards = false,
  canAskForReferrals = true,
  canAskForRecommendations = true,
  title = "CTA item",
}: Props) {
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [ctaKind, setCtaKind] = useState<ThreadCtaKind>("REFERRAL_ADD");
  const [message, setMessage] = useState("");
  const [requestedCount, setRequestedCount] = useState<number>(1);
  const [suggestedNote, setSuggestedNote] = useState("");
  const [attachments, setAttachments] = useState<UiAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>(defaultLocalDatetime(7));
  const [rewards, setRewards] = useState<BroadcastCtaRewardsDraft>(emptyRewardsDraft());

  const allowedKinds = useMemo<ThreadCtaKind[]>(() => {
    const kinds: ThreadCtaKind[] = [];
    if (canAskForReferrals) kinds.push("REFERRAL_ADD");
    if (canAskForRecommendations) kinds.push("RECOMMEND_BUSINESS");
    return kinds;
  }, [canAskForReferrals, canAskForRecommendations]);

  const defaultAllowedKind: ThreadCtaKind = useMemo(() => {
    if (canAskForReferrals) return "REFERRAL_ADD";
    if (canAskForRecommendations) return "RECOMMEND_BUSINESS";
    return "REFERRAL_ADD";
  }, [canAskForReferrals, canAskForRecommendations]);

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      const nextKind = allowedKinds.includes(initialValue.ctaKind)
        ? initialValue.ctaKind
        : defaultAllowedKind;

      setCtaKind(nextKind);
      setMessage(initialValue.ctaConfig?.message ?? "");
      setRequestedCount(Math.max(1, Number(initialValue.ctaConfig?.requestedCount ?? 1) || 1));
      setSuggestedNote(initialValue.ctaConfig?.referralDefaults?.suggestedNote ?? "");
      setAttachments(
        (initialValue.ctaConfig?.referralDefaults?.attachments ?? []).map(toUiAttachment)
      );
      setDueAt(
        initialValue.schedule?.dueAt
          ? toLocalDateTimeInputValue(new Date(initialValue.schedule.dueAt))
          : ""
      );
      setExpiresAt(
        initialValue.schedule?.expiresAt
          ? toLocalDateTimeInputValue(new Date(initialValue.schedule.expiresAt))
          : defaultLocalDatetime(7)
      );
      setRewards(initialValue.ctaConfig?.rewards ?? emptyRewardsDraft());
    } else {
      setCtaKind(defaultAllowedKind);
      setMessage("");
      setRequestedCount(1);
      setSuggestedNote("");
      setAttachments([]);
      setDueAt("");
      setExpiresAt(defaultLocalDatetime(7));
      setRewards(emptyRewardsDraft());
    }

    setErr(null);
    setUploadingAttachments(false);
  }, [open, initialValue, allowedKinds, defaultAllowedKind]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      messageRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const dueAtIso = useMemo(() => {
    return dueAt ? toIsoFromLocalDatetimeLocal(dueAt) : null;
  }, [dueAt]);

  const expiresAtIso = useMemo(() => {
    return expiresAt ? toIsoFromLocalDatetimeLocal(expiresAt) : null;
  }, [expiresAt]);

  const hasAllowedKind = allowedKinds.length > 0;

  const canSave = useMemo(() => {
    return hasAllowedKind && message.trim().length > 0 && requestedCount > 0 && !!expiresAtIso;
  }, [hasAllowedKind, message, requestedCount, expiresAtIso]);

  const canConfigureOfferRewards =
    enableOfferRewards && ctaKind === "REFERRAL_ADD";

  const hasOfferTemplates = offerTemplates.length > 0;

  const updateReward = useCallback(
    (key: keyof BroadcastCtaRewardsDraft, patch: Partial<BroadcastCtaRewardDraft>) => {
      setRewards((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...patch,
        },
      }));
    },
    []
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const bucket = (import.meta as any).env?.VITE_SUPABASE_BUCKET || "public";
      const folderRoot = "broadcast-cta-attachments";
      const owner = clean(uploaderUserId) || "anonymous";
      const context = clean(uploadContextId) || "broadcast_cta";

      setUploadingAttachments(true);
      setErr(null);

      try {
        const uploaded: UiAttachment[] = [];

        for (const file of files) {
          const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
          const unique =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

          const path = `${folderRoot}/${owner}/${context}/${unique}${ext ? `.${ext}` : ""}`;

          const { error } = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

          if (error) throw error;

          const { data } = supabase.storage.from(bucket).getPublicUrl(path);

          uploaded.push({
            url: data.publicUrl,
            name: file.name,
            mime: file.type,
            sizeBytes: file.size,
            kind: attachmentKindFromMime(file.type || ""),
            path,
          });
        }

        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to upload attachment");
      } finally {
        setUploadingAttachments(false);
      }
    },
    [uploaderUserId, uploadContextId]
  );

  const onAttachmentSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      await uploadFiles(files);
    },
    [uploadFiles]
  );

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    if (!hasAllowedKind) {
      setErr("No request types are permitted for this identity.");
      return;
    }

    if (!message.trim()) {
      setErr("Please enter a message.");
      return;
    }

    if (!requestedCount || requestedCount < 1) {
      setErr("Please enter a valid requested count.");
      return;
    }

    if (dueAt && !dueAtIso) {
      setErr("Please choose a valid due date/time.");
      return;
    }

    if (!expiresAtIso) {
      setErr("Please choose a valid expiry date/time.");
      return;
    }

    if (dueAtIso && new Date(dueAtIso) > new Date(expiresAtIso)) {
      setErr("Due at must be before expires at.");
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

    const next: BroadcastCtaItemDraft = {
      localId: initialValue?.localId ?? makeLocalId(),
      itemType: "CTA",
      ctaKind,
      ctaConfig: {
        message: message.trim(),
        requestedCount: Math.max(1, Number(requestedCount) || 1),
        referralDefaults: {
          suggestedNote: suggestedNote.trim() || undefined,
          attachments: attachments.map(toAttachmentDto),
        },
        rewards:
          canConfigureOfferRewards && hasOfferTemplates && hasAnyRewardEnabled(rewards)
            ? rewards
            : undefined,
      },
      schedule: {
        dueAt: dueAtIso,
        expiresAt: expiresAtIso,
      },
    };

    onSave(next);
    onClose();
  }, [
    initialValue,
    ctaKind,
    message,
    requestedCount,
    suggestedNote,
    attachments,
    dueAt,
    dueAtIso,
    expiresAtIso,
    canConfigureOfferRewards,
    hasOfferTemplates,
    rewards,
    onSave,
    onClose,
    hasAllowedKind,
  ]);

  if (!open) return null;

  if (open && allowedKinds.length === 0) {
    return (
      <DrawerSubmodal
        open={open}
        onClose={onClose}
        title={title}
        footer={
          <div className="th-ctaFooter">
            <button className="btn btn--ghost" onClick={onClose} type="button">
              Close
            </button>
          </div>
        }
      >
        <div className="th-ctaInfo">No request types are permitted for this identity.</div>
      </DrawerSubmodal>
    );
  }

  return (
    <DrawerSubmodal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="th-ctaFooter">
          <button className="btn btn--ghost" onClick={onClose} type="button">
            Cancel
          </button>

          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={!canSave || uploadingAttachments}
            type="button"
          >
            {uploadingAttachments ? "Uploading…" : "Save CTA"}
          </button>
        </div>
      }
    >
      <div className="broadcast-cta-editor">
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          multiple
          style={{ display: "none" }}
          onChange={onAttachmentSelected}
        />

        <div className="broadcast-cta-editor__kindBar">
          <select
            className="broadcast-cta-editor__kindSelect"
            value={ctaKind}
            onChange={(e) => setCtaKind(e.target.value as ThreadCtaKind)}
            disabled={uploadingAttachments || allowedKinds.length <= 1}
          >
            {canAskForReferrals && (
              <option value="REFERRAL_ADD">Ask for referrals</option>
            )}
            {canAskForRecommendations && (
              <option value="RECOMMEND_BUSINESS">Ask for business recommendations</option>
            )}
          </select>
        </div>

        <div className="th-form th-form--compact">
          <div className="th-field broadcast-cta-editor__field--stacked">
            <div className="th-label">Message</div>
            <textarea
              ref={messageRef}
              className="th-ramNote th-ramNote--chatgpt broadcast-cta-editor__textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder={promptPlaceholder(ctaKind)}
              disabled={uploadingAttachments}
            />
          </div>

          <div className="th-form-row th-form-row--2 broadcast-cta-editor__row">
            <div className="th-field">
              <div className="th-label">Needed</div>
              <input
                className="th-ctaInput"
                type="number"
                min={1}
                step={1}
                value={requestedCount}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setRequestedCount(
                    Number.isFinite(next) && next > 0 ? Math.floor(next) : 1
                  );
                }}
                disabled={uploadingAttachments}
              />
            </div>

            <div className="th-field">
              <div className="th-label">Due at</div>
              <input
                className="th-ctaInput"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={uploadingAttachments}
              />
            </div>
          </div>

          <div className="th-field broadcast-cta-editor__field--horizontal">
            <div className="th-label">Expires at</div>
            <input
              className="th-ctaInput"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={uploadingAttachments}
            />
          </div>

          <div className="th-field broadcast-cta-editor__field--horizontal broadcast-cta-editor__field--multiline">
            <div className="th-label">Suggested note</div>
            <textarea
              className="th-ramNote broadcast-cta-editor__textarea--small"
              value={suggestedNote}
              onChange={(e) => setSuggestedNote(e.target.value)}
              rows={2}
              placeholder={suggestedNotePlaceholder(ctaKind)}
              disabled={uploadingAttachments}
            />
          </div>

          <div className="th-field broadcast-cta-editor__field--horizontal broadcast-cta-editor__field--attachments">
            <div className="th-label">Attachments</div>

            <div className="broadcast-cta-editor__attachmentsArea">
              <button
                type="button"
                className="btn btn--ghost attachBtn"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={uploadingAttachments}
                title="Add attachment"
              >
                ＋
              </button>

              {attachments.length > 0 ? (
                <div className="pendingRow broadcast-cta-editor__pendingRow">
                  {attachments.map((a, i) => (
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
                        onClick={() => removeAttachment(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {canConfigureOfferRewards ? (
            <div className="th-field">
              <div className="th-label">Offer rewards</div>

              {offerTemplatesLoading ? (
                <div className="th-ctaHint">Loading offers…</div>
              ) : !hasOfferTemplates ? (
                <div className="th-ctaInfo">
                  No offer templates are available for this business yet. Create offer templates to
                  reward assignees, prospects, or referrers from this CTA.
                </div>
              ) : (
                <div className="th-ctaRewardSection">
                  <div className="th-ctaRewardSection__intro">
                    Automatically assign offers when this CTA is completed or when it results in a
                    referral.
                  </div>

                  <div className="th-ctaRewardSection__list">
                    <RewardCard
                      title="Reward the assignee"
                      hint="Sent when this CTA is completed."
                      value={rewards.assigneeOnCompletion}
                      onChange={(patch) => updateReward("assigneeOnCompletion", patch)}
                      offerTemplates={offerTemplates}
                      disabled={uploadingAttachments}
                    />

                    <RewardCard
                      title="Reward the prospect"
                      hint="Sent when a referral from this CTA creates a new prospect."
                      value={rewards.prospectOnReferralCreation}
                      onChange={(patch) => updateReward("prospectOnReferralCreation", patch)}
                      offerTemplates={offerTemplates}
                      disabled={uploadingAttachments}
                    />

                    <RewardCard
                      title="Reward the referrer"
                      hint="Sent when a referral is created from this CTA."
                      value={rewards.referrerOnReferralCreation}
                      onChange={(patch) => updateReward("referrerOnReferralCreation", patch)}
                      offerTemplates={offerTemplates}
                      disabled={uploadingAttachments}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {err ? <div className="th-ctaError">{err}</div> : null}
        </div>
      </div>
    </DrawerSubmodal>
  );
}