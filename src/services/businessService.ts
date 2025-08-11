// src/services/businessService.ts

import axios from "axios";
import { supabase } from "../supabaseClient"; // ✅ ADD THIS
//import { BusinessProfileDTO } from "../types/business";

const BASE_URL = "http://127.0.0.1:8080";

//const authHeader = (token: string) => ({
//  headers: {
//    Authorization: `Bearer ${token}`,
//  },
//});

export const getBusinessProfile = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await axios.get(`${BASE_URL}/business/profile`, {
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

  await axios.post(`${BASE_URL}/business/register`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const unregisterBusiness = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  await axios.post(`${BASE_URL}/profile/business/unregister`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
};