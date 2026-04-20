import { useEffect, useMemo, useState } from "react";
import ImageLightbox, { type LightboxItem } from "../../../components/ImageLightbox";
import { fetchOfferDetails } from "../../../services/offerDetailsService";
import type { AssignedOfferDetailsDTO } from "../../../types/offerDetailsTypes";

import OfferOrderPreviewModal, {
  type OfferOrderPreviewDraftPayloadDTO,
} from "../../../components/OfferOrderPreviewModal";

import "../../../css/new-chat-drawer.css";

type Props = {
  open: boolean;
  assignedOfferId: string | null;
  threadId: string;
  onClose: () => void;
  getAuth: () => Promise<{ token: string; userId: string } | null>;
  businessId?: string | null;
  onUseDraft: (draft: OfferOrderPreviewDraftPayloadDTO) => void;
};

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
  return new Intl.NumberFormat("en-IN", {
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
    return `Valid on a minimum quantity of ${offer.minPurchaseQty}`;
  }

  return "Use this voucher before it expires.";
}

function statusBadgeClass(status?: string | null): string {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "offer-status-pill offer-status-pill--active";
    case "ASSIGNED":
      return "offer-status-pill offer-status-pill--assigned";
    case "CLAIMED":
      return "offer-status-pill offer-status-pill--claimed";
    case "REDEEMED":
      return "offer-status-pill offer-status-pill--redeemed";
    case "EXPIRED":
    case "CANCELLED":
      return "offer-status-pill offer-status-pill--ended";
    default:
      return "offer-status-pill";
  }
}

