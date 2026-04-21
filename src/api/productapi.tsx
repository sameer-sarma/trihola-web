// src/modules/products/api.ts
import { ProductDTO, CreateProductReq, UpdateProductReq, ProductImageDTO, AddImageReq } from "../types/product";
import {EcomIntegrationResponse} from "../types/ecomTypes";
// Reuse your existing wrapper; adjust path if needed:
import { authFetch } from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://api.trihola.com"; // adjust

// -------- Owner (existing) --------
export async function listProducts(params: {
  active?: boolean;
  ecomIntegrationId?: string;
  limit?: number;
  offset?: number;
}): Promise<ProductDTO[]> {
  const q = new URLSearchParams();
  if (params.active !== undefined) q.set("active", String(params.active));
  if (params.ecomIntegrationId) q.set("ecomIntegrationId", params.ecomIntegrationId);
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  const res = await authFetch(`${API_BASE}/products?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProductBySlug(slug: string): Promise<ProductDTO> {
  const res = await authFetch(`${API_BASE}/products/slug/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProductById(id: string): Promise<ProductDTO> {
  const res = await authFetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createProduct(body: CreateProductReq): Promise<ProductDTO> {
  const res = await authFetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProduct(id: string, body: UpdateProductReq): Promise<ProductDTO> {
  const res = await authFetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function listImages(productId: string): Promise<ProductImageDTO[]> {
  const res = await authFetch(`${API_BASE}/products/${productId}/images`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addImage(productId: string, body: AddImageReq): Promise<ProductImageDTO> {
  const res = await authFetch(`${API_BASE}/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeImage(productId: string, position: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/products/${productId}/images/${position}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function setPrimaryFromPosition(productId: string, position: number): Promise<ProductDTO> {
  const res = await authFetch(`${API_BASE}/products/${productId}/images/${position}/primary`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// -------- Catalog (authenticated, viewable by any logged-in user) --------
export async function listBusinessProducts(
  businessSlug: string,
  params: { active?: boolean; limit?: number; offset?: number } = {}
): Promise<ProductDTO[]> {
  const q = new URLSearchParams();
  if (params.active !== undefined) q.set("active", String(params.active));
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  const res = await authFetch(
    `${API_BASE}/business/${encodeURIComponent(businessSlug)}/products?${q.toString()}`
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBusinessProduct(
  businessSlug: string,
  productSlug: string
): Promise<ProductDTO> {
  const res = await authFetch(
    `${API_BASE}/business/${encodeURIComponent(businessSlug)}/products/${encodeURIComponent(productSlug)}`
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listEcomIntegrations(): Promise<EcomIntegrationResponse[]> {
  const res = await authFetch(`${API_BASE}/ecom/integrations`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}