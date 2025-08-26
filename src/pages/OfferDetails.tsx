// src/pages/OfferDetails.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../supabaseClient";
import OfferCard from "../components/OfferCard";
import { OfferDetailsDTO } from "../types/offer";
import { useOfferClaims } from "../hooks/useOfferClaims"; // <-- your hook
import "../css/OfferDetails.css";

const OfferDetailsLoaded: React.FC<{ offer: OfferDetailsDTO }> = ({ offer }) => {
  // One fetch for claims (no duplicate API calls)
  const { manual, online, generateManual, generateOnline } = useOfferClaims(offer);

  return (
    <div className="offer-details-container">
      <OfferCard
        offer={offer}
        manualClaim={manual}
        onlineClaim={online}
        onGenerateManual={generateManual}
        onGenerateOnline={generateOnline}
      />
    </div>
  );
};

const OfferDetails: React.FC = () => {
  const { assignedOfferId } = useParams();
  const [offer, setOffer] = useState<OfferDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOffer = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token || !assignedOfferId) {
        setError("Missing token or offer ID.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${__API_BASE__}/offers/${assignedOfferId}`, {
          headers: { Authorization: `Bearer ${token}` },
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

  // Render the loaded section (contains OfferCard and claims UI)
  return <OfferDetailsLoaded offer={offer} />;
};

export default OfferDetails;
