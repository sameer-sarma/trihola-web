// src/components/CampaignInvitesPanel.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteCampaignInvites } from "../queries/campaignInvitesQueries";

type Props = { campaignId: string; token?: string };

const STATUS_OPTIONS = ["ALL", "INVITED", "ACCEPTED", "DECLINED"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

export function CampaignInvitesPanel({ campaignId, token }: Props) {
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
        const name = [r?.firstName, r?.lastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
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
    const c: Record<string, number> = {
      INVITED: 0,
      ACCEPTED: 0,
      DECLINED: 0,
    };
    allItems.forEach((it) => {
      c[it.status] = (c[it.status] ?? 0) + 1;
    });
    return c;
  }, [allItems]);

  return (
    <section className="section-block section-block--accent">
      {/* Header */}
      <div className="section-hd">
        <div>
          <h3 className="section-title">Invites</h3>
          <p className="th-muted">
            Track who you’ve invited and how they’re responding.
          </p>
        </div>
        <div className="th-header-actions">
          <button className="btn btn--ghost btn--sm" onClick={() => refetch()}>
            Refresh
          </button>
          <Link
            to={`/campaigns/${campaignId}/invites/send`}
            className="btn btn--primary btn--sm"
          >
            Invite participants
          </Link>
        </div>
      </div>

      {/* Summary + filters */}
      <div className="invites-toolbar">
        <div className="invites-summary">
          <span className="pill">
            Sent <span className="counter__value">{allItems.length}</span>
          </span>
          <span className="pill pill--invited">
            Invited{" "}
            <span className="counter__value">{counts.INVITED ?? 0}</span>
          </span>
          <span className="pill pill--accepted">
            Accepted{" "}
            <span className="counter__value">{counts.ACCEPTED ?? 0}</span>
          </span>
          <span className="pill pill--declined">
            Declined{" "}
            <span className="counter__value">{counts.DECLINED ?? 0}</span>
          </span>
        </div>

        <div className="invites-filters">
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            title="Filter by status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="th-input"
            placeholder="Search name, subject, message, id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {status === "pending" && <div className="loading">Loading…</div>}
      {error && (
        <div className="error-banner">
          {(error as Error).message || "Failed to load invites"}
        </div>
      )}

      {/* Empty state */}
      {status === "success" && allItems.length === 0 && (
        <div className="empty-state invites-empty">
          <div className="empty">No invites yet.</div>
          <div className="actions">
            <Link
              className="btn btn--primary"
              to={`/campaigns/${campaignId}/invites/send`}
            >
              Invite participants
            </Link>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length > 0 && (
        <div className="list-stack">
          {items.map((it) => {
            const r = it.recipient;
            const name = r
              ? [r.firstName, r.lastName].filter(Boolean).join(" ")
              : it.affiliateUserId.slice(0, 8);

            return (
              <div className="invite-row" key={it.id}>
                {/* Left: avatar + text */}
                <div className="invite-row__body">
                  <div className="invite-row__line1">
                    <div className="invite-row__primary">
                      <div className="invite-row__avatar">
                        {r?.profileImageUrl ? (
                          <img
                            src={r.profileImageUrl}
                            alt=""
                            className="profile-img"
                          />
                        ) : (
                          <div className="profile-noimg">
                            {(name || "U")
                              .trim()
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="invite-row__title-block">
                        <div className="title">{name || "Unknown"}</div>
                        {r?.businessName && (
                          <div className="muted">{r.businessName}</div>
                        )}
                        {r?.slug && (
                          <Link
                            className="link"
                            to={`/profile/${r.slug}`}
                          >
                            View profile
                          </Link>
                        )}
                      </div>
                    </div>

                    <span
                      className={`pill pill--${it.status.toLowerCase()}`}
                      style={{ marginLeft: "auto" }}
                    >
                      {it.status}
                    </span>
                  </div>

                  <div className="invite-row__meta">
                    <span className="muted">
                      Sent: {formatWhen(it.createdAt)}
                    </span>
                    <span className="muted">
                      Responded: {formatWhen(it.respondedAt)}
                    </span>
                    <span className="muted" title={it.id}>
                      #{it.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="invite-row__rewards">
                    <span className="invite-pill-subject">
                      <strong>{it.personalSubject || "No subject"}</strong>
                    </span>
                    {it.personalMessage && (
                      <span className="invite-pill-message">
                        {it.personalMessage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="invite-row__actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/campaign-invite/${it.id}`
                      )
                    }
                    title="Copy invite link"
                  >
                    Copy link
                  </button>

                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => alert("TODO: resend invite")}
                    title="Resend invite"
                  >
                    Resend
                  </button>

                  <Link
                    className="btn btn--primary btn--sm"
                    to={`/campaigns/${campaignId}/invites/${it.id}/thread`}
                  >
                    Open thread
                  </Link>
                </div>
              </div>
            );
          })}

          <div className="actions" style={{ justifyContent: "center" }}>
            {hasNextPage ? (
              <button
                className="btn"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span className="help-text">End of list</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
