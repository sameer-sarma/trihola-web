// src/components/ReferralFeedPanel.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useReferrals } from "../context/ReferralsContext";

export default function ReferralFeedPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { referrals } = useReferrals();

  return (
    <aside className="thread-feed">
      <div className="feed-title">Referrals</div>

      {!referrals.length && (
        <div className="feed-note" style={{padding:"0 10px 10px"}}>No referrals yet.</div>
      )}

      {referrals.map((r) => {
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
            <div className={`feed-chip ${(r.status ?? "").toLowerCase()}`}>
              {(r.status ?? "").toLowerCase()}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
