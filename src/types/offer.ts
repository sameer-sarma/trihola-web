export interface OfferTemplateDTO {
  businessId: string;
  offerTemplateId: string;

  // Metadata
  templateTitle: string;
  description: string;
  imageUrls?: string[];
  specialTerms?: string;
  maxClaims?: number;
  eligibility?: string;

  // Offer Type
  offerType: OfferTypeEnum;
  minPurchaseAmount?: number;

  // For PERCENTAGE_DISCOUNT
  discountPercentage?: number;
  maxDiscountAmount?: number;

  // For FIXED_DISCOUNT
  discountAmount?: number;

  // For FREE_PRODUCT
  productName?: string;

  // For FREE_SERVICE
  serviceName?: string;

  // Validity
  validityType: "RELATIVE" | "ABSOLUTE";
  validFrom?: string; // ISO format
  validTo?: string;
  durationDays?: number;
  trigger?: ValidityTrigger;

  isActive: boolean;
}


export type OfferTypeEnum =
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_DISCOUNT"
  | "FREE_PRODUCT"
  | "FREE_SERVICE";

export type ValidityTrigger = "ON_ELIGIBLE" | "ON_ASSIGN"; // adjust as per backend enum

export interface OfferDetailsDTO {
  assignedOfferId: string;
  referralId: string;
  offerTemplateId: string;
  recipientRole: "REFERRER" | "PROSPECT";
  status: string;
  offerTitle: string;
  description: string;
  offerType: string;
  claimPolicy: "ONLINE" | "MANUAL" | "BOTH";
  discountPercentage?: number;
  maxDiscountAmount?: number;
  discountAmount?: number;
  productName?: string;
  serviceName?: string;
  trigger?: string;
  validFrom?: string;
  validUntil?: string;
  assignedToName?: string;
  assignedByName?: string;
  token?: string;
  canClaim: boolean;
  canApproveClaim: boolean;
}

export interface ClaimRequestDTO {
  redemptionType: string;
  redemptionValue?: string;
  note?: string;
  expiresInMinutes?: number;
}

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type ClaimSource = 'MANUAL' | 'ONLINE';
export type ClaimPolicy = 'ONLINE' | 'MANUAL' | 'BOTH';

export interface OfferClaimDTO {
  id: string;
  assignedOfferId: string;
  claimantId: string;
  claimSource: ClaimSource;     // NEW
  status: ClaimStatus;
  discountCode?: string | null;
  claimedAt: string;
  expiresAt: string;
  redeemedAt?: string | null;
  approvedBy?: string | null;
  redemptionType: string;
  redemptionValue?: string | null;
  note?: string | null;
  platform?: string | null;
  domain?: string | null;
  email?: string | null;
  checkoutId?: string | null;
  orderId?: string | null;
  amountApplied?: string | null;
}

