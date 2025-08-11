// src/services/businessService.ts

import axios from "axios";
import { supabase } from "../supabaseClient"; // ✅ ADD THIS

export const getBusinessProfile = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await axios.get(`${__API_BASE__}/business/profile`, {
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

  await axios.post(`${__API_BASE__}/profile/business/unregister`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
};