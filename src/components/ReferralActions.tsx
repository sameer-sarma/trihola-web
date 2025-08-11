import React from "react";
import { ReferralDTO } from "../types/referral";
import { OfferTemplateDTO } from "../types/offer";

interface ReferralActionsProps {
  referral: ReferralDTO;
  userId: string;
  offerTemplates: OfferTemplateDTO[];
  selectedOffers: { [key: string]: string };
  setSelectedOffers: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  handleAssignOffer: (role: "REFERRER" | "PROSPECT") => void;
  handleAcceptReferral: () => void;
  handleRejectReferral: () => void;
  handleCancelReferral: () => void;
}

const ReferralActions: React.FC<ReferralActionsProps> = ({
  referral,
  userId,
  offerTemplates,
  selectedOffers,
  setSelectedOffers,
  handleAssignOffer,
  handleAcceptReferral,
  handleRejectReferral,
  handleCancelReferral,
}) => {
  const isReferrer = userId === referral.referrerId;
  const isProspect = userId === referral.prospectId;
  const isBusiness = userId === referral.businessId;

  const showCancel =
    isReferrer && ["PENDING", "PARTIALLY_ACCEPTED"].includes(referral.status);
  const showAcceptReject =
    (isProspect && referral.prospectAcceptanceStatus === "PENDING") ||
    (isBusiness && referral.businessAcceptanceStatus === "PENDING");
  const showOfferAssignment = isBusiness && referral.businessAcceptanceStatus === "ACCEPTED";

  return (
    <div className="action-buttons">
      {showCancel && (
        <button className="cancel-btn" onClick={handleCancelReferral}>
          Cancel Referral
        </button>
      )}

      {showAcceptReject && (
        <div className="accept-reject-buttons" style={{ display: "flex", gap: "12px" }}>
          <button className="accept-btn" onClick={handleAcceptReferral}>
            Accept Referral
          </button>
          <button className="reject-btn" onClick={handleRejectReferral}>
            Reject Referral
          </button>
        </div>
      )}

      {showOfferAssignment && (
        <div className="offer-assignment-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ flex: '1' }}>
            <label className="block text-sm font-medium mb-1">
              {referral.referrerOfferId ? "Edit Offer for Referrer" : "Assign Offer to Referrer"}
            </label>
            <select
              className="border rounded w-full p-2"
              value={selectedOffers.REFERRER || ""}
              onChange={(e) =>
                setSelectedOffers((prev) => ({ ...prev, REFERRER: e.target.value }))
              }
            >
              <option value="">Select offer template</option>
              {offerTemplates.map((ot) => (
                <option key={ot.offerTemplateId} value={ot.offerTemplateId}>
                  {ot.templateTitle}
                </option>
              ))}
            </select>
            <button
              className="assign-btn"
              onClick={() => handleAssignOffer("REFERRER")}
              disabled={!selectedOffers.REFERRER}
            >
              {referral.referrerOfferId ? "Update Offer" : "Assign to Referrer"}
            </button>
          </div>

          <div style={{ flex: '1' }}>
            <label className="block text-sm font-medium mb-1">
              {referral.prospectOfferId ? "Edit Offer for Prospect" : "Assign Offer to Prospect"}
            </label>
            <select
              className="border rounded w-full p-2"
              value={selectedOffers.PROSPECT || ""}
              onChange={(e) =>
                setSelectedOffers((prev) => ({ ...prev, PROSPECT: e.target.value }))
              }
            >
              <option value="">Select offer template</option>
              {offerTemplates.map((ot) => (
                <option key={ot.offerTemplateId} value={ot.offerTemplateId}>
                  {ot.templateTitle}
                </option>
              ))}
            </select>
            <button
              className="assign-btn"
              onClick={() => handleAssignOffer("PROSPECT")}
              disabled={!selectedOffers.PROSPECT}
            >
              {referral.prospectOfferId ? "Update Offer" : "Assign to Prospect"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralActions;
