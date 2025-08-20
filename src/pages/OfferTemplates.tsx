import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOfferTemplates } from "../services/offerTemplateService";
import { OfferTemplateResponse } from "../types/offerTemplateTypes";
import "../css/forms.css";
import "../css/cards.css";

interface Props {
  profile: {
    registeredAsBusiness?: boolean;
  };
  token: string;
  userId: string;
}

const OfferTemplates: React.FC<Props> = ({ profile, token }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<OfferTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // local filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | OfferTemplateResponse["offerType"]>("");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    if (!profile.registeredAsBusiness || !token) return;

    fetchOfferTemplates(token)
      .then(setTemplates)
      .catch((err) => {
        console.error("Error fetching templates:", err);
        setError("Failed to load offer templates");
      })
      .finally(() => setLoading(false));
  }, [profile, token]);

  const filtered = useMemo(() => {
    let items = templates.slice();

    if (q.trim()) {
      const needle = q.toLowerCase();
      items = items.filter((t) =>
        [
          t.templateTitle,
          t.description,
          t.specialTerms ?? "",
          t.eligibility ?? "",
          t.productName ?? "",
          t.serviceName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }

    if (typeFilter) items = items.filter((t) => t.offerType === typeFilter);
    if (activeOnly) items = items.filter((t) => t.isActive);

    // sort: updatedAt desc (fallback to title)
    items.sort((a, b) => {
      const au = a.updatedAt ?? "";
      const bu = b.updatedAt ?? "";
      if (au && bu) return bu.localeCompare(au);
      return a.templateTitle.localeCompare(b.templateTitle);
    });

    return items;
  }, [templates, q, typeFilter, activeOnly]);

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

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card">
          <p className="help">Access denied. You must be registered as a business to view offer templates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="form-card">
          <p className="help">Loading offer templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="form-card">
          <p className="help" style={{ color: "#b91c1c" }}>{error}</p>
        </div>
      </div>
    );
  }

  const filtersActive = q.trim() || typeFilter || activeOnly;

  return (
    <div className="page-wrap">
      {/* header */}
      <div className="meta-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Your Offer Templates</h2>
        <button onClick={() => navigate("/add-offer-template")} className="btn btn--primary">
          + New Template
        </button>
      </div>

      {/* filter bar */}
      <div className="form-card" style={{ marginBottom: 16 }}>
        <div className="form" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div className="section-grid">
            <div className="form-group">
              <label className="label">Search</label>
              <input
                className="input"
                type="text"
                placeholder="Search by title, details or terms"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">Type</label>
              <select
                className="select"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter((e.target.value || "") as typeof typeFilter)
                }
              >
                <option value="">All types</option>
                <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
                <option value="FIXED_DISCOUNT">Fixed Discount</option>
                <option value="FREE_PRODUCT">Free Product</option>
                <option value="FREE_SERVICE">Free Service</option>
              </select>
            </div>

            <div className="form-group form-group--inline">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                />
                Show Active only
              </label>
            </div>
          </div>

          <div className="meta-row" style={{ justifyContent: "space-between" }}>
            <span className="help">
              Showing {filtered.length} of {templates.length}
            </span>
            {filtersActive ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setQ("");
                  setTypeFilter("");
                  setActiveOnly(false);
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* content */}
      {filtered.length === 0 ? (
        <div className="form-card">
          <p className="help">No offer templates match your filters.</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((template) => (
            <div key={template.offerTemplateId} className="card">
              <h3 className="card__title">{template.templateTitle}</h3>
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

              <div className="help" style={{ marginTop: 8 }}>
                {renderTypeSpecific(template)}
              </div>

              {template.specialTerms && (
                <p className="help" style={{ marginTop: 8, fontStyle: "italic" }}>
                  * {template.specialTerms}
                </p>
              )}

              <div className="card__footer">
                <a className="card__link" onClick={() => navigate(`/offer-template/${template.offerTemplateId}`)}>View</a>
                <a className="card__link" onClick={() => navigate(`/offer-template/${template.offerTemplateId}/edit`)}>Edit</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfferTemplates;
