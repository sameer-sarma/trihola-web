import type { ApiError } from "../types/offerTemplateTypes";
import type {
  AssignedOfferDetailsDTO,
  OfferSnapshotMsg,
  OfferStatusChangedMsg,
} from "../types/offerDetailsTypes";

//const API_BASE = import.meta.env.VITE_API_BASE as string;
const API_BASE = __API_BASE__;

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const p = payload as ApiError;
  if (p?.error?.message) return p.error.message;

  if ("message" in (payload as Record<string, unknown>)) {
    const msg = (payload as Record<string, unknown>).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  if ("error" in (payload as Record<string, unknown>)) {
    const err = (payload as Record<string, unknown>).error;
    if (typeof err === "string" && err.trim()) return err;
  }

  return fallback;
}

async function api<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  token?: string | null,
  body?: unknown,
  businessId?: string | null
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(businessId ? { "X-Acting-Business-Id": businessId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      try {
        payload = await res.text();
      } catch {
        payload = null;
      }
    }

    throw new Error(
      extractApiErrorMessage(payload, `Request failed with status ${res.status}`)
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function fetchOfferDetails(params: {
  assignedOfferId: string;
  token?: string | null;
  businessId?: string | null;
}): Promise<AssignedOfferDetailsDTO> {
  const { assignedOfferId, token, businessId } = params;

  if (!assignedOfferId?.trim()) {
    throw new Error("assignedOfferId is required.");
  }

  return api<AssignedOfferDetailsDTO>(
    `/offers/${assignedOfferId}`,
    "GET",
    token,
    undefined,
    businessId
  );
}

/**
 * These are local helpers for UI / WS typing consistency.
 * They do not call the backend directly right now.
 */
export function makeOfferSnapshotMsg(params: {
  assignedOfferId: string;
  status: string;
  redemptionsUsed?: number | null;
  at?: number;
}): OfferSnapshotMsg {
  return {
    kind: "offer.snapshot",
    assignedOfferId: params.assignedOfferId,
    status: params.status,
    redemptionsUsed: params.redemptionsUsed ?? 0,
    manualClaim: null,
    onlineClaim: null,
    at: params.at ?? Date.now(),
  };
}

export function makeOfferStatusChangedMsg(params: {
  assignedOfferId: string;
  status: string;
  redemptionsUsed?: number | null;
  at?: number;
}): OfferStatusChangedMsg {
  return {
    kind: "offer.status.changed",
    assignedOfferId: params.assignedOfferId,
    status: params.status,
    redemptionsUsed: params.redemptionsUsed ?? 0,
    at: params.at ?? Date.now(),
  };
}