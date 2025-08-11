export interface ReferralDTO {
  id: string;
  slug: string;

  referrerId: string;
  referrerName?: string;
  referrerSlug?: string;
  referrerProfileImageUrl?: string;
  referrerOfferId?: string | null;

  prospectId: string;
  prospectName?: string;
  prospectSlug?: string;
  prospectProfileImageUrl?: string;
  prospectOfferId?: string | null;

  businessId: string;
  businessName?: string;
  businessSlug?: string;
  businessProfileImageUrl?: string;

  note: string;
  status: string;
  businessAcceptanceStatus: string;
  prospectAcceptanceStatus: string;

  createdAt: string;
  updatedAt: string;
}

export type ReferralThreadEventType =
  | "USER_MESSAGE"
  | "REFERRAL_EVENT"
  | "OFFER_EVENT"
  | "CONTACT_EVENT"
  | "SYSTEM_ALERT";

export interface ReferralThreadEventDTO {
  id: string;
  referralId: string;
  senderUserId?: string;
  eventType: ReferralThreadEventType;
  content: string;
  metadata?: ReferralThreadMetadata;
  dontShowToRole?: ParticipantRole;
  createdAt: string;
}

export type ReferralThreadMetadata =
  | MessageMetadata
  | ReferralEventMetadata
  | OfferEventMetadata
  | ContactEventMetadata
  | SystemAlertMetadata;

export interface MessageMetadata {
  actorName: string;
  message: string;
  attachmentUrls?: string[];
}

export interface ReferralEventMetadata {
  actorName: string;
  recipientName?: string;
  recipientUserId?: string;
  eventSubType: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface OfferEventMetadata {
  actorName: string;
  recipientName: string;
  offerId: string;
  offerTitle: string;
  eventSubType: string;
  previousStatus?: string;
  newStatus?: string;
  redemptionType?: string;
  redemptionValue?: string;
}

export interface ContactEventMetadata {
  actorName: string;
  contactName: string;
  contactUserId: string;
}

export interface SystemAlertMetadata {
  eventSubType: string;
  message: string;
}

export type ParticipantRole = "REFERRER" | "PROSPECT" | "BUSINESS";
