// src/pages/OfferTemplateDetailsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getBusinessPublicViewBySlug } from "../services/businessService";
import {
  deleteOfferTemplate,
  fetchOfferTemplateById,
} from "../services/offerTemplateService";

import ImageLightbox from "../components/ImageLightbox";

import type { BusinessPublicViewDTO } from "../types/business";
import type {
  OfferGrantLine,
  OfferTemplateResponse,
  ScopeItemSpec,
} from "../types/offerTemplateTypes";

import "../css/offer-template-details.css";

function safeText(v: unknown) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}

function formatMoney(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return String(v);
}

function formatDateOnly(v?: string | null) {
  if (!v) return "—";
  return v.slice(0, 10);
}

function businessLogoUrl(ctx: BusinessPublicViewDTO | null): string | null {
  if (!ctx) return null;
  const anyCtx = ctx as any;
  return (
    anyCtx.businessLogoUrl ||
    anyCtx.logoUrl ||
    anyCtx.logo ||
    anyCtx.profileImageUrl ||
    null
  );
}

function initials(name: string) {
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] ?? "O") + (p[1]?.[0] ?? "")).toUpperCase();
}

function primaryImage(t: OfferTemplateResponse): string | null {
  return (
    t.primaryImageUrl ||
    t.images?.find((x: any) => x?.isPrimary)?.url ||
    t.images?.[0]?.url ||
    null
  );
}

function validityLabel(t: OfferTemplateResponse): string {
  if (t.validityType === "ABSOLUTE") {
    if (t.validFrom && t.validTo) {
      return `${formatDateOnly(t.validFrom)} to ${formatDateOnly(t.validTo)}`;
    }
    if (t.validFrom) {
      return `From ${formatDateOnly(t.validFrom)}`;
    }
    if (t.validTo) {
      return `Until ${formatDateOnly(t.validTo)}`;
    }
    return "Fixed validity period";
  }

  const duration = t.durationDays != null ? `${t.durationDays} day(s)` : "Limited duration";

  switch ((t.trigger ?? "ON_ASSIGNMENT").toUpperCase()) {
    case "ON_ASSIGNMENT":
      return `${duration} from assignment`;
    case "ON_CLAIM":
      return `${duration} from claim`;
    case "ON_ACCEPTANCE":
      return `${duration} from acceptance`;
    default:
      return `${duration} from ${String(t.trigger ?? "assignment")
        .replaceAll("_", " ")
        .toLowerCase()}`;
  }
}

function getDiscountHeadline(offer: OfferTemplateResponse): string {
  if (offer.tiers && offer.tiers.length > 0) {
    const pctValues = offer.tiers
      .map((t: any) => t.discountPercentage)
      .filter((v: unknown): v is number => typeof v === "number" && v > 0);

    if (pctValues.length > 0) {
      const min = Math.min(...pctValues);
      const max = Math.max(...pctValues);
      return min === max ? `${min}% OFF` : `${min}% – ${max}% OFF`;
    }

    const fixedValues = offer.tiers
      .map((t: any) => t.discountAmount)
      .filter((v: unknown): v is number => typeof v === "number" && v > 0);

    if (fixedValues.length > 0) {
      const min = Math.min(...fixedValues);
      const max = Math.max(...fixedValues);
      return min === max ? `₹${min} OFF` : `₹${min} – ₹${max} OFF`;
    }
  }

  if (offer.offerType === "PERCENTAGE_DISCOUNT" && offer.discountPercentage != null) {
    return `${offer.discountPercentage}% OFF`;
  }

  if (offer.offerType === "FIXED_DISCOUNT" && offer.discountAmount != null) {
    return `₹${offer.discountAmount} OFF`;
  }

  if (offer.offerType === "GRANT") {
    const count = offer.grants?.length ?? 0;
    return count > 0 ? `${count} selectable offer${count === 1 ? "" : "s"}` : "Grant offer";
  }

  return "Offer";
}

function renderScopeText(t: OfferTemplateResponse) {
  if (!t.scopeItems || t.scopeItems.length === 0) {
    return "Any item";
  }
  return `Selected items (${t.scopeItems.length})`;
}

function renderClaimText(policy?: string | null) {
  switch ((policy ?? "").toUpperCase()) {
    case "ONLINE":
      return "Online";
    case "OFFLINE":
    case "MANUAL":
      return "Offline";
    case "BOTH":
      return "Online & offline";
    case "REFERRER":
      return "Referrer only";
    case "PROSPECT":
      return "Prospect only";
    default:
      return safeText(policy);
  }
}

