// src/pages/WalletStorePage.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { fetchWalletStore, purchaseOfferWithPoints } from "../services/offerService";
import type {
  WalletStoreItemDTO,
  WalletStoreResponse,
  OfferTemplateSnapshot,
} from "../types/offer";

const formatPoints = (points: number, businessName: string) =>
  `${points.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} ${businessName} Wallet points`;

const WalletStorePage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const nav = useNavigate();
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
        console.error("Error loading session:", e);
        if (!cancelled) {
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
  const { data, isLoading, error } = useQuery<WalletStoreResponse, Error>({
    queryKey: ["wallet-store", businessSlug, authToken],
    enabled: !!businessSlug && authToken !== undefined,
    queryFn: () => {
      if (!businessSlug) {
        throw new Error("Missing business slug");
      }
      return fetchWalletStore(businessSlug, authToken ?? null);
    },
  });

  const purchaseMutation = useMutation<{ assignedOfferId: string }, Error, string>(
    {
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
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: ["wallet-store", businessSlug, authToken],
        });
        queryClient.invalidateQueries({ queryKey: ["my-offers"] });
        queryClient.invalidateQueries({ queryKey: ["eligible-wallet-offers"] });

        // ✅ Go straight to OfferDetails
        nav(`/offers/${res.assignedOfferId}`);
      },
      onError: (err) => {
        alert(err.message || "Could not purchase offer.");
      },
    }
  );

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

  if (!authToken) {
    return (
      <div className="page-wrap wallet-store-page">
        <div className="card card-error">Please sign in to view this store.</div>
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
        <div className="card card-error">Failed to load store: {error.message}</div>
      </div>
    );
  }

  const items: WalletStoreItemDTO[] = data?.items ?? [];
  const walletBalance = data?.walletBalance ?? 0;

  const totalItems = items.length;
  const purchasableItems = items.filter((i) => i.canPurchase).length;
  const affordableItems = items.filter((i) => i.canPurchase && i.canAfford).length;

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
          <h1>Rewards store</h1>
          <h2>Unlock rewards with your wallet points.</h2>
          <p>
            Convert your Trihola points into meaningful rewards. Every item you
            purchase here becomes a regular offer inside <strong>My offers</strong>,
            with its own activation and validity.
          </p>

          <p className="wallet-balance">
            You currently have{" "}
            <strong>{formatPoints(walletBalance, businessNameForHero)}</strong>.
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
                <div className="snapshot-label">Eligible</div>
              </div>
              <div className="snapshot-item">
                <div className="snapshot-value">{affordableItems}</div>
                <div className="snapshot-label">Affordable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Store body */}
      <section className="myoffers-body">
        <div className="myoffers-intro" style={{ marginTop: 6 }}>
          <h2 className="section-title">Available rewards</h2>
          <p className="muted">
            Browse rewards offered by this business. If you&apos;re eligible and have
            enough points, you can purchase instantly.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <Link className="btn btn-secondary" to="/my-offers">
              My offers
            </Link>
          </div>
        </div>

        {items.length === 0 && (
          <div className="card">
            <p className="muted">
              This rewards store doesn&apos;t have any items available right now.
              Check back later or explore other campaigns and referrals to earn more
              offers.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="offer-grid">
            {items.map((item) => {
              const snap: OfferTemplateSnapshot | null | undefined =
                item.offerTemplateSnapshot;

              const title = (snap as any)?.offerTitle || item.title;
              const description = (snap as any)?.description || item.description;
              const businessName = (snap as any)?.businessName || businessNameForHero;

              const price = item.pointsPrice ?? 0;
              const pointsLabel = formatPoints(price, businessName);

              // Discount summary
              let discountSummary: string | null = null;
              if (snap?.offerType === "PERCENTAGE_DISCOUNT" && snap.discountPercentage != null) {
                discountSummary = `${snap.discountPercentage}% off`;
                if (snap.maxDiscountAmount != null) {
                  discountSummary += ` (cap ₹${snap.maxDiscountAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })})`;
                }
              } else if (snap?.offerType === "FIXED_DISCOUNT" && snap.discountAmount != null) {
                discountSummary = `₹${snap.discountAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} off the bill`;
              } else if (snap?.offerType === "GRANT") {
                discountSummary = "Free product or service (grant)";
              }

              const remaining =
                item.maxPurchasesPerUser != null
                  ? item.maxPurchasesPerUser - item.alreadyPurchased
                  : null;

              const purchaseLabel = !item.canPurchase
                ? item.canAfford
                  ? "Purchase limit reached"
                  : "Not enough points"
                : `Unlock for ${pointsLabel}`;

              const isPurchasingThis =
                purchaseMutation.isPending &&
                purchaseMutation.variables === item.offerTemplateId;

              return (
                <article key={item.offerTemplateId} className="card my-offer-card">
                  <div className="my-offer-card-inner">
                    <div className="my-offer-main">
                      <div className="my-offer-header-row">
                        <div className="my-offer-header-text">
                          <div className="offer-business-name">{businessName}</div>
                          <h3 className="offer-title">{title}</h3>
                        </div>

                        <div className="my-offer-header-right">
                          {item.canPurchase ? (
                            <span className="offer-highlight-pill">Eligible</span>
                          ) : (
                            <span className="offer-highlight-pill">
                              {item.canAfford ? "Limit reached" : "Not enough points"}
                            </span>
                          )}
                        </div>
                      </div>

                      {description && <p className="offer-description">{description}</p>}

                      <div className="offer-meta">
                        {/* Discount */}
                        {discountSummary && (
                          <div className="offer-meta-row">
                            <span className="label">Discount</span>
                            <span className="value">{discountSummary}</span>
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
                              {snap.minPurchaseAmount.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
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
                            <span className="value">You can buy {remaining} more</span>
                          </div>
                        )}
                      </div>

                      <div className="offer-footer">
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Link
                            className="btn btn-secondary"
                            to={`/wallet/${encodeURIComponent(
                              businessSlug
                            )}/offers/${item.offerTemplateId}`}
                          >
                            View
                          </Link>

                          <button
                            className="btn btn--primary"
                            disabled={!item.canPurchase || isPurchasingThis}
                            onClick={() => handlePurchase(item)}
                          >
                            {isPurchasingThis ? "Purchasing…" : purchaseLabel}
                          </button>
                        </div>

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
