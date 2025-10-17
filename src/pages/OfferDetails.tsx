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
//import OfferActions from "../components/OfferActions";
import OfferGrantsSection from "../components/OfferGrantsSection";
import OfferClaimsSection from "../components/OfferClaimsSection";
import ActiveClaimsPanel from "../components/ActiveClaimsPanel";
import { fetchOfferClaims } from "../services/offerService";
import { OfferClaimView } from "../types/offer";
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
    grantItems: grants.map((g: any) => ({
      quantity: g.quantity ?? 1,
      product: g.product,
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

  // central reload used by interval, WS, and child callbacks
  const reload = React.useCallback(async () => {
    if (!token || !assignedOfferId) return;
    try {
      setLoading(true);
      // 1) Offer details
      const offerResp = await axios.get(`${API_BASE}/offers/${assignedOfferId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffer(offerResp.data as OfferDetailsDTO);
      // 2) Claims for this offer
      const claimsResp = await fetchOfferClaims(assignedOfferId, token);
      setClaims((claimsResp ?? []).map(toClaimView));
      setErr(null);
    } catch (e: any) {
      setErr(
        e?.response?.status === 403
          ? "You are not authorized to view this offer."
          : "Failed to fetch offer details."
      );
    } finally {
      setLoading(false);
    }
  }, [token, assignedOfferId]);

  // fetch access token once
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const t = session?.access_token ?? null;
      setToken(t);
    })();
  }, []);

  // initial and subsequent reload when token/id ready
  useEffect(() => {
    if (token && assignedOfferId) reload();
  }, [token, assignedOfferId, reload]);

  // lightweight auto-refresh (180s)
  useEffect(() => {
    if (!token || !assignedOfferId) return;
    const id = setInterval(() => reload(), 180000);
    return () => clearInterval(id);
  }, [token, assignedOfferId, reload]);

  // refresh on web socket updates
  useEffect(() => {
    if (!assignedOfferId || !token) return;

    let url: URL;
    try {
      // same pattern as ReferralThread
      url = new URL(`/offers/${assignedOfferId}/ws`, __WS_BASE__);
    } catch {
      console.error("Invalid __WS_BASE__:", __WS_BASE__);
      return;
    }
    url.searchParams.set("token", token);
    const ws = new WebSocket(url.toString());

    // Debounce + last-run guards
    let debounceTimer: number | null = null;
    const scheduleReload = (delay = 300) => {
      if (debounceTimer !== null) return;
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        reload();
      }, delay);
    };

    // Return eventType (string) for interesting events; null otherwise
    const eventTypeFromMessage = (raw: any): string | null => {
      if (raw == null) return null;
      if (raw === "ping" || raw === "pong") return null;

      let obj: any = null;
      if (typeof raw === "string") {
        try { obj = JSON.parse(raw); } catch { /* not JSON */ }
        if (!obj) {
          const s = raw.toLowerCase();
          if (s === "ok" || s === "ack" || s === "resynced") return null;
          return null;
        }
      } else if (typeof raw === "object") {
        obj = raw;
      }

      const type = String(obj?.type ?? obj?.event ?? obj?.kind ?? "").toLowerCase();
      if (!type) return null;
      const meaningful = new Set([
        "offer_updated",
        "offer_status_changed",
        "claim_created",
        "claim_updated",
        "claim_deleted",
      ]);
      return meaningful.has(type) ? type : null;
    };

    ws.onopen = () => {
      try { ws.send("resync"); } catch {}
    };

    ws.onmessage = (evt) => {
      const payload = (evt && "data" in evt) ? evt.data : undefined;
      const type = eventTypeFromMessage(payload);
      if (type) scheduleReload(250);
    };

    ws.onerror = () => {
      // allow onclose to clean up; avoid noisy logs
    };

    return () => ws.close();
  }, [assignedOfferId, token, reload]);

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
    assignedOfferId: o.id ?? o.assignedOfferId,
    assignedId: o.id ?? o.assignedOfferId,
    offerType: o.offerType as any,
    canClaim: !!(o as any).canClaim,
    canApproveClaim: !!(o as any).canApproveClaim,
    claimPolicy: o.claimPolicy as any,
    validityType: o.validityType as any,
    trigger: o.trigger as any,
    scopeKind: o.scopeKind as any,
  });

  const grantsForSection: GrantForSection[] = (offer.grants ?? []).map((g: any) => ({
    itemType: g.itemType,
    quantity: typeof g.quantity === "number" ? g.quantity : undefined,
    product: g.itemType === "PRODUCT" ? g.product : undefined,
    bundle: g.itemType === "BUNDLE" ? g.bundle : undefined,
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

      {/* Live active claims (QR / online code, countdown, approval) */}
      {token && assignedOfferId && (
        <ActiveClaimsPanel
          assignedOfferId={assignedOfferId}
          token={token}
          viewer={
            (offer as any).canApproveClaim
              ? "BUSINESS"
              : (offer as any)?.viewerRole === "BUSINESS"
              ? "BUSINESS"
              : "USER"
          }
          canClaim={(offer as any).canClaim}
          claimPolicy={(offer as any).claimPolicy}
          offerType={(offer as any).offerType}
          discountAmount={(offer as any).discountAmount}
          grantPickLimit={(offer as any).grantPickLimit}
          redemptionsLeft={(offer as any).redemptionsLeft}
          scopeKind={(offer as any)?.scopeKind ?? "ANY"}
          onUpdated={() => reload()}
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
