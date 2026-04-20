import { useEffect, useMemo, useState } from "react";
import DrawerSubmodal from "./components/DrawerSubModal";

import { assignOffer } from "../../services/offerAssignmentPlanService";
import type {
  AssignOfferRequest,
  ThreadOfferRecipientOption,
} from "../../types/offerAssignmentPlanTypes";

import "../../css/assign-offer-drawer.css";
import "../../css/add-referral-cta.css";
import "../../css/broadcast-offer-item-panel.css";

type OfferTemplateLite = {
  id: string;
  name: string;
  description?: string | null;
  maxRedemptions?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;

  getAuth: () => Promise<{ token: string; userId: string } | null>;
  actingBusinessId?: string | null;
  threadId: string;
  threadTitle?: string | null;

  recipientOptions: ThreadOfferRecipientOption[];
  initialRecipientKey?: string | null;

  offerTemplates: OfferTemplateLite[];
  initialOfferTemplateId?: string | null;
  offerTemplatesLoading?: boolean;

  onAssigned?: () => Promise<void> | void;
};

function buildRequest(params: {
  threadId: string;
  offerTemplateId: string;
  recipient: ThreadOfferRecipientOption | null;
  note: string;
  maxRedemptionsOverrideText: string;
}): AssignOfferRequest | null {
  const { threadId, offerTemplateId, recipient, note, maxRedemptionsOverrideText } = params;

  if (!offerTemplateId || !recipient) return null;

  const trimmed = maxRedemptionsOverrideText.trim();
  const parsed =
    trimmed.length > 0 ? Number(trimmed) : null;

  return {
    offerTemplateId,
    recipientIdentityType: recipient.identityType,
    recipientUserId: recipient.identityType === "USER" ? recipient.userId ?? null : null,
    recipientBusinessId: recipient.identityType === "BUSINESS" ? recipient.businessId ?? null : null,
    threadId,
    maxRedemptionsOverride:
      parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    note: note.trim() ? note.trim() : null,
  };
}

