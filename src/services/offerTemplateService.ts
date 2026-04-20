import type { UiAttachment } from "../types/threads";
import type {
  ApiError,
  ApiSuccess,
  OfferTemplateRequest,
  OfferTemplateResponse,
  OfferTemplateForm,
  ScopeItemSpec,
  OfferScopeSpec,
} from "../types/offerTemplateTypes";
import { supabase } from "../supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE as string;

/* --------------------------- low-level fetch helper --------------------------- */

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;

  const p = payload as ApiError;
  if (p?.error?.message) return p.error.message;

  return fallback;
}

async function resolveAccessToken(token?: string | null): Promise<string | null> {
  if (token !== undefined) {
    return token ?? null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

async function api<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  token?: string | null,
  body?: unknown,
  businessId?: string | null
): Promise<T> {
  const resolvedToken = await resolveAccessToken(token);

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...(businessId ? { "X-Acting-Business-Id": businessId } : {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  const json = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })()
    : null;

  if (!res.ok) {
    throw new Error(
      extractApiErrorMessage(json, text || `HTTP ${res.status}`)
    );
  }

  if (!json) {
    return undefined as unknown as T;
  }

  const envelope = json as ApiSuccess<T>;
  if (typeof envelope === "object" && envelope && "success" in envelope && "data" in envelope) {
    return envelope.data;
  }

  return json as T;
}

const toNumOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

const asLocalDateTime = (d?: string | null) => (!d ? null : `${d}T00:00:00`);

function normalizePrimaryImages(images: UiAttachment[] = []): UiAttachment[] {
  const filtered = (images ?? []).filter(
    (x) => !!x?.url && String(x?.mime ?? "").startsWith("image/")
  );

  if (!filtered.length) return [];

  let found = false;

  const next = filtered.map((img) => {
    if (img.isPrimary && !found) {
      found = true;
      return { ...img, isPrimary: true };
    }
    return { ...img, isPrimary: false };
  });

  if (!found) {
    next[0] = { ...next[0], isPrimary: true };
  }

  return next;
}
/* --------------------------- response -> form --------------------------- */

export function responseToForm(t: OfferTemplateResponse): OfferTemplateForm {
  return {
    businessId: t.businessId,
    offerTemplateId: t.offerTemplateId,

    templateTitle: t.templateTitle ?? "",
    description: t.description ?? "",
    images: normalizePrimaryImages((t.images ?? []) as UiAttachment[]),
    primaryImageUrl: t.primaryImageUrl ?? null,
    specialTerms: t.specialTerms ?? "",
    maxRedemptions: t.maxRedemptions ?? undefined,
    eligibility: t.eligibility ?? "",

    validityType: t.validityType,
    validFrom: t.validFrom?.slice(0, 10) ?? "",
    validTo: t.validTo?.slice(0, 10) ?? "",
    durationDays: t.durationDays ?? undefined,
    trigger: t.trigger ?? undefined,

    isActive: !!t.isActive,
    claimPolicy: t.claimPolicy ?? "BOTH",

    minPurchaseAmount: t.minPurchaseAmount ?? undefined,
    minPurchaseQty: t.minPurchaseQty ?? undefined,

    scopeKind: t.scopeKind ?? "ANY",
    scopeItems: t.scopeItems ?? [],

    offerType: t.offerType,
    discountPercentage: t.discountPercentage ?? undefined,
    maxDiscountAmount: t.maxDiscountAmount ?? undefined,
    discountAmount: t.discountAmount ?? undefined,

    tiers: t.tiers ?? [],

    grants: t.grants ?? [],
    grantPickLimit: t.grantPickLimit ?? 1,
    grantDiscountType: t.grantDiscountType ?? "FREE",
    grantDiscountValue: t.grantDiscountValue ?? undefined,

    purchasableWithPoints: t.purchasableWithPoints ?? false,
    pointsPrice: t.pointsPrice ?? null,
    maxPurchasesPerUser: t.maxPurchasesPerUser ?? null,
  };
}

/* --------------------------- form -> request payload --------------------------- */

export function buildOfferTemplatePayload(form: OfferTemplateForm): OfferTemplateRequest {
  const items: ScopeItemSpec[] = (form.scopeItems ?? []).flatMap<ScopeItemSpec>((it) => {
    if (it?.itemType === "PRODUCT" && it.product?.id) {
      return [{ itemType: "PRODUCT", id: it.product.id }];
    }
    if (it?.itemType === "BUNDLE" && it.bundle?.id) {
      return [{ itemType: "BUNDLE", id: it.bundle.id }];
    }
    return [];
  });

  const scope: OfferScopeSpec =
    form.scopeKind === "LIST"
      ? { kind: "LIST", items }
      : { kind: "ANY", items: [] };

  const tiersOn = Array.isArray(form.tiers) && form.tiers.length > 0;

  const baseFields = tiersOn
    ? { discountPercentage: null, maxDiscountAmount: null, discountAmount: null }
    : form.offerType === "PERCENTAGE_DISCOUNT"
      ? {
          discountPercentage: toNumOrNull(form.discountPercentage),
          maxDiscountAmount: toNumOrNull(form.maxDiscountAmount),
          discountAmount: null,
        }
      : form.offerType === "FIXED_DISCOUNT"
        ? {
            discountAmount: toNumOrNull(form.discountAmount),
            discountPercentage: null,
            maxDiscountAmount: null,
          }
        : { discountPercentage: null, maxDiscountAmount: null, discountAmount: null };

  const validity =
    form.validityType === "ABSOLUTE"
      ? {
          validityType: "ABSOLUTE" as const,
          validFrom: asLocalDateTime(form.validFrom),
          validTo: asLocalDateTime(form.validTo),
          durationDays: null,
          trigger: null,
        }
      : {
          validityType: "RELATIVE" as const,
          validFrom: null,
          validTo: null,
          durationDays: form.durationDays ?? null,
          trigger: (form.trigger as OfferTemplateRequest["trigger"]) ?? "ON_ASSIGNMENT",
        };

  const images = normalizePrimaryImages(form.images ?? []).map((img) => ({
    url: img.url,
    name: img.name,
    mime: img.mime,
    sizeBytes: img.sizeBytes ?? null,
    kind: img.kind ?? "IMAGE",
    path: img.path ?? null,
    isPrimary: img.isPrimary ?? null,
  }));

  return {
    offerTemplateId: form.offerTemplateId ?? null,

    templateTitle: form.templateTitle.trim(),
    description: form.description ?? "",
    images,
    specialTerms: form.specialTerms ?? null,
    maxRedemptions: form.maxRedemptions ?? null,
    eligibility: form.eligibility ?? null,

    minPurchaseAmount: toNumOrNull(form.minPurchaseAmount),
    minPurchaseQty: toNumOrNull(form.minPurchaseQty),
    scope,

    offerType: (form.offerType ?? "PERCENTAGE_DISCOUNT") as OfferTemplateRequest["offerType"],
    ...baseFields,
    ...validity,

    isActive: !!form.isActive,
    claimPolicy: form.claimPolicy ?? "BOTH",

    grants: form.grants ?? [],
    grantPickLimit: form.grantPickLimit ?? 1,
    grantDiscountType: form.grantDiscountType ?? "FREE",
    grantDiscountValue:
      form.grantDiscountType && form.grantDiscountType !== "FREE"
        ? toNumOrNull(form.grantDiscountValue)
        : null,

    tiers: tiersOn ? form.tiers ?? [] : [],

    purchasableWithPoints: !!form.purchasableWithPoints,
    pointsPrice:
      form.purchasableWithPoints && form.pointsPrice != null
        ? Number(form.pointsPrice)
        : null,
    maxPurchasesPerUser:
      form.purchasableWithPoints && form.maxPurchasesPerUser != null
        ? Number(form.maxPurchasesPerUser)
        : null,
  };
}

/* --------------------------- CRUD helpers --------------------------- */

export async function listOfferTemplates(
  businessId: string,
  token?: string | null
): Promise<OfferTemplateResponse[]> {
  return api<OfferTemplateResponse[]>(
    "/offer-templates",
    "GET",
    token,
    undefined,
    businessId
  );
}

export async function fetchOfferTemplateById(
  id: string,
  businessId: string,
  token?: string | null
): Promise<OfferTemplateResponse> {
  return api<OfferTemplateResponse>(
    `/offer-templates/${id}`,
    "GET",
    token,
    undefined,
    businessId
  );
}

export async function createOfferTemplate(
  payload: OfferTemplateRequest,
  businessId: string,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  return api<{ offerTemplateId: string }>(
    "/offer-templates",
    "POST",
    token,
    payload,
    businessId
  );
}

export async function updateOfferTemplate(
  id: string,
  payload: OfferTemplateRequest,
  businessId: string,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  return api<{ offerTemplateId: string }>(
    `/offer-templates/${id}`,
    "PUT",
    token,
    payload,
    businessId
  );
}

export async function deleteOfferTemplate(
  id: string,
  businessId: string,
  token?: string | null
): Promise<{ deleted: boolean; offerTemplateId: string }> {
  return api<{ deleted: boolean; offerTemplateId: string }>(
    `/offer-templates/${id}`,
    "DELETE",
    token,
    undefined,
    businessId
  );
}

export async function upsertOfferTemplate(
  payload: OfferTemplateRequest,
  businessId: string,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  const id = payload.offerTemplateId || undefined;
  if (id) {
    return updateOfferTemplate(id, payload, businessId, token);
  }
  return createOfferTemplate(payload, businessId, token);
}