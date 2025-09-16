import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../supabaseClient";
import type { OfferDetailsDTO } from "../types/offer";
import OfferCard from "../components/OfferCard";
import OfferAppliesTo from "../components/OfferAppliesTo";
import OfferTiersSection from "../components/OfferTiersSection";
import OfferDetailsSection from "../components/OfferDetailsSection";
import "../css/ui-forms.css";

const API_BASE = import.meta.env.VITE_API_BASE as string;

const OfferDetails: React.FC = () => {
  const { assignedOfferId } = useParams();
  const [offer, setOffer] = useState<OfferDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !assignedOfferId) {
        setError("Missing token or offer ID.");
        setLoading(false);
        return;
      }
      try {
        const resp = await axios.get(`${API_BASE}/offers/${assignedOfferId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOffer(resp.data as OfferDetailsDTO);
      } catch (e: any) {
        setError(e?.response?.status === 403 ? "You are not authorized to view this offer." : "Failed to fetch offer.");
      } finally {
        setLoading(false);
      }
    })();
  }, [assignedOfferId]);

  if (loading) return <p className="center-text">Loading offer...</p>;

  if (error) {
    return (
      <div className="page-wrap">
        <div className="card">
          <p className="error-message">{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn--ghost">Go Back</button>
        </div>
      </div>
    );
  }

  if (!offer) {
    return <div className="page-wrap"><div className="card">Offer not found.</div></div>;
  }

  return (
    <div className="page-wrap">
      {/* Header/summary + Generate Code / Show QR come from OfferCard */}
      <div className="card">
        <OfferCard
          offer={offer}
          // Optional: pipe the Applicability UI into the card to avoid a duplicated "Applies"
          appliesSlot={<></>}
        />
      </div>

      {/* Offer Details section */}
      <OfferDetailsSection title="Details" text={(offer as any).description} />

      {/* Applicability (scopeItems) */}
      <OfferAppliesTo offer={offer} />

      {/* Tiers */}
      <OfferTiersSection offer={offer} />
    </div>
  );
};

export default OfferDetails;
