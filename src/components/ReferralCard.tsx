import React from "react";
import { ReferralDTO } from "../types/referral";
import { Link, useNavigate } from "react-router-dom";
import "../css/Referral.css";

interface ReferralCardProps {
  referral: ReferralDTO;
  userId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const ReferralCard: React.FC<ReferralCardProps> = ({
  referral,
  userId,
  onAccept,
  onReject,
  onCancel,
}) => {
  const navigate = useNavigate();

  const isYouReferrer = referral.referrerId === userId;
  const isYouProspect = referral.prospectId === userId;
  const isYouBusiness = referral.businessId === userId;

const getNameOrYou = (id: string, name?: string, slug?: string) =>
  id === userId ? (
    <span className="font-semibold text-gray-800">You</span>
  ) : (
    <Link
      to={`/profile/${slug || id}`} // ✅ Use slug if available
      onClick={(e) => e.stopPropagation()}
      className="text-blue-600 hover:underline font-medium"
    >
      {name || "Unknown"}
    </Link>
  );

const referralLine = (
  <span>
    {getNameOrYou(referral.referrerId, referral.referrerName, referral.referrerSlug)}{" "}
    {isYouReferrer ? "have" : "has"} referred{" "}
    {getNameOrYou(referral.prospectId, referral.prospectName, referral.prospectSlug)} to{" "}
    {getNameOrYou(referral.businessId, referral.businessName, referral.businessSlug)}
  </span>
);

const canAcceptOrReject =
  (referral.status === "PENDING" || referral.status === "PARTIALLY_ACCEPTED") &&
  ((isYouProspect && referral.prospectAcceptanceStatus === "PENDING") ||
    (isYouBusiness && referral.businessAcceptanceStatus === "PENDING"));

  const canCancel =
    isYouReferrer && (referral.status === "PENDING" || referral.status === "PARTIALLY_ACCEPTED");

  const userAcceptanceStatus = isYouProspect
    ? referral.prospectAcceptanceStatus
    : isYouBusiness
    ? referral.businessAcceptanceStatus
    : undefined;

  return (
<div onClick={() => navigate(`/referral/${referral.slug}/thread`)} className="referral-card">
  <div className="referral-line">{referralLine}</div>

  <div className="referral-note">{referral.note}</div>

  <div className="status-meta">
    <span>
      Referral Status: <span className="capitalize font-medium">{referral.status}</span>
    </span>
    <span>{new Date(referral.createdAt).toLocaleString()}</span>
  </div>

  {userAcceptanceStatus && (
    <div className="response-status">
      Your Response: <span>{userAcceptanceStatus.toLowerCase()}</span>
    </div>
  )}

  <div className="action-buttons">
    {canAcceptOrReject && (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAccept?.(referral.id);
          }}
          className="accept-btn"
        >
          Accept
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject?.(referral.id);
          }}
          className="reject-btn"
        >
          Reject
        </button>
      </>
    )}

    {canCancel && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel?.(referral.id);
        }}
        className="cancel-btn"
      >
        Cancel Referral
      </button>
    )}
  </div>
</div>
  );
};

export default ReferralCard;
