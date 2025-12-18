import type { OfferLink, ProfileMiniDTO } from "./campaign";
import type { ProductMini, BundleMini } from "./offer";
import type {PointsAccrualPolicyDTO} from "./wallet";
import type { ParticipantRole } from "./referral";

// src/types/invites.ts

export type CampaignInviteStatus = 'INVITED' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';


export type CampaignInvite = {
  id: string;
  campaignId: string;
  affiliateUserId: string;
  status: CampaignInviteStatus;
  personalSubject?: string | null;
  personalMessage?: string | null;
  respondedAt?: string | null;
  createdAt?: string | null;

  // NEW: enrich row rendering
  recipient?: ProfileMiniDTO | null;
  business?: ProfileMiniDTO | null;
};

export type SendCampaignInvitesRequest = {
affiliateUserIds: string[]; // TriHola userIds as strings
personalSubject?: string | null; // supports {firstName}, {lastName}, {fullName}, {businessName}
personalMessage?: string | null;
};

export type Paginated<T> = {
items: T[];
nextCursor?: string | null;
total?: number;
};

export type Contact = {
userId: string; // TriHola user id
profileSlug: string;
firstName?: string | null;
lastName?: string | null;
phone?: string | null;
email?: string | null;
profileImageUrl?: string | null;
businessName: string | null;
businessSlug: string | null;
};

//export type ParticipantRole = "BUSINESS" | "REFERRER";

// Keep this loose for now – backend enum InviteThreadEventType
export type InviteThreadEventType = string;

// Shape of one event in the invite thread timeline
export type InviteThreadEventDTO = {
  id: string;
  inviteId: string;
  senderUserId: string | null;          // null for system events
  eventType: InviteThreadEventType;     // e.g. "USER_MESSAGE", "INVITE_ACCEPTED"
  content: string;                      // primary text to render in the timeline
  metadata?: Record<string, unknown> | null;  // attachments, extra labels, etc.
  dontShowToRole?: ParticipantRole | null;    // hide from BUSINESS/REFERRER when set
  createdAt: string;                    // ISO timestamp from kotlinx-datetime Instant
};

// Body we send when posting a new chat message
export type InviteThreadMessageReq = {
  message: string;
  attachmentUrls?: string[] | null;
};

export type InviteSnapshotCampaign = {
  id: string;
  slug: string;
  title: string;
  message?: string | null;
  affiliateHeadline?: string | null;
  affiliateSubheading?: string | null;
  campaignDescription?: string | null;
  affiliateLongDescription?: string | null;
  prospectDescriptionShort?: string | null;
  prospectDescriptionLong?: string | null;
  themeColor?: string | null;
  status: string;
  primaryImageUrl?: string | null;
  businessSlug?: string | null;

  singleProductId?: string | null;
  product?: ProductMini | null;

  bundleId?: string | null;
  bundle?: BundleMini | null;
  
  expiresAt?: string | null;
};

export type InviteSnapshotRewards = {
  offer?: OfferLink | null;
  affiliatePolicy?: PointsAccrualPolicyDTO | null;
};

export type InviteSnapshot = {
  campaign: InviteSnapshotCampaign;
  rewards: InviteSnapshotRewards;
};

export type InviteReferralSummary = {
  referralId: string;
  status: string;
  slug?: string | null;
  createdAt: string;
  prospectName?: string | null;
  prospectProfileImageUrl?: string | null;
};

export type InviteDetailResponse = {
  invite: CampaignInvite;
  snapshot: InviteSnapshot;
  referrals: InviteReferralSummary[];
  myParticipantRole?: ParticipantRole | null;
  canSendReferrals?: boolean | null;
  referralsSent?: number | null;
};

export type SendReferralProspectRef = {
  prospectUserId: string;
};

export type SendReferralsRequest = {
  inviteId: string;
  note: string;
  prospects: SendReferralProspectRef[];
};

export type CampaignInviteWithProfiles = CampaignInvite & {
  recipient?: ProfileMiniDTO | null;
  business?: ProfileMiniDTO | null;
};

export type PublicCampaignInviteLandingView = {
  invite: CampaignInviteWithProfiles;
  snapshot: InviteSnapshotCampaign;
  walletPolicySummary?: string | null;
  prospectOfferSummary?: string | null;
  myParticipantRole?: ParticipantRole | null;
};

export type MyInviteListItemDTO = {
  inviteId: string;
  campaignId: string;
  campaignTitle: string;
  status: string;
  createdAt: string;
  inviteMessage?: string | null;
  inviteSubject?: string | null;
  campaignSlug?: string | null;
  primaryImageUrl?: string | null;

  businessUserId?: string | null;
  businessSnapshot?: ProfileMiniDTO | null;
  invitedBy?: string | null;

  affiliateUserId?: string | null;
  affiliateSnapshot?: ProfileMiniDTO | null;

  myRole: "BUSINESS" | "AFFILIATE";
};
