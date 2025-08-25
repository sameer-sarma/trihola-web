import axios from "axios";
import { OfferTemplateDTO, OfferDetailsDTO, OfferClaimDTO } from "../types/offer";

export const getOfferTemplates = async (token: string): Promise<OfferTemplateDTO[]> => {
  const response = await axios.get(`${__API_BASE__}/offer-templates`, {
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
    `${__API_BASE__}/referrals/assign-offer`,
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
  const response = await axios.get(`${__API_BASE__}/offers/${assignedOfferId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export async function fetchClaimDetails(token: string, claimId: string): Promise<OfferClaimDTO> {
  const res = await fetch(`${__API_BASE__}/claims/${claimId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch claim details");
  return await res.json();
};

export const approveClaim = async (
  claimId: string,
  token: string,
  redemptionValue: string,
  note?: string
): Promise<void> => {
  const response = await fetch(`${__API_BASE__}/claims/${claimId}/approve`, {
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

export const markClaimExpired = async (
  token: string,
  claimId: string
): Promise<void> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE}/claims/${claimId}/expire`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.warn (`Failed to expire claim: ${response.status} ${errorText}`);
  }
};