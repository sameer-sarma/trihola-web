import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE as string;
const LS_KEY = "trihola:firstLoginDone";

export type PriorActivitySummaryDTO = {
  contactsAdded: number;
  referralsCreated: number;
  referralsAccepted: number;
  offersPurchased?: number;
  campaignsCreated?: number;
  invitesResponded?: number; // keep for compatibility with your current response
};

export type SuggestedContactDTO = {
  id: string;
  name: string;
  slug: string;
  profileImageUrl?: string | null;
  reason?: string | null;
};

export type ActivitySectionDTO = {
  hasActivity: boolean;
  count: number;
  cta?: { title: string; subtitle?: string | null; action: string; route?: string | null; priority: number } | null;
  topItems: any[];
};

export type PublicProfile = {
  userId: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  location?: string;
  profession?: string;
  birthday?: string;
  linkedinUrl?: string;
  phone: string | null;
  email: string | null;
  registeredAsBusiness?: boolean;
  businessProfile?: {
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
    businessSlug?: string;
  } | null;
  isContact?: boolean;
};

export type BootstrapDTO = {
  bootstrapVersion: number;
  serverTimeUtc: string;
  auth: { emailVerified: boolean; phoneVerified: boolean; email?: string | null; phone?: string | null };
  profile: {
    userId: string;
    slug?: string | null;
    displayName?: string | null;
    profileImageUrl?: string | null;
    isBusiness: boolean;
    completionPercent: number;
    missing: string[];
  };

  referrals: ActivitySectionDTO;
  rewards: ActivitySectionDTO;
  affiliateCampaigns: ActivitySectionDTO;

  priorActivity?: PriorActivitySummaryDTO;
  suggestedContacts?: SuggestedContactDTO[];

  // NEW server flag (may be absent while you’re rolling out)
  hasPriorActivity?: boolean;
  featuredBusiness?: PublicProfile | null; 
};

export type BootstrapResult = {
  loading: boolean;
  error: string | null;
  data: BootstrapDTO | null;

  firstLoginDone: boolean;
  hasPriorActivity: boolean;
  nextRoute: "/start";
};

function readFirstLoginDone(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstLoginDone() {
  try {
    localStorage.setItem(LS_KEY, "1");
  } catch {}
}

function computeHasPriorActivityFromPrior(prior?: PriorActivitySummaryDTO): boolean {
  if (!prior) return false;

  return (
    (prior.contactsAdded ?? 0) > 0 ||
    (prior.referralsCreated ?? 0) > 0 ||
    (prior.referralsAccepted ?? 0) > 0 ||
    (prior.offersPurchased ?? 0) > 0 ||
    (prior.campaignsCreated ?? 0) > 0 ||
    (prior.invitesResponded ?? 0) > 0 
  );
}

export function useBootstrap(token?: string | null): BootstrapResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BootstrapDTO | null>(null);

  const firstLoginDone = useMemo(() => readFirstLoginDone(), []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<BootstrapDTO>(`${API_BASE}/me/bootstrap`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setData(res.data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Bootstrap failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Prefer server truth; fallback to computed for rollout safety
  const hasPriorActivity =
    data?.hasPriorActivity ?? computeHasPriorActivityFromPrior(data?.priorActivity);

  const nextRoute: BootstrapResult["nextRoute"] = "/start";

  return {
    loading,
    error,
    data,
    firstLoginDone,
    hasPriorActivity,
    nextRoute,
  };
}
