import type { AttachmentKind } from "./threads";

export type OfferImage = {
  url: string;
  name: string;
  mime: string;
  sizeBytes?: number | null;
  kind?: AttachmentKind | null;
  path?: string | null;
  isPrimary?: boolean | null;
};

/* =========================
 * API envelope models
 * ========================= */

export type ApiWarning = {
  code: string;
  message: string;
};

export type FieldError = {
  field: string;
  message: string;
};

export type ErrorDetail = {
  code: string;
  message: string;
  fieldErrors?: FieldError[] | null;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  warnings?: ApiWarning[];
};

export type ApiError = {
  success: false;
  error: ErrorDetail;
};

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
  minAmount?: number | null;
  minQty?: number | null;

  discountAmount?: number | null;
  discountPercentage?: number | null;

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
  sku?: string | null;
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
export type ScopeItemProductRef = {
  id: string;
  slug?: string;
  businessSlug?: string;
  name?: string;
  primaryImageUrl?: string | null;
  sku?: string | null;
};

export type ScopeItemBundleRef = {
  id: string;
  slug?: string;
  businessSlug?: string;
  title?: string;
  primaryImageUrl?: string | null;
};

export type ScopeItem =
  | { itemType: "PRODUCT"; product: ScopeItemProductRef }
  | { itemType: "BUNDLE"; bundle: ScopeItemBundleRef };

export type OfferTierReq = {
  minAmount: number;
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
};

export type CatalogItemType = "PRODUCT" | "BUNDLE";

export type ScopeItemSpec = { itemType: CatalogItemType; id: string };
export type OfferScopeSpec = { kind: "ANY" | "LIST"; items: ScopeItemSpec[] };

export interface OfferGrantLine {
  itemType: "PRODUCT" | "BUNDLE";
  productId?: string;
  product?: ProductMini | null;
  bundleId?: string;
  bundle?: BundleMini | null;
  quantity?: number | null;
}

/* Request sent to backend */
export type OfferTemplateRequest = {
  /** Present when editing */
  offerTemplateId?: string | null;

  templateTitle: string;
  description?: string | null;
  images?: OfferImage[] | null;

  isActive?: boolean;
  specialTerms?: string | null;
  eligibility?: string | null;
  claimPolicy?: ClaimPolicy;
  maxRedemptions?: number | null;

  purchasableWithPoints?: boolean;
  pointsPrice?: number | null;
  maxPurchasesPerUser?: number | null;

  validityType: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | null;
  validTo?: string | null;
  durationDays?: number | null;
  trigger?: ActivationCondition | null;

  minPurchaseAmount?: number | null;
  minPurchaseQty?: number | null;

  offerType?: OfferTypeEnum;

  scope: OfferScopeSpec;

  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  discountAmount?: number | null;

  grants?: OfferGrantLine[];
  grantPickLimit?: number | null;
  grantDiscountType?: GrantDiscountType | null;
  grantDiscountValue?: number | null;

  tiers?: DiscountTierSpec[];
};

export interface OfferTemplateResponse {
  offerTemplateId: string;
  createdAt?: string;
  updatedAt?: string;

  businessSlug?: string | null;
  businessId: string;

  templateTitle: string;
  description?: string | null;
  images?: OfferImage[];
  primaryImageUrl?: string | null;

  isActive?: boolean;
  specialTerms?: string | null;
  eligibility?: string | null;
  claimPolicy?: ClaimPolicy;
  maxRedemptions?: number | null;

  purchasableWithPoints?: boolean;
  pointsPrice?: number | null;
  maxPurchasesPerUser?: number | null;

  validityType: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | null;
  validTo?: string | null;
  durationDays?: number | null;
  trigger?: ActivationCondition | null;

  minPurchaseAmount?: number | null;
  minPurchaseQty?: number | null;

  offerType?: OfferTypeEnum;

  scopeKind: "ANY" | "LIST";
  scopeItems?: ScopeItem[];

  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  discountAmount?: number | null;

  grants?: OfferGrantLine[];
  grantPickLimit?: number | null;
  grantDiscountType?: GrantDiscountType | null;
  grantDiscountValue?: number | null;

  tiers?: DiscountTierSpec[];
}

/* UI form model */
export type OfferTemplateForm = {
  businessId: string;
  offerTemplateId?: string;

  templateTitle: string;
  description?: string | null;
  images?: OfferImage[];
  primaryImageUrl?: string | null;

  isActive?: boolean;
  specialTerms?: string | null;
  eligibility?: string | null;
  claimPolicy?: ClaimPolicy;
  maxRedemptions?: number | null;

  purchasableWithPoints?: boolean;
  pointsPrice?: number | null;
  maxPurchasesPerUser?: number | null;

  validityType: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | null;
  validTo?: string | null;
  durationDays?: number | null;
  trigger?: ActivationCondition | null;

  minPurchaseAmount?: number | null;
  minPurchaseQty?: number | null;

  offerType?: OfferTypeEnum;

  scopeKind: "ANY" | "LIST";
  scopeItems?: ScopeItem[];

  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  discountAmount?: number | null;

  grants?: OfferGrantLine[];
  grantPickLimit?: number | null;
  grantDiscountType?: GrantDiscountType | null;
  grantDiscountValue?: number | null;

  tiers?: DiscountTierSpec[];
};

export type ServerDiscountTier = {
  minAmount?: number | null;
  minQty?: number | null;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  maxDiscountAmount?: number | null;
};

export type UiTierRow = {
  id: string;
  thresholdKind: "AMOUNT" | "QTY" | "BOTH";
  minAmount?: number | null;
  minQty?: number | null;
  discountKind: "FIXED" | "PERCENT";
  value: number | null;
  maxCap?: number | null;
};