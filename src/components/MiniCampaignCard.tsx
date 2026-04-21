import { useState } from "react";
import type { CampaignOwnerDTO } from "../types/campaign";
import { Link } from "react-router-dom";

type Props = {
  data: CampaignOwnerDTO;
  onDelete?: (id: string) => Promise<void>;
};

export default function MiniCampaignCard({ data, onDelete }: Props) {
  const [pending, setPending] = useState(false);
  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = window.confirm(`Delete campaign “${data.title}”? This cannot be undone.`);
    if (!ok) return;
    try {
      setPending(true);
      await onDelete(data.id);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="th-card th-card--h">
      {data.primaryImageUrl ? (
        <img className="th-card-thumb" src={data.primaryImageUrl} alt="" />
      ) : (
        <div className="th-card-thumb th-placeholder">No image</div>
      )}

      <div className="th-card-body">
        <div className="th-card-title">{data.title}</div>
          {(data as any).affiliateHeadline && (
            <div className="th-card-subline">
              {(data as any).affiliateHeadline}
              </div>
              )}
        <div className="th-card-sub">
          <span className={`status-badge ${statusClass(data.status)}`}>{data.status}</span>
          {data.startsAt && <span className="th-chip" style={{ marginLeft: 8 }}>Starts {fmtDate(data.startsAt)}</span>}
          {data.expiresAt && <span className="th-chip" style={{ marginLeft: 6 }}>Ends {fmtDate(data.expiresAt)}</span>}
        </div>
        <div className="th-card-actions">
          <Link to={`/campaigns/${data.id}`} className="btn btn--ghost">View</Link>
          <Link to={`/campaigns/${data.id}/edit`} className="btn btn--secondary">Edit</Link>
          <button className="btn btn--danger" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

function statusClass(s: CampaignOwnerDTO["status"]) {
  switch (s) {
    case "ACTIVE": return "status-active";
    case "EXPIRED": return "status-expired";
    case "PAUSED": return "status-inactive";
    default: return "";
  }
}
