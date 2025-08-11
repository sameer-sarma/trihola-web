import axios from "axios";
import { OfferTemplateRequest, OfferTemplateResponse } from "../types/offerTemplateTypes";

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
