// src/types/referral.ts

export type UUID = string;

export type ReferralStatus =
  | "PENDING"
  | "OPEN"
  | "ACCEPTED"
  | "DECLINED"
  | "COMPLETED"
  | "CANCELLED";

export interface ReferralDTO {
  referralId: UUID;
  slug: string;

  referrerUserId: UUID;
  prospectUserId: UUID;

  targetType: "USER" | "BUSINESS";
  targetUserId?: UUID | null;
  targetBusinessId?: UUID | null;

  note?: string | null;
  status: ReferralStatus;

  createdAt: string;
  updatedAt?: string | null;
}

export type ReferralTargetType = "USER" | "BUSINESS";

export type CreateOutcome =
  | "CREATED_REFERRAL"
  | "CREATED_RECOMMENDATION"
  | "COOLDOWN_ACTIVE";

export interface CreateResult {
  outcome: CreateOutcome | string; // backend uses String; keep tolerant
  referralSlug?: string | null;
  threadId?: string | null;
  recommendationId?: string | null;
}

/**
 * Mirrors Kotlin CreateReferralV2Request exactly.
 */
export interface CreateReferralV2Request {
  prospectUserId: UUID;

  targetType: ReferralTargetType;
  targetUserId?: UUID | null;
  targetBusinessId?: UUID | null;

  note?: string; // Kotlin default ""

  productId?: UUID | null;
  bundleId?: UUID | null;
  campaignInviteId?: UUID | null;
  openReferralId?: UUID | null;

  /**
   * Optional: traceability to a Thread CTA that caused this create.
   * If present, backend will store it on the created referral/recommendation.
   */
  sourceCtaId?: UUID | null;
}

export interface InviteRecommenderRequest {
  recommendationId: UUID;
}

export interface OkResponse {
  ok: boolean;
}

// ------------------------------ Bulk create ------------------------------

export interface BulkCreateOptions {
  continueOnError?: boolean; // default true (partial success)
  dedupeWithinBatch?: boolean; // default true
  maxItems?: number | null;
}

export interface BulkCreateReferralsV2Request {
  items: CreateReferralV2Request[];
  options?: BulkCreateOptions | null;
}

export interface BulkItemResult {
  index: number;
  input?: CreateReferralV2Request | null;

  outcome?: string | null;
  referralId?: string | null;
  referralSlug?: string | null;
  threadId?: string | null;
  recommendationId?: string | null;
  note?: string | null;

  error?: string | null;
}

export interface BulkCreateResult {
  ok: boolean;
  total: number;

  createdReferrals: number;
  createdRecommendations: number;
  addedNotesToExisting: number;
  cooldownBlocked: number;
  failed: number;

  results: BulkItemResult[];
}

export interface UserMini {
  userId: UUID;
  slug: string;
  firstName?: string | null;
  lastName?: string | null;
  profession?: string | null;
  profileImageUrl?: string | null;
}

export interface BusinessMini {
  businessId: UUID;
  slug: string;
  name: string;
  logoUrl?: string | null;
}

export type TargetMini =
  | { kind: "USER"; user: UserMini }
  | { kind: "BUSINESS"; business: BusinessMini };

export function userDisplayName(u: UserMini) {
  const fn = (u.firstName ?? "").trim();
  const ln = (u.lastName ?? "").trim();
  return `${fn} ${ln}`.trim() || u.slug || u.userId;
}

export function businessDisplayName(b: BusinessMini) {
  return (b.name ?? "").trim() || b.slug || b.businessId;
}

export function buildCreateReferralRequest(args: {
  prospect: UserMini;
  target: TargetMini;
  note?: string;
  productId?: string | null;
  bundleId?: string | null;
  campaignInviteId?: string | null;
  openReferralId?: string | null;
  sourceCtaId?: string | null;
}): CreateReferralV2Request {
  const {
    prospect,
    target,
    note,
    productId = null,
    bundleId = null,
    campaignInviteId = null,
    openReferralId = null,
    sourceCtaId = null,
  } = args;

  const base = {
    prospectUserId: prospect.userId,
    note: (note ?? "").trim(),
    productId,
    bundleId,
    campaignInviteId,
    openReferralId,
    sourceCtaId,
  };

  if (target.kind === "USER") {
    const targetUserId = target.user.userId;

    // Guard: avoid recommending the prospect to themselves
    if (targetUserId === prospect.userId) {
      throw new Error("Prospect and target user cannot be the same.");
    }

    return {
      ...base,
      targetType: "USER",
      targetUserId,
      targetBusinessId: null,
    };
  }

  return {
    ...base,
    targetType: "BUSINESS",
    targetUserId: null,
    targetBusinessId: target.business.businessId,
  };
}