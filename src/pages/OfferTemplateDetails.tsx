import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchOfferTemplateById } from "../services/offerTemplateService";
import type { OfferTemplateResponse } from "../types/offerTemplateTypes";
import { getProductById } from "../api/productapi";
import { getBundleById } from "../api/bundleapi";
import "../css/ui-forms.css";   // ← unified styles
import "../css/cards.css";      // (optional) keep your card look

interface Props {
  token: string;
}

// Small helpers
const prettyType = (t?: string) =>
  t === "PERCENTAGE_DISCOUNT" ? "Percentage discount" :
  t === "FIXED_DISCOUNT"      ? "Fixed discount" :
  t === "GRANT"               ? "Grant" :
  (t ?? "").replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());


type AnyMap = Record<string, any>;

const OfferTemplateDetails: React.FC<Props> = ({ token }) => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<OfferTemplateResponse | null>(null);
//  const [error, setError] = useState<string | null>(null);

  // Resolved items for display
  const [productsMap, setProductsMap] = useState<AnyMap>({});
  const [bundlesMap, setBundlesMap]   = useState<AnyMap>({});

  // Load template
  useEffect(() => {
    if (!templateId || !token) return;
    fetchOfferTemplateById(templateId, token)
      .then(setTemplate)
      .catch(() => console.log("Failed to load offer template details"));
  }, [templateId, token]);

  // Resolve associated products/bundles once template is loaded
  useEffect(() => {
    let closed = false;
    if (!template) return;

    (async () => {
      const pIds = new Set<string>();
      const bIds = new Set<string>();

      if (template.appliesToType === "PRODUCT" && template.appliesProductId) pIds.add(template.appliesProductId);
      if (template.appliesToType === "BUNDLE"  && template.appliesBundleId)  bIds.add(template.appliesBundleId);

      for (const g of template.grants ?? []) {
        if (g.itemType === "PRODUCT" && g.productId) pIds.add(g.productId);
        if (g.itemType === "BUNDLE"  && g.bundleId)  bIds.add(g.bundleId);
      }

      // Fetch in parallel; tolerate failures per-id
      const [pEntries, bEntries] = await Promise.all([
        Promise.all([...pIds].map(async id => {
          try { return [id, await getProductById(id)] as const; } catch { return [id, null] as const; }
        })),
        Promise.all([...bIds].map(async id => {
          try { return [id, await getBundleById(id)] as const; } catch { return [id, null] as const; }
        })),
      ]);

      if (!closed) {
        setProductsMap(Object.fromEntries(pEntries));
        setBundlesMap(Object.fromEntries(bEntries));
      }
    })();

    return () => { closed = true; };
  }, [template]);


  if (!template) {
    return (
      <div className="page-wrap">
        <div className="card"><p className="help">Loading…</p></div>
      </div>
    );
  }


  // Image helpers (products return primaryImageUrl; bundles may too)
  const imgOf = (obj: any | null) => obj?.primaryImageUrl ?? obj?.imageUrl ?? obj?.thumbnailUrl ?? null;
  const nameOf = (obj: any | null, fallback?: string) => obj?.name ?? obj?.title ?? fallback ?? "Untitled";

  // Route helpers — adjust paths if your router differs
const gotoProduct = (id: string) => {
  const p = productsMap[id];
  // Prefer public URL: /business/{businessSlug}/products/{productSlug}
  if (p?.businessSlug && p?.slug) {
    navigate(`/${p.businessSlug}/${p.slug}`);
    return;
  }
  if (p?.slug) {
    navigate(`/products/${p.slug}`);
    return;
  }
};

