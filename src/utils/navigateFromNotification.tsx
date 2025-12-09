import { NotificationDTO } from "../types/notification";
import { NavigateFunction } from "react-router-dom";

export function navigateFromNotification(
  notification: NotificationDTO,
  navigate: NavigateFunction
) {
  const { contextType, contextId, contextSlug, metadata } = notification;

  switch (contextType) {
    case "REFERRAL_THREAD":
    case "REFERRAL":
      if (contextSlug) {
        navigate(`/referral/${contextSlug}/thread`);
      }
      break;

    case "INVITE_THREAD": {
      const campaignId = metadata?.campaignId;
      const inviteId = contextId || metadata?.inviteId;
      if (campaignId && inviteId) {
        navigate(`/campaigns/${campaignId}/invites/${inviteId}`);
      }
      break;
    }

    case "OFFER_DETAILS":
      if (contextId) {
        navigate(`/offers/${contextId}`);
      }
      break;

    case "WALLET_STORE":
      if (contextSlug) {
        navigate(`/wallet/${contextSlug}/store`);
      }
      break;

    case "OPEN_CAMPAIGN": {
      const campaignSlug = contextSlug || metadata?.campaignSlug;
      const openInviteSlug = metadata?.openInviteSlug;
      if (campaignSlug && openInviteSlug) {
        navigate(`/campaign-open/${campaignSlug}/${openInviteSlug}`);
      }
      break;
    }

    case "OPEN_REFERRAL": {
      const openReferralSlug = contextSlug || metadata?.openReferralSlug;
      if (openReferralSlug) {
        navigate(`/open/${openReferralSlug}`);
      }
      break;
    }

    case "PROFILE":
      if (contextSlug) {
        navigate(`/profile/${contextSlug}`);
      }
      break;

    default:
      // No-op or fallback
      break;
  }
}
