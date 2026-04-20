import { useEffect, useMemo, useRef, useState } from "react";
import type { BroadcastOfferItemDraft } from "../../../types/broadcasts";
import type { OfferTemplateResponse } from "../../../types/offerTemplateTypes";
import DrawerSubmodal from "./DrawerSubModal";

import "../../../css/add-referral-cta.css";
import "../../../css/thread-page.css";
import "../../../css/broadcast-composer.css";
import "../../../css/broadcast-offer-item-panel.css";

type Props = {
  open: boolean;
  onClose: () => void;
  initialValue: BroadcastOfferItemDraft | null;
  onSave: (item: BroadcastOfferItemDraft) => void;
  uploaderUserId: string;
  uploadContextId: string;
  offerTemplates?: OfferTemplateResponse[] | null;
  offerTemplatesLoading?: boolean;
  title?: string;
};

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clean(v: unknown): string {
  return String(v ?? "").trim();
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

function templateIdOf(t?: OfferTemplateResponse | null): string {
  if (!t) return "";
  return String((t as any).offerTemplateId ?? (t as any).id ?? "");
}

function templateLabel(t?: OfferTemplateResponse | null): string {
  if (!t) return "Untitled offer";
  return String(
    (t as any).templateTitle ??
      (t as any).name ??
      (t as any).title ??
      "Untitled offer"
  ).trim();
}

function templateDescription(t?: OfferTemplateResponse | null): string | null {
  if (!t) return null;
  const v = String((t as any).description ?? "").trim();
  return v || null;
}

function templateMaxRedemptions(t?: OfferTemplateResponse | null): number | null {
  if (!t) return null;
  const raw = (t as any).maxRedemptions;
  return typeof raw === "number" && raw > 0 ? raw : null;
}

export default function BroadcastOfferItemPanel({
  open,
  onClose,
  initialValue,
  onSave,
  offerTemplates,
  offerTemplatesLoading = false,
  title = "Offer item",
}: Props) {
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const safeOfferTemplates = useMemo<OfferTemplateResponse[]>(
    () => (Array.isArray(offerTemplates) ? offerTemplates : []),
    [offerTemplates]
  );

  const preferredOfferTemplateId = useMemo(() => {
    const candidate = clean(initialValue?.offerTemplateId);
    if (candidate && safeOfferTemplates.some((t) => templateIdOf(t) === candidate)) {
      return candidate;
    }
    return safeOfferTemplates.length > 0 ? templateIdOf(safeOfferTemplates[0]) : "";
  }, [initialValue?.offerTemplateId, safeOfferTemplates]);

  const [offerTemplateId, setOfferTemplateId] = useState<string>(preferredOfferTemplateId);
  const [note, setNote] = useState<string>("");
  const [maxRedemptionsOverrideText, setMaxRedemptionsOverrideText] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>(defaultLocalDatetime(7));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setOfferTemplateId(preferredOfferTemplateId);
    setNote(initialValue?.note ?? "");
    setMaxRedemptionsOverrideText(initialValue?.maxRedemptionsOverride ?? "");
    setDueAt(
      initialValue?.schedule?.dueAt
        ? toLocalDateTimeInputValue(new Date(initialValue.schedule.dueAt))
        : ""
    );
    setExpiresAt(
      initialValue?.schedule?.expiresAt
        ? toLocalDateTimeInputValue(new Date(initialValue.schedule.expiresAt))
        : defaultLocalDatetime(7)
    );
    setErr(null);
  }, [open, initialValue, preferredOfferTemplateId]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      selectRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const selectedTemplate = useMemo(
    () => safeOfferTemplates.find((t) => templateIdOf(t) === offerTemplateId) ?? null,
    [safeOfferTemplates, offerTemplateId]
  );

  const dueAtIso = useMemo(() => {
    return dueAt ? toIsoFromLocalDatetimeLocal(dueAt) : null;
  }, [dueAt]);

  const expiresAtIso = useMemo(() => {
    return expiresAt ? toIsoFromLocalDatetimeLocal(expiresAt) : null;
  }, [expiresAt]);

  const canSave = useMemo(() => {
    if (!clean(offerTemplateId)) return false;
    if (!expiresAtIso) return false;

    if (clean(maxRedemptionsOverrideText)) {
      const parsed = Number(clean(maxRedemptionsOverrideText));
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        return false;
      }
    }

    return true;
  }, [offerTemplateId, expiresAtIso, maxRedemptionsOverrideText]);

  const selectedDefaultMax = templateMaxRedemptions(selectedTemplate);

  function handleSave() {
    setErr(null);

    if (!clean(offerTemplateId)) {
      setErr("Please choose an offer.");
      return;
    }

    if (clean(maxRedemptionsOverrideText)) {
      const parsed = Number(clean(maxRedemptionsOverrideText));
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        setErr("Max redemptions override must be a whole number greater than 0.");
        return;
      }
    }

    if (!expiresAtIso) {
      setErr("Please provide a valid expiry date and time.");
      return;
    }

    onSave({
      localId: initialValue?.localId ?? makeLocalId(),
      itemType: "OFFER",
      offerTemplateId: clean(offerTemplateId) || null,
      note,
      maxRedemptionsOverride: clean(maxRedemptionsOverrideText),
      schedule: {
        dueAt: dueAtIso,
        expiresAt: expiresAtIso,
      },
    });

    onClose();
  }

  return (
    <DrawerSubmodal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="th-ctaFooter">
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
            disabled={!canSave}
          >
            Save offer
          </button>
        </div>
      }
    >
      <div className="boip-shell">
        <div className="boip-topGrid">
          <section className="boip-card boip-card--template">
            <div className="boip-cardHeader boip-cardHeader--tight">
              <div>
                <div className="boip-cardTitle">Offer template</div>
              </div>
            </div>

            {offerTemplatesLoading ? (
              <div className="th-ctaHint">Loading offers…</div>
            ) : safeOfferTemplates.length === 0 ? (
              <div className="th-ctaError">
                No offer templates are available for this business yet.
              </div>
            ) : (
              <>
                <select
                  ref={selectRef}
                  className="th-ctaInput"
                  value={offerTemplateId}
                  onChange={(e) => setOfferTemplateId(e.target.value)}
                >
                  <option value="">Select an offer…</option>
                  {safeOfferTemplates.map((t) => (
                    <option key={templateIdOf(t)} value={templateIdOf(t)}>
                      {templateLabel(t)}
                    </option>
                  ))}
                </select>

                {selectedTemplate ? (
                  <div className="boip-templateBlock">
                    <div className="boip-templateTitle">
                      {templateLabel(selectedTemplate)}
                    </div>

                    {templateDescription(selectedTemplate) ? (
                      <div className="boip-templateDesc">
                        {templateDescription(selectedTemplate)}
                      </div>
                    ) : null}

                    {selectedDefaultMax != null ? (
                      <div className="boip-templateMeta">
                        Default max uses: {selectedDefaultMax}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="boip-card boip-card--settings">
            <div className="boip-cardHeader boip-cardHeader--tight">
              <div>
                <div className="boip-cardTitle">Delivery settings</div>
              </div>
            </div>

            <div className="boip-settingsStack">
              <div className="th-ctaField boip-field">
                <div className="th-ctaLabel">Max redemptions override</div>
                <input
                  className="th-ctaInput"
                  type="number"
                  min={1}
                  step={1}
                  value={maxRedemptionsOverrideText}
                  onChange={(e) => setMaxRedemptionsOverrideText(e.target.value)}
                  placeholder="Use template default"
                />
              </div>

              <div className="th-ctaField boip-field">
                <div className="th-ctaLabel">Due at</div>
                <input
                  className="th-ctaInput"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>

              <div className="th-ctaField boip-field">
                <div className="th-ctaLabel">Expires at</div>
                <input
                  className="th-ctaInput"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="boip-card boip-card--note">
          <div className="boip-cardHeader boip-cardHeader--tight">
            <div>
              <div className="boip-cardTitle">Internal note</div>
            </div>
          </div>

          <div className="th-ctaField boip-field boip-field--note">
            <textarea
              className="th-ctaInput th-ctaTextarea boip-noteInput"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for this offer item..."
            />
          </div>
        </section>

        {err ? <div className="th-ctaError">{err}</div> : null}
      </div>
    </DrawerSubmodal>
  );
}