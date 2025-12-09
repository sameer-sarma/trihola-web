// src/pages/OfferDetails.tsx
import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../supabaseClient";
import type { OfferDetailsDTO } from "../types/offer";
import OfferCard from "../components/OfferCard";
import OfferAppliesTo from "../components/OfferAppliesTo";
import OfferTiersSection from "../components/OfferTiersSection";
import OfferDetailsSection from "../components/OfferDetailsSection";
import OfferGrantsSection from "../components/OfferGrantsSection";
import OfferClaimsSection from "../components/OfferClaimsSection";
import ActiveClaimsPanel from "../components/ActiveClaimsPanel";
import { fetchOfferClaims, refundOfferPurchase } from "../services/offerService";
import { OfferClaimView } from "../types/offer";

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

  const grants = Array.isArray(c?.grants)
    ? c.grants
    : Array.isArray(c?.grantItems)
    ? c.grantItems
    : [];

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        console.log("OfferDetails: reloading due to WS event: scheduleReload");
        reload();
      }, delay);
    };

    // Return eventType (string) for interesting events; null otherwise
    const eventTypeFromMessage = (raw: any): string | null => {
      if (raw == null) return null;
      if (raw === "ping" || raw === "pong") return null;

      let obj: any = null;
      if (typeof raw === "string") {
        try {
          obj = JSON.parse(raw);
        } catch {
          /* not JSON */
        }
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

      // Backend sends kind = "claim.changed" and "offer.status.changed"
      const meaningful = new Set(["claim.changed", "offer.status.changed"]);

      return meaningful.has(type) ? type : null;
    };

    ws.onopen = () => {
      try {
        ws.send("resync");
      } catch {
        // ignore
      }
    };

    ws.onmessage = (evt) => {
      const payload = evt && "data" in evt ? (evt as any).data : undefined;
      const type = eventTypeFromMessage(payload);
      console.log("OfferDetails: WS event received:", type);
      if (type) scheduleReload(250);
    };

    ws.onerror = () => {
      // allow onclose to clean up; avoid noisy logs
    };

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      ws.close();
    };
  }, [assignedOfferId, token, reload]);

  // ✅ useMutation must be declared BEFORE any returns
  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Not authenticated");
      }
      if (!assignedOfferId) {
        throw new Error("Missing offer id");
      }
      if (!offer?.businessSlug) {
        throw new Error("Missing business slug");
      }
      await refundOfferPurchase(offer.businessSlug, assignedOfferId, token);
    },
    onSuccess: () => {
      // Refresh details after refund
      reload();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to refund offer.");
    },
  });

  // Early returns are fine AFTER all hooks
  if (loading) return <p className="center-text">Loading offer...</p>;

  if (err) {
    return (
      <div className="page-wrap">
        <div className="card">
          <p className="error-message">{err}</p>
          <button onClick={() => navigate(-1)} className="btn btn--ghost">
            Go Back
          </button>
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

  const toOfferLike = (o: OfferDetailsDTO) => ({
    ...o,
    assignedOfferId: o.assignedOfferId,
    assignedId: o.assignedOfferId,
    offerType: o.offerType,
    canClaim: !!o.canClaim,
    canApproveClaim: !!o.canApproveClaim,
    claimPolicy: o.claimPolicy,
    validityType: o.validityType,
    trigger: o.trigger,
    scopeKind: o.appliesToType
      ? o.appliesToType === "ANY_PURCHASE"
        ? "ANY"
        : "LIST"
      : "ANY",
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

  // Prefer server-provided redemptionsLeft, else compute from max - used
  const redemptionsLeft =
    typeof offer.redemptionsLeft === "number"
      ? offer.redemptionsLeft
      : typeof offer.effectiveMaxRedemptions === "number" &&
        typeof offer.redemptionsUsed === "number"
      ? offer.effectiveMaxRedemptions - offer.redemptionsUsed
      : null;

  const isFullyClaimed = redemptionsLeft !== null && redemptionsLeft <= 0;

  const statusUpper = String(offer.status ?? "").toUpperCase();
  const baseCanClaim = !!offer.canClaim;

  // Final canClaim used for UI:
  // - must be allowed by backend
  // - must be ACTIVE
  // - must not be expired
  // - must have redemptions capacity
  const effectiveCanClaim =
    baseCanClaim && statusUpper === "ACTIVE" && !isExpired && !isFullyClaimed;

  const viewer: "USER" | "BUSINESS" = offer.canApproveClaim ? "BUSINESS" : "USER";

  // Build the object for the card with a status override when needed
  const offerForCard = {
    ...toOfferLike(offer),
    status: isExpired ? "EXPIRED" : isFullyClaimed ? "COMPLETED" : offer.status,
  };

  const isRefundable =
    offer.assignedVia === "USER_WP_PURCHASED" &&
    (offer.status === "ASSIGNED" || offer.status === "ACTIVE") &&
    (offer.redemptionsUsed ?? 0) === 0;

  return (
    <div className="page-wrap">
      {/* Summary */}
      <OfferCard offer={offerForCard as any} />

      {isRefundable && (
        <div className="offer-actions">
          <button
            className="btn btn--refund"
            disabled={refundMutation.isPending}
            onClick={() => refundMutation.mutate()}
          >
            {refundMutation.isPending ? "Processing…" : "Refund purchase"}
          </button>
          <span className="offer-details__hint">
            Wallet points will be credited back on refund.
          </span>
        </div>
      )}

      {/* Live active claims (QR / online code, countdown, approval) */}
      {token && assignedOfferId && (
        <ActiveClaimsPanel
          assignedOfferId={assignedOfferId}
          token={token}
          viewer={viewer}
          canClaim={effectiveCanClaim}
          claimPolicy={offer.claimPolicy as any}
          offerType={offer.offerType as any}
          discountAmount={offer.discountAmount}
          grantPickLimit={offer?.grantPickLimit ?? 1}
          redemptionsLeft={redemptionsLeft ?? undefined}
          scopeKind={(offerForCard as any)?.scopeKind ?? "ANY"}
          eligibleGrantItems={(offer.grants ?? []).map((g: any) => ({
            itemType: g.itemType,
            product: g.itemType === "PRODUCT" ? g.product : undefined,
            bundle: g.itemType === "BUNDLE" ? g.bundle : undefined,
            quantity: typeof g.quantity === "number" ? g.quantity : undefined,
          }))}
          // When anything changes (new claim, approval, expiry), refresh the whole view
          onUpdated={reload}
        />
      )}

      {/* Details */}
      <OfferDetailsSection title="Details" text={offer.description} />

      {/* Grants (hydrated minis) */}
      {grantsForSection.length > 0 && (
        <OfferGrantsSection
          grants={grantsForSection}
          pickLimit={offer.grantPickLimit ?? 1}
          discountType={offer.grantDiscountType ?? "FREE"}
          discountValue={offer.grantDiscountValue}
        />
      )}

      {/* Applicability */}
      <OfferAppliesTo offer={offer} />

      {/* Tiers */}
      <OfferTiersSection offer={offer} />

      {/* Claims history */}
      <OfferClaimsSection claims={claims} />
    </div>
  );
};

export default OfferDetails;
