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

    case "INVITE_THREAD":
    case "INVITE":
    case "CAMPAIGN_INVITE": 
      {
      const campaignId = metadata?.campaignId;
      const inviteId = contextId || metadata?.inviteId;
      if (campaignId && inviteId) {
        navigate(`/campaigns/${campaignId}/invites/${inviteId}/thread`);
      }
      break;
    }

    case "OFFER_DETAILS":
    case "OFFER":
      if (contextId) {
        navigate(`/offers/${contextId}`);
      }
      break;

    case "WALLET_STORE":
    case "WALLET":
      if (contextSlug) {
        navigate(`/wallet/${contextSlug}/store`);
      }
      break;

    case "MY_OFFERS":
      if (contextSlug) {
        navigate(`/my-offers`);
      }
      break;

    case "WALLET_OFFER": {
      const businessSlug = contextSlug || metadata?.businessSlug;
      const offerTemplateId = metadata?.offerTemplateId;
      if (businessSlug && offerTemplateId) {
        navigate(`/wallet/${businessSlug}/offers/${offerTemplateId}`);
      } else if (businessSlug) {
        // fallback: open store
        navigate(`/wallet/${businessSlug}/store`);
      } else {
        // last fallback
        navigate(`/my-offers`);
      }
      break;
    }

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
