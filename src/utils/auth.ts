import axios from "axios";
import { supabase } from "../supabaseClient";

export const refreshAccessToken = async (
  setAccessToken: (token: string | null) => void
): Promise<string | null> => {
  const storedRefreshToken = localStorage.getItem("refreshToken");
  if (!storedRefreshToken) return null;

  try {
    const response = await axios.post(`${__API_BASE__}/refresh`, {
      refreshToken: storedRefreshToken,
    });
    const newAccessToken = response.data.accessToken;
    localStorage.setItem("accessToken", newAccessToken);
    setAccessToken(newAccessToken);
    return newAccessToken;
  } catch (err) {
    console.error("Failed to refresh access token", err);
    return null;
  }
};

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}