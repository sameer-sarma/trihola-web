// src/components/OfferCard.tsx
import React, { useMemo, useState, useCallback } from "react";
import ClaimModal from "./ClaimModal";
import ExpiryCountdown from "./ExpiryCountdown";
import claimUrlFrom from "../utils/claimUrl";
import { whatYouGetSentence } from "../utils/offerWhatYouGet";
import OfferQRCode from "./OfferQRCode"; // expects { url } prop
import { useOfferClaims } from "../hooks/useOfferClaims";
import type { OfferTypeEnum } from "../types/offer";
import "../css/cards.css";
import "../css/ui-forms.css";

type OfferLike = {
  offerTitle?: string;
  description?: string | null;

  offerType?: OfferTypeEnum;
  discountPercentage?: number;
  discountAmount?: number;
  maxDiscountAmount?: number | null;
  minPurchaseAmount?: number | null;

  validityType?: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | Date | null;
  validUntil?: string | Date | null;
  durationDays?: number | null;
  trigger?: string | null;

  claimPolicy?: "ONLINE" | "MANUAL" | "BOTH";
  canClaim?: boolean;

  redemptionsUsed?: number;
  effectiveMaxRedemptions?: number | null;
  redemptionsLeft?: number | null;
  maxRedemptions?: number | null;

  scopeKind?: "ANY_PURCHASE" | "LIST";
  scopeItems?: Array<any>;
  tiers?: Array<any>;

  grants?: Array<any>;
  grantPickLimit?: number;

  assignedOfferId?: string;
  assignedId?: string;
};

interface Props {
  offer: OfferLike;
  appearance?: "flat" | "gradient";
  className?: string;
  showActions?: boolean;
  mode?: "offer" | "template";
  onGenerateManual?: () => Promise<void> | void; // optional external override
}

const fmtDateTime = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleString() : "—";

const claimPolicyText = (p?: string) => {
  switch ((p || "").toUpperCase()) {
    case "ONLINE": return "Online code";
    case "MANUAL": return "In-store QR (business scans)";
    case "BOTH":   return "In-store QR or Online code";
    default:       return "—";
  }
};

const triggerText = (t?: string | null) => {
  switch ((t || "")?.toUpperCase()) {
    case "ON_ASSIGNMENT":     return "on assignment";
    case "ON_GENERATION":     return "on code generation";
    case "ON_FIRST_PURCHASE": return "on first purchase";
    default:                  return (t || "").replace(/_/g, " ").toLowerCase() || "—";
  }
};

const plural = (n?: number | null) => (n === 1 ? "" : "s");

