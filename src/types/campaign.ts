import type { ProductMini, BundleMini } from "./offer";
import type {PointsAccrualPolicyDTO} from "./wallet";

// src/types/campaign.ts
export type OfferLink = {
  offerTemplateId: string;
  recipientRole: "REFERRER" | "PROSPECT";
  // this is what comes inside snapshot.rewards.offer from the invite endpoint:
  OfferTemplateSnapshot?: OfferTemplateSnapshot;
};
export type CampaignImageReq = { url: string; position: number; alt?: string | null };
export type CampaignAttachmentDTO = { fileName: string; url: string; mimeType?: string | null; sizeBytes?: number | null };

export type CampaignOwnerDTO = {
  id: string;
  slug: string;
  openInviteSlug?: string | null;
  openAffiliateMode?: OpenAffiliateMode;
  businessId: string;
  title: string;
  message?: string | null;
  campaignDescription?: string | null;
  affiliateHeadline?: string | null;
  affiliateSubheading?: string | null;
  affiliateLongDescription?: string | null;
  prospectDescriptionShort?: string | null;
  prospectDescriptionLong?: string | null;
  themeColor?: string | null;
  primaryImageUrl?: string | null;
  singleProductId?: string | null;
  bundleId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  status: CampaignStatus;
  images: CampaignImageReq[];
  attachments: CampaignAttachmentDTO[];
  offer?: OfferLink | null;
  affiliatePolicy?: PointsAccrualPolicyDTO | null;
  analytics?: CampaignAnalyticsSummary | null;
  product?: ProductMini | null;
  bundle?: BundleMini | null;
};

export type CampaignPublicDTO = {
  id: string;
  slug: string;
  businessSlug: string;
  openInviteSlug?: string | null;
  openAffiliateMode?: OpenAffiliateMode;
  title: string;
  status: CampaignStatus;
  message?: string | null;
  campaignDescription?: string | null;
  affiliateHeadline?: string | null;
  affiliateSubheading?: string | null;
  affiliateLongDescription?: string | null;
  prospectDescriptionShort?: string | null;
  prospectDescriptionLong?: string | null;
  themeColor?: string | null;
  primaryImageUrl?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  images: CampaignImageReq[];
  offer?: OfferLink | null;
  affiliatePolicy?: PointsAccrualPolicyDTO | null;
};

export type CreateCampaignReq = {
  title: string;
  message?: string | null;
  campaignDescription?: string | null;
  affiliateHeadline?: string | null;
  affiliateSubheading?: string | null;
  affiliateLongDescription?: string | null;
  prospectDescriptionShort?: string | null;
  prospectDescriptionLong?: string | null;
  themeColor?: string | null;
  primaryImageUrl?: string | null;
  singleProductId?: string | null;
  bundleId?: string | null;
  startsAtIso?: string | null;
  expiresAtIso?: string | null;
};

export type CampaignMediaItem = {
  url: string;
  storageKey: string;
  bucket: string;          // "campaign-media"
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  alt?: string;
  caption?: string;
  isCover?: boolean;
  order?: number;
};

export type UpsertCampaignMediaReq = {
  primaryImageUrl: string | null;
  items: CampaignMediaItem[]; // ordered list, one may have isCover=true
};

export type CampaignHubOwned = {
  id: string;
  slug?: string;
  title: string;
  status?: string;
  primaryImageUrl?: string | null;
  invites?: number;
  accepts?: number;
  redemptions?: number;
};

export type CampaignHubAffiliating = {
  inviteId: string;
  campaignId: string;
  businessName: string;
  businessSlug?: string;
  campaignTitle: string;
  campaignSlug?: string;
  primaryImageUrl?: string | null;
  status: 'INVITED' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedBy?: string;
  contactSnapshot?: ProfileMiniDTO;
  rewardReferrer?: string;
  rewardProspect?: string;
  createdAt?: string;
};

export type CampaignHubForMe = {
  referralId: string;
  fromAffiliate: string;
  affiliateSnapshot?: ProfileMiniDTO;
  businessName: string;
  businessSnapshot?: ProfileMiniDTO;
  campaignTitle: string;
  status?: string; // ACTIVE/PAUSED/ENDED (or backend-defined)
  businessSlug?: string;
  campaignSlug?: string;
  primaryImageUrl?: string | null;
  createdAt?: string;
};

export type CampaignHubDTO = {
  myCampaigns: CampaignHubOwned[];
  affiliateInvites: CampaignHubAffiliating[];
  prospectReferrals: CampaignHubForMe[];
};

export type ProfileMiniDTO = {
  userId: string;
  slug?: string | null;                // was profileSlug
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  registeredAsBusiness?: boolean;      // new
  businessName?: string | null;
  businessSlug?: string | null;
};

export interface CampaignAnalyticsSummary {
  totalInvites: number;
  totalAcceptedInvites: number;
  totalReferrals: number;
  totalRedemptions: number;
}

export type OfferTemplateSnapshot = {
  _schemaVersion: number;
  capturedAt: string;
  offerTemplateId: string;
  businessSlug: string;
  offerTitle: string;
  description?: string | null;
  offerType: string;
  claimPolicy: string;
  scopeKind: string;
  scopeItems: any[];
  minPurchaseAmount?: number | null;
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  validityType: string;
  durationDays?: number | null;
  trigger: string;
  grants: any[];
  grantPickLimit?: number | null;
  grantDiscountType?: string | null;
  templateMaxRedemptions?: number | null;
};

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
export type OpenAffiliateMode = "OFF" | "AUTO_ACCEPT" | "REQUIRE_APPROVAL";