function offerTypeLabel(offerType?: string | null) {
  switch ((offerType ?? "").toUpperCase()) {
    case "PERCENTAGE_DISCOUNT":
      return "Percentage discount";
    case "FIXED_DISCOUNT":
      return "Fixed discount";
    case "GRANT":
      return "Grant";
    default:
      return safeText(offerType);
  }
}

function scopeItemSummary(item: ScopeItemSpec, index: number) {
  const type = item.itemType === "PRODUCT" ? "Product" : "Bundle";
  const label =
    item.itemType === "PRODUCT"
      ? item.product?.name || `Product ${index + 1}`
      : item.bundle?.title || `Bundle ${index + 1}`;

  return `${label} • ${type}`;
}

function grantSummary(g: OfferGrantLine, index: number) {
  const name = g.itemType === "PRODUCT" ? g.product?.name : g.bundle?.title;
  const base = name || `Grant ${index + 1}`;
  const qty =
    g.quantity != null
      ? g.quantity === 1
        ? " • 1 item"
        : ` • ${g.quantity} items`
      : "";

  return `${base}${qty}`;
}

function renderTierRangeLabel(tier: any, idx: number, tiers: any[]) {
  const currentMin = Number(tier.minAmount ?? 0);
  const nextMin = Number(tiers[idx + 1]?.minAmount ?? NaN);

  if (idx === 0 && Number.isFinite(nextMin) && nextMin > currentMin) {
    return `Below ₹${nextMin}`;
  }

  if (Number.isFinite(nextMin) && nextMin > currentMin) {
    return `₹${currentMin} to ₹${nextMin - 1}`;
  }

  return `₹${currentMin} and above`;
}

function renderTierBenefitLabel(tier: any) {
  if (tier.discountPercentage != null) {
    return `${tier.discountPercentage}% off`;
  }

  if (tier.discountAmount != null) {
    return `₹${tier.discountAmount} off`;
  }

  return "Offer";
}

function GlassChip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted" | "accent";
}) {
  return <span className={`ofd-chip ofd-chip--${tone}`}>{children}</span>;
}

