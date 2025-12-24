// src/pages/OpenCampaignInviteLandingPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  useOpenAffiliateCampaignLanding,
  useJoinOpenAffiliateInviteMutation,
} from "../queries/campaignInvitesQueries";

type OpenAffiliateMode = "OFF" | "AUTO_ACCEPT" | "REQUIRE_APPROVAL";
type JoinState = "idle" | "loading" | "success" | "error";

export const OpenCampaignInviteLandingPage: React.FC = () => {
  const { campaignSlug, openInviteSlug } = useParams<{
    campaignSlug: string;
    openInviteSlug: string;
  }>();

  const navigate = useNavigate();

  const [token, setToken] = useState<string | undefined>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setIsLoggedIn(!!session);
      setToken(session?.access_token);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
      setToken(session?.access_token);
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Load campaign
  const {
    data: campaign,
    isLoading,
    error,
  } = useOpenAffiliateCampaignLanding(campaignSlug, openInviteSlug, token);

  const joinMutation = useJoinOpenAffiliateInviteMutation(
    campaignSlug ?? "",
    openInviteSlug ?? "",
    token
  );

  const handleJoin = useCallback(() => {
    if (!token) {
      const nextPath = `/campaign-open/${campaignSlug!}/${openInviteSlug!}`;
      navigate(`/email-login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    setJoinState("loading");
    setJoinError(null);

    joinMutation.mutate(undefined, {
      onSuccess: (res) => {
        setJoinState("success");
        navigate(`/campaigns/${res.campaignId}/invites/${res.id}/thread`);
      },
      onError: (err: any) => {
        setJoinState("error");
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to join this campaign.";
        setJoinError(msg);
      },
    });
  }, [token, campaignSlug, openInviteSlug, joinMutation, navigate]);

  if (!campaignSlug || !openInviteSlug) {
    return (
      <div className="th-page">
        <div className="card">Invalid link.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="th-page">
        <div className="card">Loading…</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="th-page">
        <div className="card">
          <h1 className="page-title">Link error</h1>
          <p className="th-muted">
            This open campaign invite could not be found or has expired.
          </p>
        </div>
      </div>
    );
  }

  const mode: OpenAffiliateMode =
    (campaign.openAffiliateMode as OpenAffiliateMode) ?? "OFF";

  const expired = campaign.expiresAt
    ? new Date(campaign.expiresAt).getTime() < Date.now()
    : false;

  const heroImage =
    campaign.primaryImageUrl ||
    // @ts-expect-error backend might expose business image fields later
    (campaign.businessPrimaryImageUrl as string | undefined) ||
    undefined;

  const businessName =
    // @ts-expect-error backend may add this
    (campaign.businessName as string | undefined) ||
    "this business";

  // New descriptive fields with fallbacks
  const affiliateHeadline =
    campaign.affiliateHeadline ||
    campaign.title ||
    "Join this Trihola campaign as an affiliate";

  const defaultSubheading = `You’ve been invited to join a live Trihola campaign for ${businessName}. As an affiliate, you can share referral links with your network and earn rewards whenever prospects engage with the business through this campaign.`;

  const affiliateSubheading =
    campaign.affiliateSubheading || defaultSubheading;

  const howCampaignWorksText =
    campaign.campaignDescription ||
    campaign.message ||
    "The business has defined how referrals are rewarded in this campaign — whether through points, discounts, or special offers. Once you join, every successful referral you make is tracked automatically.";

  const affiliateLongDescription =
    campaign.affiliateLongDescription ||
    `Joining this campaign creates an affiliate relationship between you and ${businessName} inside Trihola. You’ll receive referral links or invites you can share with your network. As prospects respond and accept, you’ll see their progress and any rewards that you earn from this campaign.`;

  const prospectSummary =
    campaign.prospectDescriptionShort ||
    // legacy / fallback if present
    // @ts-expect-error backend may expose this
    (campaign.prospectOfferSummary as string | undefined) ||
    "";

  const affiliateSummary =
    // @ts-expect-error backend may expose this
    (campaign.affiliateRewardSummary as string | undefined) || "";

  const prospectDescriptionLong = campaign.prospectDescriptionLong || "";

  const canJoin =
    isLoggedIn &&
    mode !== "OFF" &&
    campaign.status === "ACTIVE" &&
    !expired;

  const statusClass =
    campaign.status === "ACTIVE"
      ? "status-badge status-active"
      : campaign.status === "DRAFT"
      ? "status-badge status-draft"
      : "status-badge";

  const modeLabel =
    mode === "AUTO_ACCEPT"
      ? "Immediate approval"
      : mode === "REQUIRE_APPROVAL"
      ? "Requires review"
      : "Closed";

  // Optional inline theme color hook (used e.g. for chips/hero if CSS supports it)
  const heroStyle = campaign.themeColor
    ? ({
        // CSS can consume this as var(--campaign-theme-color)
        ["--campaign-theme-color" as any]: campaign.themeColor,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="th-page open-ref-page">
      {/* HERO */}
      <section className="open-ref-hero" style={heroStyle}>
        <div className="open-ref-hero__left">
          <div className="open-ref-chip-row">
            <span className="open-ref-chip">Campaign invite</span>
            <span className={statusClass}>{campaign.status}</span>
            <span className="open-ref-chip open-ref-chip--soft">
              Open affiliates · {modeLabel}
            </span>
          </div>

          <h1 className="open-ref-title">{affiliateHeadline}</h1>

          <p className="open-ref-subtitle">{affiliateSubheading}</p>

          {prospectSummary && (
            <p className="open-ref-offer-highlight">
              For prospects: {prospectSummary}
            </p>
          )}

          {affiliateSummary && (
            <p className="open-ref-tagline">
              <span className="open-ref-tagline-label">
                For affiliates like you:
              </span>{" "}
              {affiliateSummary}
            </p>
          )}

          <div className="open-ref-cta-row">
            {!isLoggedIn && mode !== "OFF" && !expired && (
              <Link
                className="btn btn--primary open-ref-btn"
                to={`/email-login?next=${encodeURIComponent(`/campaign-open/${campaignSlug!}/${openInviteSlug!}`)}`}
              >
                Sign in and join
              </Link>
            )}

            {isLoggedIn && (
              <button
                className="btn btn--primary open-ref-btn"
                disabled={!canJoin || joinState === "loading"}
                onClick={handleJoin}
              >
                {joinState === "loading"
                  ? "Joining…"
                  : mode === "AUTO_ACCEPT"
                  ? "Join campaign now"
                  : "Request to join"}
              </button>
            )}

            <p className="open-ref-cta-help">
              Once you join, this campaign will appear in your Trihola referrals
              hub. You&apos;ll get a dedicated invite thread, referral links,
              and visibility into how your referrals perform.
            </p>
          </div>
        </div>

        <div className="open-ref-hero__right">
          {heroImage ? (
            <div className="open-ref-hero__image">
              <img src={heroImage} alt={campaign.title || businessName} />
            </div>
          ) : (
            <div className="open-ref-hero__placeholder">
              <div className="open-ref-hero__badge">Powered by Trihola</div>
              <p>
                Campaigns, referrals, and affiliate rewards — all tracked in one
                place so you and the business stay in sync.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* BODY */}
      <div className="open-ref-layout">
        {/* Main column */}
        <div className="open-ref-main">
          <section className="card open-ref-card">
            <h3 className="card-title">What you get as an affiliate</h3>
            <p className="th-muted">{affiliateLongDescription}</p>
          </section>

          <section className="card open-ref-card">
            <h3 className="card-title">How this campaign works</h3>
            <p className="th-muted">{howCampaignWorksText}</p>
          </section>

          {(prospectSummary || affiliateSummary) && (
            <section className="card open-ref-card">
              <h3 className="card-title">Who benefits from your referrals?</h3>
              {prospectSummary && (
                <p className="th-muted">
                  <strong>For prospects:</strong> {prospectSummary}
                </p>
              )}
              {affiliateSummary && (
                <p className="th-muted" style={{ marginTop: 8 }}>
                  <strong>For you as an affiliate:</strong> {affiliateSummary}
                </p>
              )}
            </section>
          )}

          {prospectDescriptionLong && (
            <section className="card open-ref-card">
              <h3 className="card-title">What prospects get from this campaign</h3>
              <p className="th-muted">{prospectDescriptionLong}</p>
            </section>
          )}

          {joinError && (
            <div className="error-banner" style={{ marginTop: 16 }}>
              {joinError}
            </div>
          )}
        </div>

        {/* Side column */}
        <aside className="open-ref-side">
          <section className="card open-ref-card">
            <h3 className="card-title">Why join as an affiliate?</h3>
            <p className="th-muted">
              As an affiliate for <strong>{businessName}</strong>, you get a
              structured way to recommend something you believe in — and be
              recognised for it. Trihola tracks your referrals, keeps all
              conversations organised, and makes it clear how and when you
              receive rewards.
            </p>
          </section>

          <section className="card open-ref-card open-ref-card--accent">
            <h3 className="card-title">What is an open affiliate invite?</h3>
            <p className="th-muted">
              An open affiliate invite lets anyone with this link join a
              campaign (subject to the campaign’s rules). Instead of being
              manually added, you opt in yourself and start sharing the
              campaign’s referral links with your network.
            </p>
            <ul className="open-ref-list">
              <li>✅ You choose which campaigns to represent.</li>
              <li>✅ Your referrals and rewards are tracked transparently.</li>
              <li>
                ✅ The business can see exactly which referrals came from you.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OpenCampaignInviteLandingPage;
