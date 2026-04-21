// src/services/referralService.ts

import type {
  CreateReferralV2Request,
  CreateResult,
  InviteRecommenderRequest,
  OkResponse,
  ReferralDTO,
  BulkCreateReferralsV2Request,
  BulkCreateResult,
} from "../types/referral";

const API_BASE = __API_BASE__;

const PATHS = {
  createOrRecommend: "/v2/referrals",
  bulkCreate: "/v2/referrals/bulk",
  inviteRecommender: (slug: string) =>
    `/v2/referrals/${encodeURIComponent(slug)}/invite-recommender`,
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

export type ReferralApiErrorCode = string | number;

export class ReferralApiError extends Error {
  status: number;
  code: ReferralApiErrorCode;
  detail?: any;

  constructor(message: string, opts: { status: number; code: ReferralApiErrorCode; detail?: any }) {
    super(message);
    this.name = "ReferralApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.detail = opts.detail;
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
    throw new ReferralApiError(`REFERRAL_API_${errCode}: ${errMsg}`, {
      status: res.status,
      code: errCode,
      detail: json,
    });
  }

  return json as T;
}

export async function getReferralBySlug(
  token: string,
  slug: string
): Promise<ReferralDTO> {
  if (!slug?.trim()) throw new Error("Missing referral slug");

  // Use the shared base + URL builder so it never becomes relative.
  const url = buildUrl(`/v2/referrals/${encodeURIComponent(slug.trim())}`);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    throw new ReferralApiError(`REFERRAL_API_${errCode}: ${errMsg}`, {
      status: res.status,
      code: errCode,
      detail: json,
    });
  }

  return json as ReferralDTO;
}

/**
 * POST /v2/referrals
 * Backend behavior:
 * - 201 Created -> outcome=CREATED_REFERRAL
 * - 200 OK -> outcome=CREATED_RECOMMENDATION (or other ok outcomes)
 * - 409 Conflict -> outcome=COOLDOWN_ACTIVE (but apiJson would throw unless we treat 409 specially)
 *
 * Since backend returns a *valid* CreateResult even on 409, we handle that explicitly.
 */
export async function createReferralOrRecommendation(
  token: string,
  req: CreateReferralV2Request
): Promise<CreateResult> {
  const payload = { ...req, note: req.note ?? "" };

  const res = await fetch(buildUrl(PATHS.createOrRecommend), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  // ✅ backend uses 409 for cooldown but still returns CreateResult
  if (res.status === 409 && json) {
    return json as CreateResult;
  }

  if (!res.ok) {
    const errCode = json?.error || json?.code || res.status;
    const errMsg = json?.message || json?.detail || res.statusText || "Request failed";
    throw new ReferralApiError(`REFERRAL_API_${errCode}: ${errMsg}`, {
      status: res.status,
      code: errCode,
      detail: json,
    });
  }

  return json as CreateResult;
}

/**
 * POST /v2/referrals/bulk
 * Creates referrals/recommendations in batch.
 */
export async function bulkCreateReferrals(
  token: string,
  req: BulkCreateReferralsV2Request
): Promise<BulkCreateResult> {
  if (!req?.items?.length) {
    return {
      ok: true,
      total: 0,
      createdReferrals: 0,
      createdRecommendations: 0,
      addedNotesToExisting: 0,
      cooldownBlocked: 0,
      failed: 0,
      results: [],
    } as BulkCreateResult;
  }

  return apiJson<BulkCreateResult>(token, "POST", PATHS.bulkCreate, req);
}

/**
 * POST /v2/referrals/{slug}/invite-recommender
 * Returns { ok: true }
 */
export async function inviteRecommenderToReferralThread(
  token: string,
  referralSlug: string,
  req: InviteRecommenderRequest
): Promise<OkResponse> {
  return apiJson<OkResponse>(token, "POST", PATHS.inviteRecommender(referralSlug), req);
}