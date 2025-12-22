export type AssignmentTargetType = "REFERRAL" | "REFERRAL_CAMPAIGN" | "USER";
export type OfferAppliesToType = "ANY_PURCHASE" | "PRODUCT" | "BUNDLE";
export type RecipientRole = "REFERRER" | "PROSPECT"; // (we don't assign to BUSINESS via UI)
export type OfferTypeEnum =
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_DISCOUNT"
  | "GRANT";
  
export type ValidityTrigger = "ON_ACCEPTANCE" | "ON_ASSIGNMENT"| "ON_CLAIM_OF_LINKED_OFFER";
export type ValidityType = "RELATIVE" | "ABSOLUTE";
export type AssignedVia = "USER_WP_PURCHASED" | "BUSINESS_ASSIGNED" | "REFERRAL" | "CAMPAIGN" | "NO_LONGER_ASSIGNED";

export interface ProductMini {
  id: string;
  slug?: string | null;
  businessSlug?: string | null;
  name?: string | null;
  primaryImageUrl?: string | null;
  sku?: string | null;
}

export interface BundleMini {
  id: string;
  slug?: string| null;
  businessSlug?: string | null;
  title?: string | null;
  primaryImageUrl?: string | null;
  items?: BundleItemMini[];
}

export interface BundleItemMini{
    product: ProductMini;
    quantity: number;
}

export interface GrantItemSnapshot {
  itemType: "PRODUCT" | "BUNDLE";
  quantity?: number | null;
  product?: ProductMini | null;
  bundle?: BundleMini | null;
}

export interface ScopeItemSnapshot {
  itemType: "PRODUCT" | "BUNDLE";
  product?: ProductMini | null;
  bundle?: BundleMini | null;
}

export type GrantLine =
  | { itemType: "PRODUCT"; productId: string; quantity?: number }
  | { itemType: "BUNDLE";  bundleId:  string; quantity?: number };

export type OfferTierRow = {
  minAmount: number;                // e.g., 0, 5000, 10000
  discountAmount?: number;          // fixed ₹ off (present for fixed tiers)
  discountPercentage?: number;      // % off (present for percentage tiers)
  maxDiscountAmount?: number;       // cap for % tiers (0 or undefined means no cap per your API)
};


export interface AssignOfferRequest {
  offerTemplateId: string;
  targetType: AssignmentTargetType;
  assignedVia: AssignedVia;

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
  offerType?: OfferTypeEnum;
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

  // Tiers
  tiers?: OfferTierRow[];      

  // Validity (summary)
  trigger?: ValidityTrigger | string | null;
  validityType?: ValidityType | null;
  durationDays?: number | null;

  // Business / navigation
  businessSlug?: string | null;
  businessName?: string | null;
  businessProfileSlug?: string | null;
  referralSlug?: string | null;
  
  // Scope / Applies
  appliesToType?: OfferAppliesToType | null;
  appliesProduct?: ProductMini | null;
  appliesBundle?: BundleMini | null;
  minPurchaseAmount?: number | null;

  // Grants
  grants: GrantItemSnapshot[];
  grantPickLimit?: number | null;
  grantDiscountType?: GrantDiscountType | null;
  grantDiscountValue?: number | null;

  // Redemptions
  redemptionsUsed?: number | null;
  effectiveMaxRedemptions?: number | null;
  redemptionsLeft?: number | null;

  // Target (generic)
  targetType?: AssignmentTargetType | null;
  assignedVia: AssignedVia;
  targetUserId?: string | null;
  referralCampaignId?: string | null;

  // Claim UX
  secureToken: string;
  canClaim: boolean;
  canApproveClaim: boolean;

  assignedByName?: string | null;
  assignedToName?: string | null;
}

export interface OfferTemplateSnapshot {
  _schemaVersion: number;
  capturedAt: string;
  offerTemplateId: string;
  businessSlug: string | null;
  businessName: string | null;

  offerTitle: string;
  description: string | null;

  offerType: OfferTypeEnum;
  claimPolicy: string;

  // Scope / Applies
  appliesToType?: OfferAppliesToType | null;
  appliesProduct?: ProductMini | null;
  appliesBundle?: BundleMini | null;
  minPurchaseAmount?: number | null;

  discountPercentage: number | null;
  maxDiscountAmount: number | null;
  discountAmount: number | null;

