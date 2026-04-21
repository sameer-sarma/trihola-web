// src/pages/CampaignDetailsPage.tsx
import { Link, useParams } from "react-router-dom";
import {
  useCampaignById,
  useUpdateCampaignStatus,
  useUpdateOpenAffiliateMode,
} from "../queries/campaignQueries";
import MediaStories, { type MediaItem } from "../components/MediaStories";
import AttachmentsList from "../components/AttachmentsList";
import CampaignOfferCard from "../components/CampaignOfferCard";
import { CampaignInvitesPanel } from "../components/CampaignInvitesPanel";
import ScopeCard from "../components/ScopeCard";
import type { ProductMini, BundleMini } from "../types/offer";
import type { CampaignStatus, OpenAffiliateMode } from "../types/campaign";
import "../css/CampaignLayout.css";

interface Props {
  token: string;
}

type TabKey = "overview" | "invites" | "rewards" | "analytics";

export default function CampaignDetailsPage({ token }: Props) {
  const { id, section } = useParams<{ id: string; section?: string }>();
  const { data, isLoading, error } = useCampaignById(id);
  const updateStatus = useUpdateCampaignStatus();
  const updateOpenMode = useUpdateOpenAffiliateMode();

  const activeTab: TabKey = (section as TabKey | undefined) ?? "overview";

  if (isLoading) return <div className="card">Loading…</div>;
  if (error || !data) {
    return (
      <div className="card">
        {(error as Error)?.message || "Campaign not found"}
      </div>
    );
  }

  const hasScope = !!(data.singleProductId || data.bundleId);
  const scopeProduct = (data.product ?? undefined) as ProductMini | undefined;
  const scopeBundle = (data.bundle ?? undefined) as BundleMini | undefined;

  const scopeBusinessSlug =
    (data.offer as any)?.OfferTemplateSnapshot?.businessSlug ??
    (scopeProduct as any)?.businessSlug ??
    (scopeBundle as any)?.businessSlug ??
    null;

  const mainImage = data.primaryImageUrl || data.images?.[0]?.url || undefined;
  
  const storyItems: MediaItem[] = (data.images ?? []).map((img: any) => ({
    url: img.url,
    kind: "image",
    alt: img.alt ?? undefined, // normalize null → undefined
  }));  

  const analytics = data.analytics;
  const invitesCount = analytics?.totalInvites ?? 0;
  const acceptsCount = analytics?.totalAcceptedInvites ?? 0;
  const referralsCount = analytics?.totalReferrals ?? 0;
  const redemptionsCount = analytics?.totalRedemptions ?? 0;

  const affiliate = (data as any).affiliatePolicy as
    | {
        pointsPerCampaignReferral?: number;
        pointsPerCampaignReferralAcceptance?: number;
        percentOfCampaignReferralProspectPurchase?: number;
        maxPointsPerProspectPurchase?: number;
        isActive?: boolean;
      }
    | undefined;

  const hasAffiliateRewards =
    affiliate &&
    (affiliate.pointsPerCampaignReferral ||
      affiliate.pointsPerCampaignReferralAcceptance ||
      affiliate.percentOfCampaignReferralProspectPurchase);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as CampaignStatus;
    updateStatus.mutate({ id: data.id, status: newStatus });
  };

  const handleOpenModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as OpenAffiliateMode;
    updateOpenMode.mutate({ id: data.id, mode: newMode });
  };

  const openModeDisabled = data.status !== "ACTIVE";

  const handleCopyOpenAffiliateLink = () => {
    const campaignSlug = (data as any).slug as string | undefined;
    const openInviteSlug = (data as any).openInviteSlug as string | undefined;

    if (!campaignSlug || !openInviteSlug) {
      alert(
        "Open affiliate link is not available yet. Enable open joins so a link can be generated."
      );
      return;
    }

    const base = window.location.origin;
    const url = `${base}/campaign-open/${campaignSlug}/${openInviteSlug}`;
    navigator.clipboard?.writeText(url);
  };

  // NEW: theme + descriptive fields
  const themeColor = (data as any).themeColor as string | undefined;
  const affiliateHeadline = (data as any).affiliateHeadline as
    | string
    | undefined;
  const affiliateSubheading = (data as any).affiliateSubheading as
    | string
    | undefined;
  const campaignDescription = (data as any).campaignDescription as
    | string
    | undefined;
  const affiliateLongDescription = (data as any).affiliateLongDescription as
    | string
    | undefined;
  const prospectDescriptionShort = (data as any).prospectDescriptionShort as
    | string
    | undefined;
  const prospectDescriptionLong = (data as any).prospectDescriptionLong as
    | string
    | undefined;

  const heroStyle = themeColor
    ? { borderColor: themeColor, boxShadow: `0 0 0 1px ${themeColor}33` }
    : undefined;
  const badgeStyle = themeColor ? { backgroundColor: themeColor } : undefined;

  return (
    <div className="th-page th-page--campaigns">
      {/* Page header */}
      <div className="campaign-page-header">
        <div className="campaign-page-header-left">
          <div className="campaign-breadcrumb">TRIHOLA</div>
          <div className="campaign-page-title">Campaigns</div>
          <div className="campaign-page-subtitle">
            Manage rewards, invites and performance for{" "}
            <strong>{data.title}</strong>
          </div>
          {affiliateHeadline && (
            <div className="campaign-page-subtitle" style={{ marginTop: 4 }}>
              <span className="muted">Affiliate pitch:&nbsp;</span>
              {affiliateHeadline}
            </div>
          )}
        </div>
        <div className="campaign-page-actions">
          <Link to="/campaigns" className="btn btn--ghost">
            Hub
          </Link>
          <Link
            to={`/campaigns/${data.id}/edit`}
            className="btn btn--secondary"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Toolbar – status + open joins */}
      <div className="campaign-toolbar">
        <div className="campaign-toolbar-group">
          <span className="campaign-toolbar-label">Status</span>
          <select
            className="campaign-toolbar-select"
            value={data.status as CampaignStatus}
            onChange={handleStatusChange}
            disabled={updateStatus.isPending}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <div className="campaign-toolbar-group">
          <span className="campaign-toolbar-label">Open affiliate joins</span>
          <select
            className="campaign-toolbar-select"
            value={(data.openAffiliateMode as OpenAffiliateMode) ?? "OFF"}
            onChange={handleOpenModeChange}
            disabled={updateOpenMode.isPending || openModeDisabled}
            title={
              openModeDisabled
                ? "Open affiliate mode can only be changed when the campaign is Active"
                : ""
            }
          >
            <option value="OFF">Disabled</option>
            <option value="AUTO_ACCEPT">Auto-accept affiliates</option>
            <option value="REQUIRE_APPROVAL">Require approval</option>
          </select>
        </div>

        {data.expiresAt && (
          <div className="campaign-toolbar-group">
            <span className="campaign-toolbar-label">Expires</span>
            <span className="campaign-toolbar-value">
              {fmtDateTime(data.expiresAt)}
            </span>
          </div>
        )}

        <div className="campaign-toolbar-group">
          <span className="campaign-toolbar-label">Share</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleCopyOpenAffiliateLink}
          >
            Copy open affiliate link
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="campaign-tabs">
        <Link
          to={`/campaigns/${data.id}`}
          className={`campaign-tab ${
            activeTab === "overview" ? "is-active" : ""
          }`}
        >
          Overview
        </Link>
        <Link
          to={`/campaigns/${data.id}/invites`}
          className={`campaign-tab ${
            activeTab === "invites" ? "is-active" : ""
          }`}
        >
          Invites
        </Link>
        <Link
          to={`/campaigns/${data.id}/rewards`}
          className={`campaign-tab ${
            activeTab === "rewards" ? "is-active" : ""
          }`}
        >
          Rewards
        </Link>
        <Link
          to={`/campaigns/${data.id}/analytics`}
          className={`campaign-tab ${
            activeTab === "analytics" ? "is-active" : ""
          }`}
        >
          Analytics
        </Link>
      </div>

      {/* Hero image */}
      {mainImage && (
        <div className="campaign-hero">
          <img
            src={mainImage}
            alt={data.title}
            className="campaign-hero-img"
          />

          <div className="campaign-hero-overlay" style={heroStyle}>
            <div className="campaign-hero-topline">
              <span
                className={`s-badge ${statusClass(data.status)}`}
                style={badgeStyle}
              >
                {data.status}
              </span>
              {data.expiresAt && (
                <span className="campaign-hero-expiry">
                  Expires {fmtDateTime(data.expiresAt)}
                </span>
              )}
            </div>

            <h2 className="campaign-hero-title">
              {affiliateHeadline || data.title}
            </h2>

            {affiliateSubheading && (
              <p className="campaign-hero-message">{affiliateSubheading}</p>
            )}

            {!affiliateSubheading && campaignDescription && (
              <p className="campaign-hero-message">{campaignDescription}</p>
            )}

            {!affiliateSubheading &&
              !campaignDescription &&
              data.message && (
                <p className="campaign-hero-message">{data.message}</p>
              )}
          </div>
        </div>
      )}

      {!mainImage && data.images?.length > 0 && (
        <div className="campaign-hero">
          <MediaStories items={storyItems} />

          <div className="campaign-hero-overlay" style={heroStyle}>
            <div className="campaign-hero-topline">
              <span
                className={`s-badge ${statusClass(data.status)}`}
                style={badgeStyle}
              >
                {data.status}
              </span>
              {data.expiresAt && (
                <span className="campaign-hero-expiry">
                  Expires {fmtDateTime(data.expiresAt)}
                </span>
              )}
            </div>

            <h2 className="campaign-hero-title">
              {affiliateHeadline || data.title}
            </h2>

            {affiliateSubheading && (
              <p className="campaign-hero-message">{affiliateSubheading}</p>
            )}

            {!affiliateSubheading && campaignDescription && (
              <p className="campaign-hero-message">{campaignDescription}</p>
            )}

            {!affiliateSubheading &&
              !campaignDescription &&
              data.message && (
                <p className="campaign-hero-message">{data.message}</p>
              )}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="metric-row">
        <MetricBox label="Invites" value={invitesCount} />
        <MetricBox label="Accepted" value={acceptsCount} />
        <MetricBox label="Referrals" value={referralsCount} />
        <MetricBox label="Redemptions" value={redemptionsCount} />
      </div>

      {/* Main layout */}
      {activeTab === "overview" && (
        <div className="campaign-layout">
          <div className="campaign-layout__main">
            {/* NEW: Messaging summary */}
            {(campaignDescription ||
              affiliateLongDescription ||
              prospectDescriptionShort ||
              prospectDescriptionLong) && (
              <section className="card">
                <h3 className="section-title">Messaging</h3>
                <div className="campaign-messaging-grid">
                  {campaignDescription && (
                    <div className="campaign-messaging-block">
                      <h4>Campaign description</h4>
                      <p>{campaignDescription}</p>
                    </div>
                  )}
                  {affiliateLongDescription && (
                    <div className="campaign-messaging-block">
                      <h4>Affiliate details</h4>
                      <p>{affiliateLongDescription}</p>
                    </div>
                  )}
                  {(prospectDescriptionShort ||
                    prospectDescriptionLong) && (
                    <div className="campaign-messaging-block">
                      <h4>Prospect view</h4>
                      {prospectDescriptionShort && (
                        <p>
                          <strong>Short: </strong>
                          {prospectDescriptionShort}
                        </p>
                      )}
                      {prospectDescriptionLong && (
                        <p style={{ marginTop: 4 }}>
                          <strong>Long: </strong>
                          {prospectDescriptionLong}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Active rewards */}
            <section className="card">
              <h3 className="section-title">Active rewards</h3>
              {data.offer || hasAffiliateRewards ? (
                <CampaignOfferCard
                  offers={data.offer ? [data.offer] : []}
                  affiliatePolicy={affiliate}
                  token={token}
                  appearance="flat"
                  className="campaign-offer-strip"
                  showDetailsInCard
                />
              ) : (
                <div className="muted">
                  No rewards linked to this campaign yet.
                </div>
              )}
            </section>

            {/* Attachments */}
            {data.attachments?.length ? (
              <section className="card">
                <h3 className="section-title" style={{ marginBottom: 8 }}>
                  Attachments
                </h3>
                <AttachmentsList items={data.attachments} />
              </section>
            ) : null}

            {/* Scope */}
            {hasScope && (
              <ScopeCard
                title="Scope"
                businessSlug={scopeBusinessSlug}
                product={scopeProduct}
                bundle={scopeBundle}
                appearance="column"
              />
            )}
          </div>

          {/* Side panel – invites */}
          <aside className="campaign-layout__side">
            <div className="card campaign-invites-panel">
              <CampaignInvitesPanel campaignId={data.id} token={token} />
            </div>
          </aside>
        </div>
      )}

      {activeTab === "invites" && (
        <div className="campaign-layout">
          <div className="campaign-layout__main">
            <div className="card campaign-invites-panel">
              <CampaignInvitesPanel campaignId={data.id} token={token} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="campaign-layout">
          <div className="campaign-layout__main">
            <div className="card">
              <div className="muted">
                Rewards analytics coming soon. Use the Overview tab for active
                rewards.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="campaign-layout">
          <div className="campaign-layout__main">
            <div className="card">
              <div className="muted">
                Campaign analytics coming soon (invites → accepts → referrals →
                redemptions).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Helpers remain unchanged */
function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-box">
      <div className="metric-box__label">{label}</div>
      <div className="metric-box__value">{value}</div>
    </div>
  );
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusClass(s: string) {
  switch (s) {
    case "ACTIVE":
      return "status-active";
    case "EXPIRED":
      return "status-expired";
    case "PAUSED":
      return "status-inactive";
    default:
      return "";
  }
}
