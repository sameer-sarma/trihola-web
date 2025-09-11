// src/services/businessService.ts

import axios from "axios";
import { supabase } from "../supabaseClient"; // ✅ ADD THIS
import { authFetch } from "../utils/auth";
const API_BASE = import.meta.env.VITE_API_BASE as string;

export const getBusinessProfile = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await axios.get(`${__API_BASE__}/business/profile`, {
//  const response = await fetch(`${API_BASE}/business/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateBusinessProfile = async (data: {
  businessName: string;
  businessDescription: string;
  businessWebsite: string;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  await axios.post(`${__API_BASE__}/business/register`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const unregisterBusiness = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  await axios.post(`${__API_BASE__}/business/unregister`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export async function setBusinessSlug(slug: string) {
  const res = await authFetch(`${API_BASE}/business/slug`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ businessSlug: string }>;
}

export async function checkBusinessSlugAvailability(slug: string) {
  const res = await authFetch(`${API_BASE}/business/slug/${encodeURIComponent(slug)}/availability`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ available: boolean }>;
}

// Public catalog endpoints (for public pages)
export async function fetchPublicProducts(businessSlug: string) {
  const res = await authFetch(`${API_BASE}/business/${encodeURIComponent(businessSlug)}/products`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchPublicProduct(businessSlug: string, productSlug: string) {
  const res = await authFetch(`${API_BASE}/business/${encodeURIComponent(businessSlug)}/products/${encodeURIComponent(productSlug)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}