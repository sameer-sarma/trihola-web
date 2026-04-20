// src/services/recommendationService.ts

import type { InviteRecommenderRequest, CreateResult } from "../types/referral";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_BACKEND_URL ||
  "http://127.0.0.1:8080";

/**
 * 🔧 Update to match Ktor route.
 * The backend method needs BOTH referral (row) + recommendationId,
 * so the route typically looks like: POST /referrals/v2/{slug}/invite-recommender
 */
const PATHS = {
  inviteRecommender: (referralSlug: string) =>
    `/referrals/v2/${encodeURIComponent(referralSlug)}/invite-recommender`,
};

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
) {
  const url = new URL(path, API_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export class RecommendationApiError extends Error {
  status?: number;
  code?: string | number;
  detail?: any;

  constructor(message: string, opts?: { status?: number; code?: string | number; detail?: any }) {
    super(message);
    this.name = "RecommendationApiError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.detail = opts?.detail;
  }
}

async function apiJson<T>(
  token: string,
  method: "GET" | "POST",
  path: string,
  body?: any,
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errCode = json?.error || json?.code || res.status;
    const errMsg = json?.message || json?.detail || res.statusText || "Request failed";
    throw new RecommendationApiError(`RECOMMENDATION_API_${errCode}: ${errMsg}`, {
      status: res.status,
      code: errCode,
      detail: json,
    });
  }

  return json as T;
}

/**
 * Invite recommender into the referral thread.
 * Backend effects:
 * - adds recommender as USER participant role=RECOMMENDER
 * - marks recommendation as INVITED
 * - posts system event to referral thread
 *
 * Return type: I’m keeping it flexible as CreateResult (or OkResponse)
 * because your route could return either.
 * If your route returns { ok: true }, change return type accordingly.
 */
export async function inviteRecommenderToReferralThread(
  token: string,
  referralSlug: string,
  req: InviteRecommenderRequest
): Promise<CreateResult | { ok: true }> {
  return apiJson<CreateResult | { ok: true }>(
    token,
    "POST",
    PATHS.inviteRecommender(referralSlug),
    req
  );
}
