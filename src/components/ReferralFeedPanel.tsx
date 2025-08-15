import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { fetchMyReferrals } from "../services/referralService";
import type { ReferralDTO } from "../types/referral";

type Status = "PENDING" | "ACCEPTED" | "CANCELLED";

const statusClass = (s: Status) =>
  s === "ACCEPTED" ? "accepted" : s === "PENDING" ? "pending" : "";

export default function ReferralFeedPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReferralDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setLoading(false); return; }
      try {
        const list = await fetchMyReferrals(token);
        // optional: newest first if you have updatedAt
        list.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
        if (mounted) setItems(list);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <aside className="thread-feed">
      <div className="feed-title">Referrals</div>

      {loading && <div className="feed-note" style={{padding:"0 10px 10px"}}>Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="feed-note" style={{padding:"0 10px 10px"}}>
          No referrals yet.
        </div>
      )}

      {!loading && items.map((r) => {
        const title = `${r.prospectName ?? "Prospect"} ↔ ${r.businessName ?? "Business"}`;
        const isActive = slug === r.slug;
        return (
          <div
            key={r.id}
            className={`feed-item ${isActive ? "active" : ""}`}
            onClick={() => navigate(`/referral/${r.slug}/thread`)}
            role="button"
            title={title}
          >
            <div>
              <div className="feed-name">{title}</div>
              {r.note && <div className="feed-note">{r.note}</div>}
            </div>
            <div className={`feed-chip ${statusClass(r.status as Status)}`}>
              {(r.status ?? "").toLowerCase()}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
