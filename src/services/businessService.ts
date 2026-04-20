// src/services/businessService.ts

import axios from "axios";
import { supabase } from "../supabaseClient";
import { authFetch } from "../utils/auth";
import type {
  BusinessContextDTO,
  BusinessProfileDTOOwner,
  SlugAvailabilityResponse,
  BusinessMemberDTO,
  BusinessOwnerProfileResponse,
  BusinessPublicViewDTO
} from "../types/business";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "";

/**
 * Helper to get Supabase access token
 */
async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

/**
 * NEW: Register a business (creates PENDING business + OWNER membership).
 * Ktor: POST /businesses
 * Returns: BusinessContextDTO
 */
export async function registerBusiness(dto: BusinessProfileDTOOwner): Promise<BusinessContextDTO> {
  const token = await getAccessToken();

  const response = await axios.post(
    `${API_BASE}/businesses`,
    dto,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessContextDTO;
}

/**
 * NEW: List all businesses the requesting user belongs to
 * Ktor: GET /businesses/me
 */
export async function listMyBusinesses(): Promise<BusinessContextDTO[]> {
  const token = await getAccessToken();

  const response = await axios.get(
    `${API_BASE}/businesses/me`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessContextDTO[];
}

/**
 * NEW: Get the user's primary business context
 * Ktor: GET /businesses/me/primary
 */
export async function getPrimaryBusiness(): Promise<BusinessContextDTO> {
  const token = await getAccessToken();

  const response = await axios.get(
    `${API_BASE}/businesses/me/primary`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessContextDTO;
}

/**
 * NEW: Check slug availability (no auth in Ktor)
 * Ktor: GET /businesses/slug/{slug}/availability
 *
 * Using authFetch to match your existing pattern for "public-ish" endpoints.
 */
export async function checkBusinessSlugAvailability(slug: string): Promise<SlugAvailabilityResponse> {
  const res = await authFetch(`${API_BASE}/businesses/slug/${encodeURIComponent(slug)}/availability`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<SlugAvailabilityResponse>;
}

/**
 * NEW: List all businesses the user belongs to
 * Ktor: GET /businesses/user/{userId}
 */
export async function listBusinessesForUser(userId: string): Promise<BusinessContextDTO[]> {
  const token = await getAccessToken();

  const response = await axios.get(
    `${API_BASE}/businesses/user/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessContextDTO[];
}

export async function getBusinessContext(businessId: string) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/context`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessContextDTO;
}

export async function getBusinessMembers(businessId: string) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/members`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessMemberDTO[];
}

export async function updateBusiness(businessId: string, dto: BusinessProfileDTOOwner) {
  const token = await getAccessToken();

  await axios.put(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}`,
    dto,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function assignBusinessMember(businessId: string, payload: { targetUserId: string; role: string; designation: string }) {
  const token = await getAccessToken();

  const response = await axios.post(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/members`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data as BusinessMemberDTO[];
}

export async function changeMemberRoleOrDesignation(
  businessId: string,
  targetUserId: string,
  payload: { role: string; designation: string }
) {
  const token = await getAccessToken();

  const response = await axios.put(
     `${API_BASE}/businesses/${encodeURIComponent(businessId)}/members/${encodeURIComponent(targetUserId)}/roleOrDesignation`,
    payload,
     { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data as BusinessMemberDTO[];
}

export async function removeBusinessMember(businessId: string, targetUserId: string) {
  const token = await getAccessToken();

  const response = await axios.delete(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/members/${encodeURIComponent(targetUserId)}`,
     { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data as BusinessMemberDTO[];
}

export async function leaveBusiness(businessId: string) {
  const token = await getAccessToken();

  await axios.post(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/leave`,
    { headers: { Authorization: `Bearer ${token}` } }
);
}

export async function getBusinessPublicViewBySlug(businessSlug: string) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${API_BASE}/businesses/slug/${encodeURIComponent(businessSlug)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data as BusinessPublicViewDTO;
}

export async function getBusinessOwnerProfile(businessId: string) {
  const token = await getAccessToken();

  const response = await axios.get(`${API_BASE}/businesses/${encodeURIComponent(businessId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data as BusinessOwnerProfileResponse;
}

// ✅ Phone OTP (business)
export async function sendBusinessPhoneOtp(businessId: string, phone: string) {
  const token = await getAccessToken();

  await axios.post(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/phone/send-otp`,
    { phone },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function verifyBusinessPhoneOtp(businessId: string, phone: string, otp: string) {
  const token = await getAccessToken();

  await axios.post(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/phone/verify-otp`,
    { phone, otp },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// ✅ Email verification (business) — sends link
export async function sendBusinessEmailVerification(businessId: string, email: string) {
  const token = await getAccessToken();
  await axios.post(
    `${API_BASE}/businesses/${encodeURIComponent(businessId)}/email/send-verification`,
    { email },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}