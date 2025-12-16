// src/hooks/useResolvedBusinessFromUrl.ts
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getFullProfileByBusinessSlug } from "../services/profileService";

export interface ResolvedBusiness {
  userId: string;
  profileSlug: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
  businessSlug?: string;
  isContact?: boolean;
}

export function useResolvedBusinessFromUrl() {
  const [searchParams] = useSearchParams();
  const [business, setBusiness] = useState<ResolvedBusiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addToContacts, setAddToContacts] = useState(true);

  useEffect(() => {
    const businessSlug = searchParams.get("businessSlug");
    if (!businessSlug) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token;
        if (!token) throw new Error("Not authenticated");

        const p = await getFullProfileByBusinessSlug(businessSlug, token);

        const mapped: ResolvedBusiness = {
          userId: p.userId,
          profileSlug: p.slug,
          profileImageUrl: p.profileImageUrl ?? null,
          firstName: p.firstName ?? "Unknown",
          lastName: p.lastName ?? "",
          businessName: p.businessProfile?.businessName,
          businessSlug: p.businessProfile?.businessSlug ?? businessSlug,
          isContact: p.isContact ?? false,
        };

        setBusiness(mapped);
        setAddToContacts(!(mapped.isContact === true));
      } catch (e) {
        console.error(e);
        setError("Could not resolve business.");
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  const clear = () => {
    setBusiness(null);
    setAddToContacts(true);
    setError(null);
  };

  return {
    business,
    loading,
    error,
    addToContacts,
    setAddToContacts,
    clear,
  };
}
