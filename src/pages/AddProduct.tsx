// src/pages/AddProduct.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { useCreateProduct } from "../queries/productQueries";
import Breadcrumbs from "../components/Breadcrumbs";

const AddProduct: React.FC = () => {
  const nav = useNavigate();
  const create = useCreateProduct();

  return (
    <div className="th-page">
      <Breadcrumbs items={[{ label: "Products", to: "/products" }, { label: "Create" }]} />
      <h1 className="page-title">Create product</h1>

      <div className="card">
        <ProductForm
          mode="create"
          onSubmit={(body) => {
            create.mutate(body, {
              onSuccess: (p) => nav(`/products/${p.slug}/edit#images`, { replace: true }),
            });
          }}
          submitLabel={create.isPending ? "Saving..." : "Create"}
        />
        {create.isError && <div className="th-error">{(create.error as Error).message}</div>}
      </div>
    </div>
  );
};

export default AddProduct;
