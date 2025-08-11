import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOfferTemplates } from "../services/offerTemplateService";
import { OfferTemplateResponse } from "../types/offerTemplateTypes";

interface Props {
  profile: {
    registeredAsBusiness?: boolean;
  };
  token: string;
  userId: string;
}

const OfferTemplates: React.FC<Props> = ({ profile, token }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<OfferTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.registeredAsBusiness || !token) return;

    fetchOfferTemplates(token)
      .then(setTemplates)
      .catch((err) => {
        console.error("Error fetching templates:", err);
        setError("Failed to load offer templates");
      })
      .finally(() => setLoading(false));
  }, [profile, token]);

  if (!profile.registeredAsBusiness) {
    return (
      <div className="p-6 text-red-600 text-center">
        Access denied. You must be registered as a business to view offer templates.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading offer templates...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Offer Templates</h2>
        <button
          onClick={() => navigate("/add-offer-template")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="text-gray-600">No offer templates found. Start by creating one.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.offerTemplateId}
              className="border rounded-xl shadow-sm p-4 bg-white hover:shadow-md transition"
            >
              <h3 className="text-lg font-bold">{template.templateTitle}</h3>
              <p className="text-gray-700">{template.description}</p>

              <p className="text-sm text-blue-600 mt-2">
                Type: {template.offerType.replace("_", " ")}
              </p>

              <p className="text-sm mt-1">
                {template.offerType === "PERCENTAGE_DISCOUNT" && (
                  <>Discount: {template.discountPercentage}% (Max ₹{template.maxDiscountAmount})</>
                )}
                {template.offerType === "FIXED_DISCOUNT" && (
                  <>Flat Discount: ₹{template.discountAmount}</>
                )}
                {template.offerType === "FREE_PRODUCT" && (
                  <>Free Product: {template.productName}</>
                )}
                {template.offerType === "FREE_SERVICE" && (
                  <>Free Service: {template.serviceName}</>
                )}
              </p>

              {template.specialTerms && (
                <p className="text-xs text-gray-500 italic mt-2">
                  * {template.specialTerms}
                </p>
              )}

              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => navigate(`/offer-template/${template.offerTemplateId}`)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  View
                </button>
                <button
                  onClick={() => navigate(`/offer-template/${template.offerTemplateId}/edit`)}
                  className="text-sm text-yellow-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfferTemplates;
