import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOfferTemplates } from "../services/offerTemplateService";
import { OfferTemplateResponse } from "../types/offerTemplateTypes";
import OfferCard from "../components/OfferCard";
import "../css/ui-forms.css";
import "../css/cards.css";

interface Props {
  profile: { registeredAsBusiness?: boolean };
  token: string;
  userId: string;
  businessSlug?: string; // optional
}

/* ------------ helpers ------------ */

/** Map template → minimal offer-like object accepted by OfferCard */
const toOfferView = (t: any) => {
  const scopeItems = (t.scopeItems ?? [])
    .map((si: any) => {
      if (si.itemType === "PRODUCT" && si.product) {
        const p = si.product;
        return {
          itemType: "PRODUCT",
          product: {
            id: p.id,
            slug: p.slug,
            businessSlug: p.businessSlug ?? undefined,
            name: p.name ?? p.title,
            primaryImageUrl: p.primaryImageUrl ?? p.imageUrl ?? p.thumbnailUrl ?? undefined,
          },
        };
      }
      if (si.itemType === "BUNDLE" && si.bundle) {
        const b = si.bundle;
        return {
          itemType: "BUNDLE",
          bundle: {
            id: b.id,
            slug: b.slug,
            businessSlug: b.businessSlug ?? undefined,
            name: b.name ?? b.title,
            primaryImageUrl: b.primaryImageUrl ?? b.imageUrl ?? b.thumbnailUrl ?? undefined,
          },
        };
      }
      return null;
    })
    .filter(Boolean);

  const hasTiers = Array.isArray(t.tiers) && t.tiers.length > 0;

  return {
    // headline + copy
    offerTitle: t.templateTitle,
    description: t.description,

    // type & claim policy
    offerType: t.offerType,
    claimPolicy: t.claimPolicy,

    // validity
    validityType: t.validityType,
    validFrom: t.validityType === "ABSOLUTE" ? t.validFrom : undefined,
    validUntil: t.validityType === "ABSOLUTE" ? t.validTo : undefined,
    durationDays: t.validityType === "RELATIVE" ? t.durationDays : undefined,
    trigger: t.validityType === "RELATIVE" ? t.trigger : undefined,

    // status / redemptions
    status: t.isActive ? "ACTIVE" : "INACTIVE",
    redemptionsUsed: 0,
    effectiveMaxRedemptions: t.maxRedemptions ?? undefined,
    redemptionsLeft: t.maxRedemptions ?? undefined,

    // purchase + base discount (only when not tiered)
    minPurchaseAmount:
      typeof t.minPurchaseAmount === "number" ? t.minPurchaseAmount : undefined,
    ...( !hasTiers && typeof t.discountPercentage === "number" ? { discountPercentage: t.discountPercentage } : {}),
    ...( !hasTiers && typeof t.discountAmount     === "number" ? { discountAmount:     t.discountAmount     } : {}),
    ...( !hasTiers && typeof t.maxDiscountAmount  === "number" ? { maxDiscountAmount:  t.maxDiscountAmount  } : {}),

    // scope & tiers
    businessSlug: t.businessSlug ?? undefined,
    scopeKind: t.scopeKind === "ANY" ? "ANY_PURCHASE" : "LIST",
    scopeItems,
    tiers: t.tiers ?? [],
  };
};

const OfferTemplates: React.FC<Props> = ({ profile, token }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<OfferTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    if (!profile.registeredAsBusiness || !token) return;
    listOfferTemplates(token)
      .then(setTemplates)
      .catch((err: unknown) => {
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
        const scopeTxt = (Array.isArray(t.scopeItems) ? t.scopeItems
          .map((it: any) => `${it.itemType}:${it.product?.name || it.bundle?.title || it.product?.title || it.bundle?.name || ""}`)
          .join(" ") : "");
        return [
          t.templateTitle,
          t.description,
          t.specialTerms ?? "",
          t.eligibility ?? "",
          scopeTxt,
          t.offerType ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    if (typeFilter) items = items.filter((t: any) => (t.offerType ?? "") === typeFilter);
    if (activeOnly) items = items.filter((t) => t.isActive);

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
        <div className="form-card"><p className="help">Loading offer templates...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help" style={{ color: "#b91c1c" }}>{error}</p></div>
      </div>
    );
  }

  const filtersActive = q.trim() || typeFilter || activeOnly;

return (
  <div className="page-wrap">
    {/* Header */}
    <div className="th-header" style={{ marginBottom: 10 }}>
      <h2 className="page-title" style={{ margin: 0 }}>Your Offer Templates</h2>
      <div className="th-header-actions">
        <button onClick={() => navigate("/add-offer-template")} className="btn btn--primary">
          + New Template
        </button>
      </div>
    </div>

    {/* Search + filters */}
    <div className="form-card" style={{ marginBottom: 16 }}>
      <form className="ot-searchbar" noValidate>
        <div className="th-field" style={{ margin: 0 }}>
          <label className="th-label">Search</label>
          <input
            className="th-input"
            type="text"
            placeholder="Search by title, details or terms"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="th-field" style={{ margin: 0 }}>
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

        <div className="th-field" style={{ margin: 0 }}>
          <label className="th-label" style={{ visibility: "hidden" }}>Active</label>
          <label className="switch" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Show Active only
          </label>
        </div>
      </form>

      {filtersActive && (
        <div className="th-header" style={{ marginTop: 8 }}>
          <span className="help">Filters applied.</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => { setQ(""); setTypeFilter(""); setActiveOnly(false); }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>

    {/* CARD GRID — each item is an OfferCard tile */}
    {filtered.length === 0 ? (
      <div className="form-card"><p className="help">No offer templates match your filters.</p></div>
    ) : (
      <div className="th-grid-auto">
        {filtered.map((t: any) => {
          const id = t.offerTemplateId as string;
          const goDetails = () => navigate(`/offer-template/${id}`);
          const offerView = toOfferView(t);

          return (
            <div
              key={id}
              className="ot-list-item"
              role="link"
              tabIndex={0}
              onClick={goDetails}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goDetails(); }
              }}
              title="Open details"
              aria-label={`View ${t.templateTitle}`}
            >
              <OfferCard
                offer={offerView as any}
                appearance="flat"
                showActions={false}
                className="card--link offer-card--tile"   // <- tile class
                mode="template"
              />

              <div className="th-header" style={{ marginTop: 8 }}>
                <span />
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/offer-template/${id}/edit`); }}
                  title="Edit template"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
};

export default OfferTemplates;
