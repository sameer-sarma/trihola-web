import type {
  OfferScopeKind,
  ScopeItemSnapshot,
  GrantItemSnapshot,
  GrantDiscountType,
} from "../types/offer"; // ← adjust relative path

export interface ReferralDTO {
  id: string;
  slug: string;

  referrerId: string;
  referrerName?: string;
  referrerProfileSlug?: string;
  referrerProfileImageUrl?: string;
  referrerOfferId?: string | null;

  prospectId: string;
  prospectName?: string;
  prospectProfileSlug?: string;
  prospectProfileImageUrl?: string;
  prospectOfferId?: string | null;

  businessId: string;
  businessName?: string;
  businessProfileSlug?: string;
  businessSlug?: string;
  businessProfileImageUrl?: string;

   // NEW — server enrichment
  productId?: string | null;
  productName?: string | null;
  productImageUrl?: string | null;
  productSlug?: string | null;

  bundleId?: string | null;
  bundleTitle?: string | null;
  bundleSlug?: string | null;

  note?: string | null;
  status: string;
  businessAcceptanceStatus: string;
  prospectAcceptanceStatus: string;
  
  referrerOffer?: EmbeddedOfferDTO | null;
  prospectOffer?: EmbeddedOfferDTO | null;

  createdAt: string;
  updatedAt: string;
}

export type ReferralPublicView = {
  id: string;
  slug: string;
  status: string; // or a ReferralStatus union if you already have one
  createdAt: string;
  note?: string | null;

  referrerName?: string | null;
  referrerProfileSlug?: string | null;
  referrerProfileImageUrl?: string | null;

  prospectName?: string | null;
  prospectProfileSlug?: string | null;
  prospectProfileImageUrl?: string | null;

  businessName?: string | null;
  businessProfileSlug?: string | null;
  businessSlug?: string | null;
  businessProfileImageUrl?: string | null;

  productName?: string | null;
  productImageUrl?: string | null;
  productSlug?: string | null;

  bundleTitle?: string | null;
  bundleSlug?: string | null;

  referrerOffer?: EmbeddedOfferDTO | null;
  prospectOffer?: EmbeddedOfferDTO | null;
  isParticipant: boolean;
};

export type CreateReferralReq = {
  prospectUserId: string;
  businessUserId: string;
  note: string;
  productId?: string;  // optional, XOR with bundleId
  bundleId?: string;   // optional
};

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
  claimId?: string;
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
  message: string;
}

export interface SystemAlertMetadata {
  eventSubType: string;
  message: string;
}

export type ParticipantRole = "REFERRER" | "PROSPECT" | "BUSINESS"| "AFFILIATE";

export interface EmbeddedOfferDTO {
  id: string;
  title: string;
  status: string;
  assignedToName?: string | null;
  assignedByName?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  scopeKind?: OfferScopeKind | null;         // server default: ANY
  scopeItems: ScopeItemSnapshot[];           // [] by default from server
  grants: GrantItemSnapshot[];               // [] by default from server
  grantPickLimit: number;                    // server default: 1
  grantDiscountType?: GrantDiscountType | null; // server default: FREE
  grantDiscountValue?: number | null;        // server default: null
}

// WebSocket envelope for side-panel updates
export type ReferralUpdatedMsg = {
  type: "REFERRAL_UPDATED";
  slug: string;
  updatedAt: string;
  reason:
    | "ASSIGN_OFFER" | "UNASSIGN_OFFER" | "OFFER_UPDATED"
    | "ACCEPT" | "REJECT" | "CANCEL"
    | "CLAIM_APPROVED" | "CLAIM_REJECTED" | "CLAIM_EXPIRED" | "CLAIM_REDEEMED"
    | "REFERRAL_CREATED" | string;
  changed?: string[];
  referral: ReferralDTO;
};

export type RefLike = {
  businessSlug?: string | null;

  // product
  productId?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  productImageUrl?: string | null;        // fallback

  // bundle
  bundleId?: string | null;
  bundleSlug?: string | null;
  bundleTitle?: string | null;
};

export function getAttachedInfo(r: RefLike) {
  if (r.productId || (r.businessSlug && r.productSlug)) {
    const url = r.businessSlug && r.productSlug
      ? `/${r.businessSlug}/${r.productSlug}`     // product route
      : (r.productId ? `/products/${r.productId}` : "#");
    return { kind: "product" as const, title: r.productName ?? "Product", url, imageUrl: r.productImageUrl ?? null };
  }
  if (r.bundleId || (r.businessSlug && r.bundleSlug)) {
    const url = r.businessSlug && r.bundleSlug
      ? `/${r.businessSlug}/bundle/${r.bundleSlug}` // bundle route
      : (r.bundleId ? `/bundles/${r.bundleId}` : "#");
    return { kind: "bundle" as const, title: r.bundleTitle ?? "Bundle", url, imageUrl: null };
  }
  return null;
}