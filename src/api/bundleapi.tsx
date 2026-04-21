import { authFetch } from "../utils/auth";
import { BundleDTO, CreateBundleReq, UpdateBundleReq } from "../types/bundle";

const API_BASE = import.meta.env.VITE_API_BASE as string;

// ----- Owner scope -----
export async function listBundles(params: { active?: boolean; limit?: number; offset?: number } = {}): Promise<BundleDTO[]> {
  const q = new URLSearchParams();
  if (params.active !== undefined) q.set("active", String(params.active));
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  const res = await authFetch(`${API_BASE}/bundles?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBundleById(id: string): Promise<BundleDTO> {
  const res = await authFetch(`${API_BASE}/bundles/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createBundle(body: CreateBundleReq): Promise<BundleDTO> {
  const res = await authFetch(`${API_BASE}/bundles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateBundle(id: string, body: UpdateBundleReq): Promise<BundleDTO> {
  const res = await authFetch(`${API_BASE}/bundles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteBundle(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/bundles/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

// ----- Catalog scope (any authed user) -----
export async function listBusinessBundles(
  businessSlug: string,
  params: { active?: boolean; limit?: number; offset?: number } = {}
): Promise<BundleDTO[]> {
  console.log("listBusinessBundles called with:", businessSlug, params);
  const q = new URLSearchParams();
  if (params.active !== undefined) q.set("active", String(params.active));
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  const res = await authFetch(`${API_BASE}/business/${encodeURIComponent(businessSlug)}/bundles?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
