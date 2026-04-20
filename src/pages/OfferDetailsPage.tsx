import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { fetchOfferDetails } from "../services/offerDetailsService";
import type { AssignedOfferDetailsDTO } from "../types/offerDetailsTypes";
import ImageLightbox, { type LightboxItem } from "../components/ImageLightbox";
import "../css/offer-details-page.css";

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function titleCaseToken(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function buildVoucherValue(offer: AssignedOfferDetailsDTO): string {
  if (offer.offerType === "PERCENTAGE_DISCOUNT" && offer.discountPercentage != null) {
    return `${offer.discountPercentage}% OFF`;
  }
  if (offer.offerType === "FIXED_DISCOUNT" && offer.discountAmount != null) {
    return `${formatMoney(offer.discountAmount)} OFF`;
  }
  if (offer.offerType === "GRANT") {
    return "SPECIAL OFFER";
  }
  return titleCaseToken(offer.offerType).toUpperCase();
}

function buildConditionLine(offer: AssignedOfferDetailsDTO): string {
  if (offer.minPurchaseAmount != null) {
    return `On purchases above ${formatMoney(offer.minPurchaseAmount)}`;
  }
  if (offer.minPurchaseQty != null) {
    return `Valid on minimum quantity of ${offer.minPurchaseQty}`;
  }
  return "Use this voucher before it expires.";
}

function buildFriendlyHowToUse(offer: AssignedOfferDetailsDTO): string {
  if (offer.claimPolicy === "MANUAL") {
    return "Show this voucher when redeeming.";
  }
  if (offer.claimPolicy === "ONLINE") {
    return "Use this voucher during checkout.";
  }
  if (offer.claimPolicy === "BOTH") {
    return "Use this voucher online or show it while redeeming.";
  }
  return "Use this voucher before it expires.";
}

function buildFriendlyHistoryLabel(offer: AssignedOfferDetailsDTO): string {
  if (offer.notes?.trim()) return offer.notes.trim();
  if (offer.sourceCtaId) return "Shared with you as part of a referral request.";
  if (offer.sourceBroadcastId) return "Shared with you in an announcement.";
  return "Shared with you by the business.";
}

function ScopeItemsBlock({
  items,
}: {
  items?: AssignedOfferDetailsDTO["scopeItems"];
}) {
  if (!items || items.length === 0) {
    return <div className="od-empty">This voucher can be used across eligible purchases.</div>;
  }

  return (
    <div className="od-chipGrid">
      {items.map((item, index) => {
        if (item.itemType === "PRODUCT" && item.product) {
          return (
            <div className="od-chipCard" key={`scope-product-${item.product.id}-${index}`}>
              <div className="od-chipCard__eyebrow">Product</div>
              <div className="od-chipCard__title">{item.product.name}</div>
              {item.product.sku ? <div className="od-chipCard__meta">SKU: {item.product.sku}</div> : null}
            </div>
          );
        }

        if (item.itemType === "BUNDLE" && item.bundle) {
          return (
            <div className="od-chipCard" key={`scope-bundle-${item.bundle.id}-${index}`}>
              <div className="od-chipCard__eyebrow">Bundle</div>
              <div className="od-chipCard__title">{item.bundle.title}</div>
            </div>
          );
        }

        return (
          <div className="od-chipCard" key={`scope-generic-${index}`}>
            <div className="od-chipCard__title">{item.itemType}</div>
          </div>
        );
      })}
    </div>
  );
}

function GrantsBlock({
  grants,
}: {
  grants?: AssignedOfferDetailsDTO["grants"];
}) {
  if (!grants || grants.length === 0) {
    return <div className="od-empty">No bundled items are attached to this voucher.</div>;
  }

  return (
    <div className="od-chipGrid">
      {grants.map((grant, index) => {
        const title =
          grant.itemType === "PRODUCT"
            ? grant.product?.name || "Product"
            : grant.bundle?.title || "Bundle";

        return (
          <div className="od-chipCard" key={`grant-${index}`}>
            <div className="od-chipCard__eyebrow">{titleCaseToken(grant.itemType)}</div>
            <div className="od-chipCard__title">{title}</div>
            <div className="od-chipCard__meta">Quantity: {grant.quantity ?? 1}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function OfferDetailsPage() {
  const { assignedOfferId } = useParams<{ assignedOfferId: string }>();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<AssignedOfferDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!assignedOfferId) {
        setError("Missing offer id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token ?? null;
        const businessId = localStorage.getItem("actingBusinessId");

        const data = await fetchOfferDetails({
          assignedOfferId,
          token,
          businessId,
        });

        if (!cancelled) {
          setOffer(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load offer.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [assignedOfferId]);

  const galleryImages = useMemo(() => {
    if (!offer?.images?.length) return [];
    return offer.images.filter((img) => !!img?.url);
  }, [offer]);

  const lightboxItems = useMemo<LightboxItem[]>(() => {
    if (!offer?.images?.length) return [];
    return offer.images
      .filter((img) => !!img?.url)
      .map((img) => ({
        src: img.url,
        alt: img.name || offer.offerTitle || "Offer image",
        title: img.name || offer.offerTitle || "Offer image",
        openUrl: img.url,
      }));
  }, [offer]);

  const primaryImageUrl = useMemo(() => {
    if (!offer) return null;

    const primaryFromImages =
      offer.images?.find((img) => img?.isPrimary === true)?.url ??
      offer.images?.[0]?.url ??
      null;

    return offer.primaryImageUrl || primaryFromImages;
  }, [offer]);

  if (loading) {
    return (
      <div className="od-page">
        <div className="od-shell od-shell--compact">
          <div className="od-skeleton od-skeleton--voucher" />
          <div className="od-skeleton od-skeleton--drawer" />
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="od-page">
        <div className="od-shell od-shell--compact">
          <div className="od-errorCard">
            <div className="od-errorCard__title">Unable to load voucher</div>
            <div className="od-errorCard__body">{error || "Voucher not found."}</div>
            <div className="od-errorCard__actions">
              <button className="od-btn od-btn--primary" onClick={() => navigate(-1)}>
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const voucherValue = buildVoucherValue(offer);
  const assignedToLabel =
    offer.assignedToName || titleCaseToken(offer.recipientRole) || "Recipient";
  const conditionLine = buildConditionLine(offer);
  const howToUseLine = buildFriendlyHowToUse(offer);
  const historyLabel = buildFriendlyHistoryLabel(offer);

  return (
    <div className="od-page">
      <div className="od-shell od-shell--compact">
        <div className="od-topbar">
          <button className="od-backBtn" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <div className="od-topbar__actions">
            {offer.sourceThreadId ? (
              <button
                className="od-linkBtn"
                onClick={() => navigate(`/threads/${offer.sourceThreadId}`)}
              >
                Open thread
              </button>
            ) : null}

            <button
              className="od-linkBtn"
              onClick={() => window.print()}
            >
              Print voucher
            </button>
          </div>
        </div>

        <section className="od-ticket">
          <div className="od-ticket__body">
            <div className="od-ticket__brandRow">
              <div className="od-ticket__brand">TriHola</div>
              <div className="od-ticket__status">{titleCaseToken(offer.status)}</div>
            </div>

            <div className="od-ticket__eyebrow">Assigned offer</div>
            <div className="od-ticket__value">{voucherValue}</div>
            <div className="od-ticket__name">{offer.offerTitle}</div>
            <div className="od-ticket__condition">{conditionLine}</div>

            <div className="od-ticket__facts">
              <div className="od-ticketFact">
                <span>Valid till</span>
                <strong>{formatDateOnly(offer.validUntil)}</strong>
              </div>
              <div className="od-ticketFact">
                <span>For</span>
                <strong>{assignedToLabel}</strong>
              </div>
              <div className="od-ticketFact">
                <span>Uses left</span>
                <strong>{offer.redemptionsLeft ?? "—"}</strong>
              </div>
            </div>

            <div className="od-ticket__message">
              <div className="od-ticket__messageTitle">How to use</div>
              <div className="od-ticket__messageText">{howToUseLine}</div>
            </div>
          </div>

          <div className="od-ticket__divider" aria-hidden="true" />

          <div className="od-ticket__stub">
            {primaryImageUrl ? (
              <button
                type="button"
                className="od-ticket__image"
                onClick={() => {
                  const idx = galleryImages.findIndex((img) => img.url === primaryImageUrl);
                  setLightboxIndex(idx >= 0 ? idx : 0);
                  setLightboxOpen(true);
                }}
                aria-label="Open offer image"
              >
                <img
                  src={primaryImageUrl}
                  alt={offer.offerTitle || "Offer image"}
                  className="od-ticket__imageTag"
                />
              </button>
            ) : (
              <div className="od-ticket__image od-ticket__image--empty">No image</div>
            )}

            <div className="od-ticket__stubValue">{voucherValue}</div>
            <div className="od-ticket__stubText">{conditionLine}</div>

            <div className="od-ticket__redeem">
              <div className="od-ticket__qrBox">
                <div className="od-ticket__qrPattern" />
              </div>
              <div className="od-ticket__redeemText">Show this voucher when redeeming</div>
            </div>

            {offer.canClaim ? (
              <button className="od-btn od-btn--primary" disabled>
                Claim coming soon
              </button>
            ) : offer.canApproveClaim ? (
              <button className="od-btn od-btn--secondary" disabled>
                Approval coming soon
              </button>
            ) : (
              <button className="od-btn od-btn--ghost" disabled>
                Ready to use
              </button>
            )}
          </div>
        </section>

        <details className="od-detailsDrawer">
          <summary className="od-detailsDrawer__summary">
            More details
          </summary>

          <div className="od-detailsDrawer__content">
            <div className="od-friendlyGrid">
              <section className="od-panel">
                <h3 className="od-panel__title">Voucher summary</h3>
                <div className="od-friendlyList">
                  <div className="od-friendlyRow">
                    <span>Business</span>
                    <strong>{offer.businessName || offer.assignedByName || "—"}</strong>
                  </div>
                  <div className="od-friendlyRow">
                    <span>Offer type</span>
                    <strong>{titleCaseToken(offer.offerType)}</strong>
                  </div>
                  <div className="od-friendlyRow">
                    <span>Maximum uses</span>
                    <strong>{offer.effectiveMaxRedemptions ?? "—"}</strong>
                  </div>
                  <div className="od-friendlyRow">
                    <span>Used so far</span>
                    <strong>{offer.redemptionsUsed ?? 0}</strong>
                  </div>
                </div>
              </section>

              <section className="od-panel">
                <h3 className="od-panel__title">Spend requirement</h3>
                <div className="od-friendlyList">
                  <div className="od-friendlyRow">
                    <span>Minimum spend</span>
                    <strong>{offer.minPurchaseAmount != null ? formatMoney(offer.minPurchaseAmount) : "None"}</strong>
                  </div>
                  <div className="od-friendlyRow">
                    <span>Minimum quantity</span>
                    <strong>{offer.minPurchaseQty ?? "None"}</strong>
                  </div>
                  <div className="od-friendlyRow">
                    <span>Discount</span>
                    <strong>
                      {offer.discountPercentage != null
                        ? `${offer.discountPercentage}%`
                        : offer.discountAmount != null
                        ? formatMoney(offer.discountAmount)
                        : "—"}
                    </strong>
                  </div>
                  <div className="od-friendlyRow">
                    <span>Maximum cap</span>
                    <strong>{offer.maxDiscountAmount != null ? formatMoney(offer.maxDiscountAmount) : "—"}</strong>
                  </div>
                </div>
              </section>

              <section className="od-panel od-panel--wide">
                <h3 className="od-panel__title">Where it can be used</h3>
                <ScopeItemsBlock items={offer.scopeItems} />
              </section>

              <section className="od-panel od-panel--wide">
                <h3 className="od-panel__title">What’s included</h3>
                <GrantsBlock grants={offer.grants} />
              </section>

              <section className="od-panel">
                <h3 className="od-panel__title">Voucher history</h3>
                <div className="od-history">
                  <div className="od-history__item">
                    <div className="od-history__dot" />
                    <div>
                      <div className="od-history__title">Shared with you</div>
                      <div className="od-history__time">{formatDateTime(offer.assignedAt)}</div>
                    </div>
                  </div>

                  {offer.activatedAt ? (
                    <div className="od-history__item">
                      <div className="od-history__dot" />
                      <div>
                        <div className="od-history__title">Became active</div>
                        <div className="od-history__time">{formatDateTime(offer.activatedAt)}</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="od-history__item">
                    <div className="od-history__dot" />
                    <div>
                      <div className="od-history__title">{historyLabel}</div>
                      <div className="od-history__time">Current voucher context</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </details>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}