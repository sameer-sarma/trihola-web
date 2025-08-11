import axios from "axios";
import { OfferTemplateDTO, OfferDetailsDTO, OfferClaimDTO } from "../types/offer";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";

export const getOfferTemplates = async (token: string): Promise<OfferTemplateDTO[]> => {
  const response = await axios.get(`${API_BASE}/offer-templates`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const assignOfferToReferral = async (
  token: string,
  referralId: string,
  participantRole: "REFERRER" | "PROSPECT",
  offerTemplateId: string
): Promise<void> => {
  await axios.post(
    `${API_BASE}/referrals/assign-offer`,
    {
      offerAssignedToLevel: "REFERRAL",
      levelId: referralId,
      offerAssignedToRole: participantRole,
      templateId: offerTemplateId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const fetchOfferDetails = async (
  token: string,
  assignedOfferId: string
): Promise<OfferDetailsDTO> => {
  const response = await axios.get(`${API_BASE}/offers/${assignedOfferId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export async function fetchClaimDetails(token: string, claimId: string): Promise<OfferClaimDTO> {
  const res = await fetch(`${API_BASE}/claims/${claimId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch claim details");
  return await res.json();
}

export const approveClaim = async (
  claimId: string,
  token: string,
  redemptionValue: string,
  note?: string
): Promise<void> => {
  const response = await fetch(`${API_BASE}/claims/${claimId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      redemptionValue,
      note,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to approve claim: ${response.status} ${errorText}`);
  }
};
