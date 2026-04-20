// src/queries/campaignQueries.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as api from "../api/campaignapi";
import type { CampaignOwnerDTO, CreateCampaignReq, CampaignPublicDTO, CampaignImageReq, CampaignHubDTO, CampaignStatus, OpenAffiliateMode} from "../types/campaign";

export const campaignKeys = {
  all: ["campaigns"] as const,
  mine: (params?: object) => [...campaignKeys.all, "mine", params] as const,
  detail: (id: string) => [...campaignKeys.all, "detail", id] as const,

  // catalog (any authenticated user)
  catalogList: (bizSlug: string, params?: object) => [...campaignKeys.all, "catalog", bizSlug, "list", params] as const,
  catalogDetail: (bizSlug: string, campaignSlug: string) =>
    [...campaignKeys.all, "catalog", bizSlug, "detail", campaignSlug] as const,
  hub: () => [...campaignKeys.all, "hub"] as const,
};

// ---------- Owner (mine) ----------
export function useMyCampaigns(
  params: { status?: string; limit?: number; offset?: number } = {},
  opts: { enabled?: boolean } = {}
) {
  return useQuery<CampaignOwnerDTO[]>({
    queryKey: campaignKeys.mine(params),
    queryFn: () => api.listMyCampaigns(params),
    enabled: opts.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCampaignById(id?: string, opts: { enabled?: boolean } = {}) {
  return useQuery<CampaignOwnerDTO>({
    queryKey: campaignKeys.detail(`id:${id}`),
    queryFn: () => api.getCampaignById(id!),
    enabled: !!id && (opts.enabled ?? true),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCampaignReq) => api.createCampaign(body),
    onSuccess: (_res) => {
      // refresh lists, and you can also prefetch detail
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      // Optionally set the detail cache here if you immediately navigate to it.
      // qc.setQueryData(campaignKeys.detail(`id:${res.campaignId}`), /* owner DTO if you fetched it */);
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: Partial<CreateCampaignReq> }) =>
      api.updateCampaign(args.id, args.body),
    onSuccess: (_res, vars) => {
      // refresh the lists and detail for this campaign
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(`id:${vars.id}`) });
    },
  });
}

// ---------- Catalog (authenticated) ----------
export function useBusinessCampaigns(
  businessSlug: string,
  params: { status?: string; limit?: number; offset?: number } = {},
  opts: { enabled?: boolean } = {}
) {
  return useQuery<CampaignPublicDTO[]>({
    queryKey: campaignKeys.catalogList(businessSlug, params),
    queryFn: () => api.listBusinessCampaigns(businessSlug, params),
    enabled: !!businessSlug && (opts.enabled ?? true),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useBusinessCampaign(
  businessSlug: string,
  campaignSlug: string,
  opts: { enabled?: boolean } = {}
) {
  return useQuery<CampaignPublicDTO>({
    queryKey: campaignKeys.catalogDetail(businessSlug, campaignSlug),
    queryFn: () => api.getBusinessCampaign(businessSlug, campaignSlug),
    enabled: !!businessSlug && !!campaignSlug && (opts.enabled ?? true),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.mine({}) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useReplaceCampaignImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; images: CampaignImageReq[] }) =>
      api.replaceCampaignImages(args.id, args.images),
    onSuccess: (_res, vars) => {
      // refresh detail + my list, since we show primaryImageUrl in cards
      qc.invalidateQueries({ queryKey: campaignKeys.detail(`id:${vars.id}`) });
      qc.invalidateQueries({ queryKey: campaignKeys.mine() });
    },
  });
}

export function useSetCampaignOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { campaignId: string; offerTemplateId: string; token: string }) => {
      const { campaignId, offerTemplateId, token } = params;
      await api.setCampaignOffer(campaignId, offerTemplateId, token);
    },
    onSuccess: (_data, variables) => {
      // invalidate that campaign so Edit page refreshes and shows new offer
      qc.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
    },
  });
}

export function useDeleteCampaignOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { campaignId: string; token: string }) => {
      const { campaignId, token } = params;
      await api.deleteCampaignOffer(campaignId, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
    },
  });
}


export function useCampaignHub(opts: { enabled?: boolean } = {}) {
  return useQuery<CampaignHubDTO>({
    queryKey: campaignKeys.hub(),
    queryFn: () => api.getCampaignHub(),
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: CampaignStatus }) =>
      api.updateCampaignStatusApi(args.id, args.status),
    onSuccess: (_res, vars) => {
      // refresh everything campaign-related
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(`id:${vars.id}`) });
      qc.invalidateQueries({ queryKey: campaignKeys.mine({}) });
    },
  });
}

export function useUpdateOpenAffiliateMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; mode: OpenAffiliateMode }) =>
      api.updateOpenAffiliateModeApi(args.id, args.mode),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(`id:${vars.id}`) });
      qc.invalidateQueries({ queryKey: campaignKeys.mine({}) });
    },
  });
}
