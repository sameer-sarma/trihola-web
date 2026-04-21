import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProductBySlug, useDeleteProduct } from "../queries/productQueries";
import { useBusinessProduct } from "../queries/productQueries";
import Breadcrumbs from "../components/Breadcrumbs";

const ProductDetails: React.FC = () => {
  // Owner route: /products/:slug
  // Catalog route: /:businessSlug/:productSlug
  const { slug, businessSlug, productSlug } = useParams();
  const isCatalog = !!businessSlug && !!productSlug;

  // Fetch data depending on context
  const {
    data: priv,
    isLoading: loadingPriv,
    error: errorPriv,
  } = useProductBySlug(slug ?? "");

  const {
    data: pub,
    isLoading: loadingPub,
    error: errorPub,
  } = useBusinessProduct(businessSlug ?? "", productSlug ?? "");

  const product: any = isCatalog ? pub : priv;
  const isLoading = isCatalog ? loadingPub : loadingPriv;
  const error = isCatalog ? errorPub : errorPriv;

  const imgs = useMemo(
    () => (product?.images ?? []).slice().sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
    [product?.images]
  );

  const nav = useNavigate();
  const del = useDeleteProduct();

  if (isLoading) return <div className="th-muted">Loading…</div>;
  if (error) return <div className="th-error">{(error as Error).message}</div>;
  if (!product) return <div className="th-empty">Not found</div>;

  const name = product.name ?? product.title ?? "Untitled";

  const crumbs = isCatalog
    ? [{ label: "Products", to: `/${businessSlug}/products` }, { label: name }]
    : [{ label: "Products", to: "/products" }, { label: name }];

  return (
    <div className="th-page">
      <Breadcrumbs items={crumbs} />

      {imgs.length > 0 && (
        <div className="th-hero">
          <div className="th-image-strip" tabIndex={0}>
            {imgs.map((im: any) => (
              <img key={im.id ?? im.url} src={im.url} alt={name} className="th-hero-img" />
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout: LEFT (name, type, sales channel) | RIGHT (description) */}
      <div className="th-two-col" style={{ gridTemplateColumns: "320px 1fr" }}>
        <div className="card">
          <div className="kv"><strong>Name:</strong> {name}</div>
          {product.kind && <div className="kv"><strong>Type:</strong> {product.kind}</div>}
          {product.salesChannel && <div className="kv"><strong>Sales channel:</strong> {product.salesChannel}</div>}

          {!isCatalog && (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Link className="btn btn--ghost" to={`/products/${product.slug}/edit`}>Edit</Link>
              <button
                className="btn btn--danger"
                disabled={del.isPending}
                onClick={() => {
                  if (!confirm("Delete this product?")) return;
                  del.mutate(product.id, { onSuccess: () => nav("/products", { replace: true }) });
                }}
              >
                {del.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="page-title" style={{ fontSize: 18, marginBottom: 8 }}>Description</h3>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {product.description || <span className="th-muted">No description</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;