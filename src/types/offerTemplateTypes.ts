// /src/types/offerTemplateTypes.ts

export type OfferTypeEnum = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_PRODUCT" | "FREE_SERVICE";
export type ValidityType = "ABSOLUTE" | "RELATIVE";
export type ActivationCondition = "ON_ASSIGNMENT" | "ON_ACCEPTANCE" | "ON_CLAIM_OF_LINKED_OFFER";

// Keep enum names exactly as Ktor uses them:
export type ClaimPolicy = "BOTH" | "ONLINE" | "MANUAL";

export interface OfferTemplateRequest {
  businessId: string;
  offerTemplateId?: string;

  // Metadata
  templateTitle: string;
  description: string;
  imageUrls?: string[] | null;
  specialTerms?: string | null;
  maxRedemptions?: number | null;
  eligibility?: string | null;

  // Offer Type
  offerType: OfferTypeEnum;
  minPurchaseAmount?: number | null;

  // % Discount
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;

  // Fixed Discount
  discountAmount?: number | null;

  // Free Product / Service
  productName?: string | null;
  serviceName?: string | null;

  // Validity
  validityType: ValidityType;
  validFrom?: string | null;
  validTo?: string | null;
  durationDays?: number | null;
  trigger?: ActivationCondition | null;

  isActive: boolean;
  claimPolicy?: ClaimPolicy | null; // default BOTH if omitted
}

export interface OfferTemplateResponse extends Omit<OfferTemplateRequest, "businessId"> {
  businessId: string;
  offerTemplateId: string;
  createdAt?: string;
  updatedAt?: string;
}
