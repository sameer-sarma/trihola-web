// src/pages/catalog/ProductViewPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getBusinessPublicViewBySlug } from "../../services/businessService";
import {
  deleteProduct,
  getProductForBusinessSlug,
} from "../../services/productService";

import type { UUID, ProductRecord } from "../../types/catalog";
import type { BusinessPublicViewDTO } from "../../types/business";

import "../../css/catalog.css";

function safeText(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}

function normUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function isUuidLike(v: any) {
  if (!v) return false;
  const s = String(v).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function extractBusinessId(biz: any): UUID | null {
  const cand =
    biz?.businessId ??
    biz?.id ??
    biz?.business?.id ??
    biz?.business?.businessId ??
    null;

  if (!isUuidLike(cand)) return null;
  return String(cand) as UUID;
}

function formatBlockedDelete(message: string, bundleSlugs: string[]) {
  if (!bundleSlugs?.length) return message;
  return `${message}\n\nUsed in bundles:\n• ${bundleSlugs.join("\n• ")}`;
}

function extractError(e: any) {
  const status = e?.response?.status;
  const data = e?.response?.data;

  const msg =
    typeof data === "string"
      ? data
      : data?.message || data?.error || e?.message || "Failed";

  return status ? `${msg} (HTTP ${status})` : msg;
}

const ProductViewPage: React.FC = () => {
  const { businessSlug, productSlug } = useParams<{
    businessSlug: string;
    productSlug: string;
  }>();

  const navigate = useNavigate();

  const [ctx, setCtx] = useState<BusinessPublicViewDTO | null>(null);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewerRole = useMemo(
    () => (ctx?.viewerRelation ?? "").toUpperCase(),
    [ctx?.viewerRelation]
  );

  const canManageCatalog = viewerRole === "OWNER" || viewerRole === "ADMIN";
  const productLink = useMemo(() => normUrl(product?.productUrl ?? null), [product]);

  useEffect(() => {
    if (!businessSlug || !productSlug) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const c = await getBusinessPublicViewBySlug(businessSlug);
        if (cancelled) return;
        setCtx(c);

        // ✅ Correct backend route via productService:
        // GET /business/{businessSlug}/products/{productSlug}
        const p = await getProductForBusinessSlug(businessSlug, productSlug);
        if (cancelled) return;

        if (!p) {
          setProduct(null);
          setError("Product not found.");
        } else {
          setProduct(p);
        }
      } catch (e: any) {
        if (!cancelled) setError(extractError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessSlug, productSlug]);

  const goBackToBusiness = () => {
    if (!businessSlug) return;
    navigate(`/businesses/${encodeURIComponent(businessSlug)}`);
  };

  const onEdit = () => {
    if (!businessSlug || !productSlug) return;

    // ✅ App.tsx route:
    // /businesses/:businessSlug/products/:productSlug/edit
    navigate(
      `/businesses/${encodeURIComponent(businessSlug)}/products/${encodeURIComponent(
        productSlug
      )}/edit`
    );
  };

  const onDelete = async () => {
    if (!canManageCatalog || !ctx || !product || !businessSlug) return;

    const actingBusinessId = extractBusinessId(ctx);
    if (!actingBusinessId) {
      setError("Missing businessId for delete.");
      return;
    }

    const ok = window.confirm(
      `Delete product "${product.name}"?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await deleteProduct(actingBusinessId, product.id);

      if (res.ok) {
        navigate(`/businesses/${encodeURIComponent(businessSlug)}`, { replace: true });
        return;
      }

      if (res.kind === "NOT_FOUND") {
        setError("Product not found (it may have already been deleted).");
        return;
      }

      if (res.kind === "BLOCKED") {
        // Show a friendly, actionable reason
        setError(formatBlockedDelete(res.message, res.bundleSlugs));
        return;
      }

      // ERROR fallback
      setError(res.message + (res.status ? ` (HTTP ${res.status})` : ""));
    } finally {
      setBusy(false);
    }
 };

  if (loading) return <div className="th-page">Loading…</div>;

  return (
    <div className="th-page">
      {/* ✅ Blend with page: remove the “floating card” look */}
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 10px 22px",
          background: "transparent",
        }}
      >
        {/* Header area (no card wrapper) */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 14,
            padding: "8px 6px 14px",
          }}
        >
          <div>
            <div className="th-page-title" style={{ marginBottom: 6 }}>
              {product ? safeText(product.name) : "Product"}
            </div>
            <div className="th-text-muted">
              Business: <b>{businessSlug}</b>
            </div>
          </div>

          <div className="th-text-muted" style={{ fontWeight: 900 }}>
            {product ? (product.isActive ? "ACTIVE" : "INACTIVE") : null}
          </div>
        </div>

        {error && (
          <div className="th-text-muted" style={{ margin: "0 6px 12px", whiteSpace: "pre-wrap" }}>
            {error}
          </div>
        )}

        {!product ? null : (
          <div className="th-form" style={{ paddingBottom: 22 }}>
            <div className="th-section">
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                {product.primaryImageUrl ? (
                  <img
                    src={product.primaryImageUrl}
                    alt={safeText(product.name)}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.7)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: "var(--muted)",
                    }}
                  >
                    No image
                  </div>
                )}

                <div style={{ minWidth: 260, flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>
                    {safeText(product.name)}
                  </div>

                  <div className="th-text-muted" style={{ marginTop: 6 }}>
                    slug: <b>{safeText(product.slug)}</b>
                    {product.sku ? (
                      <>
                        {" "}
                        • sku: <b>{safeText(product.sku)}</b>
                      </>
                    ) : null}
                  </div>

                  <div className="th-text-muted" style={{ marginTop: 6 }}>
                    {safeText(product.kind)} • {safeText(product.salesChannel)} •{" "}
                    {product.isActive ? "ACTIVE" : "INACTIVE"}
                  </div>

                  {productLink && (
                    <div style={{ marginTop: 10 }}>
                      <a href={productLink} target="_blank" rel="noreferrer">
                        Open product link →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="th-form-row th-form-row--2">
              <div className="th-field">
                <div className="th-label">Category</div>
                <div>{safeText(product.category)}</div>
              </div>
              <div className="th-field">
                <div className="th-label">Ecom Integration</div>
                <div>{safeText((product as any).ecomIntegrationId)}</div>
              </div>
            </div>

            <div className="th-field">
              <div className="th-label">Description</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{safeText(product.description)}</div>
            </div>

            <div className="th-field">
              <div className="th-label">Images</div>
              {product.images?.length ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {product.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={`Image ${img.position}`}
                      style={{
                        width: 92,
                        height: 92,
                        objectFit: "cover",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.7)",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="th-text-muted">No images.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA bar like ProductUpsertPage */}
      <div className="catalogCtaBar">
        <div className="catalogCtaInner">
          <button type="button" className="btn" onClick={goBackToBusiness} disabled={busy}>
            Back to business
          </button>

          {canManageCatalog && product ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn" onClick={onDelete} disabled={busy}>
                Delete
              </button>

              <button
                type="button"
                className="btn btn--primary"
                onClick={onEdit}
                disabled={busy}
              >
                Edit
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductViewPage;
