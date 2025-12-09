// src/api/campaignapi.ts
import { authFetch } from "../utils/auth";
import type { CampaignOwnerDTO, CreateCampaignReq, CampaignPublicDTO, 
  CampaignImageReq, CampaignHubDTO, CampaignHubForMe, 
  CampaignHubAffiliating, CampaignHubOwned, CampaignStatus, OpenAffiliateMode } 
  from "../types/campaign";

import type { InviteThreadEventDTO, InviteThreadMessageReq } from "../types/invites";

const API_BASE = import.meta.env.VITE_API_BASE as string;
const WS_BASE = import.meta.env.VITE_WS_BASE as string;

// --- Internal normaliser ---

function normalizeInviteThreadEvent(raw: any): InviteThreadEventDTO {
  return {
    id: String(raw.id),
    inviteId: String(raw.inviteId),
    senderUserId: raw.senderUserId ?? null,
    eventType: raw.eventType,
    content: raw.content ?? "",
    metadata: raw.metadata ?? null,
    dontShowToRole: raw.dontShowToRole ?? null,
    createdAt: raw.createdAt,
  };
}

// -------- Owner scope (must be the business owner) --------
export async function listMyCampaigns(params: { status?: string; limit?: number; offset?: number } = {}): Promise<CampaignOwnerDTO[]> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  const res = await authFetch(`${API_BASE}/campaigns/mine?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCampaignById(id: string): Promise<CampaignOwnerDTO> {
  const res = await authFetch(`${API_BASE}/campaigns/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createCampaign(body: CreateCampaignReq): Promise<{ campaignId: string }> {
  const res = await authFetch(`${API_BASE}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCampaign(id: string, body: Partial<CreateCampaignReq>): Promise<{ updated: boolean }> {
  const res = await authFetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// -------- Catalog-style (authenticated, any user) --------
export async function listBusinessCampaigns(
  businessSlug: string,
  params: { status?: string; limit?: number; offset?: number } = {}
): Promise<CampaignPublicDTO[]> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  const res = await authFetch(`${API_BASE}/campaigns/business/${encodeURIComponent(businessSlug)}?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBusinessCampaign(
  businessSlug: string,
  campaignSlug: string
): Promise<CampaignPublicDTO> {
  const res = await authFetch(`${API_BASE}/campaigns/${encodeURIComponent(businessSlug)}/${encodeURIComponent(campaignSlug)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCampaign(id: string): Promise<{ deleted: boolean }> {
  const res = await authFetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// -------- Campaign Media (authenticated, any user) --------
export async function replaceCampaignImages(
  campaignId: string,
  images: CampaignImageReq[]
): Promise<{ replaced: boolean }> {
  const res = await authFetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/images`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(images),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// -------- Campaign Offer --------
export async function setCampaignOffer(
  campaignId: string,
  offerTemplateId: string,
  token: string
): Promise<void> {
  const res = await authFetch(`${API_BASE}/campaigns/${campaignId}/offer`, {
    method: "PUT", // or PUT, backend supports both
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ offerTemplateId }),
  });

  if (!res.ok) {
    let msg = "Failed to link offer";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch (_) {}
    throw new Error(msg);
  }
}

export async function deleteCampaignOffer(
  campaignId: string,
  token: string
): Promise<void> {
  const res = await authFetch(`${API_BASE}/campaigns/${campaignId}/offer`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let msg = "Failed to delete offer";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch (_) {}
    throw new Error(msg);
  }
}

export async function getCampaignHub(): Promise<CampaignHubDTO> {
  const res = await authFetch(`${API_BASE}/hub`);
  if (!res.ok) throw new Error(await res.text());

  const raw = (await res.json()) as {
    myCampaigns?: any[];
    affiliateInvites?: any[];
    prospectReferrals?: any[];
  };

  // --- map owned campaigns ---
  const myCampaigns: CampaignHubOwned[] = (raw.myCampaigns ?? []).map((c) => ({
    id: String(c.id),
    slug: c.slug ?? undefined,
    title: c.title ?? "Untitled campaign",
    status: c.status ?? undefined,
    primaryImageUrl: c.primaryImageUrl ?? null,
    invites: c.invites ?? 0,
    accepts: c.accepts ?? 0,
    redemptions: c.redemptions ?? 0,
  }));

  // --- map affiliate invites ---
  const affiliateInvites: CampaignHubAffiliating[] = (
    raw.affiliateInvites ?? []
  ).map((i) => ({
    inviteId: String(i.inviteId),
    campaignId: String(i.campaignId),
    businessName: i.businessName ?? "Unknown business",
    businessSlug: i.businessSlug ?? undefined,
    campaignTitle: i.campaignTitle ?? i.title ?? "Campaign",
    campaignSlug: i.campaignSlug ?? undefined,
    primaryImageUrl: i.primaryImageUrl ?? null,
    status: i.status ?? undefined, // "INVITED" | "ACCEPTED" | ...
    invitedBy: i.invitedBy ?? undefined,
    contactSnapshot: i.contactSnapshot ?? undefined,
    rewardReferrer: i.rewardReferrer ?? undefined,
    rewardProspect: i.rewardProspect ?? undefined,
    createdAt: i.createdAt ?? undefined,
  }));

  // --- map “campaigns I’ve been referred to” ---
  const prospectReferrals: CampaignHubForMe[] = (
    raw.prospectReferrals ?? []
  ).map((p) => ({
    referralId: String(p.referralId ?? p.id ?? ""),
    fromAffiliate: p.fromAffiliate ?? "", // required in our TS type
    affiliateSnapshot: p.affiliateSnapshot ?? undefined,
    businessName: p.businessName ?? "Unknown business",
    businessSnapshot: p.businessSnapshot ?? undefined,
    campaignTitle: p.campaignTitle ?? p.title ?? "Campaign",
    status: p.status ?? undefined,
    businessSlug: p.businessSlug ?? undefined,
    campaignSlug: p.campaignSlug ?? undefined,
    primaryImageUrl: p.primaryImageUrl ?? null,
    createdAt: p.createdAt ?? undefined,
  }));

  // 🔑 return the NEW DTO shape that CampaignHubPage expects
  return { myCampaigns, affiliateInvites, prospectReferrals };
}

// --- HTTP: load thread history ---

export async function getInviteThread(
  campaignId: string,
  inviteId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<InviteThreadEventDTO[]> {
  const params = new URLSearchParams();
  if (opts.before) params.set("before", opts.before);
  if (opts.limit != null) params.set("limit", String(opts.limit));

  const qs = params.toString();
  const url = `${API_BASE}/campaigns/${campaignId}/invites/${inviteId}/thread${
    qs ? `?${qs}` : ""
  }`;

  const res = await authFetch(url);
  if (!res.ok) {
    throw new Error(await res.text());
  }

  const raw = (await res.json()) as any[];
  return raw.map(normalizeInviteThreadEvent);
}

// --- HTTP: post a new message into the thread ---

export async function postInviteThreadMessage(
  campaignId: string,
  inviteId: string,
  body: InviteThreadMessageReq
): Promise<InviteThreadEventDTO> {
  const url = `${API_BASE}/campaigns/${campaignId}/invites/${inviteId}/thread`;

  const res = await authFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const raw = await res.json();
  return normalizeInviteThreadEvent(raw);
}

// --- WS: helper to build the WebSocket URL for this invite thread ---
//
// token = Supabase access_token (same one you already have in session)

export function makeInviteThreadWebSocketUrl(
  campaignId: string,
  inviteId: string,
  token: string
): string {
  return `${WS_BASE}/campaigns/${campaignId}/invites/${inviteId}/thread/ws?token=${encodeURIComponent(
    token
  )}`;
}

export async function updateCampaignStatusApi(
  id: string,
  status: CampaignStatus
): Promise<{ status: CampaignStatus }> {
  const res = await authFetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function updateOpenAffiliateModeApi(
  id: string,
  mode: OpenAffiliateMode
): Promise<{ openAffiliateMode: OpenAffiliateMode }> {
  const res = await authFetch(
    `${API_BASE}/campaigns/${encodeURIComponent(id)}/open-affiliate-mode`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openAffiliateMode: mode }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}