// src/components/OfferActivity.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/ReferralThread.css";
import {
  fetchClaimDetails,
  fetchOfferDetails,
  markClaimExpired,
} from "../services/offerService";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  ClaimStatus,
  ClaimPolicy,
  OfferClaimDTO,
  ClaimSource,
} from "../types/offer";
import BusinessApproveClaim from "./BusinessApproveClaim";

interface OfferActivityProps {
  timestamp: string;
  actorName: string;
  offerTitle: string;     // still allowed in props, just not destructured
  recipientName: string;  // "
  eventSubType: string;   // "
  content: string;
  metadata?: { claimId?: string };
  isBusinessOnReferral: boolean;
  onApproveClaim?: (claimId: string) => void;
  currentUserId?: string;
}

const asClaimStatus = (raw?: string): ClaimStatus | null => {
  if (!raw) return null;
  const val = raw.toUpperCase();
  if (["PENDING", "APPROVED", "REJECTED", "EXPIRED"].includes(val)) {
    return val as ClaimStatus;
  }
  return null;
};

const asClaimPolicy = (raw?: string): ClaimPolicy | null => {
  if (!raw) return null;
  const val = raw.toUpperCase();
  if (["ONLINE", "MANUAL", "BOTH"].includes(val)) {
    return val as ClaimPolicy;
  }
  return null;
};

const OfferActivity: React.FC<OfferActivityProps> = ({
  timestamp,
  actorName,
  // offerTitle, recipientName, eventSubType  ← intentionally not destructured
  content,
  metadata,
  isBusinessOnReferral,
  onApproveClaim,
  currentUserId,
}) => {
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [claimExpiresAt, setClaimExpiresAt] = useState<string | null>(null);
  const [claimPolicy, setClaimPolicy] = useState<ClaimPolicy | null>(null);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [claimantId, setClaimantId] = useState<string | null>(null);
  const [claimSource, setClaimSource] = useState<"MANUAL" | "ONLINE" | null>(null);
  const navigate = useNavigate();

  const sentExpireOnceRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token ?? null;
      if (!tok || !metadata?.claimId) return;

      try {
        const claim: OfferClaimDTO | null = await fetchClaimDetails(tok, metadata.claimId);
        setDiscountCode(claim?.discountCode ?? null);
        setClaimantId(claim?.claimantId ?? null);
        setClaimSource((claim?.claimSource as ClaimSource) ?? null);

        let effective = asClaimStatus(claim?.status);
        const expiresAt: string | null = claim?.expiresAt ?? null;

        if (effective === "PENDING" && expiresAt) {
          const expMs = new Date(expiresAt).getTime();
          if (!Number.isNaN(expMs) && expMs < Date.now()) {
            effective = "EXPIRED";
            if (claim && !sentExpireOnceRef.current[claim.id]) {
              sentExpireOnceRef.current[claim.id] = true;
              markClaimExpired(tok, claim.id).catch(() => { /* best-effort */ });
            }
          }
        }

        if (effective) setClaimStatus(effective);
        setClaimExpiresAt(expiresAt);

        // Offer claimPolicy
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
  }, [metadata?.claimId]);

  const canApprove = useMemo(() => {
    const inactive =
      claimStatus === "APPROVED" ||
      claimStatus === "REJECTED" ||
      claimStatus === "EXPIRED";

    const policyAllows = claimPolicy === "MANUAL" || claimPolicy === "BOTH";

    return (
      !!onApproveClaim &&
      !inactive &&
      isBusinessOnReferral &&
      !!metadata?.claimId &&
      policyAllows
    );
  }, [claimStatus, claimPolicy, isBusinessOnReferral, metadata?.claimId, onApproveClaim]);

  const isExpired = useMemo(() => {
    if (!claimExpiresAt) return false;
    const expMs = new Date(claimExpiresAt).getTime();
    return !Number.isNaN(expMs) && expMs < Date.now();
  }, [claimExpiresAt]);

  const isMine = currentUserId && claimantId && currentUserId === claimantId;

  const showQr = () => {
    if (!isMine || claimSource !== "MANUAL") return;
    const qrValue = `https://www.trihola.com/redeem-offer?claimId=${encodeURIComponent(
      metadata!.claimId!
    )}&code=${encodeURIComponent(discountCode ?? "")}`;
    navigate("/qr", {
      state: {
        qrValue,
        title: "Present this QR to the business",
        subtitle: "They'll approve it to redeem the offer",
        footer: claimExpiresAt ? `Expires at ${new Date(claimExpiresAt).toLocaleString()}` : undefined,
        size: 256,
      },
    });
  };

  const copyCode = async () => {
    if (!discountCode) return;
    try { await navigator.clipboard.writeText(discountCode); } catch {}
    alert("Code copied");
  };

  const displayMessage = content || `${actorName} acted on offer`;

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
        {/* Claimant-side affordances */}
        {isMine && claimStatus === "PENDING" && claimSource === "MANUAL" && !isExpired  && (
          <button
            onClick={showQr}
            style={{
              padding: "4px 8px",
              fontSize: "0.8rem",
              backgroundColor: "#111827",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🧾 Show QR
          </button>
        )}

        {isMine && claimSource === "ONLINE" && discountCode && !isExpired  && (
          <button
            onClick={copyCode}
            style={{
              padding: "4px 8px",
              fontSize: "0.8rem",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔐 Copy Code
          </button>
        )}

        {/* Business-side approval for manual claims */}
        {canApprove && metadata?.claimId && (
          <BusinessApproveClaim
            claimId={metadata.claimId}
            canApprove={!!canApprove}                // from your computed memo
            claimPolicy={claimPolicy ?? "BOTH"}      // already loaded from assigned offer
            expiresAt={claimExpiresAt ?? undefined}  // already in state
            onApproved={() => onApproveClaim?.(metadata.claimId!)}
          />
        )}
        <small
          style={{
            whiteSpace: "nowrap",
            color: "#6b7280",
            fontSize: "0.75rem",
          }}
        >
          {new Date(timestamp).toLocaleString()}
        </small>
      </div>
    </div>
  );
};

export default OfferActivity;
