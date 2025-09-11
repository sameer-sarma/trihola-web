import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOfferTemplates } from "../services/offerTemplateService";
import { OfferTemplateResponse } from "../types/offerTemplateTypes";
import "../css/ui-forms.css";             // ← use centralized styles
import "../css/cards.css";

interface Props {
  profile: {
    registeredAsBusiness?: boolean;
  };
  token: string;
  userId: string;
}

// Helper: prettify type
const prettyType = (t: string) =>
  t === "PERCENTAGE_DISCOUNT" ? "Percentage discount" :
  t === "FIXED_DISCOUNT"      ? "Fixed discount" :
  t === "GRANT"               ? "Grant" :
  (t || "").replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());

// "Applies" label without exposing IDs
function appliesLabel(t: any) {
  const at = t?.appliesToType || "ANY_PURCHASE";
  if (at === "PRODUCT") return "Product";
  if (at === "BUNDLE")  return "Bundle";
  return "Any purchase";
}

function grantsSummary(grants: Array<{ itemType: "PRODUCT" | "BUNDLE"; quantity?: number }> = []) {
  if (!grants.length) return "None";
  const counts = grants.reduce((acc, g) => {
    const key = g.itemType;
    acc[key] = (acc[key] || 0) + (g.quantity ?? 1);
    return acc;
  }, {} as Record<"PRODUCT" | "BUNDLE", number>);
  const parts: string[] = [];
  if (counts.PRODUCT) parts.push(`${counts.PRODUCT} product${counts.PRODUCT > 1 ? "s" : ""}`);
  if (counts.BUNDLE)  parts.push(`${counts.BUNDLE} bundle${counts.BUNDLE > 1 ? "s" : ""}`);
  return parts.join(" · ");
}


const OfferTemplates: React.FC<Props> = ({ profile, token }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<OfferTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // local filters
  const [q, setQ] = useState("");
  // make this a string so we can include "GRANT" + legacy types without TS friction
  const [typeFilter, setTypeFilter] = useState<string>("");
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
      items = items.filter((t: any) => {
        // include grants info + applies fields in search space
        const grantsTxt = (t.grants ?? [])
          .map((g: any) => `${g.itemType}:${g.productId || g.bundleId || ""}:${g.quantity || ""}`)
          .join(" ");

        return [
          t.templateTitle,
          t.description,
          t.specialTerms ?? "",
          t.eligibility ?? "",
          t.productName ?? "",   // legacy read fields
          t.serviceName ?? "",   // legacy read fields
          t.appliesToType ?? "",
          t.appliesProductId ?? "",
          t.appliesBundleId ?? "",
          grantsTxt,
          t.offerType ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    if (typeFilter) items = items.filter((t: any) => (t.offerType ?? "") === typeFilter);
    if (activeOnly) items = items.filter((t) => t.isActive);

    // sort: updatedAt desc (fallback to title)
    items.sort((a: any, b: any) => {
      const au = a.updatedAt ?? "";
      const bu = b.updatedAt ?? "";
      if (au && bu) return bu.localeCompare(au);
      return a.templateTitle.localeCompare(b.templateTitle);
    });

    return items;
  }, [templates, q, typeFilter, activeOnly]);

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

      <div className="form-card" style={{ marginBottom: 16 }}>
        <form className="th-form" noValidate>
          {/* first row: Search + Type in two columns */}
          <div className="section-grid">
            <div className="th-field">
              <label className="th-label">Search</label>
              <input
                className="th-input"
                type="text"
                placeholder="Search by title, details or terms"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="th-field">
              <label className="th-label">Type</label>
              <select
                className="select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
                <option value="FIXED_DISCOUNT">Fixed Discount</option>
                <option value="GRANT">Grants (free items)</option>
              </select>
            </div>
          </div>

          {/* second row: checkbox left, Clear filters right */}
          <div className="meta-row" style={{ marginTop: 8, alignItems: "center", justifyContent: "space-between" }}>
            <label className="switch" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              Show Active only
            </label>

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
            ) : <span />}
          </div>
        </form>
      </div>


      {/* content */}
      {filtered.length === 0 ? (
        <div className="form-card">
          <p className="help">No offer templates match your filters.</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((template: any) => (
            <div key={template.offerTemplateId} className="card">
              <h3 className="card__title">{template.templateTitle}</h3>
              <p className="card__desc">{template.description}</p>

              <div className="card__meta">
                <span className="pill pill--info">Type: {prettyType(template.offerType || "GRANT")}</span>
                <span className={`pill ${template.isActive ? "pill--ok" : "pill--muted"}`}>
                  {template.isActive ? "Active" : "Inactive"}
                </span>
                {template.claimPolicy && (
                  <span className="pill pill--info">Claims: {template.claimPolicy}</span>
                )}

                {/* Applies (no IDs shown) */}
                <span className="pill">Applies: {appliesLabel(template)}</span>

                {/* Type-specific chip */}
                {template.offerType === "PERCENTAGE_DISCOUNT" && typeof template.discountPercentage === "number" && (
                  <span className="pill pill--info">Discount: {template.discountPercentage}%</span>
                )}
                {template.offerType === "FIXED_DISCOUNT" && typeof template.discountAmount === "number" && (
                  <span className="pill pill">Flat: ₹{template.discountAmount}</span>
                )}
                {(template.offerType === "GRANT" || (template.grants?.length ?? 0) > 0) && (
                  <span className="pill pill--info">Grants: {grantsSummary(template.grants)}</span>
                )}
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
