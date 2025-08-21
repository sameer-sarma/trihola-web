import { supabase } from "../supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE as string;

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export interface EcomIntegrationDTO {
  id: string;
  businessId: string;
  platform: "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";
  domain: string;
  publicKey: string;        // returned by backend (safe to display)
  createdAt: string;
  updatedAt?: string | null;
  isActive?: boolean;       // tolerate if backend includes it; otherwise ignore
  hasSecret?: boolean;      // optional flag from backend
}

export async function listEcomIntegrations(): Promise<EcomIntegrationDTO[]> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}/ecom/integrations`, { headers });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

export async function createEcomIntegration(input: {
  platform: EcomIntegrationDTO["platform"];
  domain: string;
}): Promise<EcomIntegrationDTO> {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_BASE}/ecom/integrations`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Create failed: ${res.status} ${msg}`);
  }
  return res.json();
}

// Convenience: fetch single by id (no GET /{id} route in backend yet)
export async function getEcomIntegrationById(id: string): Promise<EcomIntegrationDTO | null> {
  const list = await listEcomIntegrations();
  return list.find(x => x.id === id) ?? null;
}

export async function deleteEcomIntegration(id: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}/ecom/integrations/${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function rotateIntegrationSecret(id: string): Promise<{ rotatedAt: string; publicKey: string }> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}/ecom/integrations/${id}/rotate-secret`, { method: "POST", headers });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Rotate failed: ${res.status} ${msg}`);
  }
  return res.json();
}

// Optional: only works if you kept GET /ecom/integrations/{id}/secret
export async function revealIntegrationSecret(id: string): Promise<string | null> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}/ecom/integrations/${id}/secret`, { headers });
  if (!res.ok) return null; // treat 404 or 401 as “not available”
  const data = await res.json().catch(() => null);
  return data?.secret ?? null;
}

// Helper to show users what to paste in their store
export function buildWebhookUrl(it: EcomIntegrationDTO): string {
  const base = API_BASE.replace(/\/+$/, "");
  const platform = it.platform.toLowerCase(); // shopify/woocommerce/custom
  return `${base}/ecom/webhooks/${platform}/${it.id}`;
}
