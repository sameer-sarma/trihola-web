// src/pages/catalog/ProductUpsertPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../../supabaseClient";
import { getBusinessPublicViewBySlug } from "../../services/businessService";
import {
  createProduct,
  getOwnerProductBySlug,
  updateProduct,
} from "../../services/productService";

import FileUploader, { type UploadedFile } from "../../components/FileUploader";

import type {
  UUID,
  ProductKind,
  SalesChannel,
  ProductRecord,
  CreateProductRequest,
  UpdateProductRequest,
} from "../../types/catalog";

import "../../css/catalog.css";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function safeText(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
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
    biz?.businessId ?? biz?.id ?? biz?.business?.id ?? biz?.business?.businessId ?? null;

  if (!isUuidLike(cand)) return null;
  return String(cand) as UUID;
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

function initialsFrom(text: string) {
  const t = (text || "").trim();
  if (!t) return "B";
  const parts = t.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "B";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function normUrl(u?: string | null) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

const ProductUpsertPage: React.FC = () => {
  const { businessSlug, productSlug } = useParams<{
    businessSlug: string;
    productSlug?: string;
  }>();

  const navigate = useNavigate();
  const isEdit = !!productSlug;

  const [actingBusinessId, setActingBusinessId] = useState<UUID | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);

  const [loaded, setLoaded] = useState<ProductRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [sku, setSku] = useState("");
  const [kind, setKind] = useState<ProductKind>("SERVICE");
  const [salesChannel, setSalesChannel] = useState<SalesChannel>("BOTH");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const STORAGE_BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string) || "";

  // keep slug auto-generated unless user edits it
  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(name);
    if (next) setSlug(next);
  }, [name, slugTouched]);

  // load business + product
  useEffect(() => {
    if (!businessSlug) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Ensure we have a session (so API calls that require auth don’t randomly fail)
        await supabase.auth.getSession().catch(() => null);

        const biz = await getBusinessPublicViewBySlug(businessSlug);

        const bizId = extractBusinessId(biz);
        if (!bizId) {
          throw new Error(
            "Could not resolve businessId for this business (expected businessId/id to be a UUID)."
          );
        }

        if (cancelled) return;

        setActingBusinessId(bizId);
        setBusinessName(
          String((biz as any).name ?? (biz as any).businessName ?? businessSlug)
        );
        setBusinessLogoUrl((biz as any).logoUrl ?? (biz as any).businessLogoUrl ?? null);

        if (productSlug) {
          const wanted = decodeURIComponent(productSlug);
          const p = await getOwnerProductBySlug(bizId, wanted);

          if (cancelled) return;

          if (!p) {
            setError("Product not found (or you don’t have access).");
            setLoaded(null);
          } else {
            setLoaded(p);

            setName(p.name ?? "");
            setSlug(p.slug ?? "");
            setSlugTouched(true);
            setSku(p.sku ?? "");
            setKind(p.kind ?? "SERVICE");
            setSalesChannel(p.salesChannel ?? "BOTH");
            setCategory(p.category ?? "");
            setDescription(p.description ?? "");
            setProductUrl(p.productUrl ?? "");
            setPrimaryImageUrl(p.primaryImageUrl ?? "");
            setIsActive(!!p.isActive);
          }
        } else {
          // create mode: reset
          setLoaded(null);
          setName("");
          setSlug("");
          setSlugTouched(false);
          setSku("");
          setKind("SERVICE");
          setSalesChannel("BOTH");
          setCategory("");
          setDescription("");
          setProductUrl("");
          setPrimaryImageUrl("");
          setIsActive(true);
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

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    if (!actingBusinessId) return false;
    if (!name.trim()) return false;
    return true;
  }, [loading, saving, actingBusinessId, name]);

  const onCancel = () => {
    if (!businessSlug) {
      navigate("/"); // safe fallback
      return;
    }
    navigate(`/businesses/${encodeURIComponent(businessSlug)}`);
  };

  const onSave = async () => {
    if (!actingBusinessId) {
      setError("Missing business context.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const cleanedSlug = slugify(slug || name);

      if (!isEdit) {
        const body: CreateProductRequest = {
          slug: cleanedSlug || null,
          name: name.trim(),
          sku: sku.trim() || null,
          kind,
          salesChannel,
          category: category.trim() || null,
          description: description.trim() || null,
          productUrl: productUrl.trim() || null,
          primaryImageUrl: primaryImageUrl.trim() || null,
          isActive,
        };

        const created = await createProduct(actingBusinessId, body);

        navigate(
          `/businesses/${encodeURIComponent(businessSlug!)}/p/${encodeURIComponent(
            created.slug
          )}`,
          { replace: true }
        );

        return;
      }

      if (!loaded) {
        setError("Cannot save: product not loaded.");
        return;
      }

      const body: UpdateProductRequest = {
        slug: cleanedSlug || null,
        name: name.trim(),
        sku: sku.trim() || null,
        kind,
        salesChannel,
        category: category.trim() || null,
        description: description.trim() || null,
        productUrl: productUrl.trim() || null,
        primaryImageUrl: primaryImageUrl.trim() || null,
        isActive,
      };

      const updated = await updateProduct(actingBusinessId, loaded.id, body);

      const viewSlug = updated.slug ?? productSlug!;
      navigate(
        `/businesses/${encodeURIComponent(businessSlug!)}/p/${encodeURIComponent(viewSlug)}`,
        { replace: true }
      );
    } catch (e: any) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="catalogPage">Loading…</div>;

  const normalizedPrimaryUrl = normUrl(primaryImageUrl);
  const slugForUpload = slugify(slug || name) || "product";

  return (
    <div className="catalogPage">
      <div className="catalogShell">
        {/* Header row */}
        <div className="catalogHeader">
          <div className="catalogTitleBlock">
            <div className="catalogTitle">{isEdit ? "Edit product" : "Add product"}</div>
            <div className="catalogSubtitle">
              Business: <b>{businessSlug}</b>
            </div>
          </div>

          {/* Identity pill (BUSINESS ONLY; no dropdown) */}
          <div className="catalogIdentityPill" title="Catalog actions are always under the Business">
            <div className="catalogIdentityAvatar">
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt={businessName || "Business"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>{initialsFrom(businessName || businessSlug || "Business")}</span>
              )}
            </div>
            <div className="catalogIdentityMeta">
              <div className="catalogIdentityName">{businessName || businessSlug}</div>
              <div className="catalogIdentitySub">Business</div>
            </div>
          </div>
        </div>

        {error && <div className="catalogErrorBanner">{error}</div>}

        <div className="catalogCard">
          <div className="th-form" style={{ marginTop: 0 }}>
            <div className="th-field">
              <div className="th-label">Name *</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Haircare consultation"
              />
            </div>

            <div className="th-field">
              <div className="th-label">Slug</div>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="auto-generated from name"
              />
              <div className="th-text-muted" style={{ marginTop: 6 }}>
                Will be normalized as: <b>{slugify(slug || name) || "—"}</b>
              </div>
            </div>

            <div className="th-form-row th-form-row--2">
              <div className="th-field">
                <div className="th-label">Kind</div>
                <select value={kind} onChange={(e) => setKind(e.target.value as ProductKind)}>
                  <option value="SERVICE">SERVICE</option>
                  <option value="PRODUCT">PRODUCT</option>
                  <option value="DIGITAL">DIGITAL</option>
                  <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                </select>
              </div>

              <div className="th-field">
                <div className="th-label">Sales channel</div>
                <select
                  value={salesChannel}
                  onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
                >
                  <option value="BOTH">BOTH</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>
            </div>

            <div className="th-form-row th-form-row--2">
              <div className="th-field">
                <div className="th-label">SKU</div>
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="optional" />
              </div>

              <div className="th-field">
                <div className="th-label">Category</div>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>

            <div className="th-field">
              <div className="th-label">Description</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="optional"
              />
            </div>

            <div className="th-form-row th-form-row--2">
              <div className="th-field">
                <div className="th-label">Product URL</div>
                <input
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="optional"
                />
              </div>

              <div className="th-field">
                <div className="th-label">Primary image URL</div>
                <input
                  value={primaryImageUrl}
                  onChange={(e) => setPrimaryImageUrl(e.target.value)}
                  placeholder="optional (or upload below)"
                />
                {normalizedPrimaryUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <div className="th-text-muted" style={{ marginBottom: 6 }}>
                      Preview
                    </div>
                    <img
                      src={normalizedPrimaryUrl}
                      alt="Primary"
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.7)",
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* ✅ Supabase upload using your generic component */}
            {actingBusinessId ? (
              <FileUploader
                userId={String(actingBusinessId)}
                bucket={STORAGE_BUCKET}
                folder="products"
                filenameBase={`primary_${slugForUpload}`}
                accept="image/*"
                label="Upload primary image"
                help="Uploads to Supabase Storage and auto-fills Primary image URL."
                strategy="overwrite"
                onComplete={(files: UploadedFile[]) => {
                  const first = files?.[0];
                  if (first?.publicUrl) setPrimaryImageUrl(first.publicUrl);
                }}
              />
            ) : (
              <div className="th-text-muted">Upload available after business context loads.</div>
            )}

            <div className="th-field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                id="prod-active"
              />
              <label htmlFor="prod-active" style={{ cursor: "pointer", fontWeight: 800 }}>
                Active
              </label>
            </div>

            {loaded && (
              <div className="th-text-muted">
                Editing: <b>{safeText(loaded.id)}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="catalogCtaBar">
        <div className="catalogCtaInner">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>

          <button
            type="button"
            className="btn btn--primary"
            onClick={onSave}
            disabled={!canSave}
            title={!name.trim() ? "Name is required" : undefined}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductUpsertPage;
