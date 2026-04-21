import React, { useMemo } from "react";
import { whatYouGetSentence } from "../utils/offerWhatYouGet";
import { Link } from "react-router-dom";
import "../css/cards.css";
import "../css/ui-forms.css";

type OfferLike = {
  offerTitle?: string;
  description?: string | null;

  offerType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
  discountPercentage?: number;
  discountAmount?: number;
  maxDiscountAmount?: number | null;
  minPurchaseAmount?: number | null;

  validityType?: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | Date | null;
  validUntil?: string | Date | null;
  durationDays?: number | null;
  trigger?: string | null;

  redemptionsUsed?: number;
  effectiveMaxRedemptions?: number | null;
  redemptionsLeft?: number | null;
  maxRedemptions?: number | null;

  scopeKind?: "ANY_PURCHASE" | "LIST";
  scopeItems?: Array<any>;
  tiers?: Array<any>;

  /** NEW: drives the header badge (e.g., EXPIRED, COMPLETED, ACTIVE) */
  status?: "ACTIVE" | "INACTIVE" | "EXPIRED" | "COMPLETED" | string;

  /** NEW: business + links (from AssignedOfferDetailsDTO) */
  businessName?: string | null;
  businessProfileSlug?: string | null;
  referralSlug?: string | null;
};

interface Props {
  offer: OfferLike;
  appearance?: "flat" | "gradient";
  className?: string;
  /** Use "offer" for OfferDetails; "template" for OfferTemplateDetails */
  mode?: "offer" | "template";
  showDetailsInCard?: boolean;
}

const fmtDateTime = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleString() : "—";

const triggerText = (t?: string | null) => {
  switch ((t || "")?.toUpperCase()) {
    case "ON_ASSIGNMENT":
      return "on assignment";
    case "ON_GENERATION":
      return "on code generation";
    case "ON_FIRST_PURCHASE":
      return "on first purchase";
    default:
      return (t || "").replace(/_/g, " ").toLowerCase() || "—";
  }
};

const plural = (n?: number | null) => (n === 1 ? "" : "s");

const statusClass = (s?: string) => {
  const key = (s || "").toUpperCase();
  if (key === "EXPIRED") return "status-badge status-expired";
  if (key === "COMPLETED") return "status-badge status-completed";
  if (key === "INACTIVE") return "status-badge status-inactive";
  if (key === "ACTIVE") return "status-badge status-active";
  return "status-badge";
};

const OfferCard: React.FC<Props> = ({
  offer,
  appearance = "flat",
  className,
  mode = "offer",
  showDetailsInCard = false,
}) => {
  const rootClass = useMemo(
    () =>
      [
        "card",
        "offer-card",
        appearance === "gradient" ? "offer-card--gradient" : "offer-card--flat",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [appearance, className]
  );

  const tiersCount = Array.isArray(offer.tiers) ? offer.tiers.length : 0;
  const used = offer.redemptionsUsed ?? 0;
  const max = offer.effectiveMaxRedemptions ?? offer.maxRedemptions ?? null;
  const left =
    offer.redemptionsLeft ??
    (typeof max === "number" ? Math.max(0, max - used) : undefined);

  // For OfferDetails (mode "offer"), if concrete dates exist, show them
  const hasConcreteDates =
    mode === "offer" && (offer.validFrom != null || offer.validUntil != null);

  const showBusinessMeta =
    mode === "offer" &&
    (!!offer.businessName || !!offer.businessProfileSlug || !!offer.referralSlug);

  return (
    <div className={rootClass}>
      {/* Header with status pill */}
      <div
        className="th-header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <h3 className="card__title" style={{ marginBottom: 0 }}>
          {offer.offerTitle || "Untitled offer"}
        </h3>
        {offer.status && (
          <span className={statusClass(offer.status)} aria-label={`Status ${offer.status}`}>
            {String(offer.status).toUpperCase()}
          </span>
        )}
      </div>

      {/* NEW: Business / referral meta bar */}
      {showBusinessMeta && (
        <div className="th-kv th-offer-meta-links" style={{ marginTop: 4, marginBottom: 8 }}>
          {offer.businessName && (
            <span>
              From{" "}
              {offer.businessProfileSlug ? (
                <Link to={`/profile/${offer.businessProfileSlug}`} className="inline-link">
                  {offer.businessName}
                </Link>
              ) : (
                <strong>{offer.businessName}</strong>
              )}
            </span>
          )}

          {offer.referralSlug && (
            <span style={{ marginLeft: offer.businessName ? 12 : 0 }}>
              ·{" "}
              <Link
                to={`/referral/${offer.referralSlug}/thread`}
                className="inline-link"
              >
                View referral thread
              </Link>
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="ot-summary">
        {hasConcreteDates ? (
          <>
            <div className="th-kv">
              <strong>Valid from</strong> {fmtDateTime(offer.validFrom)}
            </div>
            <div className="th-kv">
              <strong>Valid until</strong> {fmtDateTime(offer.validUntil)}
            </div>
          </>
        ) : offer.validityType === "ABSOLUTE" ? (
          <>
            <div className="th-kv">
              <strong>Valid from</strong> {fmtDateTime(offer.validFrom)}
            </div>
            <div className="th-kv">
              <strong>Valid until</strong> {fmtDateTime(offer.validUntil)}
            </div>
          </>
        ) : (
          <>
            <div className="th-kv">
              <strong>Validity</strong>{" "}
              {typeof offer.durationDays === "number"
                ? `${offer.durationDays} day${plural(offer.durationDays)}`
                : "—"}
            </div>
            <div className="th-kv">
              <strong>Trigger</strong> {triggerText(offer.trigger)}
            </div>
          </>
        )}

        {tiersCount > 0 && (
          <div className="th-kv">
            <strong>Tiers</strong> {tiersCount}
          </div>
        )}

        <div className="th-kv">
          <strong>Redemptions</strong>{" "}
          {mode === "template"
            ? typeof max === "number"
              ? String(max)
              : "—"
            : typeof max === "number"
            ? `${used} / ${max} · Left: ${left ?? Math.max(0, max - used)}`
            : String(used)}
        </div>
      </div>

      {/* What you get */}
      <div>
        <div className="th-muted">What you get</div>
        <div className="th-card-title th-what" style={{ lineHeight: 1.25 }}>
          {whatYouGetSentence(offer)}
        </div>
      </div>

      {/* Optional inline details */}
      {showDetailsInCard && !!offer.description && (
        <div className="th-kv" style={{ marginTop: 6 }}>
          <strong>Details</strong> {offer.description}
        </div>
      )}
    </div>
  );
};

export default OfferCard;