function ScopeItemsBlock({
  items,
}: {
  items?: AssignedOfferDetailsDTO["scopeItems"];
}) {
  if (!items || items.length === 0) {
    return <div className="offer-empty-state">Valid across eligible purchases.</div>;
  }

  return (
    <div className="offer-chip-grid">
      {items.map((item, index) => {
        if (item.itemType === "PRODUCT" && item.product) {
          return (
            <div className="offer-chip-card" key={`scope-product-${item.product.id}-${index}`}>
              <div className="offer-chip-card__eyebrow">Product</div>
              <div className="offer-chip-card__title">{item.product.name}</div>
              {item.product.sku ? (
                <div className="offer-chip-card__meta">SKU: {item.product.sku}</div>
              ) : null}
            </div>
          );
        }

        if (item.itemType === "BUNDLE" && item.bundle) {
          return (
            <div className="offer-chip-card" key={`scope-bundle-${item.bundle.id}-${index}`}>
              <div className="offer-chip-card__eyebrow">Bundle</div>
              <div className="offer-chip-card__title">{item.bundle.title}</div>
            </div>
          );
        }

        return (
          <div className="offer-chip-card" key={`scope-generic-${index}`}>
            <div className="offer-chip-card__title">{titleCaseToken(item.itemType)}</div>
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
    return <div className="offer-empty-state">No bundled items attached.</div>;
  }

  return (
    <div className="offer-chip-grid">
      {grants.map((grant, index) => {
        const title =
          grant.itemType === "PRODUCT"
            ? grant.product?.name || "Product"
            : grant.bundle?.title || "Bundle";

        return (
          <div className="offer-chip-card" key={`grant-${index}`}>
            <div className="offer-chip-card__eyebrow">{titleCaseToken(grant.itemType)}</div>
            <div className="offer-chip-card__title">{title}</div>
            <div className="offer-chip-card__meta">Quantity: {grant.quantity ?? 1}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function OfferDetailsDrawer({
  open,
  assignedOfferId,
  threadId,
  onClose,
  getAuth,
  businessId,
  onUseDraft,
}: Props) {
  const [offer, setOffer] = useState<AssignedOfferDetailsDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!open || !assignedOfferId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const auth = await getAuth();
        if (!auth?.token) {
          if (!cancelled) setErr("Not authenticated");
          return;
        }

        const data = await fetchOfferDetails({
          assignedOfferId,
          token: auth.token,
          businessId,
        });

        if (!cancelled) {
          setOffer(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Failed to load offer");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, assignedOfferId, getAuth, businessId]);

  const galleryImages = useMemo(() => {
    return (offer?.images ?? []).filter((img) => !!img?.url);
  }, [offer]);

  const lightboxItems = useMemo<LightboxItem[]>(() => {
    return galleryImages.map((img) => ({
      src: img.url,
      alt: img.name || offer?.offerTitle || "Offer image",
      title: img.name || offer?.offerTitle || "Offer image",
      openUrl: img.url,
    }));
  }, [galleryImages, offer]);

  const primaryImageUrl = useMemo(() => {
    if (!offer) return null;

    const primaryFromImages =
      offer.images?.find((img) => img?.isPrimary === true)?.url ?? null;

    return primaryFromImages || offer.primaryImageUrl || offer.images?.[0]?.url || null;
  }, [offer]);

  const voucherValue = useMemo(() => {
    if (!offer) return "—";
    return buildVoucherValue(offer);
  }, [offer]);

  const conditionLine = useMemo(() => {
    if (!offer) return "—";
    return buildConditionLine(offer);
  }, [offer]);

  const validityLine = useMemo(() => {
    if (!offer) return "—";

    if (offer.validFrom && offer.validUntil) {
      return `${formatDateOnly(offer.validFrom)} to ${formatDateOnly(offer.validUntil)}`;
    }

    if (offer.validUntil) {
      return `Valid till ${formatDateOnly(offer.validUntil)}`;
    }

    if (offer.validFrom) {
      return `Valid from ${formatDateOnly(offer.validFrom)}`;
    }

    return "Validity will be shown here when applicable.";
  }, [offer]);

  if (!open) return null;

  return (
    <>
      <div className="new-chat-overlay" onClick={onClose}>
        <div className="new-chat-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="new-chat-header">
            <div className="new-chat-title">Offer Details</div>
            <button
              type="button"
              className="new-chat-close"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="new-chat-body offer-details-body">
            {loading && <div className="loading">Loading...</div>}
            {!!err && <div className="error">{err}</div>}

            {offer && (
              <div className="offer-details-layout">
                <section className="offer-card offer-card--hero">
                  <div className="offer-status-row offer-status-row--top">
                    <span className={statusBadgeClass(offer.status)}>
                      {titleCaseToken(offer.status)}
                    </span>
                  </div>

                  <div className="offer-hero-top">
                    <div className="offer-hero-copy">
                      <div className="offer-eyebrow">
                        {offer.businessName?.trim() || "Offer"}
                      </div>

                      <h2 className="offer-title">{offer.offerTitle}</h2>

                      <div className="offer-value">{voucherValue}</div>
                    </div>

                    {primaryImageUrl ? (
                      <button
                        type="button"
                        className="offer-hero-image-btn"
                        onClick={() => {
                          setLightboxIndex(
                            Math.max(
                              0,
                              galleryImages.findIndex((img) => img.url === primaryImageUrl)
                            )
                          );
                          setLightboxOpen(true);
                        }}
                      >
                        <img
                          src={primaryImageUrl}
                          alt={offer.offerTitle}
                          className="offer-hero-image"
                        />
                      </button>
                    ) : null}
                  </div>

                  <div className="offer-hero-metaGrid">
                    <div className="offer-hero-metaCard">
                      <span className="offer-hero-metaLabel">Condition</span>
                      <strong>{conditionLine}</strong>
                    </div>
                    <div className="offer-hero-metaCard">
                      <span className="offer-hero-metaLabel">Validity</span>
                      <strong>{validityLine}</strong>
                    </div>
                  </div>

                  {offer.description?.trim() ? (
                    <div className="offer-description">{offer.description}</div>
                  ) : null}

                  <div className="offer-hero-actions offer-hero-actions--embedded">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setPreviewOpen(true)}
                    >
                      Preview Order
                    </button>

                    {offer.redemptionsLeft != null ? (
                      <span className="offer-usage-pill offer-usage-pill--hero">
                        {offer.redemptionsLeft} left
                      </span>
                    ) : null}
                  </div>
                </section>

                <div className="offer-details-grid">
                  {(offer.redemptionsUsed != null || offer.redemptionsLeft != null) && (
                    <section className="offer-card offer-card--compact">
                      <div className="offer-section-title">Usage</div>
                      <div className="offer-usage-grid offer-usage-grid--two">
                        {offer.redemptionsUsed != null ? (
                          <div className="offer-usage-card">
                            <div className="offer-usage-label">Used</div>
                            <div className="offer-usage-value">{offer.redemptionsUsed}</div>
                          </div>
                        ) : null}

                        {offer.redemptionsLeft != null ? (
                          <div className="offer-usage-card">
                            <div className="offer-usage-label">Remaining</div>
                            <div className="offer-usage-value">{offer.redemptionsLeft}</div>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  )}

                  <section className="offer-card offer-card--compact">
                    <div className="offer-section-title">Where it applies</div>
                    <ScopeItemsBlock items={offer.scopeItems} />
                  </section>

                  {offer.grants?.length ? (
                    <section className="offer-card offer-card--compact offer-card--full">
                      <div className="offer-section-title">Included with this offer</div>
                      <GrantsBlock grants={offer.grants} />
                    </section>
                  ) : null}

                  {galleryImages.length > 1 ? (
                    <section className="offer-card offer-card--compact offer-card--full">
                      <div className="offer-section-title">Gallery</div>
                      <div className="offer-gallery-grid">
                        {galleryImages.map((img, index) => (
                          <button
                            type="button"
                            key={`${img.url}-${index}`}
                            className="offer-gallery-item"
                            onClick={() => {
                              setLightboxIndex(index);
                              setLightboxOpen(true);
                            }}
                          >
                            <img src={img.url} alt={img.name || offer.offerTitle} />
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        items={lightboxItems}
        startIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      {offer ? (
        <OfferOrderPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          offer={offer}
          threadId={threadId}
          businessId={businessId}
          getAuth={getAuth}
          onUseDraft={onUseDraft}
        />
      ) : null}
    </>
  );
}