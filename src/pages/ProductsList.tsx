// src/pages/ProductsList.tsx
import React, { useState } from "react";
import { useProducts, useBusinessProducts } from "../queries/productQueries";
import { Link, useParams } from "react-router-dom";
import { ProductDTO } from "../types/product";
import EcomIntegrationSelect from "../components/EcomIntegrationSelect";
import BundlesPanel from "../components/BundlesPanel";

const ProductsList: React.FC = () => {
  // If businessSlug is present, we are in "catalog" mode (authenticated but not owner-scoped)
  const { businessSlug } = useParams();
  const isCatalog = !!businessSlug;

  // Owner-only filters (ignored in catalog mode)
  const [active, setActive] = useState<boolean | undefined>(true);
  const [ecomIntegrationId, setEcomIntegrationId] = useState<string>("");

  // CALL BOTH — but toggle with enabled
  const qCatalog = useBusinessProducts(
    businessSlug ?? "",
    { active: true, limit: 100, offset: 0 },
    { enabled: isCatalog }
  );

  const qOwner = useProducts(
    { active, ecomIntegrationId: ecomIntegrationId || undefined, limit: 100, offset: 0 },
    { enabled: !isCatalog }
  );

  // Pick the one for rendering
  const items = isCatalog ? qCatalog.data : qOwner.data;
  const isLoading = isCatalog ? qCatalog.isLoading : qOwner.isLoading;
  const error = isCatalog ? qCatalog.error : qOwner.error;

  return (
    <div className="th-page">
      <div className="th-header">
        <h2 className="page-title">{isCatalog ? "Products" : "My Products"}</h2>
        {!isCatalog && (
          <div className="th-header-actions">
            <Link to="/products/new" className="th-btn-primary">Add Product</Link>
          </div>
        )}
      </div>

      {!isCatalog && (
        <div className="form-group">
          <label className="label">
            <span>Status</span>
            <select
              value={String(active)}
              onChange={(e) =>
                setActive(e.target.value === "true" ? true : e.target.value === "false" ? false : undefined)
              }
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="undefined">All</option>
            </select>
          </label>

        <div className="th-filter" style={{ minWidth: 280 }}>
          <EcomIntegrationSelect
            name="ecom-filter"
            label="E-com Integration"
            value={ecomIntegrationId}
            onChange={(id) => setEcomIntegrationId(id)}
            includeInactive={true}
            allowNone={true}
            helpText="Filter products by integration"
          />
        </div>
      </div>
    )}

      {isLoading && <div className="th-muted">Loading…</div>}
      {error && <div className="th-error">{(error as Error).message}</div>}

      <div className="th-grid">
        {(items ?? []).map((p: ProductDTO) => {
          const to = isCatalog ? `/${businessSlug}/${p.slug}` : `/products/${p.slug}`;
          const name = p.name ?? "Untitled";
          const kind = p.kind ?? "—";
          const status = p.isActive ? "Active" : "Inactive";
          // primary image (fallback to placeholder)
          const img = p.primaryImageUrl;

          return (
            <Link key={p.id} to={to} className="th-card">
              {/* Primary image at top */}
              {img ? (
                <img className="th-card-thumb th-card-thumb--cover" src={img} alt={name} />
              ) : (
                <div className="th-card-thumb th-placeholder">No image</div>
              )}

              {/* Minimal text: Name, Type, Status */}
              <div className="th-card-body">
                <div className="th-card-title">{name}</div>
                <div className="th-card-sub">
                  {kind} • {status}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!isLoading && !error && (items?.length ?? 0) === 0 && (
        <div className="th-empty">{isCatalog ? "No products yet." : "You haven’t added any products yet."}</div>
      )}
       <BundlesPanel />
    </div>
  );
};

export default ProductsList;