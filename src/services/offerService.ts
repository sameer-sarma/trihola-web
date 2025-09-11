import axios from "axios";
import { OfferTemplateDTO, OfferDetailsDTO, OfferClaimDTO, ClaimSource, AssignOfferRequest, RecipientRole } from "../types/offer";
const API_BASE = import.meta.env.VITE_API_BASE as string;

export const getOfferTemplates = async (token: string): Promise<OfferTemplateDTO[]> => {
  const response = await axios.get(`${API_BASE}/offer-templates`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export async function getAssignedOffersByLevel(
  token: string,
  level: "REFERRAL" | "REFERRAL_CAMPAIGN",
  levelId: string
) {
  const url = `${API_BASE}/referrals/get-assigned-offers`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    params: { level, levelId },
  });
  return res.data as any[]; // OfferDetailsDTO[]
}

export async function assignOffer(token: string, req: AssignOfferRequest) {
  const res = await axios.post(`${API_BASE}/assigned-offers`, req, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // AssignedOfferDetailsDTO
}

export async function assignOfferToReferral(
  token: string,
  referralId: string,
  recipientRole: RecipientRole,
  offerTemplateId: string,
  notes?: string
) {
  return assignOffer(token, {
    offerTemplateId,
    targetType: "REFERRAL",
    referralId,
    recipientRole,
    notes,
  });
}

export async function assignOfferToReferralCampaign(
  token: string,
  referralCampaignId: string,
  recipientRole: RecipientRole,
  offerTemplateId: string,
  notes?: string
) {
  return assignOffer(token, {
    offerTemplateId,
    targetType: "REFERRAL_CAMPAIGN",
    referralCampaignId,
    recipientRole,
    notes,
  });
}

export async function assignOfferToUser(
  token: string,
  targetUserId: string,
  offerTemplateId: string,
  notes?: string
) {
  return assignOffer(token, {
    offerTemplateId,
    targetType: "USER",
    targetUserId,
    notes,
  });
}

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
};

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

export const markClaimExpired = async (
  token: string,
  claimId: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE}/claims/${claimId}/expire`,
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

export interface ClaimRequest {
  redemptionType: string;
  redemptionValue?: string | null;
  note?: string | null;
  expiresInMinutes?: number | null;
  claimSource: 'MANUAL' | 'ONLINE';
}

/** POST /offers/:id/claim — will honor policy + source on the server */
export async function requestClaim(
  token: string,
  assignedOfferId: string,
  payload: ClaimRequest
): Promise<OfferClaimDTO> {
  const res = await fetch(`${API_BASE}/offers/${assignedOfferId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to request claim (${res.status})`);
  }
  return res.json();
}

export async function fetchActiveClaimForMe(
  token: string,
  assignedOfferId: string,
  source: ClaimSource
): Promise<OfferClaimDTO | null> {
  const res = await fetch(
    `${API_BASE}/offers/${assignedOfferId}/claims/active/me?source=${source}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 404) return null; // no active claim for that source
  if (!res.ok) return null;            // treat other errors as "none" (UI stays usable)

  return (await res.json()) as OfferClaimDTO;
}