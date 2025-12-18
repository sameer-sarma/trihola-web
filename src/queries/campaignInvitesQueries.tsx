// =============================================
// FILE: src/queries/campaignInvitesQueries.tsx
// (React Query hooks with infinite pagination)
// =============================================
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { acceptInvite, declineInvite, listCampaignInvites, sendCampaignInvites, getInviteDetail, getPublicCampaignInviteLanding,
getOpenAffiliateCampaignLanding, joinCampaignViaOpenInvite, listMyInvites } from '../api/campaigninvitesapi';
import type { CampaignInvite, Paginated, SendCampaignInvitesRequest, InviteDetailResponse } from '../types/invites';
import type { PublicCampaignInviteLandingView } from '../types/invites';
import type { CampaignPublicDTO } from '../types/campaign';

export function useInfiniteCampaignInvites(campaignId: string, token?: string, pageSize = 25) {
return useInfiniteQuery<Paginated<CampaignInvite>>({
queryKey: ['campaignInvites', campaignId, token, pageSize],
queryFn: ({ pageParam }) => listCampaignInvites({ campaignId,  cursor: (pageParam as string | null) ?? null, limit: pageSize, token }),
initialPageParam: null as string | null,
getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
});
}


export function useSendCampaignInvitesMutation(campaignId: string, token?: string) {
const qc = useQueryClient();
return useMutation({
mutationFn: (payload: SendCampaignInvitesRequest) => sendCampaignInvites(campaignId, payload, token),
onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaignInvites', campaignId] }); },
});
}


export function useAcceptInviteMutation(inviteId: string, token?: string) {
const qc = useQueryClient();
return useMutation({
mutationFn: () => acceptInvite(inviteId, token),
onSuccess: () => { 
  qc.invalidateQueries({ queryKey: ['campaignInvites'] });
  qc.invalidateQueries({ queryKey: ["myInvites"] });
},
});
}


export function useDeclineInviteMutation(inviteId: string, token?: string) {
const qc = useQueryClient();
return useMutation({
mutationFn: () => declineInvite(inviteId, token),
onSuccess: () => { 
  qc.invalidateQueries({ queryKey: ['campaignInvites'] });
  qc.invalidateQueries({ queryKey: ["myInvites"] });
},
});
}

export function useInviteDetail(
  campaignId: string | undefined,
  inviteId: string | undefined,
  token?: string
) {
  return useQuery<InviteDetailResponse>({
    queryKey: ["inviteDetail", campaignId, inviteId, token],
    enabled: !!campaignId && !!inviteId && !!token,
    queryFn: () => getInviteDetail(campaignId!, inviteId!, token),
  });
}

export function usePublicCampaignInviteLanding(
  inviteId: string | undefined,
  token?: string
) {
  return useQuery<PublicCampaignInviteLandingView>({
    queryKey: ['publicCampaignInviteLanding', inviteId, token],
    enabled: !!inviteId, // token is optional; inviteId is required
    queryFn: () => getPublicCampaignInviteLanding(inviteId!, token),
  });
}

export function useOpenAffiliateCampaignLanding(
  campaignSlug: string | undefined,
  openInviteSlug: string | undefined,
  token?: string
) {
  return useQuery<CampaignPublicDTO>({
    queryKey: [
      "openAffiliateCampaignLanding",
      campaignSlug,
      openInviteSlug,
      token,
    ],
    enabled: !!campaignSlug && !!openInviteSlug,
    queryFn: () =>
      getOpenAffiliateCampaignLanding(campaignSlug!, openInviteSlug!, token),
  });
}

export function useJoinOpenAffiliateInviteMutation(
  campaignSlug: string,
  openInviteSlug: string,
  token?: string
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      joinCampaignViaOpenInvite(campaignSlug, openInviteSlug, token),
    onSuccess: () => {
      // Refresh relevant data
      qc.invalidateQueries({ queryKey: ["campaignInvites"] });
      qc.invalidateQueries({
        queryKey: [
          "openAffiliateCampaignLanding",
          campaignSlug,
          openInviteSlug,
          token,
        ],
      });
      // If you have a "my affiliate invites" key, you can also invalidate that here
      qc.invalidateQueries({ queryKey: ["myAffiliateInvites"] });
    },
  });
}

export function useMyInvites(token?: string) {
  return useQuery({
    queryKey: ["myInvites", token],
    enabled: !!token,
    queryFn: () => listMyInvites(token!),
  });
}