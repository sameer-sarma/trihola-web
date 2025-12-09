// src/pages/WalletStorePage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import {
  fetchWalletStore,
  purchaseOfferWithPoints,
} from "../services/offerService";
import type { WalletStoreItemDTO, WalletStoreResponse, OfferTemplateSnapshot } from "../types/offer";

const formatPoints = (points: number, businessName: string) =>
  `${points.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} ${businessName} Wallet points`;

const WalletStorePage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const queryClient = useQueryClient();

  // authToken: undefined = still loading, null = no session, string = token
  const [authToken, setAuthToken] = useState<string | null | undefined>(
    undefined
  );

  // Load Supabase session token once
  useEffect(() => {
    let cancelled = false;

    const loadToken = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Failed to get session:", error);
        }
        if (!cancelled) {
          setAuthToken(data?.session?.access_token ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Error loading session:", e);
          setAuthToken(null);
        }
      }
    };

    loadToken();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch wallet store (items + wallet balance) once we know the token state
  const {
    data,
    isLoading,
    error,
  } = useQuery<WalletStoreResponse, Error>({
    queryKey: ["wallet-store", businessSlug, authToken],
    enabled: !!businessSlug && authToken !== undefined,
    queryFn: () => {
      if (!businessSlug) {
        throw new Error("Missing business slug");
      }
      return fetchWalletStore(businessSlug, authToken ?? null);
    },
  });

  const purchaseMutation = useMutation<
    { assignedOfferId: string },
    Error,
    string
  >({
    mutationFn: (offerTemplateId: string) => {
      if (!businessSlug) {
        throw new Error("Missing business slug");
      }
      if (authToken === undefined) {
        throw new Error("Auth not ready");
      }
      return purchaseOfferWithPoints(
        businessSlug,
        offerTemplateId,
        authToken ?? null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["wallet-store", businessSlug, authToken],
      });
      alert("Offer purchased and added to your account.");
    },
    onError: (err) => {
      alert(err.message || "Could not purchase offer.");
    },
  });

  if (!businessSlug) {
    return (
      <div className="page-wrap wallet-store-page">
        <div className="card">
          <p className="muted">Missing business slug.</p>
        </div>
      </div>
    );
  }

  // While we’re still figuring out whether there is a session
  if (authToken === undefined) {
    return (
      <div className="page-wrap wallet-store-page">
        <div className="card">Checking your session…</div>
      </div>
    );
  }

  // Store is for logged-in users only
  if (!authToken) {
    return (
      <div className="page-wrap wallet-store-page">
        <div className="card card-error">
          Please sign in to view this rewards store.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-wrap wallet-store-page">
        <div className="card">Loading store…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap wallet-store-page">
        <div className="card card-error">
          Failed to load store: {error.message}
        </div>
      </div>
    );
  }

  const items: WalletStoreItemDTO[] = data?.items ?? [];
  const walletBalance = data?.walletBalance ?? 0;

  const totalItems = items.length;
  const purchasableItems = items.filter((i) => i.canPurchase).length;
  const affordableItems = items.filter(
    (i) => i.canPurchase && i.canAfford
  ).length;

  // Use the first item’s snapshot to extract the business name for labels / hero
  const firstSnap = items[0]?.offerTemplateSnapshot;
  const businessNameForHero = firstSnap?.businessName ?? "Trihola";

  const handlePurchase = (item: WalletStoreItemDTO) => {
    purchaseMutation.mutate(item.offerTemplateId);
  };

  return (
    <div className="page-wrap wallet-store-page">
      {/* Hero section, aligned with MyOffers layout */}
      <section className="myoffers-hero">
        <div className="myoffers-hero-left">
          <h1>Spend your points wisely.</h1>
          <h2>Unlock rewards from this business.</h2>
          <p>
            Convert your Trihola points into meaningful rewards. Every
            item you purchase here becomes a regular offer inside{" "}
            <strong>My offers</strong>, with its own activation and
            validity.
          </p>

          <p className="wallet-balance">
            You currently have{" "}
            <strong>
              {formatPoints(walletBalance, businessNameForHero)}
            </strong>
            .
          </p>
        </div>

        <div className="myoffers-hero-right">
          <div className="snapshot-box">
            <div className="snapshot-title">Store snapshot</div>
            <div className="snapshot-grid">
              <div className="snapshot-item">
                <div className="snapshot-value">{totalItems}</div>
                <div className="snapshot-label">Total rewards</div>
              </div>
              <div className="snapshot-item">
                <div className="snapshot-value">{purchasableItems}</div>
                <div className="snapshot-label">Available to buy</div>
              </div>
              <div className="snapshot-item">
                <div className="snapshot-value">
                  {affordableItems}
                </div>
                <div className="snapshot-label">
                  Within your wallet balance
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body section */}
      <section className="myoffers-body">
        <div className="myoffers-intro">
          <h2 className="section-title">Rewards you can unlock</h2>
          <p className="muted">
            Each card shows the discount you&apos;ll receive, how many{" "}
            {businessNameForHero} Wallet points it costs, any minimum
            purchase conditions, and how long it will remain valid after
            it becomes active.
          </p>
        </div>

        {items.length === 0 && (
          <div className="card">
            <p className="muted">
              This rewards store doesn&apos;t have any items available
              right now. Check back later or explore other campaigns and
              referrals to earn more offers.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="offer-grid">
            {items.map((item) => {
              const snap = item.offerTemplateSnapshot;
              const title = snap?.offerTitle || item.title;
              const description = snap?.description || item.description;
              const businessName =
                snap?.businessName || businessNameForHero;

              const pointsLabel = formatPoints(
                snap?.pointsPrice ?? item.pointsPrice,
                businessName
              );

              // top-right pill should emphasise the discount, not the cost
              let highlightLabel: string | null = null;
              if (
                snap?.offerType === "PERCENTAGE_DISCOUNT" &&
                (snap as OfferTemplateSnapshot).discountPercentage != null
              ) {
                const pct = (snap as OfferTemplateSnapshot).discountPercentage as number;
                const max = (snap as OfferTemplateSnapshot).maxDiscountAmount as
                  | number
                  | undefined;
                if (max != null) {
                  highlightLabel = `${pct}% OFF (up to ₹${max.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 }
                  )})`;
                } else {
                  highlightLabel = `${pct}% OFF`;
                }
              } else if (
                snap?.offerType === "FIXED_DISCOUNT" &&
                (snap as OfferTemplateSnapshot).discountAmount != null
              ) {
                const amt = (snap as OfferTemplateSnapshot).discountAmount as number;
                highlightLabel = `₹${amt.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} OFF`;
              } else if (snap?.offerType === "GRANT") {
                highlightLabel = "Free grant";
              }

              // Discount summary row text
              let discountSummary: string | null = null;
              if (
                snap?.offerType === "PERCENTAGE_DISCOUNT" &&
                (snap as OfferTemplateSnapshot).discountPercentage != null
              ) {
                const pct = (snap as OfferTemplateSnapshot).discountPercentage as number;
                const max = (snap as OfferTemplateSnapshot).maxDiscountAmount as
                  | number
                  | undefined;
                if (max != null) {
                  discountSummary = `${pct}% off (max ₹${max.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 }
                  )})`;
                } else {
                  discountSummary = `${pct}% off`;
                }
              } else if (
                snap?.offerType === "FIXED_DISCOUNT" &&
                (snap as OfferTemplateSnapshot).discountAmount != null
              ) {
                const amt = (snap as OfferTemplateSnapshot).discountAmount as number;
                discountSummary = `₹${amt.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} off the bill`;
              } else if (snap?.offerType === "GRANT") {
                discountSummary = "Free product or service (grant)";
              }

              const remaining =
                (item as WalletStoreItemDTO).maxPurchasesPerUser != null
                  ? (item as any).maxPurchasesPerUser -
                    item.alreadyPurchased
                  : null;

//              const disabled =
//                !item.canPurchase || purchaseMutation.isPending;

              const purchaseLabel = !item.canPurchase
                ? item.canAfford
                  ? "Purchase limit reached"
                  : "Not enough points"
                : `Unlock for ${pointsLabel}`;

              const isPurchasingThis =
                purchaseMutation.isPending &&
                purchaseMutation.variables === item.offerTemplateId;

              return (
                <article
                  key={item.offerTemplateId}
                  className="card my-offer-card wallet-offer-card"
                >
                  <div className="my-offer-card-inner">
                    <div className="my-offer-main">
                      <div className="my-offer-header-row">
                        <div className="my-offer-header-text">
                          <div className="offer-business-name">
                            {title}
                          </div>
                        </div>

                        <div className="my-offer-header-right">
                          {highlightLabel && (
                            <span className="offer-highlight-pill">
                              {highlightLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {description && (
                        <p className="offer-description">{description}</p>
                      )}

                      <div className="offer-meta">
                        {/* Discount details */}
                        {discountSummary && (
                          <div className="offer-meta-row">
                            <span className="label">Discount</span>
                            <span className="value">
                              {discountSummary}
                            </span>
                          </div>
                        )}

                        {/* Cost in points */}
                        <div className="offer-meta-row">
                          <span className="label">Cost</span>
                          <span className="value">{pointsLabel}</span>
                        </div>

                        {/* Min purchase */}
                        {snap?.minPurchaseAmount != null && (
                          <div className="offer-meta-row">
                            <span className="label">Min purchase</span>
                            <span className="value">
                              ₹
                              {snap.minPurchaseAmount.toLocaleString(
                                undefined,
                                { maximumFractionDigits: 0 }
                              )}
                            </span>
                          </div>
                        )}

                        {/* Validity */}
                        {snap?.durationDays != null && (
                          <div className="offer-meta-row">
                            <span className="label">Validity</span>
                            <span className="value">
                              {snap.durationDays} days from activation
                            </span>
                          </div>
                        )}

                        {/* Remaining purchases, if limited */}
                        {remaining != null && remaining >= 0 && (
                          <div className="offer-meta-row offer-meta-row-subtle">
                            <span className="label">Purchase limit</span>
                            <span className="value">
                              You can buy {remaining} more
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="offer-footer">
                        <button
                          className="btn btn--primary"
                          disabled={isPurchasingThis}
                          onClick={() => handlePurchase(item)}
                        >
                          {isPurchasingThis ? "Purchasing…" : purchaseLabel}
                        </button>
                        <span className="muted small">
                          After purchase, this reward appears in{" "}
                          <strong>My offers</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default WalletStorePage;
