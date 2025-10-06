// src/pages/OfferDetails.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../supabaseClient";
import type { OfferDetailsDTO } from "../types/offer";
import OfferCard from "../components/OfferCard";
import OfferAppliesTo from "../components/OfferAppliesTo";
import OfferTiersSection from "../components/OfferTiersSection";
import OfferDetailsSection from "../components/OfferDetailsSection";
import OfferActions from "../components/OfferActions";
import OfferGrantsSection from "../components/OfferGrantsSection";
import OfferClaimsSection from "../components/OfferClaimsSection";
import {fetchOfferClaims} from "../services/offerService";
import {OfferClaimView } from "../types/offer";
import "../css/ui-forms.css";

const API_BASE = import.meta.env.VITE_API_BASE as string;

type GrantForSection = {
  itemType: "PRODUCT" | "BUNDLE";
  quantity?: number;
  product?: any;
  bundle?: any;
};

const toClaimView = (v: any): OfferClaimView => {
  const c = v?.claim ?? v; // handle { claim: {...} } or flat
  const rtRaw = c?.redemptionType ? String(c.redemptionType).toUpperCase() : undefined;
  const rt: "DISCOUNT" | "GRANT" | string | undefined =
    rtRaw?.includes("GRANT") ? "GRANT" : rtRaw ? "DISCOUNT" : undefined;

  const grants = Array.isArray(c?.grants) ? c.grants : Array.isArray(c?.grantItems) ? c.grantItems : [];

  return {
    id: String(c.id),
    source: c.claimSource ?? c.source ?? "MANUAL",
    status: c.status,
    discountCode: c.discountCode ?? undefined,
    claimedAt: c.claimedAt,
    redeemedAt: c.redeemedAt ?? undefined,
    note: c.note ?? undefined,
    redemptionType: rt,
    redemptionValue: c.redemptionValue ?? undefined, // can be string or number

    // normalize grant items
    grantItems: grants.map((g: any) => ({
      quantity: g.quantity ?? 1,
      product: g.product, // hydrated mini if present
      bundleTitle: g.bundle?.title ?? g.bundleTitle,
      title: g.title ?? g.productName ?? g.bundleName ?? g.sku,
    })),
  };
};

const OfferDetails: React.FC = () => {
  const { assignedOfferId } = useParams();
  const [offer, setOffer] = useState<OfferDetailsDTO | null>(null);
  const [claims, setClaims] = useState<OfferClaimView[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const t = session?.access_token ?? null;
      setToken(t);

      if (!t || !assignedOfferId) {
        setErr("Missing token or offer ID.");
        setLoading(false);
        return;
      }

      try {
        // 1) Offer details
        const offerResp = await axios.get(`${API_BASE}/offers/${assignedOfferId}`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        setOffer(offerResp.data as OfferDetailsDTO);

        // 2) Claims for this offer
        const claimsResp = await fetchOfferClaims(assignedOfferId, t);
        setClaims((claimsResp ?? []).map(toClaimView));
      } catch (e: any) {
        setErr(
          e?.response?.status === 403
            ? "You are not authorized to view this offer."
            : "Failed to fetch offer details."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [assignedOfferId]);

  if (loading) return <p className="center-text">Loading offer...</p>;

  if (err) {
    return (
      <div className="page-wrap">
        <div className="card">
          <p className="error-message">{err}</p>
          <button onClick={() => navigate(-1)} className="btn btn--ghost">Go Back</button>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="page-wrap">
        <div className="card">Offer not found.</div>
      </div>
    );
  }

  const toOfferLike = (o: any) => ({
    ...o,
    offerType: o.offerType as any,
    claimPolicy: o.claimPolicy as any,
    validityType: o.validityType as any,
    trigger: o.trigger as any,
    scopeKind: o.scopeKind as any,
  });

  const grantsForSection: GrantForSection[] = (offer.grants ?? []).map((g: any) => ({
    itemType: g.itemType,
    quantity: typeof g.quantity === "number" ? g.quantity : undefined,
    product: g.itemType === "PRODUCT" ? g.product : undefined,
    bundle:  g.itemType === "BUNDLE"  ? g.bundle  : undefined,
  }));

  const nowMs = Date.now();
  const validUntilMs = offer.validUntil ? Date.parse(String(offer.validUntil)) : NaN;
  const isExpired = Number.isFinite(validUntilMs) && validUntilMs < nowMs;

  // prefer server-provided redemptionsLeft, else compute from max - used
  const redemptionsLeft =
    typeof (offer as any).redemptionsLeft === "number"
      ? (offer as any).redemptionsLeft
      : (typeof (offer as any).effectiveMaxRedemptions === "number" &&
        typeof (offer as any).redemptionsUsed === "number")
        ? (offer as any).effectiveMaxRedemptions - (offer as any).redemptionsUsed
        : null;

  const isFullyClaimed = redemptionsLeft !== null && redemptionsLeft <= 0;

  // Build the object for the card with a status override when needed
  const offerForCard = {
    ...toOfferLike(offer),
    status: isExpired ? "EXPIRED" : (isFullyClaimed ? "COMPLETED" : offer.status),
  };

  return (
    <div className="page-wrap">
      {/* Summary */}
      <OfferCard offer={offerForCard} />

      {/* Claim / Approve actions */}
      {!(isExpired || isFullyClaimed) && (
      <OfferActions
        offer={toOfferLike(offer)}
        token={token}
        onUpdated={() => navigate(0)}
      />
      )}

      {/* Details */}
      <OfferDetailsSection title="Details" text={(offer as any).description} />

      {/* Grants (hydrated minis) */}
      {grantsForSection.length > 0 && (
        <OfferGrantsSection
          grants={grantsForSection}
          pickLimit={(offer as any).grantPickLimit ?? 1}
          discountType={(offer as any).grantDiscountType ?? "FREE"}
          discountValue={(offer as any).grantDiscountValue}
        />
      )}

      {/* Applicability */}
      <OfferAppliesTo offer={offer} />

      {/* Tiers */}
      <OfferTiersSection offer={offer} />

      {/* Claims */}
      <OfferClaimsSection claims={claims} />
    </div>
  );
};

export default OfferDetails;
