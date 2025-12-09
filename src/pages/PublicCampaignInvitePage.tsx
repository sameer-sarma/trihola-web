// src/pages/PublicCampaignInvitePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { usePublicCampaignInviteLanding } from "../queries/campaignInvitesQueries";
//import type { PublicCampaignInviteLandingView } from "../types/invites";
import type { ProfileMiniDTO } from "../types/campaign";

const formatName = (p?: ProfileMiniDTO | null): string | undefined => {
  if (!p) return undefined;
  if (p.firstName || p.lastName) {
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || undefined;
  }
  if (p.businessName) return p.businessName;
  return undefined;
};

const formatDate = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const PublicCampaignInvitePage: React.FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Track auth status + token
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await supabase.auth.getSession();
      if (!cancelled) {
        const session = result.data.session;
        setIsLoggedIn(!!session);
        setAccessToken(session?.access_token ?? null);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
        setAccessToken(session?.access_token ?? null);
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // React Query hook – calls Ktor /public/campaign-invites/{inviteId}
  const {
    data: view,
    isLoading,
    error,
  } = usePublicCampaignInviteLanding(inviteId, accessToken ?? undefined);

  // Auto-redirect to invite thread if viewer is a participant
  useEffect(() => {
    if (!view) return;
    if (!view.myParticipantRole) return; // not a participant
    const campaignId = view.invite.campaignId;
    const inviteIdLocal = view.invite.id;
    if (!campaignId || !inviteIdLocal) return;

    const threadPath = `/campaigns/${campaignId}/invites/${inviteIdLocal}/thread`;
    navigate(threadPath, { replace: true });
  }, [view, navigate]);

  const businessName = useMemo(
    () => formatName(view?.invite.business),
    [view?.invite.business]
  );
  const affiliateName = useMemo(
    () => formatName(view?.invite.recipient),
    [view?.invite.recipient]
  );

  const snapshot = view?.snapshot;
  const themeColor = snapshot?.themeColor || undefined;
  const affiliateHeadline = snapshot?.affiliateHeadline || undefined;
  const affiliateSubheading = snapshot?.affiliateSubheading || undefined;
  const campaignDescription = snapshot?.campaignDescription || undefined;
  const affiliateLongDescription =
    snapshot?.affiliateLongDescription || undefined;
  const prospectDescriptionShort =
    snapshot?.prospectDescriptionShort || undefined;
  const prospectDescriptionLong =
    snapshot?.prospectDescriptionLong || undefined;

  const heroTitle =
    affiliateHeadline || snapshot?.title || "Campaign invite";

  const heroSubtitle = useMemo(() => {
    // 1) Prefer the campaign's affiliate subheading
    if (affiliateSubheading) return affiliateSubheading;

    // 2) Fallback to previous behaviour
    if (!view) return undefined;
    if (businessName && affiliateName) {
      return `${businessName} invited ${affiliateName} to promote this campaign.`;
    }
    if (businessName) {
      return `${businessName} invited you to promote this campaign.`;
    }
    return "You’ve been invited to promote this campaign.";
  }, [view, businessName, affiliateName, affiliateSubheading]);

  const heroImage =
    view?.snapshot.primaryImageUrl ??
    view?.snapshot.product?.primaryImageUrl ??
    view?.snapshot.bundle?.primaryImageUrl ??
    undefined;

  const expiresLabel = formatDate(view?.snapshot.expiresAt);

  const walletPolicySummary = view?.walletPolicySummary ?? undefined;
  const prospectOfferSummary = view?.prospectOfferSummary ?? undefined;

  const handleGoToThreadOrLogin = () => {
    if (!view) return;
    const campaignId = view.invite.campaignId;
    const inviteIdLocal = view.invite.id;
    if (!campaignId || !inviteIdLocal) return;

    const threadPath = `/campaigns/${campaignId}/invites/${inviteIdLocal}/thread`;

    if (isLoggedIn) {
      navigate(threadPath);
    } else {
      // keep simple: user logs in, then re-click email link
      navigate("/email-login");
    }
  };

  // Extra guard: missing inviteId in URL
  if (!inviteId) {
    return (
      <div className="th-page public-page">
        <div className="public-page-error-card">
          <h1>Campaign invite not available</h1>
          <p>Missing invite id in URL.</p>
        </div>
      </div>
    );
  }

  const typedError = error as Error | null;

  if (isLoading) {
    return (
      <div className="th-page public-page">
        <div className="public-page-loading">Loading campaign invite…</div>
      </div>
    );
  }

  if (typedError || !view) {
    return (
      <div className="th-page public-page">
        <div className="public-page-error-card">
          <h1>Campaign invite not available</h1>
          <p>
            {typedError?.message ??
              "This invite might have expired or been withdrawn."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-invite-page">
      {/* HERO */}
      <section className="public-hero">
        <div className="public-hero-bg">
          {heroImage && <img src={heroImage} alt={heroTitle} />}
          <div
            className="public-hero-overlay"
            style={
              themeColor
                ? {
                    background: `linear-gradient(135deg, ${themeColor} 0%, #000000cc 55%)`,
                  }
                : undefined
            }
          ></div>
        </div>

        <div className="public-hero-content">
          <div className="breadcrumb">Invite → Campaign</div>
          <h1 className="public-hero-title">{heroTitle}</h1>
          {heroSubtitle && (
            <p className="public-hero-subtitle">{heroSubtitle}</p>
          )}

          <div className="public-hero-chips">
            {businessName && (
              <span className="chip">
                From <strong>{businessName}</strong>
              </span>
            )}
            {affiliateName && (
              <span className="chip">
                Invite for <strong>{affiliateName}</strong>
              </span>
            )}
            {expiresLabel && (
              <span className="chip">
                Ends by <strong>{expiresLabel}</strong>
              </span>
            )}
          </div>

          <button
            className="public-hero-button"
            onClick={handleGoToThreadOrLogin}
            style={
              themeColor
                ? { backgroundColor: themeColor, borderColor: themeColor }
                : undefined
            }
          >
            {isLoggedIn ? "View your invite thread" : "Sign in to respond"}
          </button>
        </div>
      </section>

      {/* CONTENT */}
      <section className="public-content">
        <div className="public-content-container">
          {/* About this campaign */}
          <div className="public-card">
            <h2>About this campaign</h2>
            {campaignDescription ? (
              <p>{campaignDescription}</p>
            ) : view.invite.personalMessage ? (
              <p>{view.invite.personalMessage}</p>
            ) : (
              <p>
                This campaign lets you earn rewards by referring people to{" "}
                {businessName ?? "this business"}.
              </p>
            )}

            <p className="status-row">
              Current status:{" "}
              <span
                className={`status-pill status-pill--${snapshot?.status.toLowerCase()}`}
              >
                {snapshot?.status}
              </span>
            </p>
          </div>

          {/* What’s in it for everyone */}
          <div className="public-card">
            <h2>What’s in it for everyone?</h2>

            {(affiliateLongDescription || walletPolicySummary) && (
              <div className="reward-block">
                <h3>For you (as affiliate)</h3>
                <p>{affiliateLongDescription || walletPolicySummary}</p>
              </div>
            )}

            {(prospectDescriptionShort ||
              prospectDescriptionLong ||
              prospectOfferSummary) && (
              <div className="reward-block">
                <h3>For people you refer</h3>
                {prospectDescriptionShort && <p>{prospectDescriptionShort}</p>}
                {prospectDescriptionLong && (
                  <p style={{ marginTop: 4 }}>{prospectDescriptionLong}</p>
                )}
                {!prospectDescriptionShort &&
                  !prospectDescriptionLong &&
                  prospectOfferSummary && <p>{prospectOfferSummary}</p>}
              </div>
            )}

            {!affiliateLongDescription &&
              !walletPolicySummary &&
              !prospectDescriptionShort &&
              !prospectDescriptionLong &&
              !prospectOfferSummary && (
                <p>
                  The business is still configuring the rewards for this
                  campaign.
                </p>
              )}

            <button
              className="public-secondary-button"
              onClick={handleGoToThreadOrLogin}
              style={
                themeColor
                  ? { borderColor: themeColor, color: themeColor }
                  : undefined
              }
            >
              {isLoggedIn ? "Go to invite thread" : "Sign in to get started"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicCampaignInvitePage;