const gotoBundle = (id: string) => {
  const b = bundlesMap[id];
  // Prefer public URL: /business/{businessSlug}/bundles/{bundleSlug}
  if (b?.businessSlug && b?.slug) {
    navigate(`/${b.businessSlug}/bundles/${b.slug}`);
    return;
  }
  if (b?.slug) {
    navigate(`/bundles/${b.slug}`);
    return;
  }
};

  const fmtEnum = (val?: string) => (val ? val.replace(/_/g, " ").toLowerCase() : "—");
  const fmtINR = (n?: number | null) =>
    typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

  const fmtClaims = (p?: string | null) => {
    const v = String(p || "").toUpperCase();
    if (v === "ONLINE") return "ONLINE";
    if (v === "MANUAL") return "OFFLINE";
    if (v === "BOTH")   return "ONLINE AND OFFLINE";
    return "—";
  };

  return (
    <div className="page-wrap">
      <div className="card">
        {/* Title + Description */}
        <h1 className="page-title" style={{ marginBottom: 6 }}>{template.templateTitle}</h1>
        <p className="th-muted" style={{ marginBottom: 12 }}>{template.description}</p>

        {/* Spec list (Applies merged with Scope) */}
        <div className="form-card" style={{ marginBottom: 16 }}>
          <div className="th-kv"><strong>Type:</strong> {prettyType(template.offerType)}</div>
          <div className="th-kv"><strong>Status:</strong> {template.isActive ? "Active" : "Inactive"}</div>
          <div className="th-kv"><strong>Claims:</strong> {fmtClaims(template.claimPolicy)}</div>
          <div className="th-kv"><strong>Minimum purchase:</strong> {fmtINR(template.minPurchaseAmount)}</div>
          <div className="th-kv">
            <strong>Validity:</strong>{" "}
            {template.validityType === "RELATIVE"
              ? `${template.durationDays ?? "—"} days (trigger: ${fmtEnum(template.trigger)})`
              : `${template.validFrom || "—"} → ${template.validTo || "—"}`}
          </div>

          {/* Applies (merged with Scope) */}
          <div className="th-kv" style={{ alignItems: "flex-start" }}>
            <strong style={{ marginTop: 4 }}>Applies:</strong>
            <div style={{ flex: 1 }}>
              {template.appliesToType === "ANY_PURCHASE" && (
                <div className="help">Any purchase</div>
              )}

              {template.appliesToType === "PRODUCT" && template.appliesProductId && (
                <>
                  <div className="help" style={{ marginBottom: 6 }}>Purchase of a product</div>
                  <button
                    type="button"
                    className="th-item-row btn--ghost"
                    onClick={() => gotoProduct(template.appliesProductId!)}
                    style={{ textAlign: "left" }}
                  >
                    <div className="th-thumb-64">
                      {imgOf(productsMap[template.appliesProductId])
                        ? <img className="img-cover" src={imgOf(productsMap[template.appliesProductId])} alt="" />
                        : <div className="th-placeholder" />}
                    </div>
                    <div>
                      <div className="th-card-title">
                        {nameOf(productsMap[template.appliesProductId], "Product")}
                      </div>
                      <div className="th-card-sub">Click to view product</div>
                    </div>
                  </button>
                </>
              )}

              {template.appliesToType === "BUNDLE" && template.appliesBundleId && (
                <>
                  <div className="help" style={{ marginBottom: 6 }}>Purchase of a bundle</div>
                  <button
                    type="button"
                    className="th-item-row btn--ghost"
                    onClick={() => gotoBundle(template.appliesBundleId!)}
                    style={{ textAlign: "left" }}
                  >
                    <div className="th-thumb-64">
                      {imgOf(bundlesMap[template.appliesBundleId])
                        ? <img className="img-cover" src={imgOf(bundlesMap[template.appliesBundleId])} alt="" />
                        : <div className="th-placeholder" />}
                    </div>
                    <div>
                      <div className="th-card-title">
                        {nameOf(bundlesMap[template.appliesBundleId], "Bundle")}
                      </div>
                      <div className="th-card-sub">Click to view bundle</div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Grants — only render if there are any */}
        {template.grants && template.grants.length > 0 && (
          <div className="card card--form" style={{ marginBottom: 16 }}>
            <h3 className="card__title" style={{ marginBottom: 8 }}>Grant</h3>

            <div className="th-vlist">
              {template.grants.map((g, idx) => {
                const isP = g.itemType === "PRODUCT";
                const pid = g.productId!;
                const bid = g.bundleId!;
                const obj = isP ? productsMap[pid] : bundlesMap[bid];

                return (
                  <button
                    key={idx}
                    type="button"
                    className="th-item-row btn--ghost"
                    onClick={() => (isP ? gotoProduct(pid) : gotoBundle(bid))}
                    style={{ width: "100%", textAlign: "left" }}
                  >
                    <div className="th-thumb-64">
                      {imgOf(obj)
                        ? <img className="img-cover" src={imgOf(obj)} alt="" />
                        : <div className="th-placeholder" />}
                    </div>
                    <div>
                      <div className="th-card-title">
                        {isP ? "Product" : "Bundle"} — {nameOf(obj, isP ? "Product" : "Bundle")}
                        {typeof g.quantity === "number" ? ` × ${g.quantity}` : ""}
                      </div>
                      <div className="th-card-sub">Click to open {isP ? "product" : "bundle"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
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
