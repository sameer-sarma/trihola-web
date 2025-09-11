export type AssignmentTargetType = "REFERRAL" | "REFERRAL_CAMPAIGN" | "USER";
export type OfferAppliesToType = "ANY_PURCHASE" | "PRODUCT" | "BUNDLE";
export type RecipientRole = "REFERRER" | "PROSPECT"; // (we don't assign to BUSINESS via UI)
export type OfferTypeEnum =
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_DISCOUNT"
  | "GRANT";
  
export type ValidityTrigger = "ON_ACCEPTANCE" | "ON_ASSIGNMENT"| "ON_CLAIM_OF_LINKED_OFFER"; // adjust as per backend enum
export type ValidityType = "RELATIVE" | "ABSOLUTE"; // adjust as per backend enum

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

export interface AssignOfferRequest {
  offerTemplateId: string;
  targetType: AssignmentTargetType;

  // required for REFERRAL / REFERRAL_CAMPAIGN
  recipientRole?: RecipientRole;

  // one of these depending on targetType
  referralId?: string;
  referralCampaignId?: string;
  targetUserId?: string;

  // optional niceties
  notes?: string;

  // optional retarget/update a specific assignment
  assignedOfferId?: string;
}

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

export interface OfferDetailsDTO {
  assignedOfferId: string;
  referralId?: string | null;
  offerTemplateId: string;
  recipientRole?: string | null;
  status: string;

  activatedAt?: string | null;
  claimedAt?: string | null;
  notes?: string | null;

  validFrom?: string | null;
  validUntil?: string | null;

  // Headline
  offerTitle: string;
  description: string;

  // Type / claim
  offerType: OfferTypeEnum | string; // keep broad if enums vary
  claimPolicy: ClaimPolicy | string;

  // Discounts
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  discountAmount?: number | null;

  // Validity (summary)
  trigger?: ValidityTrigger | string | null;
  validityType?: ValidityType | null;
  durationDays?: number | null;

  // Business / navigation
  businessSlug?: string | null;

  // Scope / Applies
  appliesToType?: OfferAppliesToType | null;
  appliesProduct?: ProductMini | null;
  appliesBundle?: BundleMini | null;
  minPurchaseAmount?: number | null;

  // Grants
  grants: GrantItemSnapshot[];

  // Redemptions
  redemptionsUsed?: number | null;
  effectiveMaxRedemptions?: number | null;
  redemptionsLeft?: number | null;

  // Target (generic)
  targetType?: AssignmentTargetType | null;
  targetUserId?: string | null;
  referralCampaignId?: string | null;

  // Claim UX
  secureToken: string;
  canClaim: boolean;
  canApproveClaim: boolean;

  assignedByName?: string | null;
  assignedToName?: string | null;
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
  grants: GrantItemSnapshot[];
}

