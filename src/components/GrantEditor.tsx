import React from "react";
import type { OfferGrantLine } from "../types/offerTemplateTypes";
import type { PickerItem } from "../types/offerTemplateTypes";
import ProductPicker from "./ProductPicker";
import BundlePicker from "./BundlePicker";

type Props = {
  value: OfferGrantLine[];
  onChange: (next: OfferGrantLine[]) => void;
  fetchProducts?: (q: string) => Promise<PickerItem[]>;
  fetchBundles?: (q: string) => Promise<PickerItem[]>;
};

const GrantEditor: React.FC<Props> = ({
  value = [],
  onChange,
  fetchProducts,
  fetchBundles,
}) => {
  const update = (i: number, patch: Partial<OfferGrantLine>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const add = () =>
    onChange([...(value || []), { itemType: "PRODUCT", quantity: 1 }]);

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="th-stack">
      {(value || []).map((g, i) => (
        <div key={i} className="th-grid-4 th-card-soft">
          {/* Item type */}
          <div className="th-field">
            <label className="th-label">Item Type</label>
            <select
              className="select"
              value={g.itemType}
              onChange={(e) =>
                update(i, {
                  itemType: e.target.value as "PRODUCT" | "BUNDLE",
                  productId: undefined,
                  bundleId: undefined,
                })
              }
            >
              <option value="PRODUCT">Product</option>
              <option value="BUNDLE">Bundle</option>
            </select>
          </div>

          {/* Product / Bundle picker (with fallback to UUID input) */}
          {g.itemType === "PRODUCT" ? (
            fetchProducts ? (
              <div className="th-field">
                <label className="th-label">Product</label>
                <ProductPicker
                  value={g.productId ?? null}
                  onChange={(id) => update(i, { productId: id ?? undefined })}
                  fetchItems={fetchProducts}
                  placeholder="Search product…"
                />
              </div>
            ) : (
              <div className="th-field">
                <label className="th-label">Product (UUID)</label>
                <input
                  className="th-input"
                  value={g.productId ?? ""}
                  onChange={(e) => update(i, { productId: e.target.value })}
                />
              </div>
            )
          ) : fetchBundles ? (
            <div className="th-field">
              <label className="th-label">Bundle</label>
              <BundlePicker
                value={g.bundleId ?? null}
                onChange={(id) => update(i, { bundleId: id ?? undefined })}
                fetchItems={fetchBundles}
                placeholder="Search bundle…"
              />
            </div>
          ) : (
            <div className="th-field">
              <label className="th-label">Bundle (UUID)</label>
              <input
                className="th-input"
                value={g.bundleId ?? ""}
                onChange={(e) => update(i, { bundleId: e.target.value })}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="th-field">
            <label className="th-label">Quantity</label>
            <input
              className="th-input"
              type="number"
              min={1}
              value={g.quantity ?? 1}
              onChange={(e) => {
                const n = Number(e.target.value || 1);
                update(i, { quantity: Number.isFinite(n) ? Math.max(1, n) : 1 });
              }}
            />
          </div>

          {/* Remove button */}
          <div className="th-field" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => remove(i)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btn" onClick={add}>
        + Add Grant
      </button>
    </div>
  );
};

export default GrantEditor;
