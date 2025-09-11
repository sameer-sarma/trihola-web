// Server-offer types (kept as-is)
export type OfferType = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT"| "GRANT";

// UI selector (mutually exclusive)
export type UiOfferKind = "PERCENTAGE" | "ABSOLUTE" | "GRANTS";

// Applicability/scope
export type OfferAppliesToType = "ANY_PURCHASE" | "PRODUCT" | "BUNDLE";

// Grants (free items)
export interface OfferGrantLine {
  itemType: "PRODUCT" | "BUNDLE";
  productId?: string;
  bundleId?: string;
  quantity?: number; // default 1
}

// Main request used by upsertOfferTemplate
export interface OfferTemplateRequest {
  businessId: string;
  offerTemplateId?: string | null;

  // If UI kind is GRANTS, omit offerType & discount fields
  offerType?: OfferType;
  discountPercentage?: number;
  maxDiscountAmount?: number;
  discountAmount?: number;
  minPurchaseAmount?: number;
  templateTitle: string;
  description?: string;
  imageUrls?: string[];
  specialTerms?: string;
  maxRedemptions?: number;
  eligibility?: string;

  validityType: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | null;
  validTo?: string | null;
  durationDays?: number;
  trigger?: "ON_ASSIGNMENT" | "ON_ACCEPTANCE" | "ON_CLAIM_OF_LINKED_OFFER";

  isActive?: boolean;
  claimPolicy?: "BOTH" | "ONLINE" | "MANUAL";

  appliesToType?: OfferAppliesToType;
  appliesProductId?: string | null;
  appliesBundleId?: string | null;

  grants?: OfferGrantLine[];
}

// If you need it elsewhere
export interface OfferTemplateResponse extends OfferTemplateRequest {
  offerTemplateId: string;
}

export type PickerItem = {
  id: string;
  title: string;        // display name
  subtitle?: string;    // optional extra
  imageUrl?: string | null;
};