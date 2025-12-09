import type {
  OfferTemplateRequest,
  OfferTemplateResponse, OfferTemplateForm, ScopeItemSpec, OfferScopeSpec
} from "../types/offerTemplateTypes";
//import { authFetch } from "../utils/auth";



const API_BASE = import.meta.env.VITE_API_BASE as string;

/* --------------------------- low-level fetch helper --------------------------- */
async function api<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  token?: string | null,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}


const toNumOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

const asLocalDateTime = (d?: string | null) => (!d ? null : `${d}T00:00:00`);

export function responseToForm(t: OfferTemplateResponse): OfferTemplateForm {
  return {
    businessId: t.businessId,
    offerTemplateId: t.offerTemplateId,

    templateTitle: t.templateTitle ?? "",
    description: t.description ?? "",
    imageUrls: t.imageUrls ?? [],
    specialTerms: t.specialTerms ?? "",
    maxRedemptions: t.maxRedemptions ?? undefined,
    eligibility: t.eligibility ?? "",

    validityType: t.validityType,
    validFrom: t.validFrom?.slice(0, 10) ?? "", // yyyy-mm-dd from yyyy-mm-ddTHH:MM:SS
    validTo: t.validTo?.slice(0, 10) ?? "",
    durationDays: t.durationDays ?? undefined,
    trigger: t.trigger ?? undefined,

    isActive: !!t.isActive,
    claimPolicy: t.claimPolicy ?? "BOTH",

    minPurchaseAmount: t.minPurchaseAmount ?? undefined,
    minPurchaseQty: t.minPurchaseQty ?? undefined,

    // Use response-style fields if present, otherwise derive from scope
    scopeKind: t.scopeKind ?? "ANY",
    scopeItems:
      t.scopeItems ?? [],

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

// ensure we only send fields the server knows about
export function buildOfferTemplatePayload(form: OfferTemplateForm): OfferTemplateRequest {
  // scope: IDs only for request
const items: ScopeItemSpec[] = (form.scopeItems ?? []).flatMap<ScopeItemSpec>((it) => {
  if (it?.itemType === "PRODUCT" && it.product?.id) {
    return [{ itemType: "PRODUCT" as const, id: it.product.id }];
  }
  if (it?.itemType === "BUNDLE" && it.bundle?.id) {
    return [{ itemType: "BUNDLE" as const, id: it.bundle.id }];
  }
  return [];
});

const scope: OfferScopeSpec =
  form.scopeKind === "LIST"
    ? { kind: "LIST" as const, items }
    : { kind: "ANY" as const, items: [] };

  // tiers toggle
  const tiersOn = Array.isArray(form.tiers) && form.tiers.length > 0;

  // base discount: include only when tiers are off and per offer type
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

  // validity blocks
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

  return {
    businessId: form.businessId,
    offerTemplateId: form.offerTemplateId ?? null,

    templateTitle: form.templateTitle.trim(),
    description: form.description ?? "",
    imageUrls: form.imageUrls ?? null,
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

    tiers: tiersOn ? form.tiers! : [],
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

/* --------------------------- CRUD helpers (paths updated) --------------------------- */

export async function listOfferTemplates(
  token?: string | null
): Promise<OfferTemplateResponse[]> {
  return api<OfferTemplateResponse[]>("/offer-templates", "GET", token);
}

export async function fetchOfferTemplateById(
  id: string,
  token?: string | null
): Promise<OfferTemplateResponse> {
  return api<OfferTemplateResponse>(`/offer-template/${id}`, "GET", token);
}

export async function createOfferTemplate(
  payload: any,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  return api<{ offerTemplateId: string }>("/offer-template", "POST", token, payload);
}

export async function updateOfferTemplate(
  id: string,
  payload: any,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  // Note: rely on api() to auto-resolve token if not provided
  return api<{ offerTemplateId: string }>(`/offer-template/${id}`, "PUT", token, payload);
}

export async function deleteOfferTemplate(
  id: string,
  token?: string | null
): Promise<void> {
  await api<void>(`/offer-template/${id}`, "DELETE", token);
}

/** Upsert by presence of offerTemplateId */
export async function upsertOfferTemplate(
  payload: any,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  const id = payload.offerTemplateId || payload.id;
  if (id) return updateOfferTemplate(id, payload, token);
  return createOfferTemplate(payload, token);
}
