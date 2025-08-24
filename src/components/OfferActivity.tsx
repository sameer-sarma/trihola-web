import React, { useEffect, useMemo, useState } from "react";
import "../css/ReferralThread.css";
import { fetchClaimDetails } from "../services/offerService";
import { supabase } from "../supabaseClient";

interface OfferActivityMetadata {
  offerId?: string;
  claimId?: string;
}

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
type ClaimApprovalPolicy = "BOTH" | "MANUAL" | "OFFLINE";

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
  const [approvalPolicy, setApprovalPolicy] = useState<ClaimApprovalPolicy | null>(null);

  const trimmedContent = content?.trim();
  const displayMessage =
    trimmedContent
      ? trimmedContent
      : eventSubType === "OFFER_ASSIGNED"
      ? `${actorName} assigned the offer “${offerTitle}” to the ${recipientName?.toLowerCase() || "recipient"}.`
      : `${actorName} updated the offer “${offerTitle}”.`;

  // Load claim details (status, expiresAt, approval policy)
  useEffect(() => {
    const loadStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !metadata?.claimId) return;

      try {
        // Expecting: { status, expiresAt, approvalPolicy }
        const claim = await fetchClaimDetails(token, metadata.claimId);

        const rawStatus: ClaimStatus = claim.status;
        const expiresAt: string | null = claim.expiresAt ?? null; // ISO string or null
        const policy: ClaimApprovalPolicy | null = claim.approvalPolicy ?? null;

        // Compute EXPIRED if pending & past expiry
        let effectiveStatus: ClaimStatus = rawStatus;
        if (rawStatus === "PENDING" && expiresAt) {
          const now = Date.now();
          const expMs = new Date(expiresAt).getTime();
          if (!Number.isNaN(expMs) && expMs < now) {
            effectiveStatus = "EXPIRED";
          }
        }

        setClaimStatus(effectiveStatus);
        setClaimExpiresAt(expiresAt);
        setApprovalPolicy(policy);
      } catch (err) {
        console.error("Failed to fetch offer/claim status", err);
      }
    };

    loadStatus();
  }, [metadata?.claimId]);

  // Optional: re-evaluate pending→expired edge while user keeps the thread open
  useEffect(() => {
    if (claimStatus !== "PENDING" || !claimExpiresAt) return;
    const expMs = new Date(claimExpiresAt).getTime();
    if (Number.isNaN(expMs)) return;

    const tick = () => {
      if (Date.now() > expMs) setClaimStatus("EXPIRED");
    };

    // check every 30s
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [claimStatus, claimExpiresAt]);

  const canApprove = useMemo(() => {
    const isClaimInactive =
      claimStatus === "APPROVED" ||
      claimStatus === "REJECTED" ||
      claimStatus === "EXPIRED";

    // Only allow manual approval if policy is MANUAL or BOTH
    const policyAllowsApproval =
      approvalPolicy === "MANUAL" || approvalPolicy === "BOTH";

    const result =
      !!onApproveClaim &&
      !isClaimInactive &&
      isBusinessOnReferral &&
      !!metadata?.claimId &&
      policyAllowsApproval;

    return result;
  }, [claimStatus, approvalPolicy, isBusinessOnReferral, metadata?.claimId, onApproveClaim]);

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
