import React from "react";
import ProductPicker from "./ProductPicker";
import BundlePicker from "./BundlePicker";
import type { PickerItem } from "../types/offerTemplateTypes";

export type ItemKind = "PRODUCT" | "BUNDLE";
export type ItemPickerValue =
  | { kind: "PRODUCT"; id: string; item?: PickerItem }
  | { kind: "BUNDLE"; id: string; item?: PickerItem }
  | null;

export type ItemPickerProps = {
  value: ItemPickerValue;
  onChange: (next: ItemPickerValue) => void;
  fetchProducts: (q: string) => Promise<PickerItem[]>;
  fetchBundles: (q: string) => Promise<PickerItem[]>;
  placeholderProduct?: string;
  placeholderBundle?: string;
  disabled?: boolean;
  variant?: "default" | "compact";   // <<< NEW
};

const ItemPicker: React.FC<ItemPickerProps> = ({
  value,
  onChange,
  fetchProducts,
  fetchBundles,
  placeholderProduct = "Search products…",
  placeholderBundle = "Search bundles…",
  disabled,
  variant = "default",
}) => {
  const [tab, setTab] = React.useState<ItemKind>(value?.kind ?? "PRODUCT");

  const setProduct = (id: string | null, item?: PickerItem) =>
    onChange(id ? { kind: "PRODUCT", id, item } : null);
  const setBundle = (id: string | null, item?: PickerItem) =>
    onChange(id ? { kind: "BUNDLE", id, item } : null);
  
  const compact = variant === "compact";
  
  return (
    <div className="item-picker" style={{ display: "grid", gap: compact ? 6 : 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className={`btn tiny ${tab === "PRODUCT" ? "primary" : ""}`} onClick={() => setTab("PRODUCT")} disabled={disabled}>Products</button>
        <button type="button" className={`btn tiny ${tab === "BUNDLE" ? "primary" : ""}`} onClick={() => setTab("BUNDLE")} disabled={disabled}>Bundles</button>
        {value && compact && (
          <button className="btn tiny ghost" onClick={() => onChange(null)} disabled={disabled} title="Clear">✕</button>
        )}
      </div>

      {tab === "PRODUCT" ? (
        <ProductPicker
          fetchItems={fetchProducts}
          value={value?.kind === "PRODUCT" ? value.id : null}
          onChange={(id, item) => setProduct(id, item)}
          placeholder={placeholderProduct}
          disabled={disabled}
        />
      ) : (
        <BundlePicker
          fetchItems={fetchBundles}
          value={value?.kind === "BUNDLE" ? value.id : null}
          onChange={(id, item) => setBundle(id, item)}
          placeholder={placeholderBundle}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default ItemPicker;
