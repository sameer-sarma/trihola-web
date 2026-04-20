import type {
  UUID,
  ParticipantIdentity,
  BroadcastItemPayloadDTO,
} from "./threads";
import type { CreateOrderItemRequest, OfferSelectionMode } from "./orderTypes";

/* ------------------------------ enums / unions ------------------------------ */

export type BroadcastStatus =
  | "DRAFT"
  | "SENDING"
  | "SENT"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export type BroadcastItemType =
  | "MESSAGE"
  | "CTA"
  | "OFFER"
  | "ORDER";

export type BroadcastRecipientDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "PARTIAL"
  | "FAILED"
  | "SKIPPED";

export type BroadcastRecipientResponseStatus =
  | "NONE"
  | "SEEN"
  | "CLICKED"
  | "REPLIED"
  | "ACCEPTED"
  | "REJECTED";

export type ThreadCtaKind =
  | "REFERRAL_ADD"
  | "RECOMMEND_BUSINESS";

/* ------------------------------ create DTOs ------------------------------ */

export type BroadcastMessageItemCreateDTO = {
  itemType: "MESSAGE";
  messageText?: string | null;
  payload?: BroadcastItemPayloadDTO | null;
  ctaKind?: never;
  ctaConfigJson?: never;
  dueAt?: string | null;
  expiresAt?: string | null;
};

export type BroadcastCtaItemCreateDTO = {
  itemType: "CTA";
  ctaKind: ThreadCtaKind;
  ctaConfigJson: string;
  dueAt?: string | null;
  expiresAt?: string | null;
  messageText?: never;
  payload?: never;
};

export type BroadcastOfferItemCreateDTO = {
  itemType: "OFFER";
  offerTemplateId: string;
  maxRedemptionsOverride?: number | null;
  note?: string | null;
  dueAt?: string | null;
  expiresAt?: string | null;
};

export type BroadcastOrderItemCreateDTO = {
  itemType: "ORDER";
  orderPayload: BroadcastOrderPayloadDTO;
  messageText?: never;
  payload?: never;
  ctaKind?: never;
  ctaConfigJson?: never;
  offerTemplateId?: never;
  maxRedemptionsOverride?: never;
  note?: never;
  dueAt?: string | null;
  expiresAt?: string | null;
};

export type BroadcastItemCreateDTO =
  | BroadcastMessageItemCreateDTO
  | BroadcastCtaItemCreateDTO
  | BroadcastOfferItemCreateDTO
  | BroadcastOrderItemCreateDTO;

export type BroadcastRecipientCreateDTO = {
  recipientIdentity: ParticipantIdentity;
};

export type CreateBroadcastEnvelopeDTO = {
  senderIdentity: ParticipantIdentity;
  title?: string | null;
  recipients: BroadcastRecipientCreateDTO[];
  items: BroadcastItemCreateDTO[];
};

/* ------------------------------ read DTOs ------------------------------ */

export type BroadcastDTO = {
  id: UUID;
  slug: string;
  createdByUserId: UUID;
  senderIdentity: ParticipantIdentity;
  title?: string | null;
  status: BroadcastStatus;
  audienceType: "CONTACTS";
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
};

