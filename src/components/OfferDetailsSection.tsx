import React from "react";
import "../css/ui-forms.css";

interface Props {
  title?: string;
  text?: string | null;
}

const OfferDetailsSection: React.FC<Props> = ({ title = "Details", text }) => {
  const body = (text ?? "").trim();
  if (!body) return null;
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="section-header">{title}</div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
};

export default OfferDetailsSection;
