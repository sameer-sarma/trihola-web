import React from "react";
import "../css/ReferralThread.css";
import { useEffect, useState, useMemo } from "react";
import { fetchClaimDetails } from "../services/offerService";
import { supabase } from "../supabaseClient";

interface OfferActivityMetadata {
  offerId?: string;
  claimId?: string;
}

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
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const trimmedContent = content?.trim();
  const displayMessage =
  trimmedContent
    ? trimmedContent
    : eventSubType === "OFFER_ASSIGNED"
      ? `${actorName} assigned the offer “${offerTitle}” to the ${recipientName?.toLowerCase() || "recipient"}.`
      : `${actorName} updated the offer “${offerTitle}”.`;


 useEffect(() => {
    const loadStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      try {
        if (metadata?.claimId) {
          const claim = await fetchClaimDetails(token, metadata.claimId); // Must return claim.status
          setClaimStatus(claim.status); // e.g., "PENDING", "APPROVED"
        }
      } catch (err) {
        console.error("Failed to fetch offer/claim status", err);
      }
    };

    loadStatus();
  }, [metadata?.offerId, metadata?.claimId]);
  
const canApprove = useMemo(() => {
  const isClaimInactive =
    claimStatus === "APPROVED" ||
    claimStatus === "REJECTED" ||
    claimStatus === "EXPIRED";

  const result =
    !isClaimInactive &&
    isBusinessOnReferral &&
    !!metadata?.claimId;

  console.log("🧮 claimStatus:", claimStatus);
  console.log("🧮 isClaimInactive:", isClaimInactive);
  console.log("🧮 Derived canApprove:", result);
  return result;
}, [claimStatus, isBusinessOnReferral, metadata?.claimId]);

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
