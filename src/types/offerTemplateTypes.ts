// src/types/offerTemplateTypes.ts

/* =========================
 * UI-only selection
 * ========================= */
export type UiOfferKind = "PERCENTAGE" | "ABSOLUTE" | "GRANTS";

/* =========================
 * Domain enums
 * ========================= */
export type OfferTypeEnum = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";

export type OfferScopeKind = "ANY" | "LIST";

export type ClaimPolicy = "BOTH" | "ONLINE" | "MANUAL";

export type ActivationCondition =
  | "ON_ASSIGNMENT"
  | "ON_ACCEPTANCE"
  | "ON_CLAIM_OF_LINKED_OFFER";

/* =========================
 * Tiers (subtotal-based)
 * ========================= */
export type DiscountTierSpec = {
  minAmount: number;
  minQty?: number | null;

  // exactly one of the two:
  discountAmount?: number | null;
  discountPercentage?: number | null;

  // used only with percentage
  maxDiscountAmount?: number | null;
};

/* =========================
 * Grants (list of items)
 * ========================= */
export type GrantDiscountType =
  | "FREE"
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "FIXED_PRICE";

export interface ProductMini {
  id: string;
  slug: string;
  businessSlug?: string | null;
  name: string;
  primaryImageUrl?: string | null;
}

export interface BundleMini {
  id: string;
  slug: string;
  businessSlug?: string | null;
  title: string;
  primaryImageUrl?: string | null;
}

export interface GrantItemSnapshot {
  itemType: "PRODUCT" | "BUNDLE";
  quantity?: number | null;
  product?: ProductMini | null;
  bundle?: BundleMini | null;
}

/* =========================
 * Search picker items
 * ========================= */
export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  payload?: unknown;
}


/* =========================
 * Offer Template models
 * ========================= */
export interface OfferTemplateRequest {
  // identity
  businessId: string;
  /** Present when editing (used by upsert). */
  offerTemplateId?: string;

  // headline
  templateTitle: string;
  description?: string | null;
  imageUrls?: string[];

  // status & policies
  isActive?: boolean;
  specialTerms?: string | null;
  eligibility?: string | null;
  claimPolicy?: ClaimPolicy;
  maxRedemptions?: number | null;

  // validity (client-friendly; server builds validity_json)
  validityType: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | null; // yyyy-mm-dd when ABSOLUTE
  validTo?: string | null;   // yyyy-mm-dd when ABSOLUTE
  durationDays?: number | null; // when RELATIVE
  trigger?: ActivationCondition | null; // when RELATIVE

  // floors
  minPurchaseAmount?: number | null;

  // scope (new-only)
  scopeKind: OfferScopeKind;
  appliesProductIds?: string[]; // when LIST
  appliesBundleIds?: string[];  // when LIST

  // discount vs. grants
  offerType?: OfferTypeEnum; // server canonical; UI sets via UiOfferKind

  // flat discount fields (non-tiered)
  discountPercentage?: number | null; // when PERCENTAGE
  maxDiscountAmount?: number | null;  // optional cap for PERCENTAGE
  discountAmount?: number | null;     // when FIXED

  // tiers (when present, override flat fields)
  tiers?: DiscountTierSpec[];

  // grants (for GRANT offers)
  grants?: OfferGrantLine[];  
  grantPickLimit?: number; // default 1 on server
  grantDiscountType?: GrantDiscountType | null; // default FREE
  grantDiscountValue?: number | null;           // only when type ≠ FREE
}

export interface OfferTemplateResponse extends OfferTemplateRequest {
  offerTemplateId: string;
  createdAt?: string;
  updatedAt?: string;

  // optional server-provided slugs/navigation
  businessSlug?: string | null;
}

export interface OfferGrantLine {
  itemType: "PRODUCT" | "BUNDLE";
  productId?: string;
  bundleId?: string;
  quantity?: number | null;
}

export type ServerDiscountTier = {
  minAmount?: number | null;   // at least one of minAmount/minQty
  minQty?: number | null;
  discountPercentage?: number | null; // XOR with discountAmount
  discountAmount?: number | null;     // XOR with discountPercentage
  maxDiscountAmount?: number | null;  // only for percentage tiers
};

// A friendlier UI row
export type UiTierRow = {
  id: string; // local key
  thresholdKind: 'AMOUNT' | 'QTY' | 'BOTH';
  minAmount?: number | null;
  minQty?: number | null;

  // choose between absolute ₹ or %
  discountKind: 'FIXED' | 'PERCENT';
  value: number | null;          // meaning depends on discountKind
  maxCap?: number | null;        // only for PERCENT
};