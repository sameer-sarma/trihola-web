import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchOfferTemplateById } from "../services/offerTemplateService";
import { OfferTemplateResponse } from "../types/offerTemplateTypes";
import "../css/cards.css";
import "../css/forms.css";

interface Props {
  token: string;
}

const OfferTemplateDetails: React.FC<Props> = ({ token }) => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<OfferTemplateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId || !token) return;
    fetchOfferTemplateById(templateId, token)
      .then(setTemplate)
      .catch(() => setError("Failed to load offer template details"));
  }, [templateId, token]);

  const formatType = (t: OfferTemplateResponse["offerType"]) =>
    t.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  const renderTypeSpecific = (t: OfferTemplateResponse) => {
    switch (t.offerType) {
      case "PERCENTAGE_DISCOUNT":
        return (
          <>
            Discount: {t.discountPercentage}%{t.maxDiscountAmount != null ? ` (Max ₹${t.maxDiscountAmount})` : ""}
          </>
        );
      case "FIXED_DISCOUNT":
        return <>Flat Discount: ₹{t.discountAmount}</>;
      case "FREE_PRODUCT":
        return <>Free Product: {t.productName}</>;
      case "FREE_SERVICE":
        return <>Free Service: {t.serviceName}</>;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="page-wrap">
        <div className="form-card">
          <p className="help" style={{ color: "#b91c1c" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="page-wrap">
        <div className="form-card">
          <p className="help">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="card">
        <h1 className="page-title" style={{ marginBottom: 8 }}>{template.templateTitle}</h1>
        <p className="card__desc">{template.description}</p>

        <div className="card__meta">
          <span className="pill pill--info">Type: {formatType(template.offerType)}</span>
          <span className={`pill ${template.isActive ? "pill--ok" : "pill--muted"}`}>
            {template.isActive ? "Active" : "Inactive"}
          </span>
          {typeof template.maxRedemptions === "number" && (
            <span className="pill">Max: {template.maxRedemptions}</span>
          )}
          {template.claimPolicy && (
            <span className="pill pill--info">Claims: {template.claimPolicy}</span>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="meta-row">
            <strong>Summary:</strong>
            <span>{renderTypeSpecific(template)}</span>
          </div>

          {template.minPurchaseAmount != null && (
            <div className="meta-row">
              <strong>Min Purchase:</strong>
              <span>₹{template.minPurchaseAmount}</span>
            </div>
          )}

          {template.eligibility && (
            <div style={{ marginTop: 12 }}>
              <div className="label">Eligibility</div>
              <p className="help" style={{ marginTop: 4 }}>{template.eligibility}</p>
            </div>
          )}

          {template.specialTerms && (
            <div style={{ marginTop: 12 }}>
              <div className="label">Special Terms</div>
              <p className="help" style={{ marginTop: 4, fontStyle: "italic" }}>{template.specialTerms}</p>
            </div>
          )}
        </div>

        <div className="actions">
          <button
            onClick={() => navigate(`/offer-template/${template.offerTemplateId}/edit`)}
            className="btn btn--primary"
          >
            Edit Template
          </button>
          <button className="btn btn--ghost" onClick={() => navigate("/offer-templates")}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferTemplateDetails;
