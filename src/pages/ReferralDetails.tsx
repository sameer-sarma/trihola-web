import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchReferralBySlug } from "../services/referralService";
import { getOfferTemplates, assignOfferToReferral, fetchOfferDetails } from "../services/offerService";
import { acceptReferral, rejectReferral, cancelReferral } from "../services/referralService"; 
import { ReferralDTO } from "../types/referral";
import { OfferTemplateDTO } from "../types/offer";
import { supabase } from "../supabaseClient";
import { Gift } from "lucide-react";
import ReferralActions from "../components/ReferralActions";
import "../css/Referral.css";

interface ReferralDetailsProps {
  referral: ReferralDTO;
  setReferral: (referral: ReferralDTO) => void;
  onThreadUpdate?: () => void;
}

const ReferralDetails: React.FC<ReferralDetailsProps> = ({ referral, setReferral, onThreadUpdate }) => {
  const { slug } = useParams();
  const [offerTemplates, setOfferTemplates] = useState<OfferTemplateDTO[]>([]);
  const [selectedOffers, setSelectedOffers] = useState<{ [key: string]: string }>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedOfferTitles, setAssignedOfferTitles] = useState<{
    REFERRER?: string;
    PROSPECT?: string;
    BUSINESS?: string;
  }>({});

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      const uid = session?.user?.id;

      if (!token || !slug || !uid) {
        setLoading(false);
        return;
      }

      try {
        const templates = await getOfferTemplates(token);
        setOfferTemplates(templates);
        setUserId(uid);

        const titles: { REFERRER?: string; PROSPECT?: string; BUSINESS?: string } = {};

        if (referral.referrerOfferId) {
          const offer = await fetchOfferDetails(token, referral.referrerOfferId);
          titles.REFERRER = offer.offerTitle;
        }
        if (referral.prospectOfferId) {
          const offer = await fetchOfferDetails(token, referral.prospectOfferId);
          titles.PROSPECT = offer.offerTitle;
        }

        setAssignedOfferTitles(titles);
      } catch (err) {
        console.error("Failed to fetch offer templates or details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, referral]);


  const handleAcceptReferral = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !referral || !slug) return;

  try {
    await acceptReferral(token, referral.id);
    const updated = await fetchReferralBySlug(token, slug);
    setReferral(updated);
    onThreadUpdate?.();
  } catch (err) {
    console.error("Failed to accept referral:", err);
  }
};

const handleRejectReferral = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !referral || !slug) return;

  try {
    await rejectReferral(token, referral.id);
    const updated = await fetchReferralBySlug(token, slug);
    setReferral(updated);
    onThreadUpdate?.();
  } catch (err) {
    console.error("Failed to reject referral:", err);
  }
};

const handleCancelReferral = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !referral || !slug) return;

  try {
    await cancelReferral(token, referral.id);
    const updated = await fetchReferralBySlug(token, slug);
    setReferral(updated);
    onThreadUpdate?.();
  } catch (err) {
    console.error("Failed to cancel referral:", err);
  }
};


  const handleAssignOffer = async (role: "REFERRER" | "PROSPECT") => {
    const templateId = selectedOffers[role];
    if (!templateId || !referral) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    try {
      await assignOfferToReferral(token, referral.id, role, templateId);
      const updated = await fetchReferralBySlug(token, slug!);
      setReferral(updated); // ✅ Lifted state update
      onThreadUpdate?.();    // ✅ Refresh the thread
    } catch (err) {
      console.error("Failed to assign offer:", err);
    }
  };

  if (loading) return <p className="text-center mt-6">Loading referral...</p>;
  if (!referral) return <p className="text-center mt-6 text-red-600">Referral not found.</p>;

  const participants = [
    {
      id: referral.referrerId,
      name: referral.referrerName,
      slug: referral.referrerSlug,
      imageUrl: referral.referrerProfileImageUrl,
      role: "REFERRER",
      acceptanceStatus: referral.status === "CANCELLED" ? "CANCELLED" : "ACCEPTED",
      offerId: referral.referrerOfferId,
    },
    {
      id: referral.prospectId,
      name: referral.prospectName,
      slug: referral.prospectSlug,
      imageUrl: referral.prospectProfileImageUrl,
      role: "PROSPECT",
      acceptanceStatus: referral.status === "CANCELLED" ? "NOT APPLICABLE" : referral.prospectAcceptanceStatus,
      offerId: referral.prospectOfferId,
    },
    {
      id: referral.businessId,
      name: referral.businessName,
      slug: referral.businessSlug,
      imageUrl: referral.businessProfileImageUrl,
      role: "BUSINESS",
      acceptanceStatus: referral.status === "CANCELLED" ? "NOT APPLICABLE" : referral.businessAcceptanceStatus,
    },
  ];

  return (
    <div className="referral-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
      {/* Left: Participant Panel */}
      <div style={{ flex: '1 1 300px' }}>
        <div className="participant-row" style={{ borderBottom: "none" }}>
          {participants.map((p) => (
            <div key={p.id} className="participant-block">
              <img src={p.imageUrl || "/default-avatar.png"} alt="Profile" className="profile-img" />
              <Link to={`/profile/${p.slug || p.id}`} className="participant-name">
                {p.id === userId ? "You" : p.name || "Unknown"}
              </Link>
              <div className="participant-role">{p.role}</div>
              <div className={`participant-status status-${p.acceptanceStatus?.toLowerCase()}`}>
                {p.acceptanceStatus?.toLowerCase()}
              </div>
              {p.offerId && (
                <div className="participant-offer">
                  <Link to={`/offers/${p.offerId}`}>
                    <Gift className="offer-icon" />
                  </Link>
                  {assignedOfferTitles[p.role as keyof typeof assignedOfferTitles] && (
                    <div className="offer-title">
                      {assignedOfferTitles[p.role as keyof typeof assignedOfferTitles]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Status + Actions vertically stacked */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Referral status and note */}
        <div className="referral-info">
          <div className="status-meta">
            <span><strong>Status:</strong> {referral.status}</span>
            <span><strong>Created:</strong> {new Date(referral.createdAt).toLocaleString()}</span>
          </div>
          <div className="referral-note">
            <strong>Note:</strong> {referral.note}
          </div>
        </div>

        {/* Action Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ReferralActions
            referral={referral}
            userId={userId!}
            offerTemplates={offerTemplates}
            selectedOffers={selectedOffers}
            setSelectedOffers={setSelectedOffers}
            handleAssignOffer={handleAssignOffer}
             handleAcceptReferral={handleAcceptReferral}
             handleRejectReferral={handleRejectReferral}
             handleCancelReferral={handleCancelReferral}
          />
        </div>
      </div>
    </div>
  );
};

export default ReferralDetails;
