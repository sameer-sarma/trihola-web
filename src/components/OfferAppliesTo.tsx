import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import type { OfferDetailsDTO } from "../types/offer";
import "../css/ui-forms.css";

type ScopeProduct = {
  id: string;
  slug?: string;
  businessSlug?: string;
  name?: string;
  primaryImageUrl?: string;
};
type ScopeBundle = {
  id: string;
  slug?: string;
  businessSlug?: string;
  title?: string;
  name?: string;
  primaryImageUrl?: string;
};
type ScopeItem =
  | { itemType: "PRODUCT"; product: ScopeProduct }
  | { itemType: "BUNDLE"; bundle: ScopeBundle };

interface Props {
  offer: OfferDetailsDTO;
  title?: string;
}

const OfferAppliesTo: React.FC<Props> = ({ offer, title = "Products / Bundles this applies to" }) => {
  const scopeKind = (offer as any).scopeKind as "ANY_PURCHASE" | "LIST" | undefined;
  const businessSlugTop = (offer as any).businessSlug as string | undefined;
  const scopeItems = ((offer as any).scopeItems ?? []) as ScopeItem[];

  const products: ScopeProduct[] = useMemo(
    () => scopeItems.filter((i) => i.itemType === "PRODUCT" && (i as any).product)
                    .map((i) => (i as any).product as ScopeProduct),
    [scopeItems]
  );

  const bundles: ScopeBundle[] = useMemo(
    () => scopeItems.filter((i) => i.itemType === "BUNDLE" && (i as any).bundle)
                    .map((i) => (i as any).bundle as ScopeBundle),
    [scopeItems]
  );

  const productHref = (p: ScopeProduct) => {
    const biz = p.businessSlug ?? businessSlugTop;
    if (p.slug && biz) return `/${biz}/${p.slug}`;
    if (p.slug) return `/products/${p.slug}`;
    return undefined;
  };

  const bundleHref = (b: ScopeBundle) => {
    const biz = b.businessSlug ?? businessSlugTop;
    if (b.slug && biz) return `/${biz}/bundle/${b.slug}`;
    if (b.slug) return `/bundles/${b.slug}`;
    return undefined;
  };

  const titleOf = (x: { name?: string; title?: string; slug?: string; id: string }) =>
    x.name ?? x.title ?? x.slug ?? x.id;

  return (
    <div className="card">
      <div className="section-header">Applicability</div>
      <div className="card-section">
        {scopeKind !== "LIST" && products.length + bundles.length === 0 && (
          <div className="th-vlist"><div className="help">Any purchase (global).</div></div>
        )}

        {scopeKind === "LIST" && products.length === 0 && bundles.length === 0 && (
          <div className="help">No specific items are selected.</div>
        )}

        {products.length > 0 && (
          <div className="th-vlist" style={{ marginBottom: 12 }}>
            {products.map((p) => {
              const href = productHref(p);
              return (
                <div key={`p-${p.id}`} className="th-list-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {p.primaryImageUrl ? (
                      <div className="th-thumb-40"><img className="img-cover" src={p.primaryImageUrl} alt={titleOf(p)} /></div>
                    ) : (
                      <div className="th-thumb-40" />
                    )}
                    <div className="th-list-title">Product: {titleOf(p)}</div>
                  </div>
                  {href ? <Link className="btn btn--ghost btn--sm" to={href}>View</Link> : <span className="help">No link</span>}
                </div>
              );
            })}
          </div>
        )}

        {bundles.length > 0 && (
          <div className="th-vlist">
            {bundles.map((b) => {
              const href = bundleHref(b);
              return (
                <div key={`b-${b.id}`} className="th-list-row">
                  <div className="th-list-title">Bundle: {titleOf(b)}</div>
                  {href ? <Link className="btn btn--ghost btn--sm" to={href}>View</Link> : <span className="help">No link</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferAppliesTo;
