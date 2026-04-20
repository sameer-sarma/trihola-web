// src/types/threads.ts

export type UUID = string;
export type ISODateTime = string;

export type ParticipantType = "USER" | "BUSINESS";
import type { ThreadOrderCardDTO } from "./orderTypes";

export type ParticipantIdentity = {
  participantType: ParticipantType;
  participantId: UUID;
};

export type ReferralDecisionV2Request = {
  asIdentity: ParticipantIdentity;
  note?: string | null;
};

export type ReferralV2DTO = {
  referralId?: UUID | null;
  slug?: string | null;
  status?: string | null;
  targetAcceptanceStatus?: string | null;
  prospectAcceptanceStatus?: string | null;
  threadId?: UUID | null;
};

export type JsonObject = Record<string, any>;

export type ThreadType = "DIRECT" | "GROUP";
export type ThreadContextType = "DIRECT" | "GROUP" | "REFERRAL";

export type UserMiniDTO = {
  userId: UUID;
  slug: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export type BusinessMiniDTO = {
  businessId: UUID;
  slug: string | null;
  name: string | null;
  logoUrl: string | null;
};

export type AllowedActionsDTO = {
  canSendMessage: boolean;
  canSendAttachment: boolean;

  canAskForReferrals: boolean;
  canAskForRecommendation: boolean;
  canCreateOrder: boolean;

  canInviteRecommender: boolean;
  canAcceptReferral: boolean;
  canRejectReferral: boolean;
  canCancelReferral: boolean;

  canSendIntroEmail: boolean;
  canAssignOffers: boolean;

  remainingPreEngagementMessages?: number | null;
  remainingIntroEmails?: number | null;
  reason?: string | null;
};

// PATCH: extend ThreadContextDTO to match backend response
export type ThreadContextDTO = {
  threadId: UUID;

  // backend sends both
  type: ThreadContextType;
  contextType?: ThreadContextType | string | null;

  title?: string | null;

  // backend sends these (thread-level)
  status?: string | null; // "OPEN" | "CLOSED" etc
  allowParticipantAdd?: boolean | null;

  participantCount?: number | null;

  createdAt?: ISODateTime | null;
  updatedAt?: ISODateTime | null;

  // referral-only optional (keep tolerant)
  referralSlug?: string | null;
  referralId?: UUID | string | null;
  referralStatus?: string | null;

  allowedActions?: AllowedActionsDTO | null;

  activeCtas?: ThreadCtaDTO[] | null;
  visibleOrders?: ThreadOrderCardDTO[] | null;
};

export type ThreadParticipantDTO = {
  participantType: ParticipantType;
  participantId: UUID;

  userMini?: UserMiniDTO | null;
  businessMini?: BusinessMiniDTO | null;

  displayName?: string | null;
  imageUrl?: string | null;

  role: string;
  state: string;
  canAddParticipants: boolean | null;
  canContribute: boolean | null;

  // referral-specific optional
  referralRole?: string | null;
};

export type ParticipantBadgeDTO = {
  participantType: ParticipantType; // "USER" | "BUSINESS"
  participantId: UUID;
  slug: string,
  displayName?: string | null;
  imageUrl?: string | null;
};

export type ThreadCtaLinkedDTO = {
  referrals: LinkedReferralDTO[];
  recommendations: LinkedRecommendationDTO[];
};

export type LinkedReferralDTO = {
  referralId: UUID;
  threadId?: UUID | null;      // optional (referral may or may not have a thread)
  slug: string;
  status: string;
  target: ParticipantBadgeDTO;
  prospect?: UserMiniDTO | null;
  createdAt?: ISODateTime | null;
};

// Keep flexible for now (server may expand this later)
export type LinkedRecommendationDTO = {
  recommendationId?: UUID | null;
  threadId?: UUID | null;
  slug?: string | null;
  status?: string | null;
  target?: ParticipantBadgeDTO | null;
  prospect?: UserMiniDTO | null;
  createdAt?: ISODateTime | null;
};


export type ReferralThreadContextDTO = {
  referralId: UUID;
  referralSlug: string;
  referralStatus: string;
  targetAcceptanceStatus?: string | null;
  prospectAcceptanceStatus?: string | null;
  note?: string | null;

  referrer: UserMiniDTO;
  prospect: UserMiniDTO;
  business: ParticipantBadgeDTO;
};

export type ThreadSummaryDTO = {
  threadId: UUID;
  type: ThreadType; // "DIRECT" | "GROUP"
  contextType: string; // "DIRECT" | "GROUP" | "REFERRAL"
  title?: string | null;
  status: string; // "OPEN" | "CLOSED" | "ARCHIVED"
  allowParticipantAdd: boolean;
  updatedAt?: ISODateTime | null;
  lastMessageAt?: ISODateTime | null;
  lastMessagePreview?: string | null;
  unreadCount?: number | null;

  counterparty?: ParticipantBadgeDTO | null;
  referral?: ReferralThreadContextDTO | null;
  
  activeCtaCount?: number | null;
  activeCtasPreview?: ThreadCtaPreviewDTO[] | null;
};

export type ThreadCtaPreviewDTO = {
  id: UUID;
  kind: string;
  state: string;
  dueAt?: ISODateTime | null;
};


export type ThreadActivityDTO = {
  id: UUID;
  threadId: UUID;
  type: string;

  // tolerant actor shape (older/newer server formats)
  participantType?: ParticipantType | string | null;
  participantId?: UUID | string | null;

  actor?: ParticipantIdentity | null;
  actorIdentity?: ParticipantIdentity | null;
  actorParticipantType?: ParticipantType | string | null;
  actorParticipantId?: UUID | string | null;

  actorUserId?: UUID | string | null;
  actorDisplayName?: string | null;
  actorName?: string | null;
  displayName?: string | null;

  content?: string | null;
  payload?: JsonObject | null;
  createdAt?: ISODateTime | null;
};

export type OkResponse = { ok: boolean };

export type DirectThreadRequest = {
  other: ParticipantIdentity;
};

export type GroupThreadRequest = {
  title?: string | null;
  participants: ParticipantIdentity[];
};

export type CreateThreadResponse = {
  threadId: UUID;
};

export type AddParticipantRequest = {
  participant: ParticipantIdentity;
};

export type LeaveThreadRequest = {
  asIdentity: ParticipantIdentity;
};

export type BroadcastItemPayloadDTO = {
  attachments?: AttachmentDTO[];
};

export type SendMessageRequest = {
  asIdentity: ParticipantIdentity;
  text?: string | null;
  payload?: BroadcastItemPayloadDTO | null;
};

export type SendMessageResponse = {
  ok: boolean;
  activityId: UUID;
};

export type EmailAttachmentDTO = {
  filename: string;
  base64Content: string;
  contentType?: string | null;
};

export type IntroEmailRequest = {
  asIdentity: ParticipantIdentity;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  attachments: EmailAttachmentDTO[];
};

export type IntroEmailResultDTO = {
  ok: boolean;
  sentCount?: number | null;
  skippedCount?: number | null;
  remainingIntroEmails?: number | null;
  error?: string | null;
};

export type RecommendationActivityPayloadDTO = {
  kind: "RECOMMENDATION";
  note?: string | null;

  referralId?: UUID | string | null;
  referralSlug?: string | null;
  recommendationId?: UUID | string | null;
  recommenderUserId?: UUID | string | null;

  // Navigate to the *main referral thread* from any thread where this activity is shown.
  referralThreadId?: UUID | string | null;

  recommender?: UserMiniDTO | null;
  prospect?: UserMiniDTO | null;

  // polymorphic target
  targetType?: ParticipantType | string | null;
  targetUser?: UserMiniDTO | null;
  targetBusiness?: BusinessMiniDTO | null;
};

export type ThreadCtaKind = "REFERRAL_ADD"; // add more later

export type ThreadCtaState = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export type ThreadCtaBaseDTO = {
  id: UUID;
  threadId: UUID;

  createdBy?: ParticipantIdentity | null;
  assignedTo?: ParticipantIdentity | null;

  createdByType?: "USER" | "BUSINESS" | string | null;
  createdById?: UUID | string | null;
  assignedToType?: "USER" | "BUSINESS" | string | null;
  assignedToId?: UUID | string | null;

  kind: string;
  state: ThreadCtaState;

  configJson: string;
  progressJson: string;

  dueAt?: ISODateTime | null;
  expiresAt?: ISODateTime | null;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;

  createdByBadge?: ParticipantBadgeDTO | null;
  assignedToBadge?: ParticipantBadgeDTO | null;
  linked?: ThreadCtaLinkedDTO | null;
};

export type ThreadCtaBroadcastDTO = ThreadCtaBaseDTO;

export type ThreadCtaDTO = ThreadCtaBaseDTO & {
  viewerRole?: "ASSIGNEE" | "CREATOR" | string | null;
  canAct?: boolean | null;
};

export type CreateThreadCtaRequest = {
  createdBy: {
    participantType: "USER" | "BUSINESS";
    participantId: string;
  };
  assignedTo: {
    participantType: "USER" | "BUSINESS";
    participantId: string;
  };
  kind: ThreadCtaKind | string;

  configJson?: string;     // default "{}"
  progressJson?: string;   // default "{}"
  dueAt?: string | null;
  expiresAt?: string | null;
};

export type ThreadReferralBroadcastDTO = {
  referralId: UUID;
  referralSlug: string;
  status: string;
  targetAcceptanceStatus?: string | null;
  prospectAcceptanceStatus?: string | null;
  action?: string | null;
  side?: string | null;
};

export type ThreadParticipantsBroadcastDTO = {
  items: ThreadParticipantDTO[];
};

export function parseJsonSafe<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export type ThreadBroadcastEventType =
  | "THREAD_ACTIVITY_CREATED"
  | "THREAD_CTA_UPSERTED"
  | "THREAD_CTA_REMOVED"
  | "REFERRAL_STATE_UPDATED"
  | "THREAD_PARTICIPANTS_UPDATED"
  | "THREAD_CONTEXT_INVALIDATED"
  | "THREAD_CONTEXT_UPDATED";

export type ThreadBroadcastDTO = {
  eventType: ThreadBroadcastEventType;
  threadId: UUID;

  activity?: ThreadActivityDTO | null;
  cta?: ThreadCtaBroadcastDTO | null;
  referral?: ThreadReferralBroadcastDTO | null;
  participantSnapshot?: ThreadParticipantsBroadcastDTO | null;

  ctaId?: UUID | null;
  activeCtaCount?: number | null;

  contextInvalidated?: boolean | null;

  occurredAt: ISODateTime;
};

export function normalizeParticipantIdentityFromCta(
  cta: ThreadCtaBaseDTO,
  side: "createdBy" | "assignedTo"
): ParticipantIdentity | null {
  const direct = cta[side];
  if (direct?.participantType && direct?.participantId) {
    return {
      participantType: direct.participantType,
      participantId: String(direct.participantId),
    };
  }

  if (side === "createdBy" && cta.createdByType && cta.createdById) {
    return {
      participantType: cta.createdByType as ParticipantType,
      participantId: String(cta.createdById),
    };
  }

  if (side === "assignedTo" && cta.assignedToType && cta.assignedToId) {
    return {
      participantType: cta.assignedToType as ParticipantType,
      participantId: String(cta.assignedToId),
    };
  }

  return null;
}

export type AttachmentKind = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";

export type AttachmentDTO = {
  url: string;
  name: string;
  mime: string;
  sizeBytes?: number | null;
  kind?: AttachmentKind | null;
  path?: string | null;
  isPrimary?: boolean | null;
};


export type UiAttachment = {
  url: string;
  name: string;
  mime: string;
  sizeBytes?: number | null;
  kind?: AttachmentKind | null;
  path?: string | null;
  isPrimary?: boolean | null;
  _isObjectUrl?: boolean;
};

// ================================
// Inbox Composer Permissions
// ================================

export type AnnouncementComposerPermissionsDTO = {
  canAddMessageItem: boolean;
  canAddOfferItem: boolean;
  canAddOrderItem: boolean;
  canAddRequestItem: boolean;
  canAskForReferrals: boolean;
  canAskForRecommendations: boolean;
};

export type ThreadInboxComposerPermissionsDTO = {
  asIdentity: ParticipantIdentity;

  canCreateDirectThread: boolean;
  canCreateReferral: boolean;
  canCreateAnnouncement: boolean;

  announcement: AnnouncementComposerPermissionsDTO;
};

export type ThreadInboxComposerPermissionsResponseDTO = {
  permissions: ThreadInboxComposerPermissionsDTO[];
};