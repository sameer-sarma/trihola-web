// src/components/OfferActivity.tsx
import React from "react";
import "../css/ui-forms.css";
import "../css/cards.css";

type Activity = {
  id: string;
  createdAt: string;           // ISO
  eventType: string;           // e.g. CLAIM_REQUESTED_MANUAL, CLAIM_APPROVED, CLAIM_EXPIRED
  actorName?: string;          // e.g. "Sameer Sarma"
  offerTitle?: string;         // e.g. "Grant"
  content?: string;               // pre-rendered message (preferred if present)
  metadata?: any;              // optional, for message fallback
};

interface Props {
  activity: Activity;
  isBusinessOnReferral?: boolean; // kept for API compatibility; not used here
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "—";

// Build a readable line without hitting the network.
// Uses `text` if provided; otherwise derives from eventType + metadata.
function toLine(a: Activity): string {
  if (a.content) return a.content;

  const m = a.metadata ?? {};
  const who = m.actorName ?? a.actorName ?? "Someone";
  const title = m.offerTitle ?? a.offerTitle ?? "offer";
  const claimant = m.claimantName ? ` for ${m.claimantName}` : "";

  switch ((a.eventType || "").toUpperCase()) {
    case "CLAIM_REQUESTED_MANUAL":
      return `${who} requested an in-store QR for "${title}".`;
    case "CLAIM_REQUESTED_ONLINE":
      return `${who} generated an online code for "${title}".`;
    case "CLAIM_APPROVED":
      return `${who} approved redemption of "${title}"${claimant}.`;
    case "CLAIM_REJECTED":
      return `${who} rejected the claim for "${title}"${claimant}.`;
    case "CLAIM_EXPIRED":
    case "CLAIM_TIMED_OUT":
      return "Claim has timed out";
    default:
      return m.message ?? a.eventType ?? "Activity";
  }
}

const OfferActivity: React.FC<Props> = ({ activity }) => {
  return (
    <div className="activity-row" style={{ margin: "6px 0" }}>
      <div
        className="bubble"
        style={{
          display: "inline-block",
          background: "#f3f4f6",
          padding: "10px 14px",
          borderRadius: 18,
          boxShadow: "0 1px 1px rgba(0,0,0,0.04)",
        }}
      >
        {toLine(activity)}
      </div>
      <div
        className="timestamp"
        style={{ fontSize: 12, color: "#6b7280", marginLeft: 8, display: "inline-block" }}
      >
        {fmt(activity.createdAt)}
      </div>
    </div>
  );
};

export default React.memo(OfferActivity);
