// src/services/productService.ts
import axios from "axios";
import { supabase } from "../supabaseClient";
import type {
  UUID,
  ProductRecord,
  ProductImageDTO,
  CreateProductRequest,
  UpdateProductRequest,
  AddProductImageRequest,
  OwnerProductListParams,
  ListParams,
} from "../types/catalog";

const API_BASE = __API_BASE__;

/**
 * Fetch Bearer token from Supabase session and return common headers.
 */
async function authHeaders(extra?: Record<string, string>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

function withQuery(url: string, params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}

/* --------------------------- Owner / business scoped --------------------------- */
/**
 * These endpoints require:
 * - Authorization Bearer token
 * - X-Acting-Business-Id header (preferred)
 * and MANAGE_PRODUCTS permission on backend.
 */

export async function listOwnerProducts(
  actingBusinessId: UUID,
  params: OwnerProductListParams = {}
): Promise<ProductRecord[]> {
  const url = withQuery(`${API_BASE}/products`, {
    active: params.active,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
    ecomIntegrationId: params.ecomIntegrationId,
  });

  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.get(url, { headers });
  return res.data as ProductRecord[];
}

export async function createProduct(
  actingBusinessId: UUID,
  body: CreateProductRequest
): Promise<ProductRecord> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.post(`${API_BASE}/products`, body, { headers });
  return res.data as ProductRecord;
}

export async function getOwnerProductById(
  actingBusinessId: UUID,
  productId: UUID
): Promise<ProductRecord | null> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  try {
    const res = await axios.get(`${API_BASE}/products/${encodeURIComponent(productId)}`, { headers });
    return res.data as ProductRecord;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function getOwnerProductBySlug(
  actingBusinessId: UUID,
  slug: string
): Promise<ProductRecord | null> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  try {
    const res = await axios.get(`${API_BASE}/products/slug/${encodeURIComponent(slug)}`, { headers });
    return res.data as ProductRecord;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function updateProduct(
  actingBusinessId: UUID,
  productId: UUID,
  body: UpdateProductRequest
): Promise<ProductRecord> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.put(`${API_BASE}/products/${encodeURIComponent(productId)}`, body, { headers });
  return res.data as ProductRecord;
}

export type DeleteProductResult =
  | { ok: true }
  | { ok: false; kind: "NOT_FOUND" }
  | { ok: false; kind: "BLOCKED"; message: string; bundleSlugs: string[] }
  | { ok: false; kind: "ERROR"; status?: number; message: string };

export async function deleteProduct(
  actingBusinessId: UUID,
  productId: UUID
): Promise<DeleteProductResult> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });

  try {
    // Ktor returns 204 No Content on success
    await axios.delete(`${API_BASE}/products/${encodeURIComponent(productId)}`, { headers });
    return { ok: true };
  } catch (e: any) {
    const status = e?.response?.status as number | undefined;

    if (status === 404) {
      return { ok: false, kind: "NOT_FOUND" };
    }

    if (status === 409) {
      const data = e?.response?.data;
      const message =
        typeof data === "string"
          ? data
          : data?.message || "Cannot delete product because it is referenced elsewhere.";

      const bundleSlugs = Array.isArray(data?.bundleSlugs) ? data.bundleSlugs : [];
      return { ok: false, kind: "BLOCKED", message, bundleSlugs };
    }

    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Delete failed";

    return { ok: false, kind: "ERROR", status, message: msg };
  }
}

/* ------------------------------- Images APIs ------------------------------- */

export async function listProductImages(
  actingBusinessId: UUID,
  productId: UUID
): Promise<ProductImageDTO[]> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.get(`${API_BASE}/products/${encodeURIComponent(productId)}/images`, { headers });
  return res.data as ProductImageDTO[];
}

export async function addProductImage(
  actingBusinessId: UUID,
  productId: UUID,
  body: AddProductImageRequest
): Promise<ProductImageDTO> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.post(`${API_BASE}/products/${encodeURIComponent(productId)}/images`, body, { headers });
  return res.data as ProductImageDTO;
}

export async function removeProductImageAtPosition(
  actingBusinessId: UUID,
  productId: UUID,
  position: number
): Promise<boolean> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  try {
    await axios.delete(
      `${API_BASE}/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(String(position))}`,
      { headers }
    );
    return true; // 204
  } catch (e: any) {
    if (e?.response?.status === 404) return false;
    throw e;
  }
}

export async function setPrimaryProductImageFromPosition(
  actingBusinessId: UUID,
  productId: UUID,
  position: number
): Promise<ProductRecord> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.post(
    `${API_BASE}/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(String(position))}/primary`,
    {},
    { headers }
  );
  return res.data as ProductRecord;
}

/* --------------------------- Viewable catalog routes --------------------------- */
/**
 * Still authenticated on backend, but does NOT require acting business header.
 * Routes (from ProductRoutes.kt):
 * - GET /business/{businessSlug}/products
 * - GET /business/{businessSlug}/products/{productSlug}
 */

export async function listProductsForBusinessSlug(
  businessSlug: string,
  params: ListParams = {}
): Promise<ProductRecord[]> {
  const url = withQuery(`${API_BASE}/business/${encodeURIComponent(businessSlug)}/products`, {
    active: params.active ?? true,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });

  const headers = await authHeaders();
  const res = await axios.get(url, { headers });
  return res.data as ProductRecord[];
}

export async function getProductForBusinessSlug(
  businessSlug: string,
  productSlug: string
): Promise<ProductRecord | null> {
  const headers = await authHeaders();
  try {
    const res = await axios.get(
      `${API_BASE}/business/${encodeURIComponent(businessSlug)}/products/${encodeURIComponent(productSlug)}`,
      { headers }
    );
    return res.data as ProductRecord;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}
