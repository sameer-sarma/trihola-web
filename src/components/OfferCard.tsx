// src/components/OfferCard.tsx

import React from "react";
import { Gift } from "lucide-react";
import { OfferDetailsDTO } from "../types/offer";
import "../css/OfferDetails.css";

interface Props {
  offer: OfferDetailsDTO;
}

const OfferCard: React.FC<Props> = ({ offer }) => {
  const formatDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "-";

  return (
    <div className="offer-card">
      <div className="offer-card-header">
        <Gift className="offer-icon" />
        <h2 className="offer-title">{offer.offerTitle}</h2>
      </div>

      <p className="offer-description">{offer.description}</p>

      <ul className="offer-details-list">
        {offer.discountPercentage !== undefined && (
          <li>
            🎯 <strong>Discount:</strong> {offer.discountPercentage}%
          </li>
        )}
        {offer.maxDiscountAmount !== undefined && (
          <li>
            💰 <strong>Max Discount:</strong> ₹{offer.maxDiscountAmount}
          </li>
        )}
        <li>
          📅 <strong>Valid From:</strong> {formatDate(offer.validFrom)}
        </li>
        <li>
          📅 <strong>Valid Until:</strong> {formatDate(offer.validUntil)}
        </li>
        <li>
          📌 <strong>Status:</strong> {offer.status}
        </li>
      </ul>

      <div className="offer-meta">
        <p>
          <strong>Assigned to:</strong> {offer.assignedToName} ({offer.recipientRole})
        </p>
        <p>
          <strong>Assigned by:</strong> {offer.assignedByName}
        </p>
      </div>
    </div>
  );
};

export default OfferCard;
