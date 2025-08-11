import axios from "axios";
import { OfferTemplateRequest, OfferTemplateResponse } from "../types/offerTemplateTypes";

const API_BASE_URL = "http://127.0.0.1:8080";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

export const fetchOfferTemplates = async (token: string): Promise<OfferTemplateResponse[]> => {
  const response = await axios.get(`${API_BASE_URL}/offer-templates`, authHeader(token));
  return response.data;
};

export const fetchOfferTemplateById = async (id: string, token: string): Promise<OfferTemplateResponse> => {
  const response = await axios.get(`${API_BASE_URL}/offer-template/${id}`, authHeader(token));
  return response.data;
};

export const upsertOfferTemplate = async (
  template: OfferTemplateRequest,
  token: string
): Promise<{ offerTemplateId: string }> => {
  const response = await axios.post(`${API_BASE_URL}/offer-template`, template, authHeader(token));
  return response.data;
};