export default function AssignOfferDrawer({
  open,
  onClose,
  getAuth,
  actingBusinessId,
  threadId,
  threadTitle,
  recipientOptions,
  initialRecipientKey,
  offerTemplates,
  initialOfferTemplateId,
  offerTemplatesLoading = false,
  onAssigned,
}: Props) {
  const preferredRecipientKey = useMemo(() => {
    if (initialRecipientKey && recipientOptions.some((r) => r.key === initialRecipientKey)) {
      return initialRecipientKey;
    }
    return recipientOptions[0]?.key ?? "";
  }, [initialRecipientKey, recipientOptions]);

  const preferredOfferTemplateId = useMemo(() => {
    if (
      initialOfferTemplateId &&
      offerTemplates.some((t) => t.id === initialOfferTemplateId)
    ) {
      return initialOfferTemplateId;
    }
    return offerTemplates[0]?.id ?? "";
  }, [initialOfferTemplateId, offerTemplates]);

  const [recipientKey, setRecipientKey] = useState<string>(preferredRecipientKey);
  const [offerTemplateId, setOfferTemplateId] = useState<string>(preferredOfferTemplateId);
  const [note, setNote] = useState<string>("");
  const [maxRedemptionsOverrideText, setMaxRedemptionsOverrideText] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRecipientKey(preferredRecipientKey);
    setOfferTemplateId(preferredOfferTemplateId);
    setNote("");
    setMaxRedemptionsOverrideText("");
    setErr(null);
    setSuccessMsg(null);
  }, [open, preferredRecipientKey, preferredOfferTemplateId]);

  const selectedRecipient = useMemo(
    () => recipientOptions.find((r) => r.key === recipientKey) ?? null,
    [recipientOptions, recipientKey]
  );

  const selectedTemplate = useMemo(
    () => offerTemplates.find((t) => t.id === offerTemplateId) ?? null,
    [offerTemplates, offerTemplateId]
  );

  const canSubmit =
    !!threadId &&
    !!selectedRecipient &&
    !!selectedTemplate &&
    !submitting;

  async function handleSubmit() {
    setErr(null);
    setSuccessMsg(null);

    if (!threadId) {
      setErr("Missing thread context.");
      return;
    }
    if (!selectedRecipient) {
      setErr("Please choose who should receive the offer.");
      return;
    }
    if (!selectedTemplate) {
      setErr("Please choose an offer.");
      return;
    }

    if (maxRedemptionsOverrideText.trim()) {
      const parsed = Number(maxRedemptionsOverrideText.trim());
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        setErr("Max redemptions override must be a whole number greater than 0.");
        return;
      }
    }

    const req = buildRequest({
      threadId,
      offerTemplateId: selectedTemplate.id,
      recipient: selectedRecipient,
      note,
      maxRedemptionsOverrideText,
    });

    if (!req) {
      setErr("Could not build the offer assignment request.");
      return;
    }

    setSubmitting(true);
    try {
      const auth = await getAuth();
      if (!auth?.token) {
        setErr("Not authenticated.");
        return;
      }

      const res = await assignOffer(req, auth.token, actingBusinessId);
      if (!res.ok) {
        setErr(res.error.message || "Failed to assign offer.");
        return;
      }

      const createdCount = res.data.rules?.length ?? 0;
      setSuccessMsg(
        createdCount > 0
          ? `Offer assigned successfully${createdCount > 1 ? ` (${createdCount} rules created)` : ""}.`
          : "Offer assigned successfully."
      );

      await onAssigned?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to assign offer.");
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <div className="th-ctaFooter">
      <button className="btn" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
        {submitting ? "Assigning…" : "Assign offer"}
      </button>
    </div>
  );

  const selectedTemplateDefaultMaxRedemptions = selectedTemplate?.maxRedemptions ?? null;

  const defaultMaxRedemptionsText =
    selectedTemplateDefaultMaxRedemptions == null
      ? "No default limit set"
      : `Template default: ${selectedTemplateDefaultMaxRedemptions}`;

  return (
    <DrawerSubmodal
      open={open}
      onClose={onClose}
      title="Assign offer"
      footer={footer}
      panelClassName="assign-offer-drawer"
      bodyClassName="assign-offer-drawer__body"
      ariaLabel="Assign offer"
    >
      <div className="th-form">
        <div className="th-field">
          <label className="th-label">Assign to</label>
          <select
            className="th-select"
            value={recipientKey}
            onChange={(e) => setRecipientKey(e.target.value)}
            disabled={submitting || recipientOptions.length <= 1}
          >
            {recipientOptions.length === 0 ? (
              <option value="">No recipients available</option>
            ) : null}

            {recipientOptions.map((recipient) => (
              <option key={recipient.key} value={recipient.key}>
                {recipient.label}
                {recipient.subtitle ? ` — ${recipient.subtitle}` : ""}
              </option>
            ))}
          </select>
          <div className="th-help">
            Choose who should receive this offer in the thread.
          </div>
        </div>

        <div className="th-section">
          <div className="th-field">
            <label className="th-label">Offer</label>
            <select
              className="th-select"
              value={offerTemplateId}
              onChange={(e) => setOfferTemplateId(e.target.value)}
              disabled={submitting || offerTemplatesLoading || offerTemplates.length === 0}
            >
              {offerTemplates.length === 0 ? (
                <option value="">No offers available</option>
              ) : null}

              {offerTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {offerTemplatesLoading ? (
            <div className="th-help">Loading offers…</div>
          ) : selectedTemplate ? (
            <div className="boip-templateCard" style={{ marginTop: 10 }}>
              <div className="boip-templateCard__title">{selectedTemplate.name}</div>

              {selectedTemplate.description ? (
                <div className="boip-templateCard__desc">{selectedTemplate.description}</div>
              ) : null}

              <div className="boip-templateCard__meta">{defaultMaxRedemptionsText}</div>
            </div>
          ) : (
            <div className="th-help" style={{ marginTop: 8 }}>
              Choose the offer template to assign.
            </div>
          )}
        </div>

        <div className="th-form-row--2">
          <div className="th-field">
            <label className="th-label">Max redemptions (optional)</label>
            <input
              className="th-input"
              type="number"
              min={1}
              step={1}
              value={maxRedemptionsOverrideText}
              onChange={(e) => setMaxRedemptionsOverrideText(e.target.value)}
              placeholder={
                selectedTemplate?.maxRedemptions != null
                  ? `Leave blank to use default (${selectedTemplate.maxRedemptions})`
                  : "Leave blank to use template default"
              }
              disabled={submitting}
            />
            <div className="th-help">
              Only override the template default when needed.
            </div>
          </div>

          <div className="th-field">
            <label className="th-label">Note (optional)</label>
            <textarea
              className="th-textarea"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for why this offer is being assigned…"
              disabled={submitting}
            />
            <div className="th-help">
              This note will be stored with the offer assignment.
            </div>
          </div>
        </div>

        {err ? <div className="th-ctaError">{err}</div> : null}
        {successMsg ? <div className="th-ctaInfo">{successMsg}</div> : null}
      </div>
    </DrawerSubmodal>
  );
}