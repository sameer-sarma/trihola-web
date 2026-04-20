// src/utils/offerWhatYouGet.ts

const fmtINR = (n?: number | null) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

/** Human-readable scope phrase based on scopeKind + scopeItems */
const scopePhrase = (offer: any) => {
  const kind = offer.scopeKind ?? offer.appliesToType ?? "ANY_PURCHASE";
  if (kind === "ANY_PURCHASE") return "any purchase";

  const items = Array.isArray(offer.scopeItems) ? offer.scopeItems : [];
  const p = items.filter((i: any) => i?.itemType === "PRODUCT").length;
  const b = items.filter((i: any) => i?.itemType === "BUNDLE").length;
  if (p === 0 && b === 0) return "selected items";
  if (p > 0 && b > 0) return "selected products or bundles";
  if (p > 0) return p === 1 ? "a specific product" : "specific products";
  return b === 1 ? "a specific bundle" : "specific bundles";
};

/** Tiers helpers */
const hasTiers = (offer: any) => Array.isArray(offer.tiers) && offer.tiers.length > 0;
const tiersType = (offer: any) => {
  const tiers = Array.isArray(offer.tiers) ? offer.tiers : [];
  const anyPct = tiers.some((t: any) => typeof t?.discountPercentage === "number");
  const anyAmt = tiers.some((t: any) => typeof t?.discountAmount === "number");
  if (anyPct && !anyAmt) return "percentage";
  if (!anyPct && anyAmt) return "absolute";
  return "mixed";
};

/** Grants sentence */
const grantsSentence = (offer: any, scope: string) => {
  const typ = (offer.grantDiscountType ?? "FREE").toUpperCase();
  const picks = offer.grantPickLimit ?? 1;

  const counts = (offer.grants ?? []).reduce(
    (acc: any, g: any) => {
      const qty = g?.quantity ?? 1;
      if (g?.itemType === "PRODUCT") acc.products += qty;
      else if (g?.itemType === "BUNDLE") acc.bundles += qty;
      return acc;
    },
    { products: 0, bundles: 0 }
  );
  const total = counts.products + counts.bundles || picks;

  let grantText = "free item";
  if (typ === "FREE") {
    if (counts.products && !counts.bundles)
      grantText = `${total} free product${total > 1 ? "s" : ""}`;
    else if (counts.bundles && !counts.products)
      grantText = `${total} free bundle${total > 1 ? "s" : ""}`;
    else grantText = `${total} free item${total > 1 ? "s" : ""}`;
  } else if (typ === "PERCENTAGE") {
    grantText = `${offer.grantDiscountValue ?? 0}% off selected items`;
  } else if (typ === "FIXED_AMOUNT") {
    grantText = `${fmtINR(offer.grantDiscountValue ?? 0)} off selected items`;
  } else if (typ === "FIXED_PRICE") {
    grantText = `fixed price ${fmtINR(offer.grantDiscountValue ?? 0)} on selected items`;
  }

  const minClause =
    typeof offer.minPurchaseAmount === "number"
      ? ` subject to minimum purchase of ${fmtINR(offer.minPurchaseAmount)}`
      : "";

  return `Grants (${grantText}) on purchase of ${scope}${minClause}.`;
};

/** Public: build the “What you get” sentence */
export const whatYouGetSentence = (offer: any): string => {
  const scope = scopePhrase(offer);

  // Tiers first
  if (hasTiers(offer)) {
    const tt = tiersType(offer);
    const label =
      tt === "percentage"
        ? "Tiered percentage discount"
        : tt === "absolute"
        ? "Tiered absolute discount"
        : "Tiered discount";
    return `${label} for purchase of ${scope}.`;
  }

  // Grants
  if (offer.offerType === "GRANT" || (offer.grants && offer.grants.length > 0)) {
    return grantsSentence(offer, scope);
  }

  // Base (non-tiered) discounts
  const minClause =
    typeof offer.minPurchaseAmount === "number"
      ? ` subject to minimum purchase of ${fmtINR(offer.minPurchaseAmount)}`
      : "";

  if (typeof offer.discountPercentage === "number") {
    const cap =
      typeof offer.maxDiscountAmount === "number" && offer.maxDiscountAmount > 0
        ? ` up to a maximum of ${fmtINR(offer.maxDiscountAmount)}`
        : "";
    return `Percentage discount of ${offer.discountPercentage}%${cap} on ${scope}${minClause}.`;
  }

  if (typeof offer.discountAmount === "number") {
    return `Absolute discount of ${fmtINR(offer.discountAmount)} on purchase of ${scope}${minClause}.`;
  }

  // Fallback
  return offer.description ?? "—";
};
