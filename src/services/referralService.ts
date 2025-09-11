import axios from "axios";
import { CreateReferralReq, ReferralDTO, ReferralThreadEventDTO } from "../types/referral";
import { supabase } from "../supabaseClient";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ✅ Fetch all referrals
export const fetchMyReferrals = async (token: string): Promise<ReferralDTO[]> => {
  const response = await axios.get(`${__API_BASE__}/referrals/me`, authHeader(token));
  return response.data;
};

// ✅ Create a referral
//interface CreateReferralPayload {
//  prospectEmail?: string;
//  prospectPhone?: string;
//  businessEmail?: string;
//  businessPhone?: string;
//  note: string;
//}

export const createReferral = async (
  token: string,
  data: CreateReferralReq
): Promise<ReferralDTO> => {
  const response = await axios.post(`${__API_BASE__}/referral/create`, data, authHeader(token));
  return response.data;
};

// 🔁 Unified response endpoint
const respondToReferral = async (
  token: string,
  referralId: string,
  action: "accept" | "reject" | "cancel"
): Promise<void> => {
  await axios.post(
    `${__API_BASE__}/referrals/respond`,
    { referralId, action },
    authHeader(token)
  );
};

// ✅ Accept a referral
export const acceptReferral = async (token: string, referralId: string): Promise<void> => {
  await respondToReferral(token, referralId, "accept");
};

// ✅ Reject a referral
export const rejectReferral = async (token: string, referralId: string): Promise<void> => {
  await respondToReferral(token, referralId, "reject");
};

// ✅ Cancel a referral
export const cancelReferral = async (token: string, referralId: string): Promise<void> => {
  await respondToReferral(token, referralId, "cancel");
};

// ✅ Get referral by ID
export const getReferralById = async (
  token: string,
  referralId: string
): Promise<ReferralDTO> => {
  const response = await axios.get(`${__API_BASE__}/referral/${referralId}`, authHeader(token));
  return response.data;
};

// ✅ Get referral by slug
export const fetchReferralBySlug = async (
  token: string,
  slug: string
): Promise<ReferralDTO> => {
  const response = await axios.get(`${__API_BASE__}/referral/${slug}`, authHeader(token));
  return response.data;
};

export const fetchReferralThread = async (slug: string): Promise<ReferralThreadEventDTO[]> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(`${__API_BASE__}/referrals/${slug}/thread`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch referral thread");
  }

  return await response.json();
};

export const postThreadMessage = async (slug: string, message: string): Promise<void> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(`${__API_BASE__}/referrals/${slug}/thread`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: message })
  });

  if (!response.ok) {
    throw new Error("Failed to post message to thread");
  }
};
