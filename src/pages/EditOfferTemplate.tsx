import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchOfferTemplateById,
  upsertOfferTemplate, buildOfferTemplatePayload
} from "../services/offerTemplateService";
import {
  OfferTemplateRequest,
  OfferTemplateResponse,
  UiOfferKind,
} from "../types/offerTemplateTypes";
import GrantEditor from "../components/GrantEditor";

import ProductPicker from "../components/ProductPicker";
import BundlePicker  from "../components/BundlePicker";
import { productPickerLoader, bundlePickerLoader } from "../services/pickerLoaders";

interface Props {
  token: string;
}

const EditOfferTemplate: React.FC<Props> = ({ token }) => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<OfferTemplateRequest | null>(null);
  const [uiOfferKind, setUiOfferKind] = useState<UiOfferKind>("PERCENTAGE");
  const [error, setError] = useState<string | null>(null);

  // Load existing template
  useEffect(() => {
    if (!templateId || !token) return;
    fetchOfferTemplateById(templateId, token)
      .then((template: OfferTemplateResponse) => {
        setForm({
          businessId: template.businessId,
          offerTemplateId: template.offerTemplateId,
          templateTitle: template.templateTitle ?? "",
          description: template.description ?? "",
          imageUrls: template.imageUrls ?? [],
          specialTerms: template.specialTerms ?? "",
          maxRedemptions: template.maxRedemptions ?? undefined,
          eligibility: template.eligibility ?? "",
          offerType: template.offerType,
          minPurchaseAmount: template.minPurchaseAmount ?? undefined,
          discountPercentage: template.discountPercentage ?? undefined,
          maxDiscountAmount: template.maxDiscountAmount ?? undefined,
          discountAmount: template.discountAmount ?? undefined,
          validityType: template.validityType,
          validFrom: template.validFrom ?? "",
          validTo: template.validTo ?? "",
          durationDays: template.durationDays ?? undefined,
          trigger: template.trigger ?? undefined,
          isActive: template.isActive ?? true,
          claimPolicy: template.claimPolicy ?? "BOTH",
          appliesToType: template.appliesToType ?? "ANY_PURCHASE",
          appliesProductId: template.appliesProductId ?? undefined,
          appliesBundleId: template.appliesBundleId ?? undefined,
          grants: template.grants ?? [],
        });
        setError(null);

        // infer UI kind
        const inferred: UiOfferKind =
          (template.grants?.length ?? 0) > 0 && !template.offerType
            ? "GRANTS"
            : template.offerType === "FIXED_DISCOUNT"
            ? "ABSOLUTE"
            : "PERCENTAGE";
        setUiOfferKind(inferred);
      })
      .catch(() => setError("Failed to load template details"));
  }, [templateId, token]);

  // keep fields in sync when switching kind
  useEffect(() => {
    if (!form) return;
    if (uiOfferKind === "GRANTS") {
      setForm((prev) =>
        prev
          ? {
              ...prev,
              offerType: undefined,
              discountPercentage: undefined,
              maxDiscountAmount: undefined,
              discountAmount: undefined,
            }
          : prev
      );
    } else if (uiOfferKind === "PERCENTAGE") {
      setForm((prev) => (prev ? { ...prev, offerType: "PERCENTAGE_DISCOUNT", discountAmount: undefined } : prev));
    } else if (uiOfferKind === "ABSOLUTE") {
      setForm((prev) =>
        prev
          ? {
              ...prev,
              offerType: "FIXED_DISCOUNT",
              discountPercentage: undefined,
              maxDiscountAmount: undefined,
            }
          : prev
      );
    }
  }, [uiOfferKind, form]);

  // ---- typed change helpers ----
  type NumericKeys =
    | "discountPercentage"
    | "maxDiscountAmount"
    | "discountAmount"
    | "minPurchaseAmount"
    | "durationDays"
    | "maxRedemptions";

  type BooleanKeys = "isActive";

  const NUMERIC_KEYS: ReadonlyArray<NumericKeys> = [
    "discountPercentage",
    "maxDiscountAmount",
    "discountAmount",
    "minPurchaseAmount",
    "durationDays",
    "maxRedemptions",
  ];

  const BOOLEAN_KEYS: ReadonlyArray<BooleanKeys> = ["isActive"];

  const updateForm = (patch: Partial<OfferTemplateRequest>) =>
    setForm((prev) => (prev ? ({ ...prev, ...patch } as OfferTemplateRequest) : prev));

  function setField<K extends keyof OfferTemplateRequest>(
    key: K,
    raw: string,
    checked: boolean
  ) {
    setForm((prev) => {
      if (!prev) return prev;

      const next: OfferTemplateRequest = { ...prev };
      if ((NUMERIC_KEYS as ReadonlyArray<string>).includes(key as string)) {
        (next[key] as unknown as number | undefined) =
          raw === "" ? undefined : Number(raw);
      } else if ((BOOLEAN_KEYS as ReadonlyArray<string>).includes(key as string)) {
        (next[key] as unknown as boolean) = checked;
      } else {
        (next[key] as unknown as string | undefined) =
          raw === "" ? undefined : raw;
      }
      return next;
    });
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, checked } = e.target as HTMLInputElement;
    if (name === "uiOfferKind") {
      setUiOfferKind(value as UiOfferKind);
      return;
    }
    setField(name as keyof OfferTemplateRequest, value, checked);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form) return;

  // Mutual exclusivity guardrails (validate only)
  if (uiOfferKind === "GRANTS") {
    if ((form.grants?.length ?? 0) < 1) {
      alert("Please add at least one grant (free product or bundle).");
      return;
    }
  } else if (uiOfferKind === "PERCENTAGE") {
    if (form.discountPercentage == null) {
      alert("Please enter a discount percentage.");
      return;
    }
  } else if (uiOfferKind === "ABSOLUTE") {
    if (form.discountAmount == null) {
      alert("Please enter a flat discount amount.");
      return;
    }
  } // ← CLOSE the else-if chain properly

  // Scope checks
  if (form.appliesToType === "PRODUCT" && !form.appliesProductId) {
    alert("Please select a product for applicability.");
    return;
  }
  if (form.appliesToType === "BUNDLE" && !form.appliesBundleId) {
    alert("Please select a bundle for applicability.");
    return;
  }
  
  if (form.validityType === "RELATIVE" && !form.trigger) {
    alert("Please pick an activation trigger for relative validity.");
    return;
  }

  try {
    const payload = buildOfferTemplatePayload(form, uiOfferKind); // now typed as OfferTemplateRequest
    await upsertOfferTemplate(payload, token); // no TS error
    navigate("/offer-templates");
  } catch (err) {
    console.error("Failed to save template", err);
    alert("Error saving template");
  }
};


  if (error) return <div className="page-wrap">{error}</div>;
  if (!form) return <div className="page-wrap">Loading...</div>;

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">Edit Offer Template</h2>

        <form onSubmit={handleSubmit} className="th-form" noValidate>
          {/* BASICS */}
          <div className="card-section">
            <h4 className="section-title">🎯 Basics</h4>
            <div className="th-grid-2">
              <div className="th-field">
                <label className="th-label">Template Title</label>
                <input
                  className="th-input"
                  type="text"
                  name="templateTitle"
                  placeholder="e.g., 15% off on first order"
                  value={form.templateTitle}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="th-field">
                <label className="th-label">Offer kind</label>
                <select
                  className="select"
                  name="uiOfferKind"
                  value={uiOfferKind}
                  onChange={handleChange}
                >
                  <option value="PERCENTAGE">Discount — Percentage</option>
                  <option value="ABSOLUTE">Discount — Absolute</option>
                  <option value="GRANTS">Grants — Free items</option>
                </select>
              </div>

              <div className="th-field th-col-span-2">
                <label className="th-label">Description</label>
                <textarea
                  className="th-textarea"
                  name="description"
                  placeholder="Short description customers will see"
                  value={form.description ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

        {/* TYPE-SPECIFIC (full-width stripe with 2-col grid) */}
        <div className="section-block section-block--accent">
          <div className="section-header">🧩 Type-specific fields</div>
          <div className="section-grid">
            {/* Percentage discount */}
            {uiOfferKind === "PERCENTAGE" && (
              <>
                <div className="th-field">
                  <label className="th-label">Discount %</label>
                  <input
                    className="th-input"
                    type="number"
                    name="discountPercentage"
                    placeholder="e.g., 15"
                    value={form.discountPercentage ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="th-field">
                  <label className="th-label">Max Discount Amount</label>
                  <input
                    className="th-input"
                    type="number"
                    name="maxDiscountAmount"
                    placeholder="e.g., 500"
                    value={form.maxDiscountAmount ?? ""}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {/* Absolute discount (single field spans both columns) */}
            {uiOfferKind === "ABSOLUTE" && (
              <div className="th-field col-span-2">
                <label className="th-label">Flat Discount Amount</label>
                <input
                  className="th-input"
                  type="number"
                  name="discountAmount"
                  placeholder="e.g., 200"
                  value={form.discountAmount ?? ""}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Grants: show GrantEditor, spanning full width */}
            {uiOfferKind === "GRANTS" && (
              <div className="th-field col-span-2">
                <label className="th-label">Free items</label>
                <GrantEditor
                  value={form.grants ?? []}
                  onChange={(gr) => updateForm({ grants: gr })}
                  fetchProducts={productPickerLoader}
                  fetchBundles={bundlePickerLoader}
                />
              </div>
            )}
          </div>
        </div>

          {/* APPLICABILITY (SCOPE) */}
          <div className="card-section">
            <h4 className="section-title">📦 Applicability</h4>
            <div className="th-grid-2">
              <div className="th-field">
                <label className="th-label">Scope</label>
                <select
                  className="select"
                  name="appliesToType"
                  value={form.appliesToType ?? "ANY_PURCHASE"}
                  onChange={handleChange}
                >
                  <option value="ANY_PURCHASE">Any purchase (global)</option>
                  <option value="PRODUCT">Specific product</option>
                  <option value="BUNDLE">Specific bundle</option>
                </select>
              </div>

            {form.appliesToType === "PRODUCT" && (
              <div className="th-field">
                <label className="th-label">Product</label>
                <ProductPicker
                  value={form.appliesProductId ?? null}
                  onChange={(id) => updateForm({ appliesProductId: id ?? undefined })}
                  fetchItems={productPickerLoader}
                  placeholder="Search product…"
                />
              </div>
            )}

            {form.appliesToType === "BUNDLE" && (
              <div className="th-field">
                <label className="th-label">Bundle</label>
                <BundlePicker
                  value={form.appliesBundleId ?? null}
                  onChange={(id) => updateForm({ appliesBundleId: id ?? undefined })}
                  fetchItems={bundlePickerLoader}
                  placeholder="Search bundle…"
                />
              </div>
            )}
            </div>
            <p className="th-help">Tip: we can swap these for dropdown selectors later.</p>
          </div>

          {/* VALIDITY */}
          <div className="section-block">
            <div className="section-header">⏳ Validity</div>
            <div className="section-grid">
              <div className="th-field">
                <label className="th-label">Validity Type</label>
                <select
                  className="select"
                  name="validityType"
                  value={form.validityType}
                  onChange={handleChange}
                >
                  <option value="ABSOLUTE">Absolute</option>
                  <option value="RELATIVE">Relative</option>
                </select>
              </div>

              {form.validityType === "ABSOLUTE" ? (
                <>
                  <div className="th-field">
                    <label className="th-label">Valid From</label>
                    <input
                      className="th-input"
                      type="date"
                      name="validFrom"
                      value={form.validFrom ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="th-field">
                    <label className="th-label">Valid To</label>
                    <input
                      className="th-input"
                      type="date"
                      name="validTo"
                      value={form.validTo ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="th-field">
                    <label className="th-label">Duration (days)</label>
                    <input
                      className="th-input"
                      type="number"
                      name="durationDays"
                      placeholder="e.g., 30"
                      value={form.durationDays ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="th-field">
                    <label className="th-label">Activation Trigger</label>
                    <select
                      className="select"
                      name="trigger"
                      value={form.trigger ?? ""}
                      onChange={handleChange}
                    >
                      <option value="">Select Trigger</option>
                      <option value="ON_ASSIGNMENT">On Assignment</option>
                      <option value="ON_ACCEPTANCE">On Acceptance</option>
                      <option value="ON_CLAIM_OF_LINKED_OFFER">On Claim of Linked Offer</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>


          {/* RULES (OPTIONAL) */}
          <details className="section-details">
            <summary>⚙️ Rules & Optional Limits</summary>
            <div className="section-grid">
              <div className="th-field">
                <label className="th-label">Minimum Purchase Amount</label>
                <input
                  className="th-input"
                  type="number"
                  name="minPurchaseAmount"
                  placeholder="e.g., 1000"
                  value={form.minPurchaseAmount ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="th-field">
                <label className="th-label">Max Redemptions</label>
                <input
                  className="th-input"
                  type="number"
                  name="maxRedemptions"
                  placeholder="e.g., 100"
                  value={form.maxRedemptions ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="th-field col-span-2">
                <label className="th-label">Claim Mode</label>
                <select
                  className="select"
                  name="claimPolicy"
                  value={form.claimPolicy || "BOTH"}
                  onChange={handleChange}
                >
                  <option value="BOTH">Online & Offline</option>
                  <option value="ONLINE">E-commerce only</option>
                  <option value="MANUAL">Direct purchases</option>
                </select>
              </div>

              <div className="th-field col-span-2">
                <label className="th-label">Eligibility</label>
                <textarea
                  className="th-textarea"
                  name="eligibility"
                  placeholder="Who can redeem (e.g., new users only)"
                  value={form.eligibility ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="th-field col-span-2">
                <label className="th-label">Special Terms</label>
                <textarea
                  className="th-textarea"
                  name="specialTerms"
                  placeholder="Important T&Cs to show users"
                  value={form.specialTerms ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="th-field col-span-2">
                <label className="switch">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={!!form.isActive}
                    onChange={handleChange}
                  />
                  Active
                </label>
              </div>
            </div>
          </details>


          {/* ACTIONS */}
          <div className="actions">
            <button type="submit" className="btn btn--primary">Save Template</button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/offer-templates")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOfferTemplate;
