export type OfferTypeEnum = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_PRODUCT" | "FREE_SERVICE";
export type ValidityType = "ABSOLUTE" | "RELATIVE";
export type ValidityTrigger = "ON_ELIGIBLE" | "ON_CLAIM";

export interface OfferTemplateRequest {
  businessId: string;
  offerTemplateId?: string;
  templateTitle: string;
  description: string;
  imageUrls?: string[];
  specialTerms?: string;
  maxClaims?: number;
  eligibility?: string;
  offerType: OfferTypeEnum;
  minPurchaseAmount?: number;
  discountPercentage?: number;
  maxDiscountAmount?: number;
  discountAmount?: number;
  productName?: string;
  serviceName?: string;
  validityType: ValidityType;
  validFrom?: string;
  validTo?: string;
  durationDays?: number;
  trigger?: ValidityTrigger;
  isActive: boolean;
}

export interface OfferTemplateResponse extends OfferTemplateRequest {
  offerTemplateId: string; // required in response
}
