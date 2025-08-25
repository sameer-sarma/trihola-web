import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/ReferralThread.css";
import { fetchClaimDetails, fetchOfferDetails, markClaimExpired } from "../services/offerService";
import { supabase } from "../supabaseClient";

interface OfferActivityMetadata {
  offerId?: string;
  claimId?: string;
}

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "REDEEMED";
type ClaimPolicy = "ONLINE" | "MANUAL" | "BOTH";

const asClaimStatus = (s: string | null | undefined): ClaimStatus | null => {
  switch (s) {
    case "PENDING":
    case "APPROVED":
    case "REJECTED":
    case "EXPIRED":
    case "REDEEMED":
      return s;
    default:
      return null;
  }
};

const asClaimPolicy = (s: string | null | undefined): ClaimPolicy | null => {
  switch (s) {
    case "ONLINE":
    case "MANUAL":
    case "BOTH":
      return s;
    default:
      return null;
  }
};

interface OfferActivityProps {
  timestamp: string;
  actorName: string;
  offerTitle: string;
  recipientName: string;
  eventSubType: string;
  content: string;
  metadata?: OfferActivityMetadata;
  currentUserId?: string;
  isBusinessOnReferral?: boolean;
  onApproveClaim?: (claimId: string) => void;
}

const OfferActivity: React.FC<OfferActivityProps> = ({
  timestamp,
  actorName,
  offerTitle,
  recipientName,
  eventSubType,
  content,
  metadata,
  isBusinessOnReferral,
  onApproveClaim,
}) => {
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [claimExpiresAt, setClaimExpiresAt] = useState<string | null>(null);
  const [claimPolicy, setClaimPolicy] = useState<ClaimPolicy | null>(null);
  const [token, setToken] = useState<string | null>(null); // NEW: keep token so we can call expire later too

  // Guard so we POST /expire only once per claim
  const sentExpireOnceRef = useRef<Record<string, true>>({});

  const trimmedContent = content?.trim();
  const displayMessage =
    trimmedContent
      ? trimmedContent
      : eventSubType === "OFFER_ASSIGNED"
      ? `${actorName} assigned the offer “${offerTitle}” to the ${recipientName?.toLowerCase() || "recipient"}.`
      : `${actorName} updated the offer “${offerTitle}”.`;

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token ?? null;
      setToken(tok);
      if (!tok || !metadata?.claimId) return;

      try {
        // 1) Claim
        const claim = await fetchClaimDetails(tok, metadata.claimId);
        const narrowedStatus = asClaimStatus(claim?.status);
        const expiresAt: string | null = claim?.expiresAt ?? null;

        // Pending → Expired based on timestamp, and reconcile with server once
        let effective: ClaimStatus | null = narrowedStatus;
        if (effective === "PENDING" && expiresAt) {
          const expMs = new Date(expiresAt).getTime();
          if (!Number.isNaN(expMs) && expMs < Date.now()) {
            effective = "EXPIRED";
            if (!sentExpireOnceRef.current[claim.id]) {
              sentExpireOnceRef.current[claim.id] = true;
              markClaimExpired(tok, claim.id).catch(() => {/* best-effort */});
            }
          }
        }

        if (effective) setClaimStatus(effective);
        setClaimExpiresAt(expiresAt);

        // 2) Assigned offer → claimPolicy
        let policy: ClaimPolicy | null = null;
        if (claim?.assignedOfferId) {
          const assigned = await fetchOfferDetails(tok, claim.assignedOfferId);
          policy = asClaimPolicy(assigned?.claimPolicy) || null;
        }
        setClaimPolicy(policy);
      } catch (e) {
        console.error("OfferActivity load error:", e);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata?.claimId]); // keep minimal deps like your original

  // Auto flip to expired while open (UI), and reconcile server once
  useEffect(() => {
    if (claimStatus !== "PENDING" || !claimExpiresAt) return;
    const expMs = new Date(claimExpiresAt).getTime();
    if (Number.isNaN(expMs)) return;

    const id = setInterval(() => {
      if (Date.now() > expMs) {
        setClaimStatus("EXPIRED");
        const claimId = metadata?.claimId;
        if (token && claimId && !sentExpireOnceRef.current[claimId]) {
          sentExpireOnceRef.current[claimId] = true;
          markClaimExpired(token, claimId).catch(() => {/* best-effort */});
        }
      }
    }, 30_000);

    return () => clearInterval(id);
  }, [claimStatus, claimExpiresAt, metadata?.claimId, token]);

  const canApprove = useMemo(() => {
    const inactive =
      claimStatus === "APPROVED" ||
      claimStatus === "REJECTED" ||
      claimStatus === "EXPIRED";

    // Only MANUAL or BOTH allow business-side approval (never ONLINE)
    const policyAllows = claimPolicy === "MANUAL" || claimPolicy === "BOTH";

    return (
      !!onApproveClaim &&
      !inactive &&
      isBusinessOnReferral &&
      !!metadata?.claimId &&
      policyAllows
    );
  }, [claimStatus, claimPolicy, isBusinessOnReferral, metadata?.claimId, onApproveClaim]);

  const claimId = metadata?.claimId;

  return (
    <div
      className="event-card"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <p className="referral-line" style={{ margin: 0 }}>
        {displayMessage}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {canApprove && claimId && (
          <button
            className="approve-claim-button"
            onClick={() => onApproveClaim?.(claimId)}
            style={{
              padding: "4px 8px",
              fontSize: "0.8rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ✅ Approve Claim
          </button>
        )}

        <small style={{ whiteSpace: "nowrap", color: "#6b7280", fontSize: "0.75rem" }}>
          {new Date(timestamp).toLocaleString()}
        </small>
      </div>
    </div>
  );
};

export default OfferActivity;
