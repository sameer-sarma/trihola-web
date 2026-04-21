// src/pages/CampaignInvitesList.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteCampaignInvites } from "../queries/campaignInvitesQueries";

type Props = { campaignId: string; token?: string };

const STATUS_OPTIONS = ["ALL", "INVITED", "ACCEPTED", "DECLINED"] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

export default function CampaignInvitesList({ campaignId, token }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [q, setQ] = useState("");

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteCampaignInvites(campaignId, token, 25);

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  const items = useMemo(() => {
    let list = allItems;
    if (statusFilter !== "ALL") {
      list = list.filter((it) => it.status === statusFilter);
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((it) => {
        const r = it.recipient;
        const name = [r?.firstName, r?.lastName].filter(Boolean).join(" ").toLowerCase();
        const subj = (it.personalSubject ?? "").toLowerCase();
        const msg = (it.personalMessage ?? "").toLowerCase();
        return (
          name.includes(needle) ||
          (r?.businessName ?? "").toLowerCase().includes(needle) ||
          subj.includes(needle) ||
          msg.includes(needle) ||
          it.id.toLowerCase().includes(needle)
        );
      });
    }
    return list;
  }, [allItems, statusFilter, q]);

  const counts = useMemo(() => {
    const c = { INVITED: 0, ACCEPTED: 0, DECLINED: 0 } as Record<string, number>;
    allItems.forEach((it) => (c[it.status] = (c[it.status] ?? 0) + 1));
    return c;
  }, [allItems]);

  return (
    <div className="page-wrap">
      <div className="th-header" style={{ marginBottom: 12 }}>
        <h2 className="page-title">Invites</h2>
        <div className="th-header-actions" style={{ gap: 8 }}>
          <Link to={`/campaigns/${campaignId}`} className="btn btn--ghost">Back</Link>
          <Link to={`/campaigns/${campaignId}/invites/send`} className="btn btn--primary">Send invites</Link>
          <button className="btn" onClick={() => refetch()}>Refresh</button>
        </div>
      </div>

      {/* Summary */}
      <div className="card" style={{ padding: 12, marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="pill">Sent: {allItems.length}</div>
        <div className="pill" style={{ background: "#e6f2ff", color: "#0366d6" }}>Invited: {counts.INVITED ?? 0}</div>
        <div className="pill" style={{ background: "#e7f7ed", color: "#1f7a47" }}>Accepted: {counts.ACCEPTED ?? 0}</div>
        <div className="pill" style={{ background: "#fde8e8", color: "#c81e1e" }}>Declined: {counts.DECLINED ?? 0}</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            title="Filter by status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className="th-input"
            placeholder="Search name, subject, message, id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </div>
      </div>

      {status === "pending" && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{(error as Error).message}</div>}

      {/* Empty state */}
      {status === "success" && allItems.length === 0 && (
        <div className="empty-state" style={{ padding: 16, border: "1px dashed #e5e7eb", borderRadius: 10 }}>
          <div className="empty" style={{ marginBottom: 8 }}>No invites yet.</div>
          <div className="actions" style={{ display: "flex", gap: 8 }}>
            <Link className="btn btn--primary" to={`/campaigns/${campaignId}/invites/send`}>Send invites</Link>
            <button className="btn" onClick={() => refetch()}>Refresh</button>
          </div>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <>
          <table className="th-table">
            <thead>
              <tr>
                <th>Invite</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Sent / Responded</th>
                <th>Subject</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const r = it.recipient;
                const name = r ? [r.firstName, r.lastName].filter(Boolean).join(" ") : it.affiliateUserId.slice(0, 8);
                return (
                  <tr key={it.id}>
                    <td>
                      <div title={it.id}>#{it.id.slice(0, 8)}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {r?.profileImageUrl && (
                          <img
                            src={r.profileImageUrl}
                            alt=""
                            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{name || "Unknown"}</div>
                          {r?.businessName && <div className="muted">{r.businessName}</div>}
                          {r?.slug && (
                            <Link className="link" to={`/profile/${r.slug}`} >View profile</Link>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill pill--${it.status.toLowerCase()}`}>{it.status}</span>
                    </td>
                    <td>
                      <div className="muted">Sent: {formatWhen(it.createdAt)}</div>
                      <div>Responded: {formatWhen(it.respondedAt)}</div>
                    </td>
                    <td title={it.personalSubject || undefined}>
                      <strong>{it.personalSubject || "—"}</strong>
                      {it.personalMessage && (
                        <div className="muted" style={{ maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {it.personalMessage}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn"
                          onClick={() => navigator.clipboard.writeText(location.origin + `/campaign-invite/${it.id}`)}
                          title="Copy invite link"
                        >
                          Copy Link
                        </button>
                        <button
                          className="btn"
                          onClick={() => alert("TODO: resend invite")}
                          title="Resend invite"
                        >
                          Resend
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="actions" style={{ justifyContent: "center" }}>
            {hasNextPage ? (
              <button className="btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span className="help-text">End of list</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