function StatCard({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`app-statCard ${wide ? "app-statCard--wide" : ""}`}>
      <div className="app-statLabel">{label}</div>
      <div className="app-statValue">{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="app-section ofd-section">
      <div className="app-section__header">
        <div className="app-section__main">
          <h2 className="app-section__title ofd-sectionTitle">{title}</h2>
          {subtitle ? (
            <div className="app-section__subtitle ofd-sectionSubtitle">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="app-section__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

const OfferTemplateDetailsPage: React.FC = () => {
  const { businessSlug, offerTemplateId } = useParams<{
    businessSlug: string;
    offerTemplateId: string;
  }>();

  const navigate = useNavigate();

  const [business, setBusiness] = useState<BusinessPublicViewDTO | null>(null);
  const [offer, setOffer] = useState<OfferTemplateResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const viewerRole = useMemo(
    () => (business?.viewerRelation ?? "").toUpperCase(),
    [business?.viewerRelation]
  );

  const canManageOffers = viewerRole === "OWNER" || viewerRole === "ADMIN";

  useEffect(() => {
    if (!businessSlug || !offerTemplateId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const b = await getBusinessPublicViewBySlug(businessSlug);
        if (cancelled) return;
        setBusiness(b);

        const businessId = (b as any)?.businessId ?? b.businessId;
        if (!businessId) {
          throw new Error("Business ID not found.");
        }

        const details = await fetchOfferTemplateById(offerTemplateId, businessId);
        if (cancelled) return;
        setOffer(details);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load offer template");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessSlug, offerTemplateId]);

  const onDelete = async () => {
    if (!business || !offerTemplateId || !canManageOffers) return;

    const confirmed = window.confirm(
      "Delete this offer template? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      const businessId = (business as any)?.businessId ?? business.businessId;
      if (!businessId) throw new Error("Business ID not found.");

      await deleteOfferTemplate(offerTemplateId, businessId);

      navigate(`/businesses/${encodeURIComponent(businessSlug!)}`, {
        replace: true,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete offer template");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="ofd-page ofd-page--center">Loading offer template…</div>;
  }

  if (error && !offer) {
    return (
      <div className="app-page app-page--wide ofd-page">
        <div className="app-stack">
          <div className="ofd-errorBlock">
            <div className="error-banner">{error}</div>
            <div style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={() =>
                  navigate(`/businesses/${encodeURIComponent(businessSlug ?? "")}`)
                }
              >
                Back to business
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!business || !offer) {
    return <div className="ofd-page ofd-page--center">Offer template not found</div>;
  }

  const logoUrl = businessLogoUrl(business);
  const heroImage = primaryImage(offer);

  const hasConditions =
    offer.minPurchaseAmount != null ||
    offer.minPurchaseQty != null ||
    !!offer.eligibility ||
    offer.maxRedemptions != null;

  const sortedImages = [...(offer.images ?? [])].sort((a: any, b: any) => {
    const aPrimary = a?.isPrimary ? 1 : 0;
    const bPrimary = b?.isPrimary ? 1 : 0;
    return bPrimary - aPrimary;
  });

  const lightboxItems = sortedImages.map((img: any, idx: number) => ({
    src: img.url,
    alt: img.name ?? `Offer image ${idx + 1}`,
    title: img.isPrimary ? "Primary image" : `Image ${idx + 1}`,
    openUrl: img.url,
  }));

  const hasExtras =
    !!offer.specialTerms ||
    !!offer.purchasableWithPoints ||
    sortedImages.length > 0;

  const galleryLead = sortedImages[0] ?? null;
  const galleryRest = sortedImages.slice(1, 5);

  return (
    <div className="app-page app-page--wide ofd-page">
      <div className="app-stack">
        <header className="ofd-hero">
          <div className="ofd-heroGlow ofd-heroGlow--one" />
          <div className="ofd-heroGlow ofd-heroGlow--two" />
          <div className="ofd-heroInner">
            <div className="ofd-heroBrand">
              <div className="ofd-brandBadge" aria-label="Business logo">
                {logoUrl ? (
                  <img src={logoUrl} alt={safeText(business.name)} />
                ) : (
                  <div className="ofd-brandFallback">{initials(safeText(business.name))}</div>
                )}
              </div>

              <div className="ofd-brandText">
                <div className="ofd-brandEyebrow">{safeText(business.name)}</div>
                <h1 className="ofd-title">{safeText(offer.templateTitle)}</h1>
                <div className="ofd-subtitle">
                  {offer.description?.trim() || "No description provided."}
                </div>

                <div className="ofd-chipRow">
                  <GlassChip tone={offer.isActive ? "success" : "muted"}>
                    {offer.isActive ? "Active" : "Inactive"}
                  </GlassChip>
                  <GlassChip tone="accent">{offerTypeLabel(offer.offerType)}</GlassChip>
                  <GlassChip>{renderScopeText(offer)}</GlassChip>
                  <GlassChip>{renderClaimText(offer.claimPolicy)}</GlassChip>
                  <GlassChip>{validityLabel(offer)}</GlassChip>
                  {offer.purchasableWithPoints ? <GlassChip>Points enabled</GlassChip> : null}
                </div>
              </div>
            </div>

            <div className="ofd-heroMain">
              <div className="ofd-heroVisual">
                {heroImage ? (
                  <button
                    type="button"
                    className="ofd-heroImageButton"
                    onClick={() => {
                      setLightboxStartIndex(0);
                      setLightboxOpen(true);
                    }}
                  >
                    <img
                      src={heroImage}
                      alt={safeText(offer.templateTitle)}
                      className="ofd-heroImage"
                    />
                  </button>
                ) : (
                  <div className="ofd-heroImageFallback">
                    {initials(safeText(offer.templateTitle))}
                  </div>
                )}

                <div className="ofd-heroValuePanel">
                  <div className="ofd-heroValue">{getDiscountHeadline(offer)}</div>
                  <div className="ofd-heroValueMeta">
                    {offer.tiers?.length
                      ? `${offer.tiers.length} tier${offer.tiers.length === 1 ? "" : "s"}`
                      : offer.grants?.length
                      ? `${offer.grants.length} selectable item${
                          offer.grants.length === 1 ? "" : "s"
                        }`
                      : offerTypeLabel(offer.offerType)}
                  </div>
                </div>
              </div>

              <div className="ofd-heroActions">
                {canManageOffers && (
                  <>
                    <button
                      className="btn"
                      onClick={() =>
                        navigate(
                          `/businesses/${encodeURIComponent(
                            businessSlug!
                          )}/offers/${encodeURIComponent(offer.offerTemplateId)}/edit`
                        )
                      }
                    >
                      Edit
                    </button>

                    <button className="btn" onClick={onDelete} disabled={deleting}>
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </>
                )}

                <button
                  className="btn btn--primary"
                  onClick={() => navigate(`/businesses/${encodeURIComponent(businessSlug!)}`)}
                >
                  Back to business
                </button>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="ofd-inlineError">
            <div className="error-banner">{error}</div>
          </div>
        )}

        <div className="ofd-content">
          <Section
            title="Offer overview"
            subtitle="The main details of this offer at a glance."
          >
            <div className="app-statGrid">
              <StatCard label="Offer type" value={offerTypeLabel(offer.offerType)} />
              <StatCard label="Claim mode" value={renderClaimText(offer.claimPolicy)} />
              <StatCard label="Validity" value={validityLabel(offer)} />
              <StatCard
                label="Minimum purchase"
                value={
                  offer.minPurchaseAmount != null
                    ? `₹${formatMoney(offer.minPurchaseAmount)}`
                    : "—"
                }
              />
              <StatCard
                label="Minimum quantity"
                value={offer.minPurchaseQty != null ? safeText(offer.minPurchaseQty) : "—"}
              />
              <StatCard
                label="Points purchase"
                value={offer.purchasableWithPoints ? "Enabled" : "Disabled"}
              />
            </div>
          </Section>

          {hasConditions && (
            <Section
              title="Conditions"
              subtitle="Rules that apply before this offer can be used."
            >
              <div className="app-statGrid">
                {offer.minPurchaseAmount != null && (
                  <StatCard
                    label="Minimum purchase amount"
                    value={`₹${formatMoney(offer.minPurchaseAmount)}`}
                  />
                )}

                {offer.minPurchaseQty != null && (
                  <StatCard
                    label="Minimum purchase quantity"
                    value={safeText(offer.minPurchaseQty)}
                  />
                )}

                {!!offer.eligibility && (
                  <StatCard label="Eligibility" value={safeText(offer.eligibility)} wide />
                )}

                {offer.maxRedemptions != null && (
                  <StatCard
                    label="Max redemptions"
                    value={safeText(offer.maxRedemptions)}
                  />
                )}
              </div>
            </Section>
          )}

          {!!offer.scopeItems?.length && (
            <Section
              title="Applicable items"
              subtitle="Products and bundles this offer can be applied to."
            >
              <div className="app-entityList">
                {offer.scopeItems.map((item, idx) => {
                  const img =
                    item.itemType === "PRODUCT"
                      ? item.product?.primaryImageUrl
                      : item.bundle?.primaryImageUrl;

                  const title =
                    item.itemType === "PRODUCT"
                      ? item.product?.name || `Product ${idx + 1}`
                      : item.bundle?.title || `Bundle ${idx + 1}`;

                  return (
                    <article
                      key={`${item.itemType}-${item.id}-${idx}`}
                      className="app-entityCard"
                    >
                      <div className="app-entityMedia">
                        {img ? (
                          <img src={img} alt={title} className="app-entityThumb" />
                        ) : (
                          <div className="app-entityThumbFallback">
                            {initials(title).slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="app-entityBody">
                        <div className="app-entityTitle">{title}</div>
                        <div className="app-entityMeta">{scopeItemSummary(item, idx)}</div>
                      </div>

                      <div className="app-entityTag">
                        {item.itemType === "PRODUCT" ? "Product" : "Bundle"}
                      </div>
                    </article>
                  );
                })}
              </div>
            </Section>
          )}

          {!!offer.tiers?.length && (
            <Section
              title="Discount tiers"
              subtitle="Discount slabs based on purchase value."
            >
              <div className="ofd-tierGrid">
                {offer.tiers.map((tier: any, idx: number, arr: any[]) => (
                  <article key={idx} className="ofd-tierTile">
                    <div className="ofd-tierRange">{renderTierRangeLabel(tier, idx, arr)}</div>
                    <div className="ofd-tierBenefit">{renderTierBenefitLabel(tier)}</div>
                    <div className="ofd-tierFoot">
                      {tier.maxDiscountAmount != null
                        ? `Max discount ₹${tier.maxDiscountAmount}`
                        : " "}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          )}

          {!!offer.grants?.length && (
            <Section
              title="Selectable offers"
              subtitle="Items that can be granted through this offer."
            >
              <div className="app-statGrid app-statGrid--compact">
                {offer.grantPickLimit != null && (
                  <StatCard label="Pick limit" value={safeText(offer.grantPickLimit)} />
                )}

                {!!offer.grantDiscountType && (
                  <StatCard label="Discount type" value={safeText(offer.grantDiscountType)} />
                )}

                {offer.grantDiscountValue != null && (
                  <StatCard
                    label="Discount value"
                    value={safeText(offer.grantDiscountValue)}
                  />
                )}
              </div>

              <div className="app-entityList app-entityList--topGap">
                {offer.grants.map((g, idx) => {
                  const img =
                    g.itemType === "PRODUCT"
                      ? g.product?.primaryImageUrl
                      : g.bundle?.primaryImageUrl;

                  const title =
                    g.itemType === "PRODUCT"
                      ? g.product?.name || `Product grant ${idx + 1}`
                      : g.bundle?.title || `Bundle grant ${idx + 1}`;

                  return (
                    <article key={idx} className="app-entityCard">
                      <div className="app-entityMedia">
                        {img ? (
                          <img src={img} alt={title} className="app-entityThumb" />
                        ) : (
                          <div className="app-entityThumbFallback">
                            {initials(title).slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="app-entityBody">
                        <div className="app-entityTitle">{title}</div>
                        <div className="app-entityMeta">{grantSummary(g, idx)}</div>
                      </div>

                      <div className="app-entityTag">
                        {g.itemType === "PRODUCT" ? "Product" : "Bundle"}
                      </div>
                    </article>
                  );
                })}
              </div>
            </Section>
          )}

          {offer.purchasableWithPoints && (
            <Section
              title="Points purchase"
              subtitle="This offer can also be redeemed using points."
            >
              <div className="app-statGrid">
                <StatCard label="Purchasable with points" value="Yes" />
                {offer.pointsPrice != null && (
                  <StatCard label="Points price" value={safeText(offer.pointsPrice)} />
                )}
                {offer.maxPurchasesPerUser != null && (
                  <StatCard
                    label="Max purchases per user"
                    value={safeText(offer.maxPurchasesPerUser)}
                  />
                )}
              </div>
            </Section>
          )}

          {hasExtras && (
            <Section
              title="Additional details"
              subtitle="Special terms and supporting imagery."
              actions={
                sortedImages.length ? (
                  <button
                    className="btn"
                    onClick={() => {
                      setLightboxStartIndex(0);
                      setLightboxOpen(true);
                    }}
                  >
                    Open gallery
                  </button>
                ) : undefined
              }
            >
              {!!offer.specialTerms && (
                <div className="ofd-textPanel">
                  <div className="ofd-textPanelLabel">Special terms</div>
                  <div className="ofd-textPanelBody">{offer.specialTerms}</div>
                </div>
              )}

              {!!sortedImages.length && (
                <div className="ofd-galleryShell">
                  {galleryLead ? (
                    <button
                      type="button"
                      className="ofd-galleryLead"
                      onClick={() => {
                        setLightboxStartIndex(0);
                        setLightboxOpen(true);
                      }}
                    >
                      <img
                        src={galleryLead.url}
                        alt={galleryLead.name ?? "Primary offer image"}
                      />
                      <div className="ofd-galleryBadge">
                        {galleryLead.isPrimary ? "Primary image" : "Image 1"}
                      </div>
                    </button>
                  ) : null}

                  <div className="ofd-galleryGrid">
                    {galleryRest.map((img: any, idx: number) => {
                      const actualIndex = idx + 1;
                      return (
                        <button
                          key={`${img.url}-${actualIndex}`}
                          type="button"
                          className="ofd-galleryTile"
                          onClick={() => {
                            setLightboxStartIndex(actualIndex);
                            setLightboxOpen(true);
                          }}
                        >
                          <img src={img.url} alt={img.name ?? `Offer image ${actualIndex + 1}`} />
                          <div className="ofd-galleryBadge">
                            {img.isPrimary ? "Primary image" : `Image ${actualIndex + 1}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        items={lightboxItems}
        startIndex={lightboxStartIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default OfferTemplateDetailsPage;