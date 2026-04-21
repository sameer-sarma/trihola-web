import React from "react";
import { Link } from "react-router-dom";
import type { ProductMini, BundleMini } from "../types/offer";

export type BundleWithItems = BundleMini & {
  items?: {
    product: ProductMini;
    quantity: number;
  }[];
};

export type ScopeCardProps = {
  /** Optional card title, e.g. "What this invite is for" or "Scope" */
  title?: string;
  /** Business slug for navigation URLs (nullable because backend can omit it) */
  businessSlug?: string | null;
  /** Single product scope (campaign applies to one product) */
  product?: ProductMini | null;
  /** Bundle scope (campaign applies to a bundle) */
  bundle?: BundleWithItems | null;
  /** Layout mode: full-width or column-friendly */
  appearance?: "flat" | "column";
};

const ScopeCard: React.FC<ScopeCardProps> = ({
  title,
  businessSlug,
  product,
  bundle,
  appearance = "flat",
}) => {
  const hasProduct = !!product;
  const hasBundle = !!bundle;
  if (!hasProduct && !hasBundle) return null;

  const items = bundle?.items ?? [];

  const isFlat = appearance === "flat";

  const productUrl =
    product && businessSlug && product.slug
      ? `/${businessSlug}/${product.slug}`
      : undefined;

  const bundleUrl =
    bundle && businessSlug && bundle.slug
      ? `/${businessSlug}/bundle/${bundle.slug}`
      : undefined;

  const thumbClass = isFlat ? "th-thumb-64" : "th-thumb-48";

  return (
    <section className={`card scope-card scope-card--${appearance}`}>
      {title && <h3 className="section-title">{title}</h3>}

      {/* Product scope (if any) */}
      {hasProduct && product && (
        <div
          className="th-item-row scope-main-row"
          style={{ marginBottom: hasBundle ? 12 : 0 }}
        >
          <div className={thumbClass}>
            {product.primaryImageUrl ? (
              <img
                src={product.primaryImageUrl}
                alt={product.name ?? "Product"}
                className="img-cover"
              />
            ) : (
              <div className="th-placeholder-small">P</div>
            )}
          </div>
          <div>
            <div className="th-card-title">
              {product.name ?? "Product"}
            </div>
            {product.sku && (
              <div className="muted">{product.sku}</div>
            )}
            {productUrl && (
              <Link to={productUrl} className="link link--sm">
                View product details
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Bundle scope (if any) */}
      {hasBundle && bundle && (
        <div className="scope-bundle-block">
          <div className="th-item-row scope-main-row">
            <div className={thumbClass}>
              {bundle.primaryImageUrl ||
              items[0]?.product?.primaryImageUrl ? (
                <img
                  src={
                    bundle.primaryImageUrl ??
                    items[0].product.primaryImageUrl!
                  }
                  alt={
                    items[0]?.product?.name ??
                    bundle.title ??
                    "Bundle"
                  }
                  className="img-cover"
                />
              ) : (
                <div className="th-placeholder-small">B</div>
              )}
            </div>
            <div>
              <div className="th-card-title">
                {bundle.title ?? "Bundle"}
              </div>
              <div className="muted">
                {items.length} product
                {items.length === 1 ? "" : "s"}
              </div>
              {bundleUrl && (
                <Link to={bundleUrl} className="link link--sm">
                  View bundle details
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ScopeCard;
