// src/types/offerAssignmentPlanTypes.ts

export type OfferRecipientIdentityType =
  | "USER"
  | "BUSINESS";

export type OfferRuleScopeType =
  | "BUSINESS"
  | "CTA"
  | "THREAD"
  | "REFERRAL"
  | "CAMPAIGN"
  | "RELATED_OFFER";

export type OfferRecipientSelectorType =
  | "EXPLICIT_IDENTITY"
  | "REFERRAL_ROLE"
  | "CTA_ASSIGNEE";

export type OfferRecipientRole =
  | "REFERRER"
  | "PROSPECT"
  | "BUSINESS"
  | "TARGET_USER"
  | "TARGET_BUSINESS"
  | "GENERIC_USER";

export type OfferAssignmentCondition =
  | "ON_RULE_CREATION"
  | "ON_CTA_COMPLETED"
  | "ON_REFERRAL_CREATED"
  | "ON_REFERRAL_ACCEPTED"
  | "ON_RELATED_OFFER_REDEEMED"
  | "ON_PURCHASE"
  | "ON_DATE";

export type OfferActivationCondition =
  | "ON_ASSIGNMENT"
  | "ON_REFERRAL_ACCEPTED"
  | "ON_RELATED_OFFER_REDEEMED"
  | "ON_CTA_COMPLETED"
  | "ON_PURCHASE"
  | "ON_DATE";

export type OfferRuleStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "CANCELLED"
  | "DRAFT"
  | "COMPLETED"
  | "UNKNOWN";

export type OfferSourceType = string;
export type AssignedVia = string;

/**
 * Direct-thread request shape for POST /offers/assign
 */
export type AssignOfferRequest = {
  offerTemplateId: string;
  recipientIdentityType: OfferRecipientIdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  threadId?: string | null;
  maxRedemptionsOverride?: number | null;
  note?: string | null;
};

export type OfferRecipientSpec = {
  selectorType: OfferRecipientSelectorType ;
  identityType?: "USER" | "BUSINESS" | null;
  userId?: string | null;
  businessId?: string | null;
  role?: string | null;
};

export type OfferAssignmentRuleDTO = {
  id: string;
  businessId: string;
  offerTemplateId: string;

  threadId?: string | null;
  sourceCtaId?: string | null;
  referralId?: string | null;

  scopeType: OfferRuleScopeType;
  sourceType?: OfferSourceType | null;
  assignedVia?: AssignedVia | null;
  recipientSelectorType: OfferRecipientSelectorType;

  recipientIdentityType: OfferRecipientIdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  recipientRole?: OfferRecipientRole | null;

  assignmentCondition: OfferAssignmentCondition;
  activationCondition?: OfferActivationCondition | null;

  ruleConfigJson: Record<string, unknown>;

  dependsOnRuleId?: string | null;

  status: OfferRuleStatus;
  createdByUserId?: string | null;

  notes?: string | null;
  maxRedemptionsOverride?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOfferAssignmentPlanResponse = {
  rules: OfferAssignmentRuleDTO[];
  assignedOffers: AssignedOfferDTO[];
};

export type AssignOfferResponse = CreateOfferAssignmentPlanResponse;

/**
 * Thread-aware recipient option for UI.
 * Your mapper file can convert thread participants into these.
 */
export type ThreadOfferRecipientOption = {
  key: string;
  label: string;
  identityType: OfferRecipientIdentityType;
  userId?: string | null;
  businessId?: string | null;
  subtitle?: string | null;
  avatarUrl?: string | null;
};

export function makeAssignOfferRequest(params: {
  offerTemplateId: string;
  recipientIdentityType: OfferRecipientIdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  threadId?: string | null;
  maxRedemptionsOverride?: number | null;
  note?: string | null;
}): AssignOfferRequest {
  return {
    offerTemplateId: params.offerTemplateId,
    recipientIdentityType: params.recipientIdentityType,
    recipientUserId: params.recipientUserId ?? null,
    recipientBusinessId: params.recipientBusinessId ?? null,
    threadId: params.threadId ?? null,
    maxRedemptionsOverride: params.maxRedemptionsOverride ?? null,
    note: params.note ?? null,
  };
}

export type OfferAssignmentPlanSourceType =
  | "THREAD"
  | "CTA"
  | "BROADCAST"
  | "REFERRAL"
  | "RELATED_OFFER";

export type OfferAttachEntityType =
  | "THREAD"
  | "CTA"
  | "REFERRAL"
  | "BROADCAST"
  | "ASSIGNED_OFFER";

export type OfferRuleDependencyType =
  | "NONE"
  | "RULE"
  | "RELATED_OFFER";

export type OfferRuleDependencySpec = {
  dependencyType?: OfferRuleDependencyType;
  dependsOnRuleClientKey?: string | null;
  dependsOnRuleId?: string | null;
};

export type OfferAssignmentPlanSourceSpec = {
  sourceType: OfferAssignmentPlanSourceType;
  threadId?: string | null;
  broadcastId?: string | null;
  broadcastItemId?: string | null;
  broadcastPosition?: number | null;
  ctaId?: string | null;
  referralId?: string | null;
  triggeringOfferId?: string | null;
  triggeringRuleId?: string | null;
};

export type OfferAssignmentRuleSpec = {
  clientRuleKey?: string | null;
  offerTemplateId: string;

  attachToEntityType: OfferAttachEntityType;
  recipient: OfferRecipientSpec;

  assignmentCondition: OfferAssignmentCondition;
  activationCondition?: OfferActivationCondition | null;

  maxRedemptionsOverride?: number | null;
  notes?: string | null;

  dependency?: OfferRuleDependencySpec | null;
  ruleConfigJson?: Record<string, unknown>;
};

export type CreateOfferAssignmentPlanRequest = {
  source: OfferAssignmentPlanSourceSpec;
  rules: OfferAssignmentRuleSpec[];
  createdByUserId?: string | null;
};

export type AssignedOfferDTO = {
  id: string;
  businessId: string;
  offerTemplateId: string;

  recipientIdentityType: OfferRecipientIdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  recipientRole?: OfferRecipientRole | null;

  assignedVia: string;
  sourceType?: string | null;
  sourceThreadId?: string | null;
  sourceBroadcastId?: string | null;
  sourceCtaId?: string | null;
  sourceRuleId?: string | null;

  referralId?: string | null;
  relatedOfferId?: string | null;

  status: string;
  activationCondition?: OfferActivationCondition | null;

  assignedAt: string;
  activatedAt?: string | null;
  claimedAt?: string | null;
  redeemedAt?: string | null;
  cancelledAt?: string | null;
  expiredAt?: string | null;

  validFrom?: string | null;
  validUntil?: string | null;

  redemptionsUsed: number;
  maxRedemptionsOverride?: number | null;

  notes?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;

  createdAt: string;
  updatedAt: string;
};