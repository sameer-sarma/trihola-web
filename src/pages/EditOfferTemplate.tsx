import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchOfferTemplateById,
  upsertOfferTemplate,
} from "../services/offerTemplateService";
import {
  OfferTemplateRequest,
  OfferTemplateResponse,
} from "../types/offerTemplateTypes";
import "../css/forms.css";

interface Props {
  token: string;
}

const EditOfferTemplate: React.FC<Props> = ({ token }) => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<OfferTemplateRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing template
  useEffect(() => {
    if (!templateId || !token) return;
    fetchOfferTemplateById(templateId, token)
      .then((template: OfferTemplateResponse) => {
        setForm({
          businessId: template.businessId,
          offerTemplateId: template.offerTemplateId,
          templateTitle: template.templateTitle,
          description: template.description,
          imageUrls: template.imageUrls || [],
          specialTerms: template.specialTerms,
          maxRedemptions: template.maxRedemptions,
          eligibility: template.eligibility,
          offerType: template.offerType,
          minPurchaseAmount: template.minPurchaseAmount,
          discountPercentage: template.discountPercentage,
          maxDiscountAmount: template.maxDiscountAmount,
          discountAmount: template.discountAmount,
          productName: template.productName,
          serviceName: template.serviceName,
          validityType: template.validityType,
          validFrom: template.validFrom,
          validTo: template.validTo,
          durationDays: template.durationDays,
          trigger: template.trigger,
          isActive: template.isActive,
          claimPolicy: template.claimPolicy ?? "BOTH",
        });
        setError(null);
      })
      .catch(() => setError("Failed to load template details"));
  }, [templateId, token]);

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

  function setField<K extends keyof OfferTemplateRequest>(
    key: K,
    raw: string,
    checked: boolean
  ) {
    setForm((prev) => {
      if (!prev) return prev; // keep null if not loaded yet

      const next: OfferTemplateRequest = { ...prev };

      if ((NUMERIC_KEYS as ReadonlyArray<string>).includes(key as string)) {
        (next[key] as unknown as number | undefined) =
          raw === "" ? undefined : Number(raw);
      } else if (
        (BOOLEAN_KEYS as ReadonlyArray<string>).includes(key as string)
      ) {
        (next[key] as unknown as boolean) = checked;
      } else {
        (next[key] as unknown as string | undefined) =
          raw === "" ? undefined : raw;
      }

      return next;
    });
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, checked } = e.target as HTMLInputElement;
    setField(name as keyof OfferTemplateRequest, value, checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      await upsertOfferTemplate(form, token);
      navigate("/offer-templates");
    } catch (err) {
      console.error("Failed to update template", err);
      alert("Error updating template");
    }
  };

  if (error) return <div className="page-wrap">{error}</div>;
  if (!form) return <div className="page-wrap">Loading...</div>;

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">Edit Offer Template</h2>

        <form onSubmit={handleSubmit} className="form form--two-col">
          {/* BASICS */}
          <div className="section-block" style={{ gridColumn: "1 / -1" }}>
            <div className="section-header">🎯 Basics</div>
            <div className="section-grid">
              <div className="form-group">
                <label className="label">Template Title</label>
                <input
                  className="input"
                  type="text"
                  name="templateTitle"
                  placeholder="e.g., 15% off for first-time customers"
                  value={form.templateTitle}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Offer Type</label>
                <select
                  className="select"
                  name="offerType"
                  value={form.offerType}
                  onChange={handleChange}
                >
                  <option value="PERCENTAGE_DISCOUNT">
                    Percentage Discount
                  </option>
                  <option value="FIXED_DISCOUNT">Fixed Discount</option>
                  <option value="FREE_PRODUCT">Free Product</option>
                  <option value="FREE_SERVICE">Free Service</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  name="description"
                  placeholder="Short description customers will see"
                  value={form.description || ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* TYPE-SPECIFIC */}
          <div
            className="section-block section-block--accent"
            style={{ gridColumn: "1 / -1" }}
          >
            <div className="section-header">🧩 Type-specific fields</div>
            <div className="section-grid">
              {form.offerType === "PERCENTAGE_DISCOUNT" && (
                <>
                  <div className="form-group">
                    <label className="label">Discount %</label>
                    <input
                      className="input"
                      type="number"
                      name="discountPercentage"
                      placeholder="e.g., 15"
                      value={form.discountPercentage ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Max Discount Amount</label>
                    <input
                      className="input"
                      type="number"
                      name="maxDiscountAmount"
                      placeholder="e.g., 500"
                      value={form.maxDiscountAmount ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {form.offerType === "FIXED_DISCOUNT" && (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Flat Discount Amount</label>
                  <input
                    className="input"
                    type="number"
                    name="discountAmount"
                    placeholder="e.g., 200"
                    value={form.discountAmount ?? ""}
                    onChange={handleChange}
                  />
                </div>
              )}

              {form.offerType === "FREE_PRODUCT" && (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Product Name</label>
                  <input
                    className="input"
                    type="text"
                    name="productName"
                    placeholder="e.g., Free coffee mug"
                    value={form.productName ?? ""}
                    onChange={handleChange}
                  />
                </div>
              )}

              {form.offerType === "FREE_SERVICE" && (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Service Name</label>
                  <input
                    className="input"
                    type="text"
                    name="serviceName"
                    placeholder="e.g., Free hair spa"
                    value={form.serviceName ?? ""}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* VALIDITY */}
          <div className="section-block" style={{ gridColumn: "1 / -1" }}>
            <div className="section-header">⏳ Validity</div>
            <div className="section-grid">
              <div className="form-group">
                <label className="label">Validity Type</label>
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
                  <div className="form-group">
                    <label className="label">Valid From</label>
                    <input
                      className="input"
                      type="date"
                      name="validFrom"
                      value={form.validFrom ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Valid To</label>
                    <input
                      className="input"
                      type="date"
                      name="validTo"
                      value={form.validTo ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="label">Duration (days)</label>
                    <input
                      className="input"
                      type="number"
                      name="durationDays"
                      placeholder="e.g., 30"
                      value={form.durationDays ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Activation Trigger</label>
                    <select
                      className="select"
                      name="trigger"
                      value={form.trigger ?? ""}
                      onChange={handleChange}
                    >
                      <option value="">Select Trigger</option>
                      <option value="ON_ASSIGNMENT">On Assignment</option>
                      <option value="ON_ACCEPTANCE">On Acceptance</option>
                      <option value="ON_CLAIM_OF_LINKED_OFFER">
                        On Claim of Linked Offer
                      </option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RULES (OPTIONAL) */}
          <details className="group" style={{ gridColumn: "1 / -1" }} open>
            <summary>⚙️ Rules & Optional Limits</summary>
            <div className="hr" />
            <div className="section-grid">
              <div className="form-group">
                <label className="label">Minimum Purchase Amount</label>
                <input
                  className="input"
                  type="number"
                  name="minPurchaseAmount"
                  placeholder="e.g., 1000"
                  value={form.minPurchaseAmount ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Max Redemptions</label>
                <input
                  className="input"
                  type="number"
                  name="maxRedemptions"
                  placeholder="e.g., 100"
                  value={form.maxRedemptions ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Claim Policy</label>
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

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="label">Eligibility</label>
                <textarea
                  className="textarea"
                  name="eligibility"
                  placeholder="Who can redeem (e.g., new users only)"
                  value={form.eligibility ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="label">Special Terms</label>
                <textarea
                  className="textarea"
                  name="specialTerms"
                  placeholder="Important T&Cs to show users"
                  value={form.specialTerms ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div
                className="form-group form-group--inline"
                style={{ gridColumn: "1 / -1" }}
              >
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
          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="btn btn--ghost" onClick={() => navigate("/offer-templates")}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOfferTemplate;
