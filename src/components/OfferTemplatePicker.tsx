// components/OfferTemplatePicker.tsx
import React from "react";

export type OfferTemplateDTO = {
  offerTemplateId: string;
  templateTitle: string;
  description?: string | null;
  offerType?: string | null;
  isActive?: boolean;
};

export type EmbeddedOfferDTO = {
  id: string;
  title: string;
  status: string;
  assignedToName?: string | null;
  assignedByName?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  scopeKind?: string | null;
  scopeItems?: any[];
  grants?: any[];
  grantPickLimit: number;
  grantDiscountType?: string | null;
  grantDiscountValue?: number | null;
};

type OfferTemplatePickerProps = {
  templates: OfferTemplateDTO[] | null;

  // Optional: current template id, if you still track it
  persistedId?: string | null;

  // Current assigned offer on this referral
  persistedOffer?: EmbeddedOfferDTO | null;

  // Draft selection in the UI (templateId)
  value: string | null | "";
  onChange: (templateId: string | null) => void;

  title?: string;
  allowNone?: boolean;
  showPreview?: boolean;
  maxPreviewChars?: number;

  // Prevent selecting the current template again
  disableCurrentTemplate?: boolean;

  // “View offer details →”
  onViewPersistedOffer?: () => void;
};

const OfferTemplatePicker: React.FC<OfferTemplatePickerProps> = ({
  templates,
  persistedId,
  persistedOffer,
  value,
  onChange,
  title = "Offer",
  allowNone = true,
  showPreview = true,
  maxPreviewChars = 120,
  disableCurrentTemplate = true,
  onViewPersistedOffer,
}) => {
  const persistedTpl =
    persistedId && templates
      ? templates.find((t) => t.offerTemplateId === persistedId)
      : null;

  const draftTpl =
    value && templates
      ? templates.find((t) => t.offerTemplateId === value)
      : null;

  const makePreview = (text: string) => {
    if (text.length <= maxPreviewChars) return text;
    return text.slice(0, maxPreviewChars).trimEnd() + "…";
  };

  const persistedTitle =
    persistedOffer?.title ?? persistedTpl?.templateTitle ?? null;

  const currentTemplateId = persistedId ?? null;

  return (
    <div>
      {title && (
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {title}
        </h4>
      )}

      {/* Super minimal current-offer display */}
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 6,
        }}
      >
        {persistedTitle ? (
          <>
            <div>
              Current offer:{" "}
              <span style={{ fontWeight: 600 }}>{persistedTitle}</span>
              {persistedOffer?.status && (
                <span style={{ fontSize: 11, marginLeft: 4 }}>
                  ({persistedOffer.status})
                </span>
              )}
            </div>

            {onViewPersistedOffer && persistedOffer && (
              <button
                type="button"
                onClick={onViewPersistedOffer}
                style={{
                  border: "none",
                  padding: 0,
                  marginTop: 2,
                  background: "none",
                  color: "#2563eb",
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                View details →
              </button>
            )}
          </>
        ) : (
          "Current offer: —"
        )}
      </div>

      {/* Draft selection */}
      <label
        style={{
          display: "block",
          fontSize: 12,
          marginBottom: 4,
          color: "#374151",
        }}
      >
        Offer template
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: 14,
        }}
      >
        {allowNone && <option value="">— No offer —</option>}
        {(templates ?? []).map((t) => {
          const isCurrent = currentTemplateId === t.offerTemplateId;
          const inactive = t.isActive === false;
          const disabled = inactive || (disableCurrentTemplate && isCurrent);

          return (
            <option
              key={t.offerTemplateId}
              value={t.offerTemplateId}
              disabled={disabled}
              title={t.description ?? t.templateTitle}
            >
              {t.templateTitle}
              {isCurrent ? " (current)" : ""}
              {inactive ? " (inactive)" : ""}
            </option>
          );
        })}
      </select>

      {/* Optional preview for the new draft selection */}
      {showPreview && draftTpl && (
        <div style={{ marginTop: 6 }}>
          {draftTpl.description && (
            <div
              style={{
                fontSize: 12,
                color: "#4b5563",
                lineHeight: 1.4,
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {makePreview(draftTpl.description)}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            Type: {draftTpl.offerType ?? "—"}
            {draftTpl.isActive === false ? " • (inactive)" : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferTemplatePicker;
