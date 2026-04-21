import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useMyInvites } from "../queries/campaignInvitesQueries";
import type { MyInviteListItemDTO } from "../types/invites";
import type { ProfileMiniDTO } from "../types/campaign";

const API_BASE = import.meta.env.VITE_API_BASE as string;

function businessDisplayName(p?: ProfileMiniDTO | null): string {
  if (!p) return "Unknown";
  const bn = (p.businessName ?? "").trim();
  if (bn) return bn;
  const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return full || "Unknown";
}

function affiliateDisplayName(p?: ProfileMiniDTO | null): string {
  if (!p) return "Unknown";
  const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  if (full) return full;
  const bn = (p.businessName ?? "").trim();
  return bn || "Unknown";
}

const InviteFeed: React.FC = () => {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);

  const { data, isLoading, error, refetch } = useMyInvites(accessToken ?? undefined);
  const invites = (data ?? []) as MyInviteListItemDTO[];

  const loadIsBusiness = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return setIsBusiness(false);
      const profile = await res.json();
      setIsBusiness(Boolean(profile?.registeredAsBusiness));
    } catch {
      setIsBusiness(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        setAccessToken(session.access_token);
        await loadIsBusiness(session.access_token);
      } else {
        setAccessToken(null);
        setIsBusiness(false);
      }
    };

    loadSession();
  }, []);

  const metrics = useMemo(() => {
    const total = invites.length;

    const pending = invites.filter((i) =>
      ["INVITED", "PENDING"].includes((i.status || "").toUpperCase())
    ).length;

    const accepted = invites.filter((i) =>
      ["ACCEPTED", "ACTIVE", "JOINED"].includes((i.status || "").toUpperCase())
    ).length;

    return { total, pending, accepted };
  }, [invites]);

  const openItem = (it: MyInviteListItemDTO) => {
    if (it.campaignSlug) navigate(`/campaigns/${it.campaignId}/invites/${it.inviteId}/thread`);
    else navigate(`/campaigns/${it.campaignId}`);
  };

  const renderParticipantsHeader = (it: MyInviteListItemDTO) => {
    const isAffiliateView = it.myRole === "AFFILIATE";

    const businessName = businessDisplayName(it.businessSnapshot);
    const affiliateName = affiliateDisplayName(it.affiliateSnapshot);

    // we don't have "my" profile image here yet, so "You" uses fallback
    const businessAvatar = it.businessSnapshot?.profileImageUrl ?? null;
    const affiliateAvatar = it.affiliateSnapshot?.profileImageUrl ?? null;

    const headline = isAffiliateView
      ? `From ${businessName} to you`
      : `From you to ${affiliateName}`;

    // left is always "from", right is always "to"
    const leftAvatar = businessAvatar;
    const leftLabel = isAffiliateView ? businessName : "You";

    const rightAvatar = affiliateAvatar;
    const rightLabel = isAffiliateView ? "You" : affiliateName;

    const avatarStyle: React.CSSProperties = {
      width: 34,
      height: 34,
      borderRadius: 999,
      objectFit: "cover",
      border: "1px solid rgba(0,0,0,0.12)",
      background: "rgba(0,0,0,0.04)",
      display: "grid",
      placeItems: "center",
      fontSize: 16,
    };

    const personStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minWidth: 70,
    };

    const nameStyle: React.CSSProperties = {
      marginTop: 4,
      fontSize: 12,
      fontWeight: 600,
      maxWidth: 90,
      textAlign: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{headline}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={personStyle}>
            {leftAvatar ? (
              <img src={leftAvatar} alt="" style={avatarStyle} />
            ) : (
              <div style={avatarStyle}>👤</div>
            )}
            <div style={nameStyle}>{leftLabel}</div>
          </div>

          <div style={{ opacity: 0.55, fontSize: 14, marginTop: -6 }}>→</div>

          <div style={personStyle}>
            {rightAvatar ? (
              <img src={rightAvatar} alt="" style={avatarStyle} />
            ) : (
              <div style={avatarStyle}>👤</div>
            )}
            <div style={nameStyle}>{rightLabel}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="referrals-page">
      <section className="referrals-hero-card">
        <div className="referrals-hero-copy-block">
          <div className="referrals-hero-eyebrow">INVITES • CAMPAIGNS • AFFILIATES</div>

          <h1 className="referrals-hero-title">
            Invites that scale referrals.
            <br />
            Relationships that stay warm.
          </h1>

          <p className="referrals-hero-copy">
            Invites are how campaigns get shared. Businesses create campaigns and send invites to
            affiliates — affiliates can accept and start referring from the campaign flow.
          </p>

          <div className="referrals-hero-actions">
            {isBusiness && (
              <button onClick={() => navigate("/campaigns")} className="btn btn--primary">
                Go to Campaigns
              </button>
            )}

            <button onClick={() => refetch()} className="btn btn--secondary">
              Refresh
            </button>

            <span className="hero-note">
              You’ll see both: invites you received (affiliate), and invites you sent (business).
            </span>
          </div>
        </div>

        <aside className="referrals-hero-panel">
          <div className="referrals-hero-panel-title">Your invites snapshot</div>

          <div className="referrals-hero-metrics">
            <div className="referrals-metric">
              <div className="referrals-metric-label">Total invites</div>
              <div className="referrals-metric-value">{metrics.total}</div>
            </div>

            <div className="referrals-metric">
              <div className="referrals-metric-label">Pending</div>
              <div className="referrals-metric-value">{metrics.pending}</div>
            </div>

            <div className="referrals-metric">
              <div className="referrals-metric-label">Accepted</div>
              <div className="referrals-metric-value">{metrics.accepted}</div>
            </div>
          </div>

          <p className="referrals-hero-footnote">
            Click an invite to jump to the campaign context and take action.
          </p>
        </aside>
      </section>

      <section className="referrals-list-section" style={{ marginTop: 24 }}>
        <div className="referrals-list-header">
          <div>
            <h2 className="referrals-list-title">Your invites</h2>
            <p className="referrals-list-subtitle">
              Every invite you’re part of — as a business (sender) or affiliate (recipient).
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="card">
            <p className="th-muted">Loading invites…</p>
          </div>
        ) : error ? (
          <div className="card">
            <h3 style={{ margin: "0 0 6px" }}>Couldn’t load invites</h3>
            <p className="th-muted" style={{ marginBottom: 12 }}>
              Please try again. If this persists, check the backend logs for `/invites/me`.
            </p>
            <button onClick={() => refetch()} className="btn btn--primary">
              Retry
            </button>
          </div>
        ) : invites.length === 0 ? (
          <div className="card">
            <h3 style={{ margin: "0 0 6px" }}>No invites yet</h3>
            <p className="th-muted" style={{ marginBottom: 12 }}>
              If you’re an affiliate, you’ll see invites when a business adds you to a campaign. If
              you’re a business, create a campaign first — then send invites from Campaigns.
            </p>
            {isBusiness && (
              <button onClick={() => navigate("/campaigns")} className="btn btn--primary">
                Create or manage campaigns
              </button>
            )}
          </div>
        ) : (
          <div className="th-stack">
            {invites.map((it) => {
              const status = (it.status || "").toUpperCase();

              return (
                <div
                key={it.inviteId}
                className="card th-clickable-canvas"
                role="button"
                tabIndex={0}
                onClick={() => openItem(it)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openItem(it);
                }}
                >
                  <div className="th-row th-between" style={{ marginBottom: 6 }}>
                    <div className="th-row th-middle" style={{ gap: 12 }}>
                      {/* Participants header (replaces "As business"/title text) */}
                      <div>
                        {renderParticipantsHeader(it)}
                        <div className="th-muted" style={{ fontSize: 12, marginTop: 6 }}>
                          {it.campaignTitle}
                        </div>
                      </div>
                    </div>

                    <span className={`status-pill status-pill--${(it.status || "unknown").toLowerCase()}`}>
                      {status || "UNKNOWN"}
                    </span>
                  </div>

                  {(it.inviteSubject || it.inviteMessage) && (
                    <div style={{ marginTop: 8 }}>
                      {it.inviteSubject && (
                        <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{it.inviteSubject}</p>
                      )}
                      {it.inviteMessage && (
                        <p className="th-muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                          {it.inviteMessage}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="th-row th-between th-middle" style={{ marginTop: 10 }}>
                    <div className="th-muted" style={{ fontSize: 12 }}>
                      Created {it.createdAt ? new Date(it.createdAt).toLocaleString() : "recently"}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default InviteFeed;
