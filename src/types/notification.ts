export interface NotificationDTO {
  id: string;
  userId: string;
  kind: string;               // "referral.message", "invite.message", etc.
  title: string;
  body: string;
  contextType?: string | null; // "REFERRAL_THREAD", "INVITE_THREAD", "OFFER_DETAILS", ...
  contextId?: string | null;
  contextSlug?: string | null;
  metadata?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;          // ISO timestamp from Instant
}
