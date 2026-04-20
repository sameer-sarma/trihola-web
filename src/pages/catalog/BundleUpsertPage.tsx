// src/pages/catalog/BundleUpsertPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../../css/catalog.css";

import { getBusinessPublicViewBySlug } from "../../services/businessService";
import { listOwnerProducts } from "../../services/productService";
import {
  createBundle,
  getOwnerBundleBySlug,
  updateBundle,
} from "../../services/bundleService";

import type {
  UUID,
  BundleRecord,
  BundleItemInput,
  CreateBundleRequest,
  UpdateBundleRequest,
  ProductRecord,
} from "../../types/catalog";

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
    biz?.businessId ??
    biz?.id ??
    biz?.business?.id ??
    biz?.business?.businessId ??
    null;

  if (!isUuidLike(cand)) return null;
  return String(cand) as UUID;
}

function extractError(e: any) {
  const status = e?.response?.status;
  const data = e?.response?.data;

  // Ktor sometimes returns plain text
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

type ItemRow = {
  productId: UUID;
  qty: number;
};

const BundleUpsertPage: React.FC = () => {
  const { businessSlug, bundleSlug } = useParams<{
    businessSlug: string;
    bundleSlug?: string;
  }>();

  const navigate = useNavigate();
  const isEdit = !!bundleSlug;

  const [actingBusinessId, setActingBusinessId] = useState<UUID | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);

  const [loaded, setLoaded] = useState<BundleRecord | null>(null);
  const [allProducts, setAllProducts] = useState<ProductRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [newProductId, setNewProductId] = useState<UUID | "">("");
  const [newQty, setNewQty] = useState<number>(1);

  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(title);
    if (next) setSlug(next);
  }, [title, slugTouched]);

  useEffect(() => {
    if (!businessSlug) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
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

        // load products for item picker
        const prods = await listOwnerProducts(bizId, {
          active: undefined,
          limit: 500,
          offset: 0,
        });
        if (!cancelled) setAllProducts(prods ?? []);

        if (bundleSlug) {
          const wanted = decodeURIComponent(bundleSlug);
          const b = await getOwnerBundleBySlug(bizId, wanted);
          if (cancelled) return;

          if (!b) {
            setError("Bundle not found (or you don’t have access).");
            setLoaded(null);
          } else {
            setLoaded(b);
            setTitle(b.title ?? "");
            setSlug(b.slug ?? "");
            setSlugTouched(true);
            setDescription(b.description ?? "");
            setIsActive(!!b.isActive);

            const mapped: ItemRow[] =
              (b.items ?? []).map((it) => ({
                productId: it.productId,
                qty: Number(it.qty ?? 1) || 1,
              })) ?? [];

            setItems(mapped);
          }
        } else {
          // create mode: reset
          setLoaded(null);
          setTitle("");
          setSlug("");
          setSlugTouched(false);
          setDescription("");
          setIsActive(true);
          setItems([]);
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
  }, [businessSlug, bundleSlug]);

  const productById = useMemo(() => {
    const map = new Map<UUID, ProductRecord>();
    for (const p of allProducts) map.set(p.id, p);
    return map;
  }, [allProducts]);

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    if (!actingBusinessId) return false;
    if (!title.trim()) return false;
    return true;
  }, [loading, saving, actingBusinessId, title]);

  const addItem = () => {
    if (!newProductId) return;
    const pid = newProductId as UUID;

    setItems((prev) => {
      if (prev.some((x) => x.productId === pid)) return prev; // prevent duplicates
      return [...prev, { productId: pid, qty: Math.max(1, Number(newQty) || 1) }];
    });

    setNewProductId("");
    setNewQty(1);
  };

  const updateQty = (productId: UUID, qty: number) => {
    const q = Math.max(1, Number(qty) || 1);
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, qty: q } : it))
    );
  };

  const removeItem = (productId: UUID) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const onCancel = () => {
    if (!businessSlug) return navigate("/");
    navigate(`/businesses/${encodeURIComponent(businessSlug)}`);
  };

  const onSave = async () => {
    if (!actingBusinessId) return;

    setSaving(true);
    setError(null);

    try {
      const cleanedSlug = slugify(slug || title);

      const payloadItems: BundleItemInput[] = items.map((it) => ({
        productId: it.productId,
        qty: Math.max(1, Number(it.qty) || 1),
      }));

      if (!isEdit) {
        const body: CreateBundleRequest = {
          slug: cleanedSlug || null,
          title: title.trim(),
          description: description.trim() || null,
          isActive,
          items: payloadItems,
        };

        const created = await createBundle(actingBusinessId, body);

        navigate(
          `/businesses/${encodeURIComponent(businessSlug!)}/b/${encodeURIComponent(
            created.slug
          )}`,
          { replace: true }
        );
        return;
      }

      if (!loaded) {
        setError("Cannot save: bundle not loaded.");
        return;
      }

      const body: UpdateBundleRequest = {
        slug: cleanedSlug || null,
        title: title.trim(),
        description: description.trim() || null,
        isActive,
        items: payloadItems,
      };

      const updated = await updateBundle(actingBusinessId, loaded.id, body);

      const viewSlug = updated.slug ?? bundleSlug!;
      navigate(
        `/businesses/${encodeURIComponent(businessSlug!)}/b/${encodeURIComponent(
          viewSlug
        )}`,
        { replace: true }
      );
    } catch (e: any) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="catalogPage">Loading…</div>;

  return (
    <div className="catalogPage">
      <div className="catalogShell">
        {/* Header row */}
        <div className="catalogHeader">
          <div className="catalogTitleBlock">
            <div className="catalogTitle">{isEdit ? "Edit bundle" : "Add bundle"}</div>
            <div className="catalogSubtitle">
              Business: <b>{businessSlug}</b>
            </div>
          </div>

          {/* Business-only identity pill (no personal option, no dropdown) */}
          <div
            className="catalogIdentityPill"
            title="Catalog actions are always under the Business"
          >
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
              <div className="th-label">Title *</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Starter kit bundle"
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
                placeholder="auto-generated from title"
              />
              <div className="th-text-muted" style={{ marginTop: 6 }}>
                Will be normalized as: <b>{slugify(slug || title) || "—"}</b>
              </div>
            </div>

            <div className="th-field">
              <div className="th-label">Description</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="optional"
              />
            </div>

            <div
              className="th-field"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                id="bundle-active"
              />
              <label htmlFor="bundle-active" style={{ cursor: "pointer", fontWeight: 800 }}>
                Active
              </label>
            </div>

            {/* Items editor */}
            <div className="th-field">
              <div className="th-label">Items</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value as any)}
                  style={{ minWidth: 280 }}
                >
                  <option value="">Select a product…</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 90 }}
                />

                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={addItem}
                  disabled={!newProductId}
                >
                  Add item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="th-text-muted" style={{ marginTop: 10 }}>
                  No items yet. (Bundles can be empty, but usually you’ll add at least one product.)
                </div>
              ) : (
                <div className="th-form">
                  {items.map((it) => {
                    const p = productById.get(it.productId);
                    const label = p ? `${p.name} (${p.slug})` : it.productId;

                    return (
                      <div key={it.productId} className="th-item-card">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900 }}>{safeText(label)}</div>
                          <div className="th-text-muted">productId: {safeText(it.productId)}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => updateQty(it.productId, Number(e.target.value))}
                            style={{ width: 90 }}
                          />
                          <button className="btn" type="button" onClick={() => removeItem(it.productId)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {loaded && (
              <div className="th-text-muted">
                Editing: <b>{safeText(loaded.id)}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="catalogCtaBar">
        <div className="catalogCtaInner">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave}
            onClick={onSave}
            title={!title.trim() ? "Title is required" : undefined}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BundleUpsertPage;
