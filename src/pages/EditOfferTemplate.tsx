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
import "../css/EditProfile.css";

interface Props {
  token: string;
}

const EditOfferTemplate: React.FC<Props> = ({ token }) => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<OfferTemplateRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          maxClaims: template.maxClaims,
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
        });
      })
      .catch(() => setError("Failed to load template details"));
  }, [templateId, token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (!form) return;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
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

  if (error)
    return <div className="p-6 text-red-600 text-center">{error}</div>;
  if (!form)
    return <div className="p-6 text-gray-700 text-center">Loading...</div>;

  return (
    <div className="profile-container">
      <h2 className="text-xl font-bold mb-4">Edit Offer Template</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label>Template Title:</label>
          <input
            type="text"
            name="templateTitle"
            placeholder="Title"
            value={form.templateTitle}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Offer Type:</label>
          <select name="offerType" value={form.offerType} onChange={handleChange}>
            <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
            <option value="FIXED_DISCOUNT">Fixed Discount</option>
            <option value="FREE_PRODUCT">Free Product</option>
            <option value="FREE_SERVICE">Free Service</option>
          </select>
        </div>

        {form.offerType === "PERCENTAGE_DISCOUNT" && (
          <>
            <div className="form-group">
              <label>Discount %:</label>
              <input
                type="number"
                name="discountPercentage"
                value={form.discountPercentage || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Max Discount Amount:</label>
              <input
                type="number"
                name="maxDiscountAmount"
                value={form.maxDiscountAmount || ""}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Validity Type:</label>
          <select name="validityType" value={form.validityType} onChange={handleChange}>
            <option value="ABSOLUTE">Absolute Validity</option>
            <option value="RELATIVE">Relative Validity</option>
          </select>
        </div>

        {form.validityType === "ABSOLUTE" ? (
          <>
            <div className="form-group">
              <label>Valid From:</label>
              <input
                type="date"
                name="validFrom"
                value={form.validFrom || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Valid To:</label>
              <input
                type="date"
                name="validTo"
                value={form.validTo || ""}
                onChange={handleChange}
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Duration (Days):</label>
              <input
                type="number"
                name="durationDays"
                value={form.durationDays || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Trigger:</label>
              <select name="trigger" value={form.trigger || ""} onChange={handleChange}>
                <option value="">Select Trigger</option>
              <option value="ON_ASSIGNMENT">On Assignment</option>
              <option value="ON_ACCEPTANCE">On Acceptance</option>
              <option value="ON_CLAIM_OF_LINKED_OFFER">On Claim of Linked Offer</option>
              </select>
            </div>
          </>
        )}

        <button type="submit" className="primary-btn">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditOfferTemplate;
