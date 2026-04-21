import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gift } from "lucide-react";

import type { ReferralDTO } from "../types/referral";
import  { getAttachedInfo } from "../types/referral";
import type { OfferTemplateDTO } from "../types/offer";

import { getOfferTemplates, assignOffer } from "../services/offerService";
import { acceptReferral, rejectReferral, cancelReferral } from "../services/referralService";
import { AvatarOrPlaceholder } from "../utils/uiHelper";
import OfferTemplatePicker from "../components/OfferTemplatePicker";

import "../css/Referral.css";

interface Props {
  referral: ReferralDTO;
  setReferral?: (ref: ReferralDTO) => void; // optional (WS updates state)
}

const ReferralDetails: React.FC<Props> = ({ referral }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<OfferTemplateDTO[] | null>(null);
  const [selected, setSelected] = useState<{ [k in "REFERRER" | "PROSPECT"]?: string }>({});
  const navigate = useNavigate();
  
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

  useEffect(() => {
  ensureTemplates();
}, []);

  // Mutations (no refetch—server will push WS updates)
  const handleAssign = async (role: "REFERRER" | "PROSPECT") => {
    const templateId = selected[role];
    if (!templateId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await assignOffer(token, {
      offerTemplateId: templateId,
      targetType: "REFERRAL",
      referralId: referral.id,
      recipientRole: role,
      assignedVia: "REFERRAL"
    });
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
      slug: referral.referrerProfileSlug,
      imageUrl: referral.referrerProfileImageUrl,
      role: "REFERRER",
      acceptanceStatus: referrerStatusChip, 
      offerId: referral.referrerOfferId,
      offerTitle: referral.referrerOffer?.title ?? null,
    },
    {
      id: referral.prospectId,
      name: referral.prospectName,
      slug: referral.prospectProfileSlug,
      imageUrl: referral.prospectProfileImageUrl,
      role: "PROSPECT",
      acceptanceStatus: prospectStatusChip, 
      offerId: referral.prospectOfferId,
      offerTitle: referral.prospectOffer?.title ?? null,
    },
    {
      id: referral.businessId,
      name: referral.businessName,
      slug: referral.businessProfileSlug,
      imageUrl: referral.businessProfileImageUrl,
      role: "BUSINESS",
      acceptanceStatus: businessStatusChip, 
      offerId: null,
      offerTitle: null,
    },
  ];

  const referrerOfferId = referral?.referrerOffer?.id ?? null;
  const prospectOfferId = referral?.prospectOffer?.id ?? null;

  return (
    <div className="referral-card" style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      {/* Left: Participants */}
      <div style={{ flex: "1 1 300px" }}>
        <div className="participant-row" style={{ borderBottom: "none" }}>
          {participants.map((p) => (
            <div key={p.role} className="participant-block">
              <AvatarOrPlaceholder src={p.imageUrl} name={p.name} />
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
          {referral.note && (
            <div className="rd-note">
              <div className="rd-note__label">Note:</div>
              <div className="rd-note__text clamp-3">{referral.note}</div>
            </div>
          )}
        </div>

{(() => {
  const info = getAttachedInfo(referral);
  if (!info) return null;
  return (
    <div className="card" style={{ marginTop: 12, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Attached item</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "#f1f5f9", boxShadow: "inset 0 0 0 1px #e5e7eb" }}>
          {info.imageUrl ? (
            <img src={info.imageUrl} alt={info.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg,#f8fafc,#eef2f7)" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{info.title}</div>
          <div style={{ marginTop: 4 }}>
            <Link to={info.url} className="th-link">View {info.kind}</Link>
          </div>
        </div>
      </div>
    </div>
  );
})()}

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
              <OfferTemplatePicker
                templates={templates ?? []}
                persistedOffer={referral.prospectOffer ?? undefined}
                value={selected.PROSPECT ?? ""}
                title="Prospect offer"
                onChange={(templateId) =>
                  setSelected((s) => ({ ...s, PROSPECT: templateId ?? "" }))
                }
                allowNone={true}
                showPreview={true}
                disableCurrentTemplate={true}
                onViewPersistedOffer={
                  prospectOfferId
                    ? () => navigate(`/offers/${prospectOfferId}`)
                    : undefined
                }
                />
              <button
                onClick={() => handleAssign("PROSPECT")}
                disabled={!selected.PROSPECT}
                style={{ padding: "8px 12px", marginTop: 32 }}
              >
                Assign to Prospect
              </button>
            </div>

            {/* Referrer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <OfferTemplatePicker
                templates={templates ?? []}
                persistedOffer={referral.referrerOffer ?? undefined}
                value={selected.REFERRER ?? ""}
                title="Referrer offer"
                onChange={(templateId) =>
                  setSelected((s) => ({ ...s, REFERRER: templateId ?? "" }))
                }
                allowNone={true}
                showPreview={true}
                disableCurrentTemplate={true}
                onViewPersistedOffer={
                  referrerOfferId
                    ? () => navigate(`/offers/${referrerOfferId}`)
                    : undefined
                }
                />
              <button
                onClick={() => handleAssign("REFERRER")}
                disabled={!selected.REFERRER}
                style={{ padding: "8px 12px", marginTop: 32 }}
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
