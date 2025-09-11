// src/components/ProductForm.tsx
import React, { useMemo, useState } from "react";
import {
  CreateProductReq,
  ProductDTO,
  ProductKind,
  SalesChannel,
  UpdateProductReq,
} from "../types/product";
import ProductImagesManager from "./ProductImagesManager"; // new
import EcomIntegrationSelect from "./EcomIntegrationSelect";

type CreateProps = {
  mode: "create";
  initial?: never;
  onSubmit: (body: CreateProductReq) => void;
  submitLabel?: string;
};

type EditProps = {
  mode: "edit";
  initial: ProductDTO;
  onSubmit: (body: UpdateProductReq) => void;
  submitLabel?: string;
};

type Props = CreateProps | EditProps;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 160);

const ProductForm: React.FC<Props> = (props) => {
  const { mode, onSubmit, submitLabel = "Save" } = props;
  const initial = mode === "edit" ? props.initial : undefined;

  // form state
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [kind, setKind] = useState<ProductKind>(initial?.kind ?? "SERVICE");
  const [salesChannel, setSalesChannel] = useState<SalesChannel>(initial?.salesChannel ?? "BOTH");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ecomIntegrationId, setEcomIntegrationId] = useState(initial?.ecomIntegrationId ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const slugPreview = useMemo(() => slugify(name), [name]);

  const buildCreateBody = (): CreateProductReq => ({
    name,
    sku: sku || null,
    kind,
    salesChannel,
    category: category || null,
    description: description || null,
    productUrl: null,          // removed from UI, send null
    primaryImageUrl: null,     // removed from UI, send null
    ecomIntegrationId: ecomIntegrationId || null,
    isActive,
  });

  const buildUpdateBody = (): UpdateProductReq => ({
    name,
    slug: slug || undefined,
    sku: sku || null,
    kind,
    salesChannel,
    category: category || null,
    description: description || null,
    productUrl: null,          // removed from UI
    primaryImageUrl: null,     // removed from UI
    ecomIntegrationId: ecomIntegrationId || null,
    isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") onSubmit(buildCreateBody());
    else onSubmit(buildUpdateBody());
  };

  return (
    <>
          <div className="card card--form" style={{ marginBottom: 20 }}>
      <form className="form form--two-col" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} />
        </div>

        {mode === "edit" ? (
          <div className="form-group">
            <label className="label">Slug</label>
            <input className="input" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} maxLength={160} />
          </div>
        ) : (
          <div className="form-group">
            <div className="help">Slug will be generated: {slugPreview || "—"}</div>
          </div>
        )}

        <div className="form-group">
          <label className="label">SKU</label>
          <input className="input" value={sku ?? ""} onChange={(e) => setSku(e.target.value)} maxLength={120} />
        </div>

        <div className="form-group">
          <label className="label">Kind</label>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as ProductKind)}>
            <option value="PHYSICAL">Physical</option>
            <option value="SERVICE">Service</option>
            <option value="DIGITAL">Digital</option>
          </select>
        </div>

        <div className="form-group">
          <label className="label">Sales Channel</label>
          <select className="select" value={salesChannel} onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        <div className="form-group">
          <label className="label">Category</label>
          <input className="input" value={category ?? ""} onChange={(e) => setCategory(e.target.value)} />
        </div>

        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Description</label>
          <textarea className="textarea" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>

        <div className="form-group">
          <label className="label">Ecom Integration</label>
          <EcomIntegrationSelect
            name="ecomIntegrationId"
            value={ecomIntegrationId || ""}
            onChange={(id) => setEcomIntegrationId(id)}
            includeInactive={true}
            allowNone={true}
          />
        </div>

        <div className="form-group switch">
          <label className="label">Active</label>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>

        <div className="actions" style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="btn btn--primary">{submitLabel}</button>
        </div>
      </form>
      </div>

      {/* Images live in the form for edit mode */}
      {mode === "edit" && initial?.id && (
        <div id="images" className="card" style={{ marginTop: 20 }}>
          <h3 className="page-title" style={{ fontSize: 18, marginBottom: 12 }}>Images</h3>
          <div className="help">Upload up to 3 images. Slot 1 is used as the primary image.</div>
          <ProductImagesManager productId={initial.id} />
        </div>
      )}
    </>
  );
};

export default ProductForm;
