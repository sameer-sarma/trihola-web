
// src/types/openReferrals.ts
import type { ProductMini, BundleMini } from "./offer";
import type { ProfileMiniDTO } from "./campaign";

export type OpenReferralStatus =
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "EXHAUSTED"; // align with backend

export interface CreateOpenReferralRequest {
  businessId: string;
  campaignId?: string | null;
  campaignInviteId?: string | null;
  title?: string | null;
  message?: string | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  productId?: string | null;
  bundleId?: string | null;
  publishNow?: boolean; // NEW
}

export interface OpenReferralDTO {
  id: string;
  slug: string;
  affiliateUserId: string;
  businessId: string;
  business: ProfileMiniDTO;
  campaignId?: string | null;
  campaignInviteId?: string | null;
  title?: string | null;
  message?: string | null;
  status: OpenReferralStatus;
  maxUses?: number | null;
  expiresAt?: string | null;
  product?: ProductMini | null; // define ProductMini in types/products.ts, etc.
  bundle?: BundleMini | null;
  createdAt: string;

  // You can add more as you need them later, matching backend OpenReferralDTO.
}

export type UpdateOpenReferralRequest = {
  title?: string;
  message?: string;
  status?: OpenReferralStatus;
  maxUses?: number | null;
};

export type PublicBusinessSnapshot = {
  id: string;
  name?: string | null;
  slug?: string | null;
  primaryImageUrl?: string | null;
};

export type UserPublicProfileDTO = {
  userId: string;
  slug: string;
  profileImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  publicBusinessProfile?: PublicBusinessSnapshot | null;
};

export type PublicCampaignSnapshot = {
  id: string;
  slug: string;
  title: string;
  primaryImageUrl?: string | null;
  affiliateRewardSummary?: string | null;
  prospectOfferSummary?: string | null;
};

export type PublicAffiliateSnapshot = {
  userId: string;
  slug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

/**
 * Matches Ktor PublicOpenReferralDTO – response of
 * GET /public/open-referrals/{slug}
 */
export type PublicOpenReferralDTO = {
  slug: string;
  status: string; // e.g. "ACTIVE", "PAUSED", "EXPIRED", "EXHAUSTED"
  title?: string | null;
  message?: string | null;
  business: UserPublicProfileDTO;
  campaign?: PublicCampaignSnapshot | null;
  affiliate?: PublicAffiliateSnapshot | null;
  canClaim: boolean;
};

/**
 * Matches Ktor OpenReferralClaimResponse – response of
 * POST /public/open-referrals/{slug}/claim
 */
export type OpenReferralClaimResponse = {
  referralId: string;
  referralSlug?: string | null;
};