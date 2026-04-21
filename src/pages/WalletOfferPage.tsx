// src/pages/WalletOfferPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import {
  fetchWalletOffer,
  purchaseOfferWithPoints,
} from "../services/offerService";
import type {
  WalletOfferResponseDTO,
  WalletStoreItemDTO,
  OfferTemplateSnapshot,
} from "../types/offer";

const formatPoints = (points: number, businessName: string) =>
  `${points.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${businessName} Wallet points`;

const WalletOfferPage: React.FC = () => {
  const { businessSlug, offerTemplateId } = useParams<{
    businessSlug: string;
    offerTemplateId: string;
  }>();

  const nav = useNavigate();
  const queryClient = useQueryClient();

  // authToken: undefined = loading, null = no session, string = token
  const [authToken, setAuthToken] = useState<string | null | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("Failed to get session:", error);
        if (!cancelled) setAuthToken(data?.session?.access_token ?? null);
      } catch (e) {
        console.error("Error loading session:", e);
        if (!cancelled) setAuthToken(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const offerQuery = useQuery<WalletOfferResponseDTO, Error>({
    queryKey: ["wallet-offer", businessSlug, offerTemplateId, authToken],
    enabled: !!businessSlug && !!offerTemplateId && authToken !== undefined,
    queryFn: async () => {
      if (!businessSlug) throw new Error("Missing business slug");
      if (!offerTemplateId) throw new Error("Missing offerTemplateId");
      return fetchWalletOffer(businessSlug, offerTemplateId, authToken ?? null);
    },
  });

  const purchaseMutation = useMutation<{ assignedOfferId: string }, Error, void>(
    {
      mutationFn: async () => {
        if (!businessSlug) throw new Error("Missing business slug");
        if (!offerTemplateId) throw new Error("Missing offerTemplateId");
        if (authToken === undefined) throw new Error("Auth not ready");
        return purchaseOfferWithPoints(
          businessSlug,
          offerTemplateId,
          authToken ?? null
        );
      },
      onSuccess: (resp) => {
        // refresh pages that depend on wallet balance / eligibility
        queryClient.invalidateQueries({ queryKey: ["wallet-offer"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-store"] });
        queryClient.invalidateQueries({ queryKey: ["eligible-wallet-offers"] });
        queryClient.invalidateQueries({ queryKey: ["my-offers"] });

        // go straight to offer details ✅
        nav(`/offers/${resp.assignedOfferId}`);
      },
      onError: (err) => {
        alert(err.message || "Could not purchase offer.");
      },
    }
  );

  const item: WalletStoreItemDTO | null = offerQuery.data?.item ?? null;
  const walletBalance = offerQuery.data?.walletBalance ?? 0;

  const snap: OfferTemplateSnapshot | undefined = item?.offerTemplateSnapshot ?? undefined;
  const businessName = snap?.businessName ?? "Trihola";

  const title = item?.title ?? "Offer";
  const description = item?.description ?? null;
  const price = item?.pointsPrice ?? 0;
  const alreadyPurchased = item?.alreadyPurchased ?? 0;
  const maxPerUser = item?.maxPurchasesPerUser ?? null;

  const remaining =
    maxPerUser == null ? null : Math.max(0, maxPerUser - alreadyPurchased);

  const pointsLabel = formatPoints(price, businessName);
  const canAfford = !!item?.canAfford;
  const canPurchase = !!item?.canPurchase;

  const discountSummary = useMemo(() => {
    if (!snap) return null;
    // keep this intentionally simple to match store page “Discount” row
    if (snap.offerType === "PERCENTAGE_DISCOUNT" && snap.discountPercentage != null) {
      const pct = `${snap.discountPercentage}%`;
      if (snap.maxDiscountAmount != null) return `${pct} (cap ₹${snap.maxDiscountAmount})`;
      return pct;
    }
    if (snap.offerType === "FIXED_DISCOUNT" && snap.discountAmount != null) {
      return `₹${snap.discountAmount}`;
    }
    if (snap.offerType === "GRANT") {
      return "Free item / bundle";
    }
    return null;
  }, [snap]);

  if (!businessSlug || !offerTemplateId) {
    return (
      <div className="page-wrap wallet-offer-page">
        <div className="card">
          <p className="muted">Missing business or offer template id.</p>
        </div>
      </div>
    );
  }

  if (authToken === undefined) {
    return (
      <div className="page-wrap wallet-offer-page">
        <div className="card">Checking your session…</div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="page-wrap wallet-offer-page">
        <div className="card card-error">Please sign in to view this offer.</div>
      </div>
    );
  }

  if (offerQuery.isLoading) {
    return (
      <div className="page-wrap wallet-offer-page">
        <div className="card">Loading offer…</div>
      </div>
    );
  }

  if (offerQuery.error) {
    return (
      <div className="page-wrap wallet-offer-page">
        <div className="card card-error">
          Failed to load offer: {offerQuery.error.message}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-wrap wallet-offer-page">
        <div className="card">
          <p className="muted">Offer not found.</p>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btn-secondary" to={`/wallet/${encodeURIComponent(businessSlug)}/store`}>
              Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const purchaseLabel = !canAfford
    ? "Not enough points"
    : remaining === 0
    ? "Limit reached"
    : "Purchase with points";

  return (
    <div className="page-wrap wallet-offer-page">
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div className="muted small">Rewards store</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{businessName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted small">Wallet balance</div>
            <div style={{ fontWeight: 700 }}>
              {formatPoints(walletBalance, businessName)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-secondary" to={`/wallet/${encodeURIComponent(businessSlug)}/store`}>
            Back to store
          </Link>
          <Link className="btn" to="/my-offers">
            My offers
          </Link>
        </div>
      </div>

      <article className="card">
        <div className="offer-card">
          <div className="offer-card-main">
            <div className="offer-header">
              <div className="offer-title">{title}</div>
              <div className="my-offer-header-right">
                {!canPurchase && (
                  <span className="offer-highlight-pill">
                    {remaining === 0 ? "Limit reached" : "Not eligible"}
                  </span>
                )}
                {canPurchase && (
                  <span className="offer-highlight-pill">Eligible</span>
                )}
              </div>
            </div>

            {description && <p className="offer-description">{description}</p>}

            <div className="offer-meta">
              {discountSummary && (
                <div className="offer-meta-row">
                  <span className="label">Discount</span>
                  <span className="value">{discountSummary}</span>
                </div>
              )}

              <div className="offer-meta-row">
                <span className="label">Cost</span>
                <span className="value">{pointsLabel}</span>
              </div>

              {snap?.minPurchaseAmount != null && (
                <div className="offer-meta-row">
                  <span className="label">Min purchase</span>
                  <span className="value">
                    ₹{snap.minPurchaseAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}

              {snap?.durationDays != null && (
                <div className="offer-meta-row">
                  <span className="label">Validity</span>
                  <span className="value">{snap.durationDays} days from activation</span>
                </div>
              )}

              {remaining != null && (
                <div className="offer-meta-row offer-meta-row-subtle">
                  <span className="label">Purchase limit</span>
                  <span className="value">You can buy {remaining} more</span>
                </div>
              )}
            </div>

            <div className="offer-footer">
              <button
                className="btn btn--primary"
                disabled={!canPurchase || purchaseMutation.isPending}
                onClick={() => purchaseMutation.mutate()}
              >
                {purchaseMutation.isPending ? "Purchasing…" : purchaseLabel}
              </button>

              <span className="muted small">
                After purchase, you’ll be taken to the offer details page.
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default WalletOfferPage;
