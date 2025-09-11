// src/pages/EditProduct.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { useProductBySlug, useUpdateProduct } from "../queries/productQueries";
import Breadcrumbs from "../components/Breadcrumbs";

const EditProduct: React.FC = () => {
  const nav = useNavigate();
  const { slug = "" } = useParams();
  const { data: p, isLoading, error } = useProductBySlug(slug);
  const update = useUpdateProduct(p?.id ?? "");

  if (isLoading) return <div className="th-muted">Loading…</div>;
  if (error) return <div className="th-error">{(error as Error).message}</div>;
  if (!p) return <div className="th-empty">Not found</div>;

  return (
    <div className="th-page">
      <Breadcrumbs items={[
        { label: "Products", to: "/products" },
        { label: p.name, to: `/products/${p.slug}` },
        { label: "Edit" }
      ]} />
      <h1 className="page-title">Edit product</h1>

      <div className="card">
        <ProductForm
          mode="edit"
          initial={p}
          onSubmit={(body) => {
            update.mutate(body, { onSuccess: (u) => nav(`/products/${u.slug}`) });
          }}
          submitLabel={update.isPending ? "Saving..." : "Save changes"}
        />
        {update.isError && <div className="th-error">{(update.error as Error).message}</div>}
      </div>
    </div>
  );
};

export default EditProduct;
