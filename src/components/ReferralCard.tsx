import React from "react";
import { ReferralDTO } from "../types/referral";
import { Link, useNavigate } from "react-router-dom";
import "../css/ui-forms.css";

import { AvatarOrPlaceholder } from "../utils/uiHelper";
import { getAttachedInfo } from "../types/referral";

interface ReferralCardProps {
  referral: ReferralDTO;
  userId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  onCopyReferralLink?: () => void;
}

/** Inline chip: show avatar ONLY when there is an image; otherwise just the link text */
const InlinePerson: React.FC<{
  to: string;
  imageUrl?: string | null;
  name?: string | null;
  you?: boolean;
}> = ({ to, imageUrl, name, you }) => (
  <span
    className="inline-person"
    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
  >
    {imageUrl ? (
      <AvatarOrPlaceholder
        src={imageUrl}
        name={name ?? undefined}
        size={20}
        showLabel={false}
      />
    ) : null}
    <Link to={to} className="th-link" onClick={(e) => e.stopPropagation()}>
      {you ? "You" : name || "Unknown"}
    </Link>
  </span>
);

const ReferralCard: React.FC<ReferralCardProps> = ({
  referral,
  userId,
  onAccept,
  onReject,
  onCancel,
  onCopyReferralLink,
}) => {
  const navigate = useNavigate();

  const isYouReferrer = referral.referrerId === userId;
  const isYouProspect = referral.prospectId === userId;
  const isYouBusiness = referral.businessId === userId;

  const refTo = `/profile/${referral.referrerProfileSlug || referral.referrerId}`;
  const prosTo = `/profile/${referral.prospectProfileSlug || referral.prospectId}`;
  const bizTo = `/profile/${referral.businessProfileSlug || referral.businessId}`;

  const attached = getAttachedInfo(referral);

  const roleLabel = isYouReferrer
    ? "You’re the referrer"
    : isYouProspect
    ? "You’re the prospect"
    : isYouBusiness
    ? "You’re the business"
    : null;

  const canAcceptOrReject =
    (referral.status === "PENDING" || referral.status === "PARTIALLY_ACCEPTED") &&
    ((isYouProspect && referral.prospectAcceptanceStatus === "PENDING") ||
      (isYouBusiness && referral.businessAcceptanceStatus === "PENDING"));

  const canCancel =
    referral.referrerId === userId &&
    (referral.status === "PENDING" || referral.status === "PARTIALLY_ACCEPTED");

  const userAcceptanceStatus = isYouProspect
    ? referral.prospectAcceptanceStatus
    : isYouBusiness
    ? referral.businessAcceptanceStatus
    : undefined;

  const threadUrl = `/referral/${referral.slug}/thread`;

  const openThread = () => {
    if (!referral.slug) return;
    navigate(threadUrl);
  };

  const onCardKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    // Support Enter/Space like an inbox row
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openThread();
    }
  };

  return (
    <div
      onClick={openThread}
      onKeyDown={onCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Open referral thread"
      className="card ref-card card--clickable ref-card--canvas"
      style={{
        position: "relative",
        paddingRight: 44, // reserve gutter for chevron so it never crowds content
      }}
    >
      {/* Chevron gutter (always visible, vertically centered) */}
      <div
        className="ref-card__chevron"
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted, #94a3b8)",
          fontSize: 22,
          lineHeight: 1,
          pointerEvents: "none", // ✅ important: chevron never steals clicks from canvas
          userSelect: "none",
        }}
      >
        ›
      </div>

      {/* Tokenized sentence */}
      <div
        className="ref-card__line ref-card__line--tokens"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          lineHeight: 1.35,
        }}
      >
        <InlinePerson
          to={refTo}
          imageUrl={referral.referrerProfileImageUrl}
          name={referral.referrerName}
          you={isYouReferrer}
        />
        <span className="inline-text" style={{ display: "inline-flex", alignItems: "center" }}>
          {isYouReferrer ? "have referred" : "has referred"}
        </span>
        <InlinePerson
          to={prosTo}
          imageUrl={referral.prospectProfileImageUrl}
          name={referral.prospectName}
          you={isYouProspect}
        />
        <span className="inline-text" style={{ display: "inline-flex", alignItems: "center" }}>
          to
        </span>
        <InlinePerson
          to={bizTo}
          imageUrl={referral.businessProfileImageUrl}
          name={referral.businessName}
          you={isYouBusiness}
        />
      </div>

      {/* Optional product/bundle hint */}
      {attached && (
        <div className="referral-note" style={{ marginTop: 6 }}>
          on{" "}
          <Link to={attached.url} className="th-link" onClick={(e) => e.stopPropagation()}>
            {attached.title}
          </Link>
        </div>
      )}
      {/* Optional campaign context */}
      {referral.campaignTitle && (
        <div className="referral-note" style={{ marginTop: 4 }}>
          As part of campaign: {referral.campaignTitle}
        </div>
      )}

      {/* Note */}
      {referral.note && <div className="th-muted ref-card__note">{referral.note}</div>}

      {/* Meta: status (left) and timestamp (right) */}
      <div
        className="ref-card__meta"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <div className="ref-card__meta-left">
          <span className="th-muted">Referral Status:</span>{" "}
          <span className="ref-card__status" style={{ fontWeight: 600, textTransform: "capitalize" }}>
            {referral.status.toLowerCase()}
          </span>

          {roleLabel && <span className="ref-card__role-chip">{roleLabel}</span>}
        </div>

        <div className="meta-right" style={{ color: "var(--muted, #94a3b8)" }}>
          {new Date(referral.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Your response (if applicable) */}
      {userAcceptanceStatus && (
        <div className="th-muted" style={{ marginTop: 6 }}>
          Your Response:{" "}
          <span style={{ textTransform: "capitalize" }}>{String(userAcceptanceStatus).toLowerCase()}</span>
        </div>
      )}

      {/* Actions */}
      <div className="th-row th-right ref-card__actions" style={{ marginTop: 8, gap: 6 }}>
        {canAcceptOrReject && (
          <>
            <button
              className="btn btn--primary btn--sm"
              onClick={(e) => {
                e.stopPropagation();
                onAccept?.(referral.id);
              }}
            >
              Accept
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(referral.id);
              }}
            >
              Reject
            </button>
          </>
        )}

        {canCancel && (
          <button
            className="btn btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.(referral.id);
            }}
          >
            Cancel Referral
          </button>
        )}

        {onCopyReferralLink && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={(e) => {
              e.stopPropagation();
              onCopyReferralLink();
            }}
          >
            Copy referral link
          </button>
        )}
      </div>
    </div>
  );
};

export default ReferralCard;
