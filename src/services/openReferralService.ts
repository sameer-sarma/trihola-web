// src/services/openReferralService.ts

import {
  CreateOpenReferralRequest,
  OpenReferralDTO,
  UpdateOpenReferralRequest,
  OpenReferralClaimResponse,
} from "../types/openReferrals";

// If you already expose __API_BASE__ globally, this will just work.
// Otherwise, replace __API_BASE__ with your base URL string.
declare const __API_BASE__: string;

/**
 * Create an open referral.
 *
 * This covers both:
 *  - non-campaign open referrals (businessId, title/message, productId/bundleId)
 *  - campaign-linked open referrals (also send campaignId, campaignInviteId)
 *
 * Ktor: POST /open-referrals
 */
export async function createOpenReferral(
  payload: CreateOpenReferralRequest,
  token: string
): Promise<OpenReferralDTO> {
  const resp = await fetch(`${__API_BASE__}/open-referrals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Ktor auth-jwt
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Failed to create open referral: ${resp.status} ${text}`
    );
  }

  return (await resp.json()) as OpenReferralDTO;
}

/**
 * List all open referrals owned by the logged-in user
 * (affiliate or business).
 *
 * Ktor: GET /open-referrals/my
 */
export async function fetchMyOpenReferrals(
  token: string
): Promise<OpenReferralDTO[]> {
  const resp = await fetch(`${__API_BASE__}/open-referrals/my`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Failed to fetch my open referrals: ${resp.status} ${text}`
    );
  }

  return (await resp.json()) as OpenReferralDTO[];
}

/**
 * Update an open referral that belongs to the logged-in user.
 * (e.g. change title/message, status, product/bundle).
 *
 * Ktor: PUT /open-referrals/{id}
 */
export async function updateOpenReferral(
  id: string,
  payload: UpdateOpenReferralRequest,
  token: string
): Promise<OpenReferralDTO> {
  const resp = await fetch(`${__API_BASE__}/open-referrals/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Failed to update open referral: ${resp.status} ${text}`
    );
  }

  return (await resp.json()) as OpenReferralDTO;
}

/**
 * Fetch (or ensure) the open referral associated with a specific
 * campaign invite. Useful for campaign pages that want to show
 * / reuse the open referral link for that invite.
 *
 * Ktor: GET /campaigns/{campaignId}/invites/{inviteId}/open-referral
 */
export async function fetchOpenReferralForInvite(
  campaignId: string,
  inviteId: string,
  token: string
): Promise<OpenReferralDTO> {
  const resp = await fetch(
    `${__API_BASE__}/campaigns/${campaignId}/invites/${inviteId}/open-referral`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Failed to fetch open referral for invite: ${resp.status} ${text}`
    );
  }

  return (await resp.json()) as OpenReferralDTO;
}

/**
 * Fetch the public view of an open referral by slug.
 * This powers the public landing page.
 *
 * Ktor: GET /public/open-referrals/{slug}
 *
 * Note: The response type is the PublicOpenReferralDTO on the backend.
 * If you already have a matching TS type, feel free to replace `any`.
 */
export async function fetchPublicOpenReferral(
  slug: string,
  token?: string
): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(
    `${__API_BASE__}/public/open-referrals/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Failed to fetch public open referral: ${resp.status} ${text}`
    );
  }

  return await resp.json();
}

/**
 * Claim an open referral after the user has logged in.
 *
 * Ktor: POST /public/open-referrals/{slug}/claim
 */
export async function claimOpenReferral(
  slug: string,
  token: string
): Promise<OpenReferralClaimResponse> {
  const resp = await fetch(
    `${__API_BASE__}/public/open-referrals/${encodeURIComponent(slug)}/claim`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!resp.ok) {
    const contentType = resp.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await resp.json();
      const error = new Error(
        body.message ||
          `Failed to claim open referral: ${resp.status} ${resp.statusText}`
      );
      (error as any).code = body.errorCode;
      throw error;
    }

    const text = await resp.text();
    throw new Error(
      `Failed to claim open referral: ${resp.status} ${text}`
    );
  }

  return (await resp.json()) as OpenReferralClaimResponse;
}
