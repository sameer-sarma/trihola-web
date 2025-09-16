import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchOfferTemplateById } from "../services/offerTemplateService";
import type { OfferTemplateResponse } from "../types/offerTemplateTypes";
import { getProductById } from "../api/productapi";
import { getBundleById } from "../api/bundleapi";
import OfferCard from "../components/OfferCard";
import OfferAppliesTo from "../components/OfferAppliesTo";
import OfferTiersSection from "../components/OfferTiersSection";
import OfferGrantsSection from "../components/OfferGrantsSection";
import OfferDetailsSection from "../components/OfferDetailsSection";
import "../css/ui-forms.css";
import "../css/cards.css";

type AnyMap = Record<string, any>;

interface Props {
  token: string;
}

/** Map OfferTemplateResponse -> minimal "offer-like" object for shared components */
/** Map OfferTemplateResponse -> minimal "offer-like" object for shared components */
const templateToOfferView = (t: any) => {
  const scopeItems = (t.scopeItems ?? [])
    .map((si: any) => {
      if (si.itemType === "PRODUCT" && si.product) {
        const p = si.product;
        return {
          itemType: "PRODUCT",
          product: {
            id: p.id,
            slug: p.slug,
            businessSlug: p.businessSlug ?? undefined,
            name: p.name ?? p.title,
            primaryImageUrl: p.primaryImageUrl ?? p.imageUrl ?? p.thumbnailUrl ?? undefined,
          },
        };
      }
      if (si.itemType === "BUNDLE" && si.bundle) {
        const b = si.bundle;
        return {
          itemType: "BUNDLE",
          bundle: {
            id: b.id,
            slug: b.slug,
            businessSlug: b.businessSlug ?? undefined,
            name: b.name ?? b.title,
            primaryImageUrl: b.primaryImageUrl ?? b.imageUrl ?? b.thumbnailUrl ?? undefined,
          },
        };
      }
      return null;
    })
    .filter(Boolean);

  const hasTiers = Array.isArray(t.tiers) && t.tiers.length > 0;

  return {
    // headline + copy
    offerTitle: t.templateTitle,
    description: t.description,

    // type & claim policy
    offerType: t.offerType,
    claimPolicy: t.claimPolicy,

    // validity
    validityType: t.validityType,
    validFrom: t.validityType === "ABSOLUTE" ? t.validFrom : undefined,
    validUntil: t.validityType === "ABSOLUTE" ? t.validTo : undefined,
    durationDays: t.validityType === "RELATIVE" ? t.durationDays : undefined,
    trigger:      t.validityType === "RELATIVE" ? t.trigger      : undefined,

    // status / redemptions (templates don’t track usage)
    status: t.isActive ? "ACTIVE" : "INACTIVE",
    redemptionsUsed: 0,
    effectiveMaxRedemptions: t.maxRedemptions ?? undefined,
    redemptionsLeft: t.maxRedemptions ?? undefined,

    // purchase + base discount
    minPurchaseAmount: typeof t.minPurchaseAmount === "number" ? t.minPurchaseAmount : undefined,
    ...( !hasTiers && typeof t.discountPercentage === "number" ? { discountPercentage: t.discountPercentage } : {}),
    ...( !hasTiers && typeof t.discountAmount     === "number" ? { discountAmount:     t.discountAmount     } : {}),
    ...( !hasTiers && typeof t.maxDiscountAmount  === "number" ? { maxDiscountAmount:  t.maxDiscountAmount  } : {}),

    // scope & tiers
    businessSlug: t.businessSlug ?? undefined,
    scopeKind: t.scopeKind === "ANY" ? "ANY_PURCHASE" : "LIST",
    scopeItems,
    tiers: t.tiers ?? [],
  };
};

const OfferTemplateDetails: React.FC<Props> = ({ token }) => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<OfferTemplateResponse | null>(null);
  // Used to hydrate Grants (template grants are ID-based)
  const [productsMap, setProductsMap] = useState<AnyMap>({});
  const [bundlesMap, setBundlesMap] = useState<AnyMap>({});

  // Load template
  useEffect(() => {
    if (!templateId || !token) return;
    fetchOfferTemplateById(templateId, token)
      .then(setTemplate)
      .catch(() => console.error("Failed to load offer template details"));
  }, [templateId, token]);

  // Hydrate Grants with names/images from IDs
  useEffect(() => {
    let closed = false;
    if (!template) return;

    (async () => {
      const pIds = new Set<string>();
      const bIds = new Set<string>();

      for (const g of template.grants ?? []) {
        if (g.itemType === "PRODUCT" && g.productId) pIds.add(g.productId);
        if (g.itemType === "BUNDLE" && g.bundleId) bIds.add(g.bundleId);
      }

      const [pEntries, bEntries] = await Promise.all([
        Promise.all(
          [...pIds].map(async (id) => {
            try {
              return [id, await getProductById(id)] as const;
            } catch {
              return [id, null] as const;
            }
          })
        ),
        Promise.all(
          [...bIds].map(async (id) => {
            try {
              return [id, await getBundleById(id)] as const;
            } catch {
              return [id, null] as const;
            }
          })
        ),
      ]);

      if (!closed) {
        setProductsMap(Object.fromEntries(pEntries));
        setBundlesMap(Object.fromEntries(bEntries));
      }
    })();

    return () => {
      closed = true;
    };
  }, [template]);

  if (!template) {
    return (
      <div className="page-wrap">
        <div className="card">
          <p className="help">Loading…</p>
        </div>
      </div>
    );
  }

  const offerView = templateToOfferView(template);

  return (
    <div className="page-wrap">
      {/* Header / summary (flat, actions hidden for templates) */}
      <OfferCard offer={offerView as any} appearance="flat" showActions={false}  mode="template"/>

      {/* Offer Details section */}
      <OfferDetailsSection title="Details" text={(offerView as any).description} />

      {/* Applicability from scopeItems */}
      <OfferAppliesTo offer={offerView as any} />

      {/* Tiers (if present) */}
      <OfferTiersSection offer={offerView as any} />

      {/* Grants (templates use ID-based grants) */}
      <OfferGrantsSection
        grants={(template.grants ?? []).map(g => ({
          ...g,
          // normalize quantity to satisfy GrantInput (no nulls)
          quantity: g.quantity ?? undefined,
        }))}
        productById={productsMap}
        bundleById={bundlesMap}
        pickLimit={template.grantPickLimit ?? 1}
        discountType={template.grantDiscountType ?? "FREE"}
        discountValue={template.grantDiscountValue}
      />

      {/* Actions */}
      <div className="actions" style={{ marginTop: 12 }}>
        <button
          onClick={() => navigate(`/offer-template/${template.offerTemplateId}/edit`)}
          className="btn btn--primary"
        >
          Edit Template
        </button>
        <button className="btn btn--ghost" onClick={() => navigate("/offer-templates")}>
          Back
        </button>
      </div>
    </div>
  );
};

export default OfferTemplateDetails;
