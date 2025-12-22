// src/pages/MyOffers.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import {
  fetchMyOffers,
  refundOfferPurchase,
  fetchEligibleWalletOffers,
  purchaseOfferWithPoints,
} from "../services/offerService";
import type {
  AssignedOfferDTO,
  EligibleOffersMultiResponseDTO,
  WalletStoreItemDTO,
} from "../types/offer";

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const humanStatus = (status: string) => {
  if (!status) return "";
  return status.charAt(0) + status.slice(1).toLowerCase();
};

const humanOfferType = (type?: string | null) => {
  switch (type) {
    case "PERCENTAGE_DISCOUNT":
      return "Percentage discount";
    case "FIXED_DISCOUNT":
      return "Flat discount";
    case "GRANT":
      return "Grant";
    default:
      return type || "Offer";
  }
};

const humanRecipientRole = (role?: string | null) => {
  switch (role) {
    case "REFERRER":
      return "For you (referrer)";
    case "PROSPECT":
      return "For you (prospect)";
    default:
      return null;
  }
};

const humanClaimPolicy = (policy?: string | null) => {
  switch (policy) {
    case "AUTO":
      return "Auto-applied";
    case "MANUAL":
      return "Claim at checkout";
    case "BOTH":
      return "Flexible claim";
    default:
      return null;
  }
};

const formatPoints = (n: number | null | undefined) => {
  if (n == null) return "0";
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } catch {
    return String(n);
  }
};

