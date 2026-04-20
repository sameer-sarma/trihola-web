// src/services/offerAssignmentPlanService.ts

import type {
  AssignOfferRequest,
  AssignOfferResponse,
  CreateOfferAssignmentPlanRequest,
  CreateOfferAssignmentPlanResponse,
} from "../types/offerAssignmentPlanTypes";

const API_BASE = import.meta.env.VITE_API_BASE as string;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
};

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code?: string;
        message: string;
        details?: unknown;
        status?: number;
      };
    };

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const p = payload as ApiErrorPayload;
  if (typeof p.error?.message === "string" && p.error.message.trim()) {
    return p.error.message;
  }
  if (typeof p.message === "string" && p.message.trim()) {
    return p.message;
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
      // ignore JSON parse failures
    }

    const err = new Error(
      extractApiErrorMessage(payload, `Request failed with status ${res.status}`)
    ) as Error & { status?: number; payload?: unknown };

    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return res.json() as Promise<T>;
}

/**
 * Direct-thread assignment route.
 * Backend route:
 *   POST /offers/assign
 */
export async function assignOffer(
  req: AssignOfferRequest,
  token?: string | null,
  businessId?: string | null
): Promise<ServiceResult<AssignOfferResponse>> {
  try {
    const data = await api<AssignOfferResponse>(
      "/offers/assign",
      "POST",
      token,
      req,
      businessId
    );

    return {
      ok: true,
      data,
    };
  } catch (err) {
    const e = err as Error & {
      status?: number;
      payload?: any;
    };

    return {
      ok: false,
      error: {
        code: e.payload?.error?.code,
        message: e.message || "Failed to assign offer",
        details: e.payload?.error?.details ?? e.payload,
        status: e.status,
      },
    };
  }
}

export async function createOfferAssignmentPlan(
  req: CreateOfferAssignmentPlanRequest,
  token?: string | null,
  businessId?: string | null
): Promise<ServiceResult<CreateOfferAssignmentPlanResponse>> {
  try {
    const data = await api<CreateOfferAssignmentPlanResponse>(
      "/offer-assignment-plans",
      "POST",
      token,
      req,
      businessId
    );

    return {
      ok: true,
      data,
    };
  } catch (err) {
    const e = err as Error & {
      status?: number;
      payload?: any;
    };

    return {
      ok: false,
      error: {
        code: e.payload?.error?.code,
        message: e.message || "Failed to create offer assignment plan",
        details: e.payload?.error?.details ?? e.payload,
        status: e.status,
      },
    };
  }
}