  validityType: "ABSOLUTE" | "RELATIVE";
  durationDays: number | null;
  trigger: ValidityTrigger | string | null;

  templateMaxRedemptions: number | null;

  purchasableWithPoints: boolean;
  pointsPrice: number | null;
  maxPurchasesPerUser: number | null;

  // Optional/complex fields – keep as any or refine later
  grants?: GrantItemSnapshot[];
  tiers?: OfferTierRow[];      
}

export interface AssignedOfferDTO {
  id: string;
  targetType: AssignmentTargetType;
  assignedVia: AssignedVia;
  referralId?: string | null;
  offerTemplateId: string;
  recipientRole?: RecipientRole | null;
  status: string;
  activatedAt?: string | null;
  expiresAt?: string | null;
  claimedAt?: string | null;
  notes?: string | null;
  activationCondition?: ValidityTrigger | string | null;
  relatedOfferId?: string | null;
  redemptionsUsed?: number | null;
  maxRedemptions?: number | null;
  templateSnapshot?: OfferTemplateSnapshot | null;
}

export interface WalletStoreItemDTO {
  offerTemplateId: string;
  title: string;
  description: string | null;
  pointsPrice: number;
  maxPurchasesPerUser: number | null;
  alreadyPurchased: number;
  canAfford: boolean;
  canPurchase: boolean;
  offerTemplateSnapshot: OfferTemplateSnapshot | null;
}

export interface WalletStoreResponse {
  walletBalance: number;
  items: WalletStoreItemDTO[];
}

export interface ClaimRequestDTO {
  redemptionType?: string;
  redemptionValue?: string;
  note?: string;
  expiresInMinutes?: number;
  claimSource?: 'MANUAL' | 'ONLINE';
  platform?: string;
  domain?: string;
  email?: string;
  checkoutId?: string;
  selectedGrants?: GrantSelectionInput[]; // NEW
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

export type GrantSelectionInput =
  | { itemType: 'PRODUCT'; productId: string; quantity?: number }
  | { itemType: 'BUNDLE';  bundleId:  string; quantity?: number };
  
export interface GrantOption {
  itemType: 'PRODUCT' | 'BUNDLE';
  id: string;              // productId or bundleId
  title: string;
  imageUrl?: string | null;
  defaultQuantity: number; // from template snapshot
}

export type FetchGrantOptionsResponse = {
  options: GrantOption[];
  pickLimit: number;
};

type GrantItem = {
  product?: ProductMini;
  bundleTitle?: string;
  quantity: number;
  title?: string; // fallback label if product/bundle title isn't present
};

export type OfferClaimView = {
  id: string;
  source: "MANUAL" | "ONLINE" | string;
  status: "PENDING" | "APPROVED" | "REDEEMED" | "EXPIRED" | "REJECTED" | "CANCELLED" | string;
  discountCode?: string | null;
  claimedAt: string;               // ISO
  redeemedAt?: string | null;      // ISO
  note?: string | null;
  redemptionType?: "DISCOUNT" | "GRANT" | string;
  redemptionValue?: string | number | null;
  grantItems?: GrantItem[] | null; // for GRANT redemptions
};

export type RedemptionType = "GRANT" | "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT";

export type OfferScopeKind = "ANY" | "LIST";
export type GrantDiscountType = "FREE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE";

export type ClaimPreviewRequest = {
  redemptionType: RedemptionType;
  billTotal?: number; // scope ANY
  cart?: { productId?: string; bundleId?: string; qty: number; unitPrice?: number }[]; // scope LIST
  selectedGrants?: { productId: string; qty: number }[]; // GRANT
};

export type ClaimPreviewResponse = {
  eligibleSubtotal: number;
  applied?: {
    type: RedemptionType;
    value?: number; // currency amount for %/fixed
    percent?: number;
    grants?: { productId: string; qty: number }[];
  };
  finalTotal?: number;
  warnings: string[];
  nextTierHint?: { spendMore: number; nextPercent: number } | null;
  canApprove: boolean;
};

export type EligibleOffersResponseDTO = {
  businessId: string;
  walletBalance: number;
  items: WalletStoreItemDTO[];
};

export type EligibleOffersMultiResponseDTO = {
  items: EligibleOffersResponseDTO[];
};

export type WalletOfferResponseDTO = {
  walletBalance: number;
  item: WalletStoreItemDTO;
};