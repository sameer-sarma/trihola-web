import axios from "axios";
import { OfferTemplateRequest, OfferTemplateResponse, UiOfferKind } from "../types/offerTemplateTypes";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

export const fetchOfferTemplates = async (token: string): Promise<OfferTemplateResponse[]> => {
  const response = await axios.get(`${__API_BASE__}/offer-templates`, authHeader(token));
  return response.data;
};

export const fetchOfferTemplateById = async (id: string, token: string): Promise<OfferTemplateResponse> => {
  const response = await axios.get(`${__API_BASE__}/offer-template/${id}`, authHeader(token));
  return response.data;
};

export const upsertOfferTemplate = async (
  template: OfferTemplateRequest,
  token: string
): Promise<{ offerTemplateId: string }> => {
  const response = await axios.post(`${__API_BASE__}/offer-template`, template, authHeader(token));
  return response.data;
};


export function buildOfferTemplatePayload(
  form: OfferTemplateRequest,
  uiKind: UiOfferKind
): OfferTemplateRequest {
  // derive the final offerType & discount fields
 const offerType =
  uiKind === "GRANTS"     ? "GRANT" :
  uiKind === "PERCENTAGE" ? "PERCENTAGE_DISCOUNT" :
                             "FIXED_DISCOUNT";

  // validity
  const isAbsolute = form.validityType === "ABSOLUTE";
  const validFrom = isAbsolute ? (form.validFrom || undefined) : undefined;
  const validTo   = isAbsolute ? (form.validTo   || undefined) : undefined;
  const durationDays = !isAbsolute ? form.durationDays : undefined;
  const trigger      = !isAbsolute ? form.trigger      : undefined;

  // scope
  const appliesProductId =
    form.appliesToType === "PRODUCT" ? form.appliesProductId ?? undefined : undefined;
  const appliesBundleId  =
    form.appliesToType === "BUNDLE"  ? form.appliesBundleId  ?? undefined : undefined;


  // Build the final payload (spread original to keep required fields like businessId/templateTitle/validityType)
  const payload: OfferTemplateRequest = {
    ...form,
    offerType,
    discountAmount: uiKind === "ABSOLUTE" ? form.discountAmount ?? 0 : undefined,
    discountPercentage: uiKind === "PERCENTAGE" ? form.discountPercentage : undefined,
    maxDiscountAmount: uiKind === "PERCENTAGE" ? form.maxDiscountAmount : undefined,
    grants: uiKind === "GRANTS" ? (form.grants ?? []) : [],
    
    validFrom,
    validTo,
    durationDays,
    trigger,

    appliesProductId,
    appliesBundleId,

  };

  return payload;
}