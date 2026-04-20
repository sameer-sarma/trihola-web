// src/hooks/useOfferClaims.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { fetchActiveClaimForMe, requestClaim } from "../services/offerService";
import { OfferDetailsDTO, OfferClaimDTO, ClaimRequestDTO, GrantSelectionInput } from "../types/offer";

export function useOfferClaims(offer: OfferDetailsDTO) {
  const [manual, setManual] = useState<OfferClaimDTO | null>(null);
  const [online, setOnline] = useState<OfferClaimDTO | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !offer.assignedOfferId) return;
      const [m, o] = await Promise.all([
        fetchActiveClaimForMe(token, offer.assignedOfferId, "MANUAL"),
        fetchActiveClaimForMe(token, offer.assignedOfferId, "ONLINE"),
      ]);
      if (!abort) {
        setManual(m && m.status === "PENDING" ? m : null);
        setOnline(o && o.status === "PENDING" ? o : null);
      }
    })();
    return () => { abort = true; };
  }, [offer.assignedOfferId]);

  // NEW: accept selectedGrants for MANUAL (QR) claims
  const generateManual = useCallback(
    async (selectedGrants?: GrantSelectionInput[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !offer.assignedOfferId) return;

      const body: ClaimRequestDTO = {
        claimSource: "MANUAL",
        // server will derive redemptionType; keep if you still need it
        // redemptionType: offer.offerType,
        expiresInMinutes: 15,
        selectedGrants, // <— pass the shopper’s picks
      };
      const c = await requestClaim(token, offer.assignedOfferId, body);
      setManual(c);
      return c;
    },
    [offer]
  );

  const generateOnline = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const c = await requestClaim(token, offer.assignedOfferId, {
      redemptionType: typeof offer.discountPercentage === "number" ? "PERCENTAGE_DISCOUNT" : (offer.offerType || "FREE_SERVICE"),
      redemptionValue: typeof offer.discountPercentage === "number" ? String(offer.discountPercentage) : (offer.description ?? ""),
      expiresInMinutes: 10,
      claimSource: "ONLINE",
    });
    setOnline(c);
    try { if (c.discountCode) await navigator.clipboard.writeText(c.discountCode); } catch {}
    return c;
  }, [offer]);

  return { manual, online, generateManual, generateOnline };
}
