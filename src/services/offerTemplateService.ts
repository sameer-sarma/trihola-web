import type {
  OfferTemplateRequest as UiOfferTemplateRequest,
  OfferTemplateResponse,
  UiOfferKind,
  ActivationCondition,
   OfferGrantLine,
} from "../types/offerTemplateTypes";



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

/* --------------------------- payload builder (no legacy) --------------------------- */
/**
 * Shapes the payload exactly as Ktor expects under the new schema.
 * - GRANTS: include only grants fields; strip discount/tier fields.
 * - DISCOUNT (PERCENTAGE/FIXED): include base or tiers; strip grants fields.
 * - Scope:
 *    - ANY_PURCHASE → omit appliesProductIds/appliesBundleIds entirely
 *    - LIST         → include appliesProductIds/appliesBundleIds (may be empty if UI allowed)
 * - Validity:
 *    - ABSOLUTE → send validFrom/validTo (yyyy-mm-dd), null duration/trigger
 *    - RELATIVE → send durationDays/trigger, null validFrom/validTo
 */
// services/offerTemplateService.ts (or wherever your builder lives)

// The Kotlin API expects OfferTemplateRequest (OfferModels.kt)
type ScopeItemSpec = { itemType: "PRODUCT" | "BUNDLE"; id: string };
type OfferScopeSpec = { kind: "ANY" | "LIST"; items: ScopeItemSpec[] };

type DiscountTierSpec = {
  minAmount?: number | null;
  minQty?: number | null;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  maxDiscountAmount?: number | null;
};

type OfferTemplateGrantSpec = {
  itemType: "PRODUCT" | "BUNDLE";
  productId?: string | null;
  bundleId?: string | null;
  quantity?: number;
};

type ServerOfferTemplateRequest = {
  businessId: string;
  offerTemplateId?: string | null;

  // metadata
  templateTitle: string;
  description?: string | null;
  imageUrls?: string[] | null;
  specialTerms?: string | null;
  maxRedemptions?: number | null;
  eligibility?: string | null;

  // floors / scope
  minPurchaseAmount?: number | null;
  minPurchaseQty?: number | null;
  scope: OfferScopeSpec;

  // type & core
  offerType: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
  discountPercentage?: number | null;
  maxDiscountAmount?: number | null;
  discountAmount?: number | null;

  // validity
  validityType: "ABSOLUTE" | "RELATIVE";
  validFrom?: string | null;
  validTo?: string | null;
  durationDays?: number | null;
  trigger?: ActivationCondition | null;

  // state & policy
  isActive: boolean;
  claimPolicy?: "BOTH" | "ONLINE" | "MANUAL" | null;

  // grants
  grants: OfferTemplateGrantSpec[];
  grantPickLimit: number;
  grantDiscountType?: "FREE" | "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE" | null;
  grantDiscountValue?: number | null;

  // tiers
  tiers?: DiscountTierSpec[] | null;
};

