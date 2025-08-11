// src/pages/OfferDetails.tsx

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";
import OfferCard from "../components/OfferCard";
import { OfferDetailsDTO } from "../types/offer";
import { QRCodeSVG } from "qrcode.react";
import "../css/OfferDetails.css";

const OfferDetails: React.FC = () => {
  const { assignedOfferId } = useParams();
  const [offer, setOffer] = useState<OfferDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimQrValue, setClaimQrValue] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOffer = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token || !assignedOfferId) {
        setError("Missing token or offer ID.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${__API_BASE__}/offers/${assignedOfferId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setOffer(response.data);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 403) {
            setError("You are not authorized to view this offer.");
          } else {
            console.error("Failed to fetch offer details:", error);
            setError("An unexpected error occurred. Please try again later.");
          }
        } else {
          console.error("Unexpected non-Axios error:", error);
          setError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [assignedOfferId]);

  const handleClaim = async (assignedOffer: OfferDetailsDTO) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!assignedOfferId || !token) return;

    const offerType = offer?.offerType; // e.g., "DISCOUNT", "FREE_SERVICE", etc.
  const redemptionType = offerType; // reuse offerType for now

  // Optionally determine redemptionValue
let redemptionValue: string | null = null;

switch (offerType) {
  case "FIXED_DISCOUNT":
redemptionValue = assignedOffer?.discountAmount != null
  ? String(assignedOffer.discountAmount)
  : null;
    break;
  case "FREE_SERVICE":
    redemptionValue = assignedOffer?.serviceName ?? null;
    break;
  case "FREE_PRODUCT":
    redemptionValue = assignedOffer?.productName ?? null;
    break;
  case "PERCENTAGE_DISCOUNT":
    redemptionValue = null; // not needed or derived later
    break;
  default:
    redemptionValue = null;
}

  const payload = {
    redemptionType,
    redemptionValue,
    note: "Initiating claim", // optional static or user-entered
    expiresInMinutes: 10,
  };

  try {
    const response = await axios.post(
      `${__API_BASE__}/offers/${assignedOffer.assignedOfferId}/claim`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setClaimQrValue(
      JSON.stringify({
        assignedOfferId: assignedOffer.assignedOfferId,
        claimToken: response.data.claimToken,
      })
    );
  } catch (err) {
    console.error("Failed to claim offer:", err);
    alert("Failed to claim offer.");
  }
};

  if (loading) return <p className="center-text">Loading offer...</p>;

  if (error) {
    return (
      <div className="error-box">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Go Back
        </button>
      </div>
    );
  }

  if (!offer) return <p className="center-text error-message">Offer not found.</p>;

  return (
    <div className="offer-details-container">
      <OfferCard offer={offer} />

      {offer.canClaim && offer.status === "ACTIVE" && !claimQrValue && (
        <div className="claim-button-container">
          <button className="claim-button" onClick={() => handleClaim(offer)}>
            Claim This Offer
            </button>
        </div>
      )}

      {claimQrValue && (
        <div className="qr-container">
          <div className="qr-card">
            <h3 className="qr-title">🎁 Claim QR Code</h3>

            <div className="qr-code">
              <QRCodeSVG value={claimQrValue} size={160} />
            </div>

            <p className="qr-description">
              Show this code at the business to validate your claim.
            </p>

            <Link
              to="/qrcode"
              state={{
                qrValue: claimQrValue,
                title: "🎁 Claim QR Code",
                subtitle: `Assigned to ${offer.assignedToName}`,
                footer: `Offer: ${offer.offerTitle}`,
                size: 256,
              }}
              className="fullscreen-link"
            >
              View Fullscreen QR
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferDetails;
