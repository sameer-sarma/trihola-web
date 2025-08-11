import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchOfferTemplateById } from "../services/offerTemplateService";
import { OfferTemplateResponse } from "../types/offerTemplateTypes";

interface Props {
  token: string;
}

const OfferTemplateDetails: React.FC<Props> = ({token}) => {
    const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<OfferTemplateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId || !token) return;

    fetchOfferTemplateById(templateId, token)
      .then(setTemplate)
      .catch(() => setError("Failed to load offer template details"));
  }, [templateId, token]);

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  if (!template) {
    return <div className="p-6 text-center text-gray-600">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-2">{template.templateTitle}</h1>
      <p className="text-gray-700 mb-4">{template.description}</p>

      <div className="mb-2">
        <strong>Type:</strong> {template.offerType.replace("_", " ")}
      </div>

      <div className="mb-2">
        {template.offerType === "PERCENTAGE_DISCOUNT" && (
          <p>
            Discount: {template.discountPercentage}% (Max ₹{template.maxDiscountAmount})
          </p>
        )}
        {template.offerType === "FIXED_DISCOUNT" && (
          <p>Flat Discount: ₹{template.discountAmount}</p>
        )}
        {template.offerType === "FREE_PRODUCT" && (
          <p>Free Product: {template.productName}</p>
        )}
        {template.offerType === "FREE_SERVICE" && (
          <p>Free Service: {template.serviceName}</p>
        )}
      </div>

      {template.specialTerms && (
        <div className="mb-4">
          <strong>Special Terms:</strong>
          <p className="text-sm text-gray-600 italic">{template.specialTerms}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/offer-template/${template.offerTemplateId}/edit`)}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Edit Template
        </button>
      </div>
    </div>
  );
};

export default OfferTemplateDetails;
