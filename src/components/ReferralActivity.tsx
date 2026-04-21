import React from "react";
import "../css/ReferralThread.css";

interface ReferralActivityProps {
  slug: string;
  content: string;
  timestamp: string;
}

const ReferralActivity: React.FC<ReferralActivityProps> = ({
  content,
  timestamp,
}) => {

return (
  <div className="event-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <p className="referral-line" style={{ margin: 0 }}>{content}</p>
    <small style={{ marginLeft: '1rem', whiteSpace: 'nowrap', color: '#6b7280' }}>
      {new Date(timestamp).toLocaleString()}
    </small>
  </div>
);
};

export default ReferralActivity;
