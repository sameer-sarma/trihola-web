// src/services/threadService.ts

import type {
  AddParticipantRequest,
  CreateThreadResponse,
  DirectThreadRequest,
  GroupThreadRequest,
  LeaveThreadRequest,
  OkResponse,
  SendMessageRequest,
  SendMessageResponse,
  ThreadActivityDTO,
  ThreadParticipantDTO,
  ThreadSummaryDTO,
  ThreadContextDTO,
  UUID,
  ParticipantIdentity,
  IntroEmailRequest,
  ReferralDecisionV2Request,
  ReferralV2DTO,
  CreateThreadCtaRequest, 
  ThreadCtaDTO,
  ThreadInboxComposerPermissionsResponseDTO,
} from "../types/threads";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_BACKEND_URL ||
  "http://127.0.0.1:8080";

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
    const errMsg =
      json?.message || json?.detail || res.statusText || "Request failed";
    throw new Error(`THREAD_API_${errCode}: ${errMsg}`);
  }

  return json as T;
}

/** Inbox identity filter for GET /threads/my */
export type ThreadsInboxIdentityFilter =
  | { asType: "USER" | "BUSINESS"; asId: UUID }
  | { asIdentity: ParticipantIdentity };

/** Normalize caller identity -> query params expected by Ktor */
function identityToQuery(
  ident?: ThreadsInboxIdentityFilter
): { asType?: "USER" | "BUSINESS"; asId?: string } {
  if (!ident) return {};

  if ("asType" in ident) {
    return { asType: ident.asType, asId: String(ident.asId) };
  }

  const t = String(ident.asIdentity.participantType || "").toUpperCase();
  const asType = t === "BUSINESS" ? "BUSINESS" : "USER"; // default USER
  return { asType, asId: String(ident.asIdentity.participantId) };
}

// ✅ Inbox
export async function listMyThreads(
  token: string,
  opts?: {
    limit?: number;
    offset?: number;
    identity?: ThreadsInboxIdentityFilter;
  }
): Promise<ThreadSummaryDTO[]> {
  const identQ = identityToQuery(opts?.identity);

  return apiJson<ThreadSummaryDTO[]>(token, "GET", "/threads/my", undefined, {
    limit: opts?.limit ?? 50,
    offset: opts?.offset ?? 0,
    ...identQ,
  });
}

export async function getThreadInboxComposerPermissions(
  token: string
): Promise<ThreadInboxComposerPermissionsResponseDTO> {
  return apiJson<ThreadInboxComposerPermissionsResponseDTO>(
    token,
    "GET",
    "/threads/inbox-composer-permissions"
  );
}

export async function getOrCreateDirectThread(
  token: string,
  req: DirectThreadRequest
): Promise<CreateThreadResponse> {
  return apiJson<CreateThreadResponse>(token, "POST", "/threads/direct", req);
}

export async function createGroupThread(
  token: string,
  req: GroupThreadRequest
): Promise<CreateThreadResponse> {
  return apiJson<CreateThreadResponse>(token, "POST", "/threads/group", req);
}

export async function getThreadParticipants(
  token: string,
  threadId: UUID
): Promise<ThreadParticipantDTO[]> {
  return apiJson<ThreadParticipantDTO[]>(
    token,
    "GET",
    `/threads/${threadId}/participants`
  );
}

export async function addThreadParticipant(
  token: string,
  threadId: UUID,
  req: AddParticipantRequest
): Promise<OkResponse> {
  return apiJson<OkResponse>(
    token,
    "POST",
    `/threads/${threadId}/participants`,
    req
  );
}

export async function leaveThread(
  token: string,
  threadId: UUID,
  req: LeaveThreadRequest
): Promise<OkResponse> {
  return apiJson<OkResponse>(token, "POST", `/threads/${threadId}/leave`, req);
}

export async function sendThreadMessage(
  token: string,
  threadId: UUID,
  req: SendMessageRequest
): Promise<SendMessageResponse> {
  return apiJson<SendMessageResponse>(
    token,
    "POST",
    `/threads/${threadId}/messages`,
    req
  );
}

export async function listThreadActivities(
  token: string,
  threadId: UUID,
  opts?: { limit?: number; before?: string | null }
): Promise<ThreadActivityDTO[]> {
  return apiJson<ThreadActivityDTO[]>(
    token,
    "GET",
    `/threads/${threadId}/activities`,
    undefined,
    {
      limit: opts?.limit ?? 50,
      before: opts?.before ?? undefined,
    }
  );
}

export async function getThreadContext(
  token: string,
  threadId: UUID,
  asIdentity?: ParticipantIdentity | null
): Promise<ThreadContextDTO> {
  const asType = asIdentity?.participantType
    ? String(asIdentity.participantType).toUpperCase()
    : undefined;

  const asId = asIdentity?.participantId
    ? String(asIdentity.participantId)
    : undefined;

  return apiJson<ThreadContextDTO>(
    token,
    "GET",
    `/threads/${threadId}`,
    undefined,
    asType && asId ? { asType, asId } : undefined
  );
}

export async function sendIntroEmail(
  token: string,
  threadId: string,
  req: IntroEmailRequest
) {

  const asType = req.asIdentity?.participantType;
  const asId = req.asIdentity?.participantId;

  const url = new URL(`/threads/${encodeURIComponent(threadId)}/intro-email`, API_BASE);
  if (asType) url.searchParams.set("asType", String(asType));
  if (asId) url.searchParams.set("asId", String(asId));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    throw new Error(`sendIntroEmail failed (${res.status}): ${text}`);
  }

  return json;
}


/* ----------------------------- Referral V2 actions ----------------------------- */

export async function acceptReferralV2(
  token: string,
  referralSlug: string,
  req: ReferralDecisionV2Request
): Promise<ReferralV2DTO> {
  return apiJson<ReferralV2DTO>(
    token,
    "POST",
    `/v2/referrals/${encodeURIComponent(referralSlug)}/accept`,
    req
  );
}

export async function rejectReferralV2(
  token: string,
  referralSlug: string,
  req: ReferralDecisionV2Request
): Promise<ReferralV2DTO> {
  return apiJson<ReferralV2DTO>(
    token,
    "POST",
    `/v2/referrals/${encodeURIComponent(referralSlug)}/reject`,
    req
  );
}

export async function cancelReferralV2(
  token: string,
  referralSlug: string,
  req: ReferralDecisionV2Request
): Promise<ReferralV2DTO> {
  return apiJson<ReferralV2DTO>(
    token,
    "POST",
    `/v2/referrals/${encodeURIComponent(referralSlug)}/cancel`,
    req
  );
}

export type InviteRecommenderRequest = {
  recommendationId: string; // UUID
};

export async function inviteRecommenderToReferralThread(
  token: string,
  referralSlug: string,
  req: InviteRecommenderRequest
): Promise<OkResponse> {
  return apiJson<OkResponse>(
    token,
    "POST",
    `/v2/referrals/${encodeURIComponent(referralSlug)}/invite-recommender`,
    req
  );
}


/* ----------------------------- Referral V2 actions ----------------------------- */

export async function createThreadCta(
  token: string,
  threadId: string,
  req: CreateThreadCtaRequest
): Promise<ThreadCtaDTO> {
  return apiJson<ThreadCtaDTO>(
    token,
    "POST",
    `/threads/${encodeURIComponent(threadId)}/ctas`,
    req
  );
}
