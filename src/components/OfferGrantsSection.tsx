import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/ui-forms.css";

/** Accepts OfferGrantLine-like items (IDs or hydrated objects) */
type GrantInput = {
  itemType: "PRODUCT" | "BUNDLE";
  productId?: string;
  bundleId?: string;
  quantity?: number;
  product?: any; // hydrated product (optional)
  bundle?: any;  // hydrated bundle (optional)
};

interface Props {
  grants: GrantInput[];
  productById?: Record<string, any>;
  bundleById?: Record<string, any>;
  pickLimit?: number;
  discountType?: "FREE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE";
  discountValue?: number | null;
  title?: string;
}

const fmtINR = (n?: number | null) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const headerText = (typ?: Props["discountType"], val?: number | null) => {
  if (!typ || typ === "FREE")   return "Grant: free items";
  if (typ === "PERCENTAGE")     return `Grant: ${val ?? 0}% off selected items`;
  if (typ === "FIXED_AMOUNT")   return `Grant: ${fmtINR(val ?? 0)} off selected items`;
  if (typ === "FIXED_PRICE")    return `Grant: fixed price ${fmtINR(val ?? 0)} on selected items`;
  return "Grant";
};

const OfferGrantsSection: React.FC<Props> = ({
  grants,
  productById,
  bundleById,
  pickLimit,
  discountType,
  discountValue,
  title,
}) => {
  const navigate = useNavigate();
  if (!grants || grants.length === 0) return null;

  const rows = grants.map((g) => {
    if (g.itemType === "PRODUCT") {
      const obj = g.product ?? (g.productId ? productById?.[g.productId] : null);
      const go = () => {
        if (!obj) return;
        if (obj.businessSlug && obj.slug) navigate(`/${obj.businessSlug}/${obj.slug}`);
        else if (obj.slug) navigate(`/products/${obj.slug}`);
      };
      return {
        key: `p-${g.productId ?? obj?.id ?? Math.random()}`,
        label: "Product",
        title: obj?.name ?? obj?.title ?? "Product",
        img: obj?.primaryImageUrl ?? obj?.imageUrl ?? obj?.thumbnailUrl ?? null,
        qty: g.quantity,
        onClick: go,
      };
    } else {
      const obj = g.bundle ?? (g.bundleId ? bundleById?.[g.bundleId] : null);
      const go = () => {
        if (!obj) return;
        if (obj.businessSlug && obj.slug) navigate(`/${obj.businessSlug}/bundle/${obj.slug}`);
        else if (obj.slug) navigate(`/bundles/${obj.slug}`);
      };
      return {
        key: `b-${g.bundleId ?? obj?.id ?? Math.random()}`,
        label: "Bundle",
        title: obj?.name ?? obj?.title ?? "Bundle",
        img: obj?.primaryImageUrl ?? obj?.imageUrl ?? obj?.thumbnailUrl ?? null,
        qty: g.quantity,
        onClick: go,
      };
    }
  });

  return (
    <div className="card card--form" style={{ marginTop: 12 }}>
      <h3 className="card__title" style={{ marginBottom: 4 }}>
        {title ?? headerText(discountType, discountValue)}
      </h3>
      {typeof pickLimit === "number" && (
        <div className="th-muted" style={{ marginBottom: 8 }}>
          Pick limit: {pickLimit}
        </div>
      )}

      <div className="th-vlist">
        {rows.map((r) => (
          <button
            key={r!.key}
            type="button"
            className="th-item-row btn--ghost"
            onClick={r!.onClick}
            style={{ width: "100%", textAlign: "left" }}
          >
            <div className="th-thumb-64">
              {r!.img ? <img className="img-cover" src={r!.img} alt="" /> : <div className="th-placeholder" />}
            </div>
            <div>
              <div className="th-card-title">
                {r!.label} — {r!.title}{typeof r!.qty === "number" ? ` × ${r!.qty}` : ""}
              </div>
              <div className="th-card-sub">Click to open {r!.label.toLowerCase()}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OfferGrantsSection;