const OfferCard: React.FC<Props> = ({
  offer,
  appearance = "flat",
  className,
  showActions = true,
  mode = "offer",
  onGenerateManual,
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
  const max  = offer.effectiveMaxRedemptions ?? offer.maxRedemptions ?? null;
  const left = offer.redemptionsLeft ?? (typeof max === "number" ? Math.max(0, max - used) : undefined);

  const manualAllowed = offer.claimPolicy === "MANUAL" || offer.claimPolicy === "BOTH";
  const onlineAllowed = offer.claimPolicy === "ONLINE" || offer.claimPolicy === "BOTH";
  const canClaimBase = !!offer.canClaim && !!(offer.assignedOfferId || offer.assignedId);
  const canManual = canClaimBase && manualAllowed;
  const canOnline = canClaimBase && onlineAllowed;
  const assignedId = offer.assignedOfferId ?? offer.assignedId ?? "";

  // hook manages create/fetch of claims
  const { manual, online, generateManual, generateOnline } = useOfferClaims(offer as any);

  // Local UI state for manual path
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [manualClaim, setManualClaim] = useState<any | null>(null);
  const [expiredManual, setExpiredManual] = useState(false);

  // Local UI state for online path
  const [expiredOnline, setExpiredOnline] = useState(false);

const hasGrantList = Array.isArray(offer.grants) && offer.grants.length > 0;
const isGrantType  = (offer.offerType === "GRANT");
const expectsGrants = isGrantType || hasGrantList;

  const handleManualCreated = useCallback((claim: any) => {
    setManualClaim(claim);
    setExpiredManual(false);
  }, []);

const handleManualClick = useCallback(async () => {
  if (!canManual) return;

  if (onGenerateManual) {
    await onGenerateManual();
    return;
  }

  if (expectsGrants) {
    setShowClaimModal(true);         // open picker only when there are grants
  } else {
    // no grants to pick -> generate directly (empty grants)
    try {
      setExpiredManual(false);
      await generateManual?.();      // if your hook accepts args, pass { grants: [] }
    } catch {
      /* surface toast if needed */
    }
  }
}, [canManual, onGenerateManual, expectsGrants, generateManual]);

  const handleOnlineClick = useCallback(async () => {
    if (!canOnline) return;
    try {
      setExpiredOnline(false);
      await generateOnline(); // hook sets `online`
    } catch {
      /* surface toast if you have one */
    }
  }, [canOnline, generateOnline]);

  // prefer freshly created manual claim if present, else hook's manual
  const activeManual = manualClaim || manual;
  const manualClaimId = activeManual?.id ?? activeManual?.claimId;
  const manualCode = activeManual?.discountCode ?? activeManual?.code;
  const qrUrl = manualClaimId ? claimUrlFrom({ id: manualClaimId, discountCode: manualCode }) : "";

  const onlineCode = online?.discountCode;


  return (
    <div className={rootClass}>
      {/* Header */}
      <div className="th-header">
        <h3 className="card__title" style={{ marginBottom: 0 }}>
          {offer.offerTitle || "Untitled offer"}
        </h3>
      </div>

      {/* Summary */}
      <div className="ot-summary">
        {offer.validityType === "ABSOLUTE" ? (
          <>
            <div className="th-kv"><strong>Valid from</strong> {fmtDateTime(offer.validFrom)}</div>
            <div className="th-kv"><strong>Valid until</strong> {fmtDateTime(offer.validUntil)}</div>
          </>
        ) : (
          <>
            <div className="th-kv">
              <strong>Validity</strong>{" "}
              {typeof offer.durationDays === "number" ? `${offer.durationDays} day${plural(offer.durationDays)}` : "—"}
            </div>
            <div className="th-kv"><strong>Trigger</strong> {triggerText(offer.trigger)}</div>
          </>
        )}
        <div className="th-kv"><strong>How to claim</strong> {claimPolicyText(offer.claimPolicy)}</div>
        {tiersCount > 0 && <div className="th-kv"><strong>Tiers</strong> {tiersCount}</div>}
        <div className="th-kv">
          <strong>Redemptions</strong>{" "}
          {mode === "template"
            ? (typeof max === "number" ? String(max) : "—")
            : (typeof max === "number" ? `${used} / ${max} · Left: ${left ?? Math.max(0, max - used)}` : String(used))}
        </div>
      </div>

      {/* What you get */}
      <div>
        <div className="th-muted">What you get</div>
        <div className="th-card-title th-what" style={{ lineHeight: 1.25 }}>
          {whatYouGetSentence(offer)}
        </div>
      </div>

{/* Actions + helper in one aligned row */}
      {showActions && (canManual || canOnline) && (
        <div className="offer-cta">
          <div className="offer-cta__help">
            • <strong>Generate QR (in-store)</strong>: shows a QR for the business to scan and approve on the spot.
            <br />
            • <strong>Generate Code (online)</strong>: gives you a one-time code to apply at checkout.
          </div>

          <div className="offer-cta__buttons">
            {canManual && (
              <button
                className="btn btn--primary"
                onClick={handleManualClick}
                title="Generate a QR to claim in-store"
              >
                Generate QR
              </button>
            )}
            {canOnline && (
              <button
                className="btn btn--primary"
                onClick={handleOnlineClick}
                title="Generate an online code to use at checkout"
              >
                Generate Code (online)
              </button>
            )}
          </div>
        </div>
      )}

      {/* MANUAL claim panel */}
      {activeManual && (
        <div className="claim-qr-panel" style={{ marginTop: 12 }}>
          <div className="help">Show this QR to the business</div>
          {qrUrl && <OfferQRCode url={qrUrl} />}
          {activeManual.expiresAt && !expiredManual && (
            <div style={{ marginTop: 6 }}>
              <ExpiryCountdown expiresAt={activeManual.expiresAt} onExpire={() => setExpiredManual(true)} />
            </div>
          )}
          {expiredManual && (
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn btn--primary" onClick={() => setShowClaimModal(true)}>
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}

      {/* ONLINE claim panel */}
      {online && (
        <div className="claim-code-panel" style={{ marginTop: 12 }}>
          <div className="help">Use this code at checkout</div>
          <div
            className="th-code"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "8px 12px",
              border: "1px solid var(--th-border, #e5e7eb)",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {onlineCode || "—"}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => onlineCode && navigator.clipboard?.writeText(onlineCode)}
              title="Copy code"
              style={{ marginLeft: 8 }}
            >
              Copy
            </button>
          </div>

          {online.expiresAt && !expiredOnline && (
            <div style={{ marginTop: 6 }}>
              <ExpiryCountdown expiresAt={online.expiresAt} onExpire={() => setExpiredOnline(true)} />
            </div>
          )}
          {expiredOnline && (
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn btn--primary" onClick={handleOnlineClick}>
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Claim modal for manual (handles grants & validation) */}
      {showClaimModal && assignedId && (
        <ClaimModal
          assignedOfferId={assignedId}
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          onCreated={handleManualCreated}
          grantMode={expectsGrants}
        />
      )}
    </div>
  );
};

export default OfferCard;