export type BroadcastMessageItemDTO = {
  id: UUID;
  broadcastId: UUID;
  position: number;
  itemType: "MESSAGE";
  messageText?: string | null;
  payload?: BroadcastItemPayloadDTO | null;
  ctaKind?: null;
  ctaConfigJson?: null;
  dueAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastCtaItemDTO = {
  id: UUID;
  broadcastId: UUID;
  position: number;
  itemType: "CTA";
  messageText?: null;
  payload?: null;
  ctaKind: ThreadCtaKind | string;
  ctaConfigJson?: string | null;
  dueAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastOfferItemDTO = {
  id: UUID;
  broadcastId: UUID;
  position: number;
  itemType: "OFFER";
  messageText?: null;
  payload?: null;
  ctaKind?: null;
  ctaConfigJson?: null;
  offerTemplateId: UUID;
  maxRedemptionsOverride?: number | null;
  note?: string | null;
  dueAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastOrderPayloadDTO = {
  currencyCode?: string;
  grossAmount: string;
  inScopeAmount?: string | null;
  summary?: string | null;
  notes?: string | null;
  paymentInstructionsJson?: string | null;
  items?: CreateOrderItemRequest[];
  offerSelectionMode?: OfferSelectionMode;
};

export type BroadcastOrderItemDTO = {
  id: UUID;
  broadcastId: UUID;
  position: number;
  itemType: "ORDER";
  orderPayload: BroadcastOrderPayloadDTO;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastItemDTO =
  | BroadcastMessageItemDTO
  | BroadcastCtaItemDTO
  | BroadcastOfferItemDTO
  | BroadcastOrderItemDTO;

export type BroadcastRecipientDTO = {
  id: UUID;
  broadcastId: UUID;
  recipientIdentity: ParticipantIdentity;
  threadId?: UUID | null;
  deliveryStatus: BroadcastRecipientDeliveryStatus;
  responseStatus: BroadcastRecipientResponseStatus;
  failureCode?: string | null;
  failureReason?: string | null;
  failureContextJson?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
};

export type BroadcastRecipientItemDeliveryDTO = {
  id: UUID;
  broadcastId: UUID;
  recipientId: UUID;
  itemId: UUID;
  itemType: BroadcastItemType;
  deliveryStatus: BroadcastRecipientDeliveryStatus;
  threadActivityId?: UUID | null;
  ctaId?: UUID | null;
  assignedOfferId?: UUID | null;
  orderId?: UUID | null;
  failureCode?: string | null;
  failureReason?: string | null;
  failureContextJson?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
};

export type BroadcastDetailsDTO = {
  broadcast: BroadcastDTO;
  items: BroadcastItemDTO[];
  recipients: BroadcastRecipientDTO[];
  deliveries: BroadcastRecipientItemDeliveryDTO[];
};

/* ------------------------------ create result ------------------------------ */

export type BroadcastDeliverySummary = {
  totalRecipients: number;
  sentRecipients: number;
  failedRecipients: number;
  partialRecipients: number;
  finalStatus: BroadcastStatus;
};

export type BroadcastCreationResultDTO = {
  broadcast: BroadcastDTO;
  deliverySummary?: BroadcastDeliverySummary | null;
};

/* ------------------------------ frontend draft types ------------------------------ */

export type BroadcastMessageItemDraft = {
  localId: string;
  itemType: "MESSAGE";
  messageText: string;
  payload?: BroadcastItemPayloadDTO | null;
};

export type BroadcastOfferItemDraft = {
  localId: string;
  itemType: "OFFER";
  offerTemplateId: string | null;
  note: string;
  maxRedemptionsOverride: string;
  schedule: {
    dueAt: string | null;
    expiresAt: string | null;
  };
};

export type BroadcastCtaRewardDraft = {
  enabled: boolean;
  offerTemplateId: string;
  maxRedemptionsOverrideText: string;
  notes: string;
};

export type BroadcastCtaRewardsDraft = {
  assigneeOnCompletion: BroadcastCtaRewardDraft;
  prospectOnReferralCreation: BroadcastCtaRewardDraft;
  referrerOnReferralCreation: BroadcastCtaRewardDraft;
};

export type BroadcastCtaDraftConfig = {
  message?: string;
  requestedCount?: number;
  referralDefaults?: {
    suggestedNote?: string;
    attachments?: Array<{
      url: string;
      name: string;
      mime: string;
      sizeBytes?: number | null;
    }>;
  };
  rewards?: BroadcastCtaRewardsDraft;
};

export type BroadcastCtaScheduleDraft = {
  dueAt?: string | null;
  expiresAt?: string | null;
};

export type BroadcastCtaItemDraft = {
  localId: string;
  itemType: "CTA";
  ctaKind: ThreadCtaKind;
  ctaConfig: BroadcastCtaDraftConfig;
  schedule?: BroadcastCtaScheduleDraft | null;
};

export type BroadcastOrderItemDraft = {
  localId: string;
  itemType: "ORDER";
  grossAmount: string;
  inScopeAmount?: string;
  summary: string;
  notes: string;
  paymentInstructionsJson?: string;
  items: CreateOrderItemRequest[];
};

export type BroadcastItemDraft =
  | BroadcastMessageItemDraft
  | BroadcastOfferItemDraft
  | BroadcastCtaItemDraft
  | BroadcastOrderItemDraft;

export type BroadcastDraft = {
  senderIdentity: ParticipantIdentity | null;
  title: string;
  recipients: BroadcastRecipientCreateDTO[];
  items: BroadcastItemDraft[];
};

/* ------------------------------ helper builders ------------------------------ */

export function buildBroadcastItemCreateDTO(
  item: BroadcastItemDraft
): BroadcastItemCreateDTO {
  if (item.itemType === "MESSAGE") {
    return {
      itemType: "MESSAGE",
      messageText: item.messageText || null,
      payload: item.payload ?? null,
      dueAt: null,
      expiresAt: null,
    };
  }

  if (item.itemType === "OFFER") {
    const parsed =
      item.maxRedemptionsOverride.trim().length > 0
        ? Number(item.maxRedemptionsOverride.trim())
        : null;

    return {
      itemType: "OFFER",
      offerTemplateId: item.offerTemplateId ?? "",
      maxRedemptionsOverride:
        parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      note: item.note.trim() || null,
      dueAt: item.schedule?.dueAt ?? null,
      expiresAt: item.schedule?.expiresAt ?? null,
    };
  }

  if (item.itemType === "ORDER") {
    return {
      itemType: "ORDER",
      orderPayload: {
        currencyCode: "INR",
        grossAmount: item.grossAmount,
        inScopeAmount: item.inScopeAmount || null,
        summary: item.summary || null,
        notes: item.notes || null,
        paymentInstructionsJson: item.paymentInstructionsJson || null,
        items: item.items ?? [],
        offerSelectionMode: "AUTO",
      },
      dueAt: null,
      expiresAt: null,
    };
  }

  return {
    itemType: "CTA",
    ctaKind: item.ctaKind,
    ctaConfigJson: JSON.stringify(item.ctaConfig ?? {}),
    dueAt: item.schedule?.dueAt ?? null,
    expiresAt: item.schedule?.expiresAt ?? null,
  };
}

/* ------------------------------ util type guards ------------------------------ */

export function isBroadcastMessageItem(
  item: BroadcastItemDTO | BroadcastItemCreateDTO | BroadcastItemDraft
): item is BroadcastMessageItemDTO | BroadcastMessageItemCreateDTO | BroadcastMessageItemDraft {
  return item.itemType === "MESSAGE";
}

export function isBroadcastCtaItem(
  item: BroadcastItemDTO | BroadcastItemCreateDTO | BroadcastItemDraft
): item is BroadcastCtaItemDTO | BroadcastCtaItemCreateDTO | BroadcastCtaItemDraft {
  return item.itemType === "CTA";
}

export function isBroadcastOfferItem(
  item: BroadcastItemDTO | BroadcastItemCreateDTO | BroadcastItemDraft
): item is BroadcastOfferItemDTO | BroadcastOfferItemCreateDTO | BroadcastOfferItemDraft {
  return item.itemType === "OFFER";
}

export function isBroadcastOrderItem(
  item: BroadcastItemDTO | BroadcastItemCreateDTO | BroadcastItemDraft
): item is BroadcastOrderItemDTO | BroadcastOrderItemCreateDTO | BroadcastOrderItemDraft {
  return item.itemType === "ORDER";
}