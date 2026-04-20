import { NotificationDTO } from "../types/notification";
import { NavigateFunction } from "react-router-dom";

/**
 * Navigation rules (backward compatible):
 * - Prefer thread-based routes (v2): /threads/:threadId
 *   Thread id can come from:
 *     - notification.metadata.threadId / referralThreadId / inviteThreadId
 *     - notification.contextId when contextType looks like a thread
 * - Fall back to legacy routes (v1) if only slugs are available.
 */
export function navigateFromNotification(
  notification: NotificationDTO,
  navigate: NavigateFunction
) {
  const { contextType, contextId, contextSlug, metadata } = notification;

  const ct = String(contextType ?? "").toUpperCase();

  // ---- V2: thread-first navigation ----
  const metaThreadId =
    metadata?.threadId ||
    metadata?.referralThreadId ||
    metadata?.inviteThreadId ||
    metadata?.threadID ||
    metadata?.referral_thread_id ||
    null;

  const threadId =
    (typeof metaThreadId === "string" && metaThreadId.trim() ? metaThreadId.trim() : null) ||
    ((ct.includes("THREAD") || ct === "THREAD") &&
    typeof contextId === "string" &&
    contextId.trim()
      ? contextId.trim()
      : null);

  if (threadId) {
    navigate(`/threads/${encodeURIComponent(threadId)}`);
    return;
  }

  // ---- Legacy fallbacks (keep working for older payloads) ----
  switch (ct) {
    case "REFERRAL_THREAD":
    case "REFERRAL":
      // older UI used /referral/:slug/thread
      if (contextSlug) {
        navigate(`/referral/${encodeURIComponent(contextSlug)}/thread`);
      }
      break;

    case "INVITE_THREAD":
    case "INVITE":
    case "CAMPAIGN_INVITE": {
      const campaignId = metadata?.campaignId;
      const inviteId = contextId || metadata?.inviteId;
      if (campaignId && inviteId) {
        navigate(
          `/campaigns/${encodeURIComponent(String(campaignId))}/invites/${encodeURIComponent(
            String(inviteId)
          )}/thread`
        );
      }
      break;
    }

    case "OFFER_DETAILS":
    case "OFFER":
      if (contextId) {
        navigate(`/offers/${encodeURIComponent(contextId)}`);
      }
      break;

    case "WALLET_STORE":
    case "WALLET":
      if (contextSlug) {
        navigate(`/wallet/${encodeURIComponent(contextSlug)}/store`);
      }
      break;

    case "MY_OFFERS":
      navigate(`/my-offers`);
      break;

    case "WALLET_OFFER": {
      const businessSlug = contextSlug || metadata?.businessSlug;
      const offerTemplateId = metadata?.offerTemplateId;
      if (businessSlug && offerTemplateId) {
        navigate(
          `/wallet/${encodeURIComponent(String(businessSlug))}/offers/${encodeURIComponent(
            String(offerTemplateId)
          )}`
        );
      } else if (businessSlug) {
        navigate(`/wallet/${encodeURIComponent(String(businessSlug))}/store`);
      } else {
        navigate(`/my-offers`);
      }
      break;
    }

    case "OPEN_CAMPAIGN": {
      const campaignSlug = contextSlug || metadata?.campaignSlug;
      const openInviteSlug = metadata?.openInviteSlug;
      if (campaignSlug && openInviteSlug) {
        navigate(
          `/campaign-open/${encodeURIComponent(String(campaignSlug))}/${encodeURIComponent(
            String(openInviteSlug)
          )}`
        );
      }
      break;
    }

    case "OPEN_REFERRAL": {
      const openReferralSlug = contextSlug || metadata?.openReferralSlug;
      if (openReferralSlug) {
        navigate(`/open/${encodeURIComponent(String(openReferralSlug))}`);
      }
      break;
    }

    case "PROFILE":
      if (contextSlug) {
        navigate(`/profile/${encodeURIComponent(contextSlug)}`);
      }
      break;

    default:
      // No-op or fallback
      break;
  }
}