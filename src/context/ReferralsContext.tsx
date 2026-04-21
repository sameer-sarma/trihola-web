// src/context/ReferralsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { fetchMyReferrals } from "../services/referralService";
import type { ReferralDTO } from "../types/referral";

type Ctx = {
  referrals: ReferralDTO[];
  refresh: () => Promise<void>;
  updateOne: (r: ReferralDTO) => void; // optional in-place update when REFERRAL_UPDATED arrives
};

const ReferralsContext = createContext<Ctx>({
  referrals: [],
  refresh: async () => {},
  updateOne: () => {},
});

export const ReferralsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [referrals, setReferrals] = useState<ReferralDTO[]>([]);

  const refresh = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const list = await fetchMyReferrals(token);
    list.sort((a: any, b: any) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    setReferrals(list);
  };

  const updateOne = (r: ReferralDTO) => {
    setReferrals(prev => {
      const i = prev.findIndex(x => x.id === r.id);
      if (i === -1) return prev;
      const next = prev.slice();
      next[i] = r;
      return next;
    });
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <ReferralsContext.Provider value={{ referrals, refresh, updateOne }}>
      {children}
    </ReferralsContext.Provider>
  );
};

export const useReferrals = () => useContext(ReferralsContext);
