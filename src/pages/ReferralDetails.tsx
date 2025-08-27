import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gift } from "lucide-react";

import type { ReferralDTO } from "../types/referral";
import type { OfferTemplateDTO } from "../types/offer";

import { getOfferTemplates, assignOfferToReferral } from "../services/offerService";
import { acceptReferral, rejectReferral, cancelReferral } from "../services/referralService";

import "../css/Referral.css";

interface Props {
  referral: ReferralDTO;
  setReferral?: (ref: ReferralDTO) => void; // optional (WS updates state)
}

const ReferralDetails: React.FC<Props> = ({ referral }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<OfferTemplateDTO[] | null>(null);
  const [selected, setSelected] = useState<{ [k in "REFERRER" | "PROSPECT"]?: string }>({});

  // Identify current user
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    })();
  }, []);

  // Lazy-load templates on first focus
  const ensureTemplates = async () => {
    if (templates) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const list = await getOfferTemplates(token);
    setTemplates(list);
  };

  // Mutations (no refetch—server will push WS updates)
  const handleAssign = async (role: "REFERRER" | "PROSPECT") => {
    const templateId = selected[role];
    if (!templateId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await assignOfferToReferral(token, referral.id, role, templateId);
  };

  const handleAccept = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await acceptReferral(token, referral.id);
  };

  const handleReject = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await rejectReferral(token, referral.id);
  };

  const handleCancel = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await cancelReferral(token, referral.id);
  };

  // Role flags
  const isYouReferrer = !!userId && referral.referrerId === userId;
  const isYouProspect = !!userId && referral.prospectId === userId;
  const isYouBusiness = !!userId && referral.businessId === userId;

  // 🔁 NEW: normalized acceptance statuses for chips
  const referrerStatusChip =
    referral.status === "CANCELLED" ? "CANCELLED" : "CREATED";

  const prospectStatusChip =
    (referral as ReferralDTO).prospectAcceptanceStatus ?? "PENDING";

  const businessStatusChip =
    (referral as ReferralDTO).businessAcceptanceStatus ?? "PENDING";

  // Permissions for action buttons (mirrors card)
  const canAcceptOrReject =
    (referral.status === "PENDING" || (referral as ReferralDTO).status === "PARTIALLY_ACCEPTED") &&
    ((isYouProspect && (referral as ReferralDTO).prospectAcceptanceStatus === "PENDING") ||
      (isYouBusiness && (referral as ReferralDTO).businessAcceptanceStatus === "PENDING"));

  const canCancel =
    isYouReferrer &&
    (referral.status === "PENDING" || (referral as ReferralDTO).status === "PARTIALLY_ACCEPTED");

  // Participants panel (uses embedded offer titles)
  const participants = [
    {
      id: referral.referrerId,
      name: referral.referrerName,
      slug: referral.referrerSlug,
      imageUrl: referral.referrerProfileImageUrl,
      role: "REFERRER",
      acceptanceStatus: referrerStatusChip, 
      offerId: referral.referrerOfferId,
      offerTitle: referral.referrerOffer?.title ?? null,
    },
    {
      id: referral.prospectId,
      name: referral.prospectName,
      slug: referral.prospectSlug,
      imageUrl: referral.prospectProfileImageUrl,
      role: "PROSPECT",
      acceptanceStatus: prospectStatusChip, 
      offerId: referral.prospectOfferId,
      offerTitle: referral.prospectOffer?.title ?? null,
    },
    {
      id: referral.businessId,
      name: referral.businessName,
      slug: referral.businessSlug,
      imageUrl: referral.businessProfileImageUrl,
      role: "BUSINESS",
      acceptanceStatus: businessStatusChip, 
      offerId: null,
      offerTitle: null,
    },
  ];

  return (
    <div className="referral-card" style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      {/* Left: Participants */}
      <div style={{ flex: "1 1 300px" }}>
        <div className="participant-row" style={{ borderBottom: "none" }}>
          {participants.map((p) => (
            <div key={p.role} className="participant-block">
              <img src={p.imageUrl || "/default-avatar.png"} alt="Profile" className="profile-img" />
              <Link to={`/profile/${p.slug || p.id}`} className="participant-name">
                {p.id === userId ? "You" : p.name || "Unknown"}
              </Link>
              <div className="participant-role">{p.role}</div>
              <div className={`participant-status status-${String(p.acceptanceStatus ?? "").toLowerCase()}`}>
                {String(p.acceptanceStatus ?? "").toLowerCase()}
              </div>

              {p.offerId && (
                <div className="participant-offer">
                  <Link
                    to={`/offers/${p.offerId}`}
                    aria-label={p.offerTitle ? `View offer: ${p.offerTitle}` : "View offer"}
                    title={p.offerTitle ?? "View offer"}
                    className="offer-badge"
                  >
                    <Gift className="offer-icon" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Status + Actions + Assign (business only) */}
      <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Status + Note */}
        <div className="referral-info">
          <div className="status-meta">
            <span>
              <strong>Status:</strong> {referral.status}
            </span>
            <span>
              <strong>Created:</strong> {new Date(referral.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="referral-note">
            <strong>Note:</strong> {referral.note}
          </div>
        </div>

        {/* Action buttons (conditional) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canAcceptOrReject && (
            <>
              <button onClick={handleAccept}>Accept</button>
              <button onClick={handleReject}>Reject</button>
            </>
          )}
          {canCancel && <button onClick={handleCancel}>Cancel</button>}
        </div>

        {/* Assign Offers — only the Business may assign */}
        {isYouBusiness && (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "1fr",
              borderTop: "1px solid #eee",
              paddingTop: 12,
            }}
          >
            {/* Prospect */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <select
                onFocus={ensureTemplates}
                onChange={(e) => setSelected((s) => ({ ...s, PROSPECT: e.target.value }))}
                value={selected.PROSPECT ?? ""}
                style={{ padding: 8 }}
              >
                <option value="">{templates ? "Select prospect offer…" : "Load offers…"}</option>
                {templates?.map((t) => (
                  <option
                    key={t.offerTemplateId}
                    value={t.offerTemplateId}
                    disabled={!t.isActive}
                    title={t.description ?? t.templateTitle}
                  >
                    {t.templateTitle}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleAssign("PROSPECT")}
                disabled={!selected.PROSPECT}
                title={!selected.PROSPECT ? "Choose an offer first" : "Assign to Prospect"}
                style={{ padding: "8px 12px" }}
              >
                Assign to Prospect
              </button>
            </div>

            {/* Referrer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <select
                onFocus={ensureTemplates}
                onChange={(e) => setSelected((s) => ({ ...s, REFERRER: e.target.value }))}
                value={selected.REFERRER ?? ""}
                style={{ padding: 8 }}
              >
                <option value="">{templates ? "Select referrer offer…" : "Load offers…"}</option>
                {templates?.map((t) => (
                  <option
                    key={t.offerTemplateId}
                    value={t.offerTemplateId}
                    disabled={!t.isActive}
                    title={t.description ?? t.templateTitle}
                  >
                    {t.templateTitle}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleAssign("REFERRER")}
                disabled={!selected.REFERRER}
                title={!selected.REFERRER ? "Choose an offer first" : "Assign to Referrer"}
                style={{ padding: "8px 12px" }}
              >
                Assign to Referrer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralDetails;
