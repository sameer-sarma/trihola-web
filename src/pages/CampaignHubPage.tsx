import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCampaignHub } from "../queries/campaignQueries";

export default function CampaignHubPage() {
  const { data, isLoading, isError, refetch } = useCampaignHub();
  console.log("hub data", data);

  // New: which lane are we viewing?
  const [activeTab, setActiveTab] = useState<"business" | "affiliate">(
    "business"
  );

  // Data lanes from backend / CampaignHubDTO
  const myCampaigns = data?.myCampaigns ?? [];
  const affiliateInvites = data?.affiliateInvites ?? [];
//  const _prospectReferrals = data?.prospectReferrals ?? []; // currently not shown in hub

  // Business metrics (for my campaigns)
  const businessTotals = useMemo(() => {
    let invites = 0,
      accepted = 0,
      redemptions = 0;
    for (const c of myCampaigns) {
      invites += Number(c.invites ?? 0);
      accepted += Number(c.accepts ?? 0);
      redemptions += Number(c.redemptions ?? 0);
    }
    return { invites, accepted, redemptions };
  }, [myCampaigns]);

  // Affiliate metrics (for campaigns I'm invited to refer)
  const affiliateTotals = useMemo(() => {
    const invitesReceived = affiliateInvites.length;
    const accepted = affiliateInvivesWithStatus(affiliateInvites, "ACCEPTED");
    const activeCampaigns = accepted; // for now, accepted = active
    return { invitesReceived, accepted, activeCampaigns };
  }, [affiliateInvites]);

  const topAffiliateInvites = [...affiliateInvites]
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA; // newest first
    })
    .slice(0, 3);

  return (
    <div className="th-page">
      {/* Header */}
      <div className="th-header">
        <div>
          <div className="breadcrumb">TRIHOLA</div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Campaigns — Landing Hub
          </h1>
          <p className="muted">
            A single place for your campaigns, affiliate invites, and referrals.
          </p>
        </div>
        <div className="th-header-actions">
          <button className="btn btn--ghost" onClick={() => refetch()}>
            Refresh
          </button>
          <button className="btn btn--ghost" onClick={() => copyHubUrl()}>
            Share Hub
          </button>
          <Link className="btn btn--primary" to="/campaigns/new">
            + New Campaign
          </Link>
        </div>
      </div>

      {/* Role tabs */}
      <div className="tab-bar">
        <button
          type="button"
          className={activeTab === "business" ? "tab active" : "tab"}
          onClick={() => setActiveTab("business")}
        >
          Business
        </button>
        <button
          type="button"
          className={activeTab === "affiliate" ? "tab active" : "tab"}
          onClick={() => setActiveTab("affiliate")}
        >
          Affiliate
        </button>
      </div>

      {isLoading && <div className="loading">Loading your hub…</div>}
      {isError && (
        <div className="error-banner">Couldn’t load hub. Please retry.</div>
      )}

      {/* BUSINESS LANE */}
      {activeTab === "business" && (
        <>
          {/* Top metrics for my campaigns */}
          <div className="metric-row">
            <MetricBox label="INVITES SENT" value={businessTotals.invites} />
            <MetricBox label="ACCEPTED" value={businessTotals.accepted} />
            <MetricBox
              label="REDEMPTIONS"
              value={businessTotals.redemptions}
            />
          </div>

          {/* My Campaigns */}
          <SectionHeader
            title="My Campaigns"
             rightLink={{ to: "/campaigns/owned", label: "View all" }}
          />
          <div className="card-grid">
            {myCampaigns.length === 0 && (
              <EmptyLine text="You haven’t created any campaigns yet." />
            )}
            {myCampaigns.map((c) => (
              <article key={c.id} className="hub-card">
                <Thumb src={c.primaryImageUrl} alt={c.title} />
                <div className="hub-card__body">
                  <div className="hub-card__title">{c.title}</div>
                  <div className="hub-card__meta">
                    <Counter label="INVITES" value={c.invites ?? 0} />
                    <Counter label="ACCEPTED" value={c.accepts ?? 0} />
                    <Counter label="REDEEMED" value={c.redemptions ?? 0} />
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="hub-card__actions">
                    <Link
                      className="btn btn--sm btn--ghost"
                      to={`/campaigns/${c.id}`}
                    >
                      Open
                    </Link>
                    <Link
                      className="btn btn--sm btn--ghost"
                      to={`/campaigns/${c.id}/edit`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="btn btn--sm btn--ghost"
                      to={`/campaigns/${c.id}/invites`}
                    >
                      Invites
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Discover (business-focused) */}
          <SectionHeader title="Discover Campaigns" />
          <div className="muted discover-line">
            Coming soon: campaigns from businesses you follow or categories you
            like.
          </div>
        </>
      )}

      {/* AFFILIATE LANE */}
      {activeTab === "affiliate" && (
        <>
          {/* Affiliate metrics */}
          <div className="metric-row">
            <MetricBox
              label="INVITES RECEIVED"
              value={affiliateTotals.invitesReceived}
            />
            <MetricBox label="ACCEPTED" value={affiliateTotals.accepted} />
            <MetricBox
              label="ACTIVE CAMPAIGNS"
              value={affiliateTotals.activeCampaigns}
            />
          </div>

          {/* Campaigns I'm invited to refer */}
          <SectionHeader
            title="Campaigns I’m invited to refer"
            rightLink={{ to: "/campaigns/my-invites", label: "View all" }}
          />
          <div className="list-stack">
            {affiliateInvites.length === 0 && (
              <EmptyLine text="No campaign invites yet — when someone invites you, it’ll appear here." />
            )}
            {topAffiliateInvites.map((i) => (
              <div
                key={`${i.campaignId}:${i.inviteId}`}
                className="invite-row"
              >
                <div className="invite-row__body">
                  <div className="invite-row__line1">
                    <span className="title">{i.campaignTitle}</span>
                    {i.status && (
                      <span
                        className={`pill pill--${pillClass(i.status)}`}
                      >
                        {i.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <div className="invite-row__rewards">
                    {i.rewardReferrer && (
                      <RewardChip
                        label="Referrer"
                        value={i.rewardReferrer}
                      />
                    )}
                    {i.rewardProspect && (
                      <RewardChip
                        label="Prospect"
                        value={i.rewardProspect}
                      />
                    )}
                    {i.invitedBy && (
                      <span className="muted">
                        Invited by {i.invitedBy}
                      </span>
                    )}
                  </div>
                </div>
                <div className="invite-row__actions">
                  {i.status === "INVITED" && (
                    <>
                      <button
                        className="btn btn--sm btn--primary"
                        disabled
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn--sm btn--ghost"
                        disabled
                      >
                        Decline
                      </button>
                    </>
                  )}
                  <Link
                    className="btn btn--sm btn--ghost"
                    to={`/campaigns/${i.campaignId}/invites/${i.inviteId}/thread`}
                  >
                    Open Thread
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* --- helpers --- */

function affiliateInvivesWithStatus(
  invites: any[],
  status: string
): number {
  return invites.filter((i) => i.status === status).length;
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-box">
      <div className="metric-box__label">{label}</div>
      <div className="metric-box__value">{value}</div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="counter">
      <div className="counter__value">{value}</div>
      <div className="counter__label">{label}</div>
    </div>
  );
}

function SectionHeader({
  title,
  rightLink,
}: {
  title: string;
  rightLink?: { to: string; label: string };
}) {
  return (
    <div className="section-hd">
      <h3 className="section-title">{title}</h3>
      {rightLink && (
        <Link className="th-link" to={rightLink.to}>
          {rightLink.label}
        </Link>
      )}
    </div>
  );
}

function RewardChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="reward-chip">
      <b>{label}:</b> {value}
    </span>
  );
}

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="thumb">
      {src ? (
        <img src={src} alt={alt} className="img-cover" />
      ) : (
        <div className="thumb__ph">No image</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const cn =
    s === "active"
      ? "status-badge status-active"
      : s === "paused"
      ? "status-badge status-paused"
      : "status-badge status-ended";
  return <span className={cn}>{status}</span>;
}

function pillClass(s: string) {
  switch (s) {
    case "ACCEPTED":
      return "accepted";
    case "DECLINED":
      return "declined";
    case "VIEWED":
      return "viewed";
    case "INVITED":
      return "invited";
    case "EXPIRED":
      return "expired";
    default:
      return "";
  }
}

function EmptyLine({ text }: { text: string }) {
  return <div className="empty muted">{text}</div>;
}

function copyHubUrl() {
  const url = `${window.location.origin}/campaigns/hub`;
  navigator.clipboard?.writeText(url);
}
