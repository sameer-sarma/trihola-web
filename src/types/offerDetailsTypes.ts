import type {
  ClaimPolicy,
  DiscountTierSpec,
  GrantDiscountType,
  GrantItemSnapshot,
  OfferImage,
  OfferScopeKind,
  OfferTypeEnum,
  ScopeItem,
} from "./offerTemplateTypes";
import type {
  AssignedVia,
  OfferActivationCondition,
  OfferRecipientIdentityType,
  OfferRecipientRole,
  OfferSourceType,
} from "./offerAssignmentPlanTypes";

export type AssignedOfferDetailsDTO = {
  assignedOfferId: string;
  offerTemplateId: string;

  recipientIdentityType: OfferRecipientIdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  recipientRole?: OfferRecipientRole | string | null;

  assignedVia: AssignedVia;
  sourceType?: OfferSourceType | null;
  sourceThreadId?: string | null;
  sourceBroadcastId?: string | null;
  sourceCtaId?: string | null;
  sourceRuleId?: string | null;
  referralId?: string | null;
  relatedOfferId?: string | null;

  status: string;
  activatedAt?: string | null;
  claimedAt?: string | null;
  notes?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;

  offerTitle: string;
  description: string;
  offerType: OfferTypeEnum;
  claimPolicy: ClaimPolicy;

  images?: OfferImage[];
  primaryImageUrl?: string | null;

  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  discountAmount?: number | null;

  trigger?: OfferActivationCondition | null;
  validityType?: "ABSOLUTE" | "RELATIVE" | string | null;
  durationDays?: number | null;

  businessSlug?: string | null;
  businessName?: string | null;
  businessProfileSlug?: string | null;

  scopeKind?: OfferScopeKind | null;
  scopeItems?: ScopeItem[];

  minPurchaseAmount?: number | null;
  minPurchaseQty?: number | null;

  grants?: GrantItemSnapshot[];
  grantPickLimit?: number | null;
  grantDiscountType?: GrantDiscountType | null;
  grantDiscountValue?: number | null;

  tiers?: DiscountTierSpec[] | null;

  redemptionsUsed?: number | null;
  effectiveMaxRedemptions?: number | null;
  redemptionsLeft?: number | null;

  secureToken?: string | null;
  canClaim: boolean;
  canApproveClaim: boolean;

  assignedByName?: string | null;
  assignedToName?: string | null;
};

export type OfferSnapshotMsg = {
  kind: "offer.snapshot";
  assignedOfferId: string;
  status: string;
  redemptionsUsed: number;
  manualClaim?: unknown | null;
  onlineClaim?: unknown | null;
  at: number;
};

export type OfferStatusChangedMsg = {
  kind: "offer.status.changed";
  assignedOfferId: string;
  status: string;
  redemptionsUsed: number;
  at: number;
};