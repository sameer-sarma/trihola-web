// =============================================
// FILE: src/api/campaignInvites.ts
// (API layer – thin wrappers around fetch; supports cursor pagination)
// =============================================
import type { CampaignInvite, SendCampaignInvitesRequest, Paginated, InviteDetailResponse, MyInviteListItemDTO, PublicCampaignInviteLandingView, OpenCampaignInviteLandingView } from '../types/invites';
import type { CampaignHubAffiliating } from '../types/campaign';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';


function authHeaders(token?: string) {
return {
'Content-Type': 'application/json',
...(token ? { Authorization: `Bearer ${token}` } : {}),
} as const;
}


export type ListInvitesParams = {
campaignId: string;
cursor?: string | null; // opaque cursor from backend
limit?: number; // page size
token?: string;
};

export async function sendCampaignInvites(
campaignId: string,
payload: SendCampaignInvitesRequest,
token?: string
): Promise<CampaignInvite[]> {
const res = await fetch(`${API_BASE}/campaigns/${campaignId}/invites`, {
method: 'POST',
headers: authHeaders(token),
body: JSON.stringify(payload),
});
if (!res.ok) {
const text = await res.text();
throw new Error(`Failed to send invites: ${res.status} ${text}`);
}
return res.json();
}


export async function listCampaignInvites(
params: ListInvitesParams
): Promise<Paginated<CampaignInvite>> {
const { campaignId, cursor, limit = 25, token } = params;
const qs = new URLSearchParams();
if (cursor) qs.set('cursor', cursor);
qs.set('limit', String(limit));


const res = await fetch(`${API_BASE}/campaigns/${campaignId}/invites?${qs.toString()}`, {
headers: authHeaders(token),
});
if (!res.ok) throw new Error(`Failed to list invites: ${res.status} ${await res.text()}`);
return res.json(); // expected { items: CampaignInvite[], nextCursor?: string | null, total?: number }
}

export async function acceptInvite(inviteId: string, token?: string): Promise<{ status: string }> {
const res = await fetch(`${API_BASE}/campaign-invites/${inviteId}/accept`, {
method: 'POST',
headers: authHeaders(token),
});
if (!res.ok) {
const text = await res.text();
throw new Error(`Failed to accept invite: ${res.status} ${text}`);
}
return res.json();
}


export async function declineInvite(inviteId: string, token?: string): Promise<{ status: string }> {
const res = await fetch(`${API_BASE}/campaign-invites/${inviteId}/decline`, {
method: 'POST',
headers: authHeaders(token),
});
if (!res.ok) {
const text = await res.text();
throw new Error(`Failed to decline invite: ${res.status} ${text}`);
}
return res.json();
}

export async function getInviteDetail(
  campaignId: string,
  inviteId: string,
  token?: string
): Promise<InviteDetailResponse> {
  const res = await fetch(
    `${API_BASE}/campaigns/${campaignId}/invites/${inviteId}`,
    {
      headers: authHeaders(token),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch invite detail: ${res.status} ${text}`
    );
  }
  return res.json();
}


export async function listMyAffiliateInvites(
  token: string
): Promise<CampaignHubAffiliating[]> {
  const res = await fetch(`${API_BASE}/campaigns/my-invites`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text || `Failed to load my invites (${res.status})`
    );
  }

  return res.json();
}

export async function listMyInvites(token: string): Promise<MyInviteListItemDTO[]> {
  const res = await fetch(`${API_BASE}/invites/me`, {
    method: "GET",
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load my invites (${res.status})`);
  }

  return res.json();
}

export async function getPublicCampaignInviteLanding(
  inviteId: string,
  token?: string
): Promise<PublicCampaignInviteLandingView> {
  if (!inviteId) {
    throw new Error('Missing inviteId');
  }

  const res = await fetch(`${API_BASE}/public/campaign-invites/${inviteId}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      text || `Failed to load public campaign invite (${res.status})`
    );
  }

  return res.json();
}

// --- Open affiliate campaign invites ---

/**
 * Public landing for an open affiliate campaign invite.
 * This hits GET /public/campaigns/{campaignSlug}/open-invites/{openInviteSlug}
 */
export async function getOpenAffiliateCampaignLanding(
  campaignSlug: string,
  openInviteSlug: string,
  token?: string
): Promise<OpenCampaignInviteLandingView> {
  if (!campaignSlug || !openInviteSlug) {
    throw new Error("Missing campaignSlug or openInviteSlug");
  }

  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(
      campaignSlug
    )}/open-invites/${encodeURIComponent(openInviteSlug)}`,
    {
      method: "GET",
      headers: authHeaders(token),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Failed to load open affiliate campaign (${res.status})`
    );
  }

  return res.json(); // backend returns a public campaign view DTO
}

/**
 * Join a campaign as an affiliate via an open invite.
 * This hits POST /public/campaigns/{campaignSlug}/open-invites/{openInviteSlug}/join
 * and returns a CampaignInvite-like DTO.
 */
export async function joinCampaignViaOpenInvite(
  campaignSlug: string,
  openInviteSlug: string,
  token?: string
): Promise<CampaignInvite> {
  if (!campaignSlug || !openInviteSlug) {
    throw new Error("Missing campaignSlug or openInviteSlug");
  }

  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(
      campaignSlug
    )}/open-invites/${encodeURIComponent(openInviteSlug)}/join`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Failed to join campaign via open invite (${res.status})`
    );
  }

  return res.json();
}
