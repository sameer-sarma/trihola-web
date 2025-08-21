import { EcomIntegrationRequest, EcomIntegrationResponse } from "../types/ecomTypes";

const API_BASE = import.meta.env.VITE_API_BASE;

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function listEcomIntegrations(token: string): Promise<EcomIntegrationResponse[]> {
  const res = await fetch(`${API_BASE}/ecom/integrations`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch integrations");
  return res.json();
}

export async function getEcomIntegration(id: string, token: string): Promise<EcomIntegrationResponse> {
  const res = await fetch(`${API_BASE}/ecom/integrations/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch integration");
  return res.json();
}

export async function createEcomIntegration(
  payload: EcomIntegrationRequest,
  token: string
): Promise<EcomIntegrationResponse> {
  const res = await fetch(`${API_BASE}/ecom/integrations`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create integration");
  return res.json();
}

export async function updateEcomIntegration(
  id: string,
  payload: EcomIntegrationRequest,
  token: string
): Promise<EcomIntegrationResponse> {
  const res = await fetch(`${API_BASE}/ecom/integrations/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update integration");
  return res.json();
}

export async function deleteEcomIntegration(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ecom/integrations/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete integration");
}
