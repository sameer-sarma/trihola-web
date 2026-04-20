// src/services/bundleService.ts
import axios from "axios";
import { supabase } from "../supabaseClient";
import type {
  UUID,
  BundleRecord,
  CreateBundleRequest,
  UpdateBundleRequest,
  ListParams,
} from "../types/catalog";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "";

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
 * - X-Acting-Business-Id header
 * and MANAGE_BUNDLES permission on backend.
 */

export async function listOwnerBundles(
  actingBusinessId: UUID,
  params: ListParams = {}
): Promise<BundleRecord[]> {
  const url = withQuery(`${API_BASE}/bundles`, {
    active: params.active,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });

  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.get(url, { headers });
  return res.data as BundleRecord[];
}

export async function createBundle(
  actingBusinessId: UUID,
  body: CreateBundleRequest
): Promise<BundleRecord> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.post(`${API_BASE}/bundles`, body, { headers });
  return res.data as BundleRecord;
}

export async function getOwnerBundleById(
  actingBusinessId: UUID,
  bundleId: UUID
): Promise<BundleRecord | null> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  try {
    const res = await axios.get(`${API_BASE}/bundles/${encodeURIComponent(bundleId)}`, { headers });
    return res.data as BundleRecord;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function getOwnerBundleBySlug(
  actingBusinessId: UUID,
  slug: string
): Promise<BundleRecord | null> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  try {
    const res = await axios.get(`${API_BASE}/bundles/slug/${encodeURIComponent(slug)}`, { headers });
    return res.data as BundleRecord;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function updateBundle(
  actingBusinessId: UUID,
  bundleId: UUID,
  body: UpdateBundleRequest
): Promise<BundleRecord> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  const res = await axios.put(`${API_BASE}/bundles/${encodeURIComponent(bundleId)}`, body, { headers });
  return res.data as BundleRecord;
}

export async function deleteBundle(
  actingBusinessId: UUID,
  bundleId: UUID
): Promise<boolean> {
  const headers = await authHeaders({ "X-Acting-Business-Id": actingBusinessId });
  try {
    await axios.delete(`${API_BASE}/bundles/${encodeURIComponent(bundleId)}`, { headers });
    return true; // 204
  } catch (e: any) {
    if (e?.response?.status === 404) return false;
    // backend may return 409 "BUNDLE_IN_PROTECTED_USE"
    throw e;
  }
}

/* --------------------------- Viewable by business slug --------------------------- */
/**
 * Route (from BundleRoutes.kt):
 * - GET /business/{businessSlug}/bundles
 * Still authenticated on backend.
 */

export async function listBundlesForBusinessSlug(
  businessSlug: string,
  params: ListParams = {}
): Promise<BundleRecord[]> {
  const url = withQuery(`${API_BASE}/business/${encodeURIComponent(businessSlug)}/bundles`, {
    active: params.active ?? true,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });

  const headers = await authHeaders();
  const res = await axios.get(url, { headers });
  return res.data as BundleRecord[];
}
