import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as api from "../api/bundleapi";
import type { BundleDTO, CreateBundleReq, UpdateBundleReq } from "../types/bundle";

export const bundleKeys = {
  all: ["bundles"] as const,
  list: (params?: object) => [...bundleKeys.all, "list", params] as const,
  detail: (id: string) => [...bundleKeys.all, "detail", id] as const,
  catalogList: (bizSlug: string, params?: object) => [...bundleKeys.all, "catalog", bizSlug, "list", params] as const,
};

export function useBundles(params: { active?: boolean; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: bundleKeys.list(params),
    queryFn: () => api.listBundles(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useBusinessBundles(businessSlug: string, params: { active?: boolean; limit?: number; offset?: number } = {}, enabled = true) {
  return useQuery({
    queryKey: bundleKeys.catalogList(businessSlug, params),
    queryFn: () => api.listBusinessBundles(businessSlug, params),
    enabled: !!businessSlug && enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBundleReq) => api.createBundle(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: bundleKeys.all }),
  });
}

export function useUpdateBundle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBundleReq) => api.updateBundle(id, body),
    onSuccess: (updated: BundleDTO) => {
      qc.invalidateQueries({ queryKey: bundleKeys.all });
      qc.setQueryData(bundleKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBundle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bundleKeys.all }),
  });
}
