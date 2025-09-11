// src/modules/products/queries.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData  } from "@tanstack/react-query";
import * as api from "../api/productapi";
import { CreateProductReq, UpdateProductReq, ProductDTO, ProductImageDTO } from "../types/product";
import { EcomIntegrationResponse } from "../types/ecomTypes";
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE as string;

export const productKeys = {
  all: ["products"] as const,
  list: (params: object) => [...productKeys.all, "list", params] as const,
  detail: (slugOrId: string) => [...productKeys.all, "detail", slugOrId] as const,
  images: (productId: string) => [...productKeys.all, "images", productId] as const,
    // NEW: separate cache space for catalog reads
  catalogList: (bizSlug: string, params?: object) =>
    [...productKeys.all, "catalog", bizSlug, "list", params] as const,
  catalogDetail: (bizSlug: string, productSlug: string) =>
    [...productKeys.all, "catalog", bizSlug, "detail", productSlug] as const,
};

// ---------- Owner (existing) ----------
export function useProducts(params: { active?: boolean; ecomIntegrationId?: string; limit?: number; offset?: number },
  opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => api.listProducts(params),
    placeholderData: keepPreviousData, 
    staleTime: 30_000,
    enabled: opts.enabled ?? true, 
  });
}

export function useProductsInfinite(params: {
  active?: boolean;
  ecomIntegrationId?: string;
  pageSize?: number;
}) {
  const pageSize = params.pageSize ?? 20;

  return useInfiniteQuery<ProductDTO[], Error>({
    queryKey: productKeys.list({ ...params, pageSize }),
    initialPageParam: 0, // <-- v5 requires this
    queryFn: ({ pageParam }) =>
      api.listProducts({
        active: params.active,
        ecomIntegrationId: params.ecomIntegrationId,
        limit: pageSize,
        offset: pageParam as number, // offset paging
      }),
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === pageSize ? (lastPageParam as number) + lastPage.length : undefined,
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: productKeys.detail(`slug:${slug}`),
    queryFn: () => api.getProductBySlug(slug),
    enabled: !!slug,
  });
}

export function useProductById(id?: string) {
  return useQuery({
    queryKey: productKeys.detail(`id:${id}`),
    queryFn: () => api.getProductById(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductReq) => api.createProduct(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProductReq) => api.updateProduct(id, body),
    onSuccess: (updated: ProductDTO) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.setQueryData(productKeys.detail(`id:${id}`), updated);
      qc.setQueryData(productKeys.detail(`slug:${updated.slug}`), updated);
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useImages(productId: string) {
  return useQuery({
    queryKey: productKeys.images(productId),
    queryFn: () => api.listImages(productId),
    enabled: !!productId,
  });
}

export function useAddImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { url: string; position?: number }) => api.addImage(productId, vars),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: productKeys.images(productId) });
      const prev = qc.getQueryData<ProductImageDTO[]>(productKeys.images(productId)) || [];
      const optimistic: ProductImageDTO = {
        id: `optimistic-${Date.now()}`,
        productId,
        position: (vars.position ?? Math.min((prev[prev.length - 1]?.position ?? 0) + 1, 3)) as 1 | 2 | 3,
        url: vars.url,
      };
      qc.setQueryData(productKeys.images(productId), [...prev, optimistic].slice(0, 3));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(productKeys.images(productId), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.images(productId) }),
  });
}

export function useRemoveImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (position: number) => api.removeImage(productId, position),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.images(productId) }),
  });
}

export function useMakePrimary(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (position: number) => api.setPrimaryFromPosition(productId, position),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: productKeys.images(productId) });
      qc.setQueryData(productKeys.detail(`id:${productId}`), updated);
      qc.setQueryData(productKeys.detail(`slug:${updated.slug}`), updated);
    },
  });
}

// ---------- Catalog (authenticated) ----------
export function useBusinessProducts(
  businessSlug: string,
  params: { active?: boolean; limit?: number; offset?: number } = {},
  opts: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: productKeys.catalogList(businessSlug, params),
    queryFn: () => api.listBusinessProducts(businessSlug, params),
    enabled: (opts.enabled ?? true) && !!businessSlug,   // <— new
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useBusinessProduct(businessSlug: string, productSlug: string) {
  return useQuery({
    queryKey: productKeys.catalogDetail(businessSlug, productSlug),
    queryFn: () => api.getBusinessProduct(businessSlug, productSlug),
    enabled: !!businessSlug && !!productSlug,
  });
}

// ---------- Direct axios helpers (kept as-is) ----------
export async function addProductImage(
  productId: string,
  body: { url: string; position?: number | null },
  token?: string
) {
  const { data } = await axios.post(
    `${API_BASE}/products/${productId}/images`,
    body,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  return data;
}

// NEW: list current images (to avoid position collisions and respect 1..3)
export async function listProductImages(productId: string, token?: string) {
  const { data } = await axios.get(
    `${API_BASE}/products/${productId}/images`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  // expected: [{ id, position, url }, ...]
  return data as Array<{ id: string; position: number; url: string }>;
}

//NEW: Add a small hook to fetch once and cache 
export function useEcomIntegrations() {
  return useQuery<EcomIntegrationResponse[], Error>({
    queryKey: ["ecom", "integrations"],
    queryFn: () => api.listEcomIntegrations(),
    staleTime: 60_000,
  });
}