const MyOffers: React.FC = () => {
  const nav = useNavigate();

  // authToken: undefined = loading, null = no logged-in user, string = token
  const [authToken, setAuthToken] = useState<string | null | undefined>(
    undefined
  );

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

  const {
    data,
    isLoading,
    error,
  } = useQuery<AssignedOfferDTO[], Error>({
    queryKey: ["my-offers", authToken],
    enabled: authToken !== undefined && !!authToken,
    queryFn: () => fetchMyOffers(authToken ?? null),
  });

  const queryClient = useQueryClient();

  // Decide when an offer is refundable from the UI point of view
  const isRefundableOffer = (offer: AssignedOfferDTO): boolean => {
    // Must be a wallet purchase
    if (offer.assignedVia !== "USER_WP_PURCHASED") return false;

    // Status must be ASSIGNED or ACTIVE (not EXPIRED / REDEEMED / CANCELLED)
    if (offer.status !== "ASSIGNED" && offer.status !== "ACTIVE") return false;

    // No redemptions used yet
    if ((offer.redemptionsUsed ?? 0) > 0) return false;

    return true;
  };

  const refundMutation = useMutation({
    mutationFn: async (offer: AssignedOfferDTO) => {
      const snap = offer.templateSnapshot;
      const businessSlug = snap?.businessSlug;
      if (!businessSlug) {
        throw new Error("Missing business information for this offer.");
      }
      await refundOfferPurchase(businessSlug, offer.id, authToken ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-wallet-offers"] });
    },
    onError: (err: any) => {
      const msg =
        err?.message || "Failed to refund this offer. Please try again.";
      alert(msg);
    },
  });

  const eligibleQuery = useQuery<EligibleOffersMultiResponseDTO, Error>({
    queryKey: ["eligible-wallet-offers", authToken],
    enabled: authToken !== undefined && !!authToken,
    queryFn: () => fetchEligibleWalletOffers(authToken ?? null),
  });

  // ✅ Purchase from eligible list (go straight to OfferDetails on success)
  const purchaseEligibleMutation = useMutation<
    { assignedOfferId: string },
    Error,
    { businessSlug: string; offerTemplateId: string }
  >({
    mutationFn: async ({ businessSlug, offerTemplateId }) => {
      if (!businessSlug) throw new Error("Missing business slug");
      if (authToken === undefined) throw new Error("Auth not ready");
      return purchaseOfferWithPoints(
        businessSlug,
        offerTemplateId,
        authToken ?? null
      );
    },
    onSuccess: (res, vars) => {
      // refresh lists
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      queryClient.invalidateQueries({
        queryKey: ["eligible-wallet-offers", authToken],
      });
      queryClient.invalidateQueries({
        queryKey: ["wallet-store", vars.businessSlug, authToken],
      });

      const assignedOfferId = res?.assignedOfferId;
      if (assignedOfferId) {
        nav(`/offers/${assignedOfferId}`);
      } else {
        // fallback
        nav("/my-offers");
      }
    },
    onError: (err: any) => {
      alert(err?.message || "Could not purchase offer.");
    },
  });

  // Flatten + basic computed counts for the snapshot box (optional)
  const eligibleFlatCount = useMemo(() => {
    const groups = eligibleQuery.data?.items ?? [];
    return groups.reduce((acc, g) => acc + (g.items?.length ?? 0), 0);
  }, [eligibleQuery.data]);

  // Still figuring out if user is logged in
  if (authToken === undefined) {
    return (
      <div className="page-wrap my-offers-page">
        <div className="card">Checking your session…</div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="page-wrap my-offers-page">
        <div className="card card-error">Please sign in to view your offers.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-wrap my-offers-page">
        <div className="card">Loading your offers…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap my-offers-page">
        <div className="card card-error">
          Failed to load offers: {error.message}
        </div>
      </div>
    );
  }

  const offers = data ?? [];
  const totalOffers = offers.length;
  const activeOffers = offers.filter((o) => o.status === "ACTIVE").length;
  const expiredOffers = offers.filter((o) => o.status === "EXPIRED").length;

  return (
    <div className="page-wrap my-offers-page">
      {/* Hero section */}
      <section className="myoffers-hero">
        <div className="myoffers-hero-left">
          <h1>Rewards made simple.</h1>
          <h2>Your offers, all in one place.</h2>
          <p>
            Every discount, reward, and special perk you’ve earned through referrals
            and campaigns lives here. Review the details, track when they activate and
            expire, and redeem them at the right time.
          </p>
        </div>

        <div className="myoffers-hero-right">
          <div className="snapshot-box">
            <div className="snapshot-title">Your rewards snapshot</div>
            <div className="snapshot-grid">
              <div className="snapshot-item">
                <div className="snapshot-value">{totalOffers}</div>
                <div className="snapshot-label">Total offers</div>
              </div>
              <div className="snapshot-item">
                <div className="snapshot-value">{activeOffers}</div>
                <div className="snapshot-label">Active</div>
              </div>
              <div className="snapshot-item">
                <div className="snapshot-value">{expiredOffers}</div>
                <div className="snapshot-label">Expired</div>
              </div>

              {/* Optional: show eligible count */}
              <div className="snapshot-item">
                <div className="snapshot-value">
                  {eligibleQuery.isLoading ? "…" : eligibleFlatCount}
                </div>
                <div className="snapshot-label">Eligible to buy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="myoffers-body">
        {/* ✅ Eligible section */}
        <div className="myoffers-intro" style={{ marginTop: 6 }}>
          <h2 className="section-title">Eligible to purchase now</h2>
          <p className="muted">
            These are wallet rewards you can purchase right now (based on your points
            balance and purchase limits). If you just earned points, you may see new
            offers appear here.
          </p>
        </div>

        {eligibleQuery.isLoading && (
          <div className="card">
            <p className="muted">Loading eligible offers…</p>
          </div>
        )}

        {eligibleQuery.error && (
          <div className="card card-error">
            Failed to load eligible offers: {eligibleQuery.error.message}
          </div>
        )}

        {!eligibleQuery.isLoading &&
          !eligibleQuery.error &&
          (eligibleQuery.data?.items?.length ?? 0) === 0 && (
            <div className="card">
              <p className="muted">
                No wallet offers are eligible right now.
                <br />
                Earn more wallet points through referrals and campaigns to unlock new rewards.
              </p>
            </div>
          )}

        {!eligibleQuery.isLoading &&
          !eligibleQuery.error &&
          (eligibleQuery.data?.items?.length ?? 0) > 0 && (
            <div className="eligible-offers-groups">
              {(eligibleQuery.data?.items ?? []).map((group) => {
                const firstItem: WalletStoreItemDTO | undefined = group.items?.[0];

                const snap = firstItem?.offerTemplateSnapshot ?? null;
                const businessName =
                  (snap as any)?.businessName ||
                  (snap as any)?.businessContactName ||
                  "Business";
                const businessSlug = (snap as any)?.businessSlug as
                  | string
                  | undefined;

                return (
                  <div key={group.businessId} className="card eligible-group-card">
                    <div className="eligible-group-header">
                      <div className="eligible-group-title">
                        <div className="eligible-business-name">{businessName}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          Wallet balance:{" "}
                          <strong>{formatPoints(group.walletBalance)}</strong> points
                        </div>
                      </div>

                      <div className="eligible-group-actions">
                        {businessSlug ? (
                          <Link
                            to={`/wallet/${businessSlug}/store`}
                            className="btn btn-secondary"
                          >
                            Open wallet store
                          </Link>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>
                            (Store link unavailable)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="wallet-store-grid" style={{ marginTop: 12 }}>
                      {group.items.map((item) => {
                        const s: any = item.offerTemplateSnapshot ?? null;

                        const scopeSummary =
                          s?.appliesToType === "ANY_PURCHASE"
                            ? "Any purchase"
                            : s?.appliesToType === "PRODUCT"
                            ? s?.appliesProduct?.name || "Specific product"
                            : s?.appliesToType === "BUNDLE"
                            ? s?.appliesBundle?.title || "Bundle"
                            : null;

                        const offerTypeLabel = humanOfferType(s?.offerType);
                        const claimPolicyLabel = humanClaimPolicy(s?.claimPolicy);

                        const canBuyHere = !!businessSlug;

                        return (
                          <article
                            key={`${group.businessId}-${item.offerTemplateId}`}
                            className="card wallet-store-item-card"
                          >
                            <div className="wallet-store-item-top">
                              <div className="wallet-store-item-title">
                                <h3 style={{ margin: 0 }}>{item.title}</h3>
                                {item.description && (
                                  <p className="muted" style={{ marginTop: 6 }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="wallet-store-item-price">
                                <div className="price-pill">
                                  {formatPoints(item.pointsPrice)} pts
                                </div>
                              </div>
                            </div>

                            <div className="wallet-store-item-meta">
                              {scopeSummary && (
                                <div className="offer-meta-row">
                                  <span className="label">Applies to</span>
                                  <span className="value">{scopeSummary}</span>
                                </div>
                              )}

                              {s?.minPurchaseAmount != null && (
                                <div className="offer-meta-row">
                                  <span className="label">Min purchase</span>
                                  <span className="value">
                                    ₹
                                    {Number(s.minPurchaseAmount).toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}
                                  </span>
                                </div>
                              )}

                              {claimPolicyLabel && (
                                <div className="offer-meta-row offer-meta-row-subtle">
                                  <span className="label">How to claim</span>
                                  <span className="value">{claimPolicyLabel}</span>
                                </div>
                              )}

                              {offerTypeLabel && (
                                <div className="offer-meta-row offer-meta-row-subtle">
                                  <span className="label">Type</span>
                                  <span className="value">{offerTypeLabel}</span>
                                </div>
                              )}

                              {item.maxPurchasesPerUser != null && (
                                <div className="offer-meta-row offer-meta-row-subtle">
                                  <span className="label">Purchase limit</span>
                                  <span className="value">
                                    {item.alreadyPurchased} / {item.maxPurchasesPerUser}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="wallet-store-item-actions">
                              {/* For now we keep View -> store (until WalletOfferPage is added) */}
                              {businessSlug ? (
                                <Link
                                  to={`/wallet/${businessSlug}/offers/${item.offerTemplateId}`}
                                  className="btn btn-secondary"
                                >
                                  View
                                </Link>
                              ) : (
                                <button className="btn btn-secondary" disabled>
                                  View
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn"
                                disabled={
                                  !canBuyHere || purchaseEligibleMutation.isPending
                                }
                                onClick={() => {
                                  if (!businessSlug) return;
                                  purchaseEligibleMutation.mutate({
                                    businessSlug,
                                    offerTemplateId: item.offerTemplateId,
                                  });
                                }}
                              >
                                {purchaseEligibleMutation.isPending
                                  ? "Purchasing…"
                                  : "Purchase"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {/* Existing: Your offers */}
        <div className="myoffers-intro" style={{ marginTop: 18 }}>
          <h2 className="section-title">Your offers</h2>
          <p className="muted">
            Every reward you’re part of — as referrer or prospect — shown as a clean,
            easy-to-scan card. Look for the <strong>business name</strong> to quickly
            find offers from a particular brand, and click <strong>View details</strong>{" "}
            to see full terms, validity, and redemption status.
          </p>
        </div>

        {offers.length === 0 && (
          <div className="card">
            <p className="muted">
              You don’t have any active or past offers yet.
              <br />
              Earn offers by participating in referrals and campaigns, or by redeeming
              your wallet points in rewards stores.
            </p>
          </div>
        )}

        {offers.length > 0 && (
          <div className="offer-grid">
            {offers.map((offer) => {
              const snap = offer.templateSnapshot;
              const title = snap?.offerTitle || `Offer #${offer.id.slice(0, 8)}`;
              const description = snap?.description || offer.notes || "";
              const businessName = snap?.businessName || "Unknown business";

              const statusLabel = humanStatus(offer.status);
              const statusClass = `status-pill status-${offer.status.toLowerCase()}`;

              const activated = formatDate(offer.activatedAt);
              const claimed = formatDate(offer.claimedAt);
              const expires = formatDate(offer.expiresAt);

              const typeLabel = humanOfferType(snap?.offerType);
              const roleLabel = humanRecipientRole(offer.recipientRole);
              const claimPolicyLabel = humanClaimPolicy(snap?.claimPolicy);

              const usesLeft =
                offer.maxRedemptions != null
                  ? Math.max(0, offer.maxRedemptions - (offer.redemptionsUsed ?? 0))
                  : null;

              let highlightLabel: string | null = null;
              if (
                snap?.offerType === "PERCENTAGE_DISCOUNT" &&
                snap.discountPercentage != null
              ) {
                highlightLabel = `${snap.discountPercentage}% OFF`;
              } else if (
                snap?.offerType === "FIXED_DISCOUNT" &&
                snap.discountAmount != null
              ) {
                highlightLabel = `₹${snap.discountAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} OFF`;
              } else if (snap?.offerType === "GRANT") {
                highlightLabel = "Free grant";
              } else if (typeLabel) {
                highlightLabel = typeLabel;
              }

              const showValidityRow =
                snap?.durationDays != null && offer.status === "ASSIGNED";
              const showActiveExpiryRow = expires && offer.status === "ACTIVE";
              const showExpiredRow = expires && offer.status === "EXPIRED";

              const grantHeroImage =
                snap?.grants && snap.grants.length > 0
                  ? snap.grants[0]?.product?.primaryImageUrl
                  : null;

              return (
                <article key={offer.id} className="card my-offer-card">
                  <div className="my-offer-card-inner">
                    <div className="my-offer-main">
                      <div className="my-offer-header-row">
                        <div className="my-offer-header-text">
                          <div className="offer-business-name">{businessName}</div>
                          <h3 className="offer-title">{title}</h3>
                        </div>

                        <div className="my-offer-header-right">
                          {highlightLabel && (
                            <span className="offer-highlight-pill">{highlightLabel}</span>
                          )}
                          <span className={statusClass}>{statusLabel}</span>
                        </div>
                      </div>

                      {description && (
                        <p className="offer-description">{description}</p>
                      )}

                      <div className="offer-meta">
                        {snap && (
                          <>
                            {snap.appliesToType && (
                              <div className="offer-meta-row">
                                <span className="label">Applies to</span>
                                <span className="value">
                                  {snap.appliesToType === "ANY_PURCHASE" &&
                                    "Any purchase"}
                                  {snap.appliesToType === "PRODUCT" &&
                                    (snap.appliesProduct?.name || "Specific product")}
                                  {snap.appliesToType === "BUNDLE" &&
                                    (snap.appliesBundle?.title || "Bundle")}
                                </span>
                              </div>
                            )}

                            {snap.minPurchaseAmount != null && (
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

                            {showValidityRow && (
                              <div className="offer-meta-row">
                                <span className="label">Validity</span>
                                <span className="value">
                                  {snap.durationDays} days from activation
                                </span>
                              </div>
                            )}

                            {showActiveExpiryRow && (
                              <div className="offer-meta-row">
                                <span className="label">Expires</span>
                                <span className="value">{expires}</span>
                              </div>
                            )}

                            {showExpiredRow && (
                              <div className="offer-meta-row">
                                <span className="label">Expired</span>
                                <span className="value">{expires}</span>
                              </div>
                            )}
                          </>
                        )}

                        {activated && (
                          <div className="offer-meta-row offer-meta-row-subtle">
                            <span className="label">Activated</span>
                            <span className="value">{activated}</span>
                          </div>
                        )}

                        {claimed && (
                          <div className="offer-meta-row offer-meta-row-subtle">
                            <span className="label">Claimed</span>
                            <span className="value">{claimed}</span>
                          </div>
                        )}

                        {usesLeft != null && offer.maxRedemptions != null && (
                          <div className="offer-meta-row">
                            <span className="label">Uses left</span>
                            <span className="value">
                              {usesLeft} of {offer.maxRedemptions}
                            </span>
                          </div>
                        )}

                        {claimPolicyLabel && (
                          <div className="offer-meta-row offer-meta-row-subtle">
                            <span className="label">How to claim</span>
                            <span className="value">{claimPolicyLabel}</span>
                          </div>
                        )}
                      </div>

                      <div className="offer-footer">
                        <div className="offer-tags">
                          {typeLabel && (
                            <span className="pill pill-outline">{typeLabel}</span>
                          )}
                          {roleLabel && (
                            <span className="pill pill-muted">{roleLabel}</span>
                          )}
                          {offer.referralId && (
                            <span className="pill pill-link">Linked to referral</span>
                          )}
                        </div>

                        <div className="offer-actions">
                          {isRefundableOffer(offer) && (
                            <button
                              type="button"
                              className="btn btn-refund"
                              disabled={refundMutation.isPending}
                              onClick={() => refundMutation.mutate(offer)}
                            >
                              {refundMutation.isPending
                                ? "Processing…"
                                : "Refund purchase"}
                            </button>
                          )}

                          <Link to={`/offers/${offer.id}`} className="btn btn-secondary">
                            View details
                          </Link>
                        </div>
                      </div>
                    </div>

                    {grantHeroImage && (
                      <div className="my-offer-side-image">
                        <img
                          src={grantHeroImage}
                          alt="Offer reward"
                          className="offer-hero-image"
                        />
                      </div>
                    )}
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

export default MyOffers;
