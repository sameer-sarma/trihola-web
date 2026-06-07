import axios from "axios";
import { supabase } from "../supabaseClient";

const OTP_TOKEN_KEY = "triholaOtpToken";
const OTP_USER_ID_KEY = "triholaOtpUserId";
const OTP_AUTH_MODE_KEY = "triholaAuthMode";

export type TriholaAuthMode = "SUPABASE" | "PHONE_OTP";

export type TriholaAuthSession = {
  accessToken: string | null;
  userId: string | null;
  authMode: TriholaAuthMode | null;
};

export function saveOtpSession(params: {
  token: string;
  userId?: string | null;
  authMode?: string | null;
}) {
  localStorage.setItem(OTP_TOKEN_KEY, params.token);

  if (params.userId) {
    localStorage.setItem(OTP_USER_ID_KEY, params.userId);
  }

  localStorage.setItem(
    OTP_AUTH_MODE_KEY,
    params.authMode || "PHONE_OTP"
  );

  window.dispatchEvent(new Event("trihola-auth-changed"));
}

export function clearOtpSession() {
  localStorage.removeItem(OTP_TOKEN_KEY);
  localStorage.removeItem(OTP_USER_ID_KEY);
  localStorage.removeItem(OTP_AUTH_MODE_KEY);

  window.dispatchEvent(new Event("trihola-auth-changed"));
}

export function getStoredOtpToken(): string | null {
  return localStorage.getItem(OTP_TOKEN_KEY);
}

export async function getTriholaAuthSession(): Promise<TriholaAuthSession> {
  const otpToken = getStoredOtpToken();

  if (otpToken) {
    return {
      accessToken: otpToken,
      userId: localStorage.getItem(OTP_USER_ID_KEY),
      authMode: "PHONE_OTP",
    };
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  return {
    accessToken: session?.access_token ?? null,
    userId: session?.user?.id ?? null,
    authMode: session?.access_token ? "SUPABASE" : null,
  };
}

export async function getTriholaAccessToken(): Promise<string | null> {
  const session = await getTriholaAuthSession();
  return session.accessToken;
}

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

export async function authFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const token = await getTriholaAccessToken();

  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

export async function logoutTrihola() {
  clearOtpSession();

  // Hard-clear ALL Supabase persisted auth keys
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("sb-")) {
      localStorage.removeItem(key);
    }
  });

  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith("sb-")) {
      sessionStorage.removeItem(key);
    }
  });

  // Optional best-effort logout call
  try {
    await supabase.auth.signOut({
      scope: "local",
    });
  } catch (e) {
    console.warn("Ignoring Supabase logout error", e);
  }

  window.dispatchEvent(
    new Event("trihola-auth-changed")
  );
}

export type RegisterStartResponse = {
  status: string;
  claimId: string;
  emailOtpRequired: boolean;
  phoneOtpRequired: boolean;
  phoneOtpSupported: boolean;
  message: string;
};

export type VerifyRegistrationOtpResponse = {
  status: string;
  verified: boolean;
  message: string;
};

export async function startRegistration(payload: {
  email: string;
  phone: string;
  password: string;
}): Promise<RegisterStartResponse> {
  const res = await axios.post(`${__API_BASE__}/register/start`, payload);
  return res.data;
}

export async function verifyRegistrationEmailOtp(payload: {
  claimId: string;
  otp: string;
}): Promise<VerifyRegistrationOtpResponse> {
  const res = await axios.post(`${__API_BASE__}/register/verify-email`, payload);
  return res.data;
}

export async function verifyRegistrationPhoneOtp(payload: {
  claimId: string;
  otp: string;
}): Promise<VerifyRegistrationOtpResponse> {
  const res = await axios.post(`${__API_BASE__}/register/verify-phone`, payload);
  return res.data;
}

export async function completeRegistrationClaim(payload: {
  claimId: string;
}) {
  const res = await axios.post(`${__API_BASE__}/register/complete`, payload);
  return res.data;
}