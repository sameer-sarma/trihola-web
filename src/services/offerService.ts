import axios from "axios";
import { OfferTemplateDTO, OfferDetailsDTO, WalletStoreResponse, AssignedOfferDTO, OfferClaimDTO, ClaimSource, AssignOfferRequest, RecipientRole, ClaimRequestDTO, 
FetchGrantOptionsResponse, GrantItemSnapshot, GrantLine, OfferClaimView, ClaimPreviewRequest, ClaimPreviewResponse, 
EligibleOffersMultiResponseDTO, WalletOfferResponseDTO } from "../types/offer";

const API_BASE = import.meta.env.VITE_API_BASE as string;

function toSnapshot(line: GrantLine): GrantItemSnapshot {
  if (line.itemType === "PRODUCT") {
    return {
      itemType: "PRODUCT",
      quantity: line.quantity ?? 1,
      product: { id: line.productId }, // minimal is fine; metadata fields are optional
    };
  }
  return {
    itemType: "BUNDLE",
    quantity: line.quantity ?? 1,
    bundle: { id: line.bundleId },
  };
}

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
    assignedVia: "REFERRAL",
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
    assignedVia: "CAMPAIGN",
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
    assignedVia: "USER_WP_PURCHASED",
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

export async function fetchGrantOptions(assignedOfferId: string, token: string): Promise<FetchGrantOptionsResponse> {
  console.log(token)
  const r = await fetch(`${API_BASE}/offers/${assignedOfferId}/grant-options`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }, 
    credentials: 'include' 
  }
);
console.log(r)
  if (!r.ok) throw new Error('Failed to load grant options');
  return r.json();
}

export async function fetchClaimDetails(token: string, claimId: string): Promise<OfferClaimDTO> {
  const res = await fetch(`${API_BASE}/claims/${claimId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch claim details");
  return await res.json();
};

export async function approveClaim(
  claimId: string,
  token: string,
  body: {
    note?: string;
    redemptionValue?: string;           // for percentage
    /** EITHER pass snapshots directly… */
    selectedGrants?: GrantItemSnapshot[];
    /** …or let the service convert UI lines to snapshots */
    grants?: GrantLine[];
  },
): Promise<void> {
  const payload: Record<string, any> = {
    note: body.note ?? "",
  };

  if (body.redemptionValue !== undefined) {
    payload.redemptionValue = body.redemptionValue;
  }

  // ✅ Only send `selectedGrants` (what Ktor expects). Never send `grants` or `{ grantId }`.
  if (Array.isArray(body.selectedGrants) && body.selectedGrants.length > 0) {
    payload.selectedGrants = body.selectedGrants;
  } else if (Array.isArray(body.grants) && body.grants.length > 0) {
    payload.selectedGrants = body.grants.map(toSnapshot);
  }

  const res = await fetch(`${API_BASE}/claims/${claimId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to approve claim: ${res.status} ${text}`);
  }
}

/** Reject a pending claim (business side) with a reason. */
export async function rejectClaim(
  claimId: string,
  body: { reason?: string },
  token?: string | null
) {
  const response = await fetch(`${API_BASE}/claims/${claimId}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note: body.reason ?? "",
    }),
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json(); // -> updated claim
}

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

/** POST /offers/:id/claim — will honor policy + source on the server */
export async function requestClaim(
  token: string,
  assignedOfferId: string,
  body: ClaimRequestDTO
): Promise<OfferClaimDTO> {
  const res = await fetch(`${API_BASE}/offers/${assignedOfferId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to request claim (${res.status})`);
  }
  return res.json();
}

export async function fetchOfferClaims(
  assignedOfferId: string,
  token: string
): Promise<OfferClaimView[]> {
  try {
    const resp = await axios.get<OfferClaimView[]>(
      `${API_BASE}/offers/${assignedOfferId}/claims`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data ?? [];
  } catch (e: any) {
    const code = e?.response?.status;
    const msg = code === 403 ? "Not authorized to view claims" : "Failed to fetch claims";
    throw new Error(msg);
  }
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

export async function fetchApprovableManualClaim(
  assignedOfferId: string,
  token?: string | null
): Promise<OfferClaimDTO | null> {
  const url = `${API_BASE}/offers/${encodeURIComponent(assignedOfferId)}/claims/active/approvable`;

  const r = await fetch(url, {
    method: "GET",
    headers: token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (r.status === 404 || r.status === 204) return null;
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function previewClaim(
  assignedOfferId: string,
  claimId: string,
  payload: ClaimPreviewRequest,
  token?: string | null
): Promise<ClaimPreviewResponse> {
  const url = `${API_BASE}/offers/${encodeURIComponent(assignedOfferId)}/claims/${encodeURIComponent(claimId)}/preview`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchWalletStore(
  businessSlug: string,
  token?: string | null
): Promise<WalletStoreResponse> {
  const url = `${API_BASE}/wallet/${encodeURIComponent(businessSlug)}/store`;
  const r = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function purchaseOfferWithPoints(
  businessSlug: string,
  offerTemplateId: string,
  token?: string | null
): Promise<{ assignedOfferId: string }> {
  const url = `${API_BASE}/wallet/${encodeURIComponent(businessSlug)}/offers/${encodeURIComponent(offerTemplateId)}/purchase`;
  
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchMyOffers( token?: string | null): Promise<AssignedOfferDTO[]> {
  const url = `${API_BASE}/offers/me`;
  
  const r = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();

}

export async function refundOfferPurchase(
  businessSlug: string,
  assignedOfferId: string,
  token: string | null
): Promise<void> {
  if (!token) {
    throw new Error("Missing auth token");
  }

  const res = await fetch(
    `${API_BASE}/wallet/${encodeURIComponent(
      businessSlug
    )}/offers/${encodeURIComponent(assignedOfferId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to refund offer");
  }
}

export async function fetchEligibleWalletOffers(
  authToken: string | null,
  businessId?: string
): Promise<EligibleOffersMultiResponseDTO> {
  const qs = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
  const res = await fetch(`${API_BASE}/wallet/eligible${qs}`, {
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to load eligible offers");
  }
  return res.json();
}

export async function fetchWalletOffer(
  businessSlug: string,
  offerTemplateId: string,
  token?: string | null
): Promise<WalletOfferResponseDTO> {
  const url = `${API_BASE}/wallet/${encodeURIComponent(
    businessSlug
  )}/offers/${encodeURIComponent(offerTemplateId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Failed to fetch wallet offer (${res.status})`);
  }

  return (await res.json()) as WalletOfferResponseDTO;
}
