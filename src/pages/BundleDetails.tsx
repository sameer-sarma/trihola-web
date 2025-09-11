import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useBusinessBundles } from "../queries/bundleQueries";
import type { BundleDTO } from "../types/bundle";

const BundleDetails: React.FC = () => {
  const { businessSlug = "", bundleSlug = "" } = useParams();
  const q = useBusinessBundles(businessSlug, { active: true, limit: 200, offset: 0 }, true);

  const bundle: BundleDTO | undefined = useMemo(
    () => (q.data ?? []).find((b) => b.slug === bundleSlug),
    [q.data, bundleSlug]
  );

  if (q.isLoading) return <div className="th-page"><div className="th-muted">Loading bundle…</div></div>;
  if (q.error)   return <div className="th-page"><div className="th-error">{(q.error as Error).message}</div></div>;
  if (!bundle)   return (
    <div className="th-page">
      <div className="card">
        <div className="th-empty">Bundle not found.</div>
        <div className="actions" style={{ marginTop: 12 }}>
          <Link to={`/${businessSlug}/products`} className="btn">Back to Products</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="th-page">
      <div className="card">
        {/* Header */}
        <div className="th-header">
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {bundle.title}
            <span className="th-chip">{bundle.isActive ? "Active" : "Inactive"}</span>
          </div>
          <div className="th-header-actions">
            <Link to={`/${businessSlug}/products`} className="btn">Back to Products</Link>
          </div>
        </div>

        {/* Description directly under title */}
        {bundle.description && (
          <p className="th-muted" style={{ marginTop: 4 }}>{bundle.description}</p>
        )}

        {/* Items — vertical stack */}
        <div className="th-section">
          <h3 className="section-title">Items</h3>

          <div className="th-vlist">
            {bundle.items.map((it) => {
              // Link target depends on context; for public/catalog use /:businessSlug/:productSlug
              const to = `/${businessSlug}/${it.slug}`;
              return (
                <div key={it.productId} className="th-card">
                  <div className="th-card-body th-item-row">
                    <div className="th-thumb-64">
                      {it.primaryImageUrl ? (
                        <img src={it.primaryImageUrl} alt={it.name} className="img-cover" />
                      ) : null}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="th-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Link to={to} className="th-link">{it.name}</Link>
                        <span className="th-chip" style={{ opacity: it.isActive ? 1 : 0.6 }}>
                          {it.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="th-muted" style={{ fontSize: 12 }}>
                        {it.kind ?? "—"} • Qty: <b>{it.qty}</b>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {bundle.items.length === 0 && <div className="th-empty">No products in this bundle.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleDetails;
