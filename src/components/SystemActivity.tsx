import React from "react";

import {
  ContactEventMetadata,
  SystemAlertMetadata
 } from "../types/referral";
import "../css/ReferralThread.css";


export const SystemActivity: React.FC<{
  metadata: ContactEventMetadata | SystemAlertMetadata;
  timestamp: string;
}> = ({ metadata, timestamp }) => {
  const content = metadata?.message || JSON.stringify(metadata);

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
