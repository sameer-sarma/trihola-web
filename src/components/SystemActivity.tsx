import React from "react";

import {
  ReferralThreadEventDTO,
  ReferralThreadEventType,
  MessageMetadata,
  OfferEventMetadata,
  ReferralEventMetadata,
  ContactEventMetadata,
  SystemAlertMetadata
 } from "../types/referral";
import "../css/ReferralThread.css";


export const SystemActivity: React.FC<{
  eventType: string;
  metadata: ContactEventMetadata | SystemAlertMetadata;
  timestamp: string;
}> = ({ eventType, metadata, timestamp }) => {
  let content = metadata?.message || JSON.stringify(metadata);

  return (
    <div
      className="event-card"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <p className="referral-line" style={{ margin: 0 }}>
        {content}
      </p>
      <small style={{ marginLeft: "1rem", whiteSpace: "nowrap", color: "#6b7280" }}>
        {new Date(timestamp).toLocaleString()}
      </small>
    </div>
  );
};

export default SystemActivity;