// ensure we only send fields the server knows about
export function buildOfferTemplatePayload(
  form: UiOfferTemplateRequest,
  uiOfferKind: UiOfferKind
): ServerOfferTemplateRequest {
  // ----- helpers -----
  const asLocalDateTime = (d?: string | null) => (!d ? null : `${d}T00:00:00`);

  const isServerTier = (t: any) =>
    t && (typeof t.discountAmount !== "undefined" || typeof t.discountPercentage !== "undefined");

  const isUiTierRow = (t: any) =>
    t && typeof t.discountType !== "undefined" && typeof t.discountValue !== "undefined";

  // ----- 1) scope transform -----
  const scope: OfferScopeSpec =
    form.scopeKind === "LIST"
      ? {
          kind: "LIST",
          items: [
            ...(form.appliesProductIds ?? []).map<ScopeItemSpec>((id) => ({ itemType: "PRODUCT", id })),
            ...(form.appliesBundleIds ?? []).map<ScopeItemSpec>((id) => ({ itemType: "BUNDLE", id })),
          ],
        }
      : { kind: "ANY", items: [] };

  // ----- 2) offer type -----
  const offerType: ServerOfferTemplateRequest["offerType"] =
    uiOfferKind === "GRANTS" ? "GRANT" : (form.offerType as ServerOfferTemplateRequest["offerType"]);

  // ----- 3) tiers transform (robust: pass-through if already server-shaped) -----
  let tiers: DiscountTierSpec[] | null = null;

  if (Array.isArray(form.tiers) && form.tiers.length > 0) {
    if (isServerTier(form.tiers[0])) {
      // Already server shape (e.g., from uiToServerTiers). Normalize nulls.
      tiers = (form.tiers as any[]).map((t) => ({
        minAmount: (t.minAmount ?? 0) as number,
        minQty: t.minQty ?? null,
        discountAmount: t.discountAmount ?? null,
        discountPercentage: t.discountPercentage ?? null,
        maxDiscountAmount: t.maxDiscountAmount ?? null,
      }));
    } else if (isUiTierRow(form.tiers[0])) {
      // UI rows -> server shape
      tiers = (form.tiers as any[]).map((t) => {
        const isPct = t.discountType === "PERCENTAGE";
        return {
          minAmount: (t.minAmount ?? 0) as number,
          minQty: null,
          discountPercentage: isPct ? (t.discountValue ?? 0) : null,
          discountAmount: !isPct ? (t.discountValue ?? 0) : null,
          maxDiscountAmount: isPct ? (t.maxDiscountAmount ?? 0) : null,
        } as DiscountTierSpec;
      });
    } else {
      console.warn("[buildOfferTemplatePayload] Unknown tier shape; sending null tiers. First item:", form.tiers[0]);
      tiers = null;
    }
  } else {
    tiers = null;
  }

  console.log("[buildOfferTemplatePayload] tiers BEFORE payload:", JSON.stringify(tiers, null, 2));

  // ----- 4) grants transform -----
  const grants: OfferTemplateGrantSpec[] = (form.grants ?? []).map((g: OfferGrantLine) => ({
    itemType: g.itemType,
    productId: g.itemType === "PRODUCT" ? g.productId ?? null : null,
    bundleId: g.itemType === "BUNDLE" ? g.bundleId ?? null : null,
    quantity: g.quantity ?? 1,
  }));

  // ----- 5) validity -----
  const payload: ServerOfferTemplateRequest = {
    businessId: form.businessId,
    offerTemplateId: (form as any).offerTemplateId ?? null,

    templateTitle: form.templateTitle,
    description: form.description,
    imageUrls: form.imageUrls ?? null,
    specialTerms: form.specialTerms ?? null,
    maxRedemptions: form.maxRedemptions ?? null,
    eligibility: form.eligibility ?? null,

    minPurchaseAmount: form.minPurchaseAmount ?? null,
    minPurchaseQty: (form as any).minPurchaseQty ?? null,
    scope,

    offerType,

    // Top-level discount fields: only when NO tiers are used.
    discountPercentage:
      tiers && tiers.length > 0
        ? null
        : offerType === "PERCENTAGE_DISCOUNT"
        ? form.discountPercentage ?? null
        : null,
    maxDiscountAmount:
      tiers && tiers.length > 0
        ? null
        : offerType === "PERCENTAGE_DISCOUNT"
        ? form.maxDiscountAmount ?? null
        : null,
    discountAmount:
      tiers && tiers.length > 0
        ? null
        : offerType === "FIXED_DISCOUNT"
        ? form.discountAmount ?? null
        : null,

    validityType: form.validityType,
    validFrom: form.validityType === "ABSOLUTE" ? asLocalDateTime(form.validFrom) : null,
    validTo: form.validityType === "ABSOLUTE" ? asLocalDateTime(form.validTo) : null,
    durationDays: form.validityType === "RELATIVE" ? form.durationDays ?? null : null,
    trigger: form.validityType === "RELATIVE" ? form.trigger ?? null : null,

    isActive: !!form.isActive,
    claimPolicy: (form.claimPolicy as any) ?? "BOTH",

    grants,
    grantPickLimit: form.grantPickLimit ?? 1,
    grantDiscountType: form.grantDiscountType ?? "FREE",
    grantDiscountValue:
      form.grantDiscountType && form.grantDiscountType !== "FREE" ? form.grantDiscountValue ?? null : null,

    tiers,
  };

  console.log("[buildOfferTemplatePayload] FINAL payload:", JSON.stringify(payload, null, 2));
  return payload;
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
  return api<{ offerTemplateId: string }>(
    "/offer-template",
    "POST",
    token,
    payload
  );
}

export async function updateOfferTemplate(
  id: string,
  payload: any,
  token?: string | null
): Promise<{ offerTemplateId: string }> {
  return api<{ offerTemplateId: string }>(
    `/offer-template/${id}`,
    "PUT",
    token,
    payload
  );
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

