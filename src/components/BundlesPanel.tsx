import { useMemo, useState, useEffect } from "react";
import type { BundleDTO, CreateBundleReq, UpdateBundleReq, BundleItemReq } from "../types/bundle";
import type { ProductDTO } from "../types/product";
import { useBundles, useCreateBundle, useUpdateBundle, useDeleteBundle, useBusinessBundles } from "../queries/bundleQueries";
import { useProducts, useBusinessProducts } from "../queries/productQueries";
import { useParams, Link, generatePath } from "react-router-dom";
import { supabase } from "../supabaseClient";


const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } as const;
const chip = { padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd", fontSize: 12 } as const;
const qtyInput = { width: 56, padding: "4px 6px" } as const;

type EditorItem = { productId: string; qty: number };
type EditorState = {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  items: EditorItem[]; // selected products with quantities
};

function BundleEditor({
  allProducts,
  value,
  onCancel,
  onSaved,
  onDelete,
}: {
  allProducts: ProductDTO[];
  value: EditorState;
  onCancel: () => void;
  onSaved: (v: EditorState) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(value.name);
  const [description, setDescription] = useState(value.description ?? "");
  const [isActive, setIsActive] = useState(value.isActive);
  const [items, setItems] = useState<EditorItem[]>(value.items ?? []);
  const [userId, setUserId] = useState<string | null>(null);

  const create = useCreateBundle();
  const update = useUpdateBundle(value.id ?? "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

//  const isChecked = (productId: string) => items.some((i) => i.productId === productId);

  const toggle = (productId: string) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === productId);
      if (found) return prev.filter((i) => i.productId !== productId);
      return [...prev, { productId, qty: 1 }]; // default qty 1
    });
  };

  const setQty = (productId: string, q: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, Math.floor(q || 1)) } : i))
    );
  };

  const selectedCount = items.length;
  const canSave = selectedCount >= 2 && name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;

    const payloadItems: BundleItemReq[] = items.map((i) => ({ productId: i.productId, qty: i.qty || 1 }));

    if (value.id) {
      const body: UpdateBundleReq = {
        title: name,
        description: description || null,
        isActive,
        items: payloadItems,
      };
      update.mutate(body, {
        onSuccess: () => onSaved({ ...value, name, description, isActive, items }),
      });
    } else {
      if (!userId) {
        alert("Cannot create bundle: user not resolved");
        return;
      }
      const body: CreateBundleReq = {
        businessId: userId, // server validates against JWT
        title: name,
        description: description || null,
        isActive,
        items: payloadItems,
      };
      create.mutate(body, {
        onSuccess: () => onSaved({ name, description, isActive, items }),
      });
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="form form--two-col">
        <div className="form-group">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        </div>
        <div className="form-group switch">
          <label className="label">Active</label>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Description</label>
          <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Products in bundle (min 2)</label>
          <div style={{ ...row }}>
            {allProducts.map((p) => {
              const sel = items.find((i) => i.productId === p.id);
              return (
                <div key={p.id} className="th-pill" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 8 }}>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!sel} onChange={() => toggle(p.id)} />
                    <span>{p.name}</span>
                  </label>
                  {p.isActive ? <span style={{ ...chip }}>Active</span> : <span style={{ ...chip, opacity: 0.7 }}>Inactive</span>}
                  {!!sel && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
                      <span className="th-muted" style={{ fontSize: 12 }}>Qty</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={sel.qty}
                        onChange={(e) => setQty(p.id, Number(e.target.value))}
                        style={qtyInput}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedCount < 2 ? (
            <div className="th-error" style={{ marginTop: 6, fontSize: 12 }}>
              Select at least <b>two</b> products to save a bundle.
            </div>
          ) : (
            <div className="help" style={{ marginTop: 6 }}>
              You’ve selected {selectedCount} product{selectedCount > 1 ? "s" : ""}.
            </div>
          )}
        </div>

        <div className="actions" style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button className="btn btn--primary" type="button" disabled={!canSave} onClick={handleSave}>
            Save
          </button>
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
          </button>
          {!!value.id && onDelete && (
            <button className="btn btn--danger" type="button" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BundlesPanel() {
  const { businessSlug } = useParams();
  const isCatalog = !!businessSlug;

  // products for selection (owner vs catalog view)
  const qOwnerProducts = useProducts({ active: undefined, limit: 200, offset: 0 }, { enabled: !isCatalog });
  const qCatalogProducts = useBusinessProducts(businessSlug ?? "", { active: true, limit: 200, offset: 0 }, { enabled: isCatalog });

  const allProducts: ProductDTO[] = useMemo(
    () => (isCatalog ? qCatalogProducts.data ?? [] : qOwnerProducts.data ?? []),
    [isCatalog, qCatalogProducts.data, qOwnerProducts.data]
  );

  // bundles list
  const qOwnerBundles = useBundles({ active: undefined, limit: 100, offset: 0 });
  const qCatalogBundles = useBusinessBundles(businessSlug ?? "", { active: true, limit: 100, offset: 0 }, isCatalog);

  const bundles = isCatalog ? qCatalogBundles.data ?? [] : qOwnerBundles.data ?? [];
  const loading = isCatalog ? qCatalogBundles.isLoading : qOwnerBundles.isLoading;
  const error = isCatalog ? qCatalogBundles.error : qOwnerBundles.error;

  const [editing, setEditing] = useState<EditorState | null>(null);
  const del = useDeleteBundle();

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="th-header" style={{ marginBottom: 8 }}>
        <h3 className="page-title" style={{ fontSize: 18 }}>Bundles {isCatalog ? "" : "(owner)"}</h3>
        {!isCatalog && (
          <div className="th-header-actions">
            {allProducts.length > 1 ? (
              <button
                className="th-btn-primary"
                onClick={() =>
                  setEditing({
                    name: "",
                    description: "",
                    isActive: true,
                    items: [],
                  })
                }
              >
                Add Bundle
              </button>
            ) : (
              <span className="th-muted" style={{ fontSize: 12 }}>
                Add at least 2 products to create a bundle
              </span>
            )}
          </div>
        )}
      </div>

      {loading && <div className="th-muted">Loading…</div>}
      {error && <div className="th-error">{(error as Error).message}</div>}

      {/* grid of bundles */}
      <div className="th-grid">
        {bundles.map((b: BundleDTO) => {
          const detailsPath = businessSlug
            ? generatePath("/:businessSlug/bundle/:bundleSlug", { businessSlug, bundleSlug: b.slug })
            : undefined;

          return (
            <div key={b.id} className="th-card">
              <div className="th-card-body">
                <div className="th-card-title" title={b.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {detailsPath ? <Link to={detailsPath} className="th-link">{b.title}</Link> : b.title}
                  <span className="th-chip" style={{ fontSize: 11, opacity: 0.85 }}>
                    {b.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {b.description && <div className="th-card-sub" style={{ marginTop: 4 }}>{b.description}</div>}

                <div style={{ marginTop: 10 }}>
                  <div className="th-imggrid-40">
                    {b.items.slice(0, 8).map((it) => (
                      <div key={it.productId} className="th-thumb-40" title={`${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}`}>
                        {it.primaryImageUrl ? <img src={it.primaryImageUrl} alt={it.name} className="img-cover" /> : <div className="th-placeholder">No image</div>}
                        {it.qty > 1 && <span className="th-qty-badge">×{it.qty}</span>}
                      </div>
                    ))}
                  </div>
                  {b.items.length > 8 && (
                    <div className="th-muted" style={{ marginTop: 6, fontSize: 12 }}>
                      +{b.items.length - 8} more items
                    </div>
                  )}
                </div>

                {!isCatalog && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="btn btn--ghost"
                      onClick={() =>
                        setEditing({
                          id: b.id,
                          name: b.title,
                          description: b.description ?? "",
                          isActive: b.isActive,
                          items: (b.items ?? []).map((it) => ({ productId: it.productId, qty: it.qty || 1 })),
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--danger"
                      style={{ marginLeft: 8 }}
                      onClick={() => {
                        if (!confirm("Delete this bundle?")) return;
                        del.mutate(b.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && !error && bundles.length === 0 && (
        <div className="th-empty">{isCatalog ? "No bundles yet." : "You haven’t created any bundles yet."}</div>
      )}

      {!isCatalog && editing && (
        <BundleEditor
          allProducts={allProducts}
          value={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          onDelete={
            editing.id
              ? () => {
                  if (!confirm("Delete this bundle?")) return;
                  del.mutate(editing.id!, { onSuccess: () => setEditing(null) });
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
