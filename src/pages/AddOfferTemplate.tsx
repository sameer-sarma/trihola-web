import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { upsertOfferTemplate } from "../services/offerTemplateService";
import "../css/EditProfile.css";
import {
  OfferTypeEnum,
  ValidityType,
  OfferTemplateRequest,
  ValidityTrigger,
} from "../types/offerTemplateTypes";

interface Props {
  token: string;
  userId: string;
  profile: {
    registeredAsBusiness?: boolean;
  };
}

const AddOfferTemplate: React.FC<Props> = ({ token, userId, profile }) => {
  const navigate = useNavigate();

  const [form, setForm] = useState<OfferTemplateRequest>({
    businessId: userId,
    templateTitle: "",
    description: "",
    offerType: "PERCENTAGE_DISCOUNT",
    discountPercentage: undefined,
    maxDiscountAmount: undefined,
    discountAmount: undefined,
    productName: "",
    serviceName: "",
    validityType: "ABSOLUTE",
    validFrom: "",
    validTo: "",
    durationDays: undefined,
    trigger: undefined,
    isActive: true,
  });

  if (!profile.registeredAsBusiness) {
    return (
      <div className="p-6 text-red-600 text-center">
        Access denied. You must be registered as a business to create offer templates.
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertOfferTemplate(form, token);
      navigate("/offer-templates");
    } catch (err) {
      console.error("Failed to create template", err);
      alert("Error creating template");
    }
  };

  return (
    <div className="profile-container">
      <h2 className="text-xl font-bold mb-4">Create Offer Template</h2>
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
        <select
          name="offerType"
          value={form.offerType}
          onChange={handleChange}
        >
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
              placeholder="Discount %"
              value={form.discountPercentage || ""}
              onChange={handleChange}
            />
        </div>
        <div className="form-group">
          <label>Max Discount Amount:</label>
            <input
              type="number"
              name="maxDiscountAmount"
              placeholder="Max Discount Amount"
              value={form.maxDiscountAmount || ""}
              onChange={handleChange}
            />
        </div>
          </>
        )}

        {form.offerType === "FIXED_DISCOUNT" && (
        <div className="form-group">
          <label>Discount Amount:</label>
          <input
            type="number"
            name="discountAmount"
            placeholder="Discount Amount"
            value={form.discountAmount || ""}
            onChange={handleChange}
          />
        </div>
        )}

        {form.offerType === "FREE_PRODUCT" && (
        <div className="form-group">
          <label>Product Name:</label>
          <input
            type="text"
            name="productName"
            placeholder="Product Name"
            value={form.productName || ""}
            onChange={handleChange}
          />
        </div>
        )}

        {form.offerType === "FREE_SERVICE" && (
        <div className="form-group">
          <label>Service Name:</label>
          <input
            type="text"
            name="serviceName"
            placeholder="Service Name"
            value={form.serviceName || ""}
            onChange={handleChange}
          />
        </div>
        )}

        <div className="form-group">
          <label>Validity Type:</label>
        <select
          name="validityType"
          value={form.validityType}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        >
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
          <label>Number of Days:</label>
            <input
              type="number"
              name="durationDays"
              placeholder="Duration in days"
              value={form.durationDays || ""}
              onChange={handleChange}
            />
        </div>
        <div className="form-group">
          <label>Trigger:</label>
            <select
              name="trigger"
              value={form.trigger || ""}
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

        <button
          type="submit"
          className="primary-btn"
        >
          Save Template
        </button>
      </form>
    </div>
  );
};

export default AddOfferTemplate;
