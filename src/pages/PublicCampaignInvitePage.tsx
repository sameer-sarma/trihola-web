// src/pages/PublicCampaignInvitePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { usePublicCampaignInviteLanding } from "../queries/campaignInvitesQueries";
import type { ProfileMiniDTO } from "../types/campaign";

const formatName = (p?: ProfileMiniDTO | null): string | undefined => {
  if (!p) return undefined;
  if (p.firstName || p.lastName) {
    const n = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return n || undefined;
  }
  if (p.businessName) return p.businessName;
  return undefined;
};

const formatDate = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

const PublicCampaignInvitePage: React.FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Keep auth state in sync
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await supabase.auth.getSession();
      if (cancelled) return;
      const session = result.data.session;
      setIsLoggedIn(!!session);
      setAccessToken(session?.access_token ?? null);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // IMPORTANT: Hooks must be called unconditionally.
  const { data: view, isLoading, error } = usePublicCampaignInviteLanding(inviteId, accessToken ?? undefined);

  // ---- Derive everything WITHOUT new hooks ----

  const typedError = error as Error | null;

  const campaignId = view?.invite?.campaignId;

  // Role is invite-scoped now (per your Ktor change)
  const myRole = (view as any)?.myParticipantRole as "BUSINESS" | "AFFILIATE" | null | undefined;
  const isBusinessViewer = myRole === "BUSINESS";
  const isInviteeAffiliateViewer = myRole === "AFFILIATE"; // invitee of THIS invite only

  const viewerIsAlreadyAffiliate = !!(view as any)?.viewerIsAlreadyAffiliate;
  const viewerInviteId = ((view as any)?.viewerInviteId as string | undefined) ?? undefined;

  // Campaign affiliate elsewhere: only when authed + backend says yes + not owner/invitee of this invite
  const isCampaignAffiliateElsewhere =
    !!accessToken && viewerIsAlreadyAffiliate && !!viewerInviteId && !isBusinessViewer && !isInviteeAffiliateViewer;

  const inviteThreadPath =
    campaignId && view?.invite?.id ? `/campaigns/${campaignId}/invites/${view.invite.id}/thread` : null;

  const myInviteThreadPath =
    campaignId && viewerInviteId ? `/campaigns/${campaignId}/invites/${viewerInviteId}/thread` : null;

  const ownerCampaignPath = campaignId ? `/campaigns/${campaignId}` : null;

  const snapshot = view?.snapshot;
  const themeColor = snapshot?.themeColor || undefined;

  const businessName = formatName(view?.invite?.business);
  const inviteeName = formatName(view?.invite?.recipient);

  const affiliateHeadline = snapshot?.affiliateHeadline || undefined;
  const affiliateSubheading = snapshot?.affiliateSubheading || undefined;
  const campaignDescription = snapshot?.campaignDescription || undefined;
  const affiliateLongDescription = snapshot?.affiliateLongDescription || undefined;
  const prospectDescriptionShort = snapshot?.prospectDescriptionShort || undefined;
  const prospectDescriptionLong = snapshot?.prospectDescriptionLong || undefined;

  const heroTitle = affiliateHeadline || snapshot?.title || "Campaign invite";

  const heroSubtitle = (() => {
    if (affiliateSubheading) return affiliateSubheading;
    if (businessName && inviteeName) return `${businessName} invited ${inviteeName} to promote this campaign.`;
    if (businessName) return `${businessName} invited you to promote this campaign.`;
    return "You’ve been invited to promote this campaign.";
  })();

  const heroImage =
    snapshot?.primaryImageUrl ?? snapshot?.product?.primaryImageUrl ?? snapshot?.bundle?.primaryImageUrl ?? undefined;

  const expiresLabel = formatDate(snapshot?.expiresAt);

  const walletPolicySummary = view?.walletPolicySummary ?? undefined;
  const prospectOfferSummary = view?.prospectOfferSummary ?? undefined;

  const openedSomeoneElsesInvite =
    isCampaignAffiliateElsewhere && !!view?.invite?.id && !!viewerInviteId && view.invite.id !== viewerInviteId;

  const inviteeDisplay = inviteeName ?? "this person";

  const primaryLabel = !isLoggedIn
    ? "Sign in to view invite"
    : isBusinessViewer
      ? "Open campaign dashboard"
      : isInviteeAffiliateViewer
        ? "Open this invite thread"
        : isCampaignAffiliateElsewhere
          ? "Open your invite thread"
          : `This invite is for ${inviteeDisplay}`;

  const primaryDisabled =
    isLoggedIn && !isBusinessViewer && !isInviteeAffiliateViewer && !isCampaignAffiliateElsewhere;

  const handlePrimaryCta = () => {
    if (!inviteId) return;

    if (!isLoggedIn) {
      navigate(`/email-login?next=${encodeURIComponent(`/campaign-invite/${inviteId}`)}`);
      return;
    }

    if (isBusinessViewer) {
      if (ownerCampaignPath) navigate(ownerCampaignPath);
      return;
    }

    if (isInviteeAffiliateViewer) {
      if (inviteThreadPath) navigate(inviteThreadPath);
      return;
    }

    if (isCampaignAffiliateElsewhere) {
      if (myInviteThreadPath) navigate(myInviteThreadPath);
      return;
    }
  };

  const openCampaignPath =
    snapshot?.slug && snapshot?.openInviteSlug ? `/campaign-open/${snapshot.slug}/${snapshot.openInviteSlug}` : null;

  const showOpenInviteSecondary =
    isLoggedIn &&
    !isBusinessViewer &&
    !isInviteeAffiliateViewer &&
    !isCampaignAffiliateElsewhere &&
    !!openCampaignPath;

  const statusLower = snapshot?.status?.toLowerCase?.() ?? "unknown";

  // ---- Now safe early returns (NO hooks below this point) ----

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
          <p>{typedError?.message ?? "This invite might have expired or been withdrawn."}</p>
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
            style={themeColor ? { background: `linear-gradient(135deg, ${themeColor} 0%, #000000cc 55%)` } : undefined}
          />
        </div>

        <div className="public-hero-content">
          <div className="breadcrumb">Invite → Campaign</div>
          <h1 className="public-hero-title">{heroTitle}</h1>
          {heroSubtitle && <p className="public-hero-subtitle">{heroSubtitle}</p>}

          {openedSomeoneElsesInvite && (
            <div className="public-info" style={{ marginTop: 10 }}>
              You’re already an affiliate for this campaign. This link is someone else’s invite — you can open yours
              instead.
            </div>
          )}

          <div className="public-hero-chips">
            {businessName && (
              <span className="chip">
                From <strong>{businessName}</strong>
              </span>
            )}
            {inviteeName && (
              <span className="chip">
                Invite for <strong>{inviteeName}</strong>
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
            onClick={handlePrimaryCta}
            disabled={primaryDisabled}
            style={
              themeColor
                ? {
                    backgroundColor: themeColor,
                    borderColor: themeColor,
                    opacity: primaryDisabled ? 0.6 : 1,
                    cursor: primaryDisabled ? "not-allowed" : "pointer",
                  }
                : primaryDisabled
                  ? { opacity: 0.6, cursor: "not-allowed" }
                  : undefined
            }
          >
            {primaryLabel}
          </button>

          {showOpenInviteSecondary && (
            <button
              className="public-secondary-button"
              onClick={() => openCampaignPath && navigate(openCampaignPath)}
              style={themeColor ? { borderColor: themeColor, color: themeColor } : undefined}
            >
              Use open invite link instead
            </button>
          )}
        </div>
      </section>

      {/* CONTENT */}
      <section className="public-content">
        <div className="public-content-container">
          <div className="public-card">
            <h2>About this campaign</h2>
            {campaignDescription ? (
              <p>{campaignDescription}</p>
            ) : view.invite.personalMessage ? (
              <p>{view.invite.personalMessage}</p>
            ) : (
              <p>This campaign lets you earn rewards by referring people to {businessName ?? "this business"}.</p>
            )}

            <p className="status-row">
              Current status:{" "}
              <span className={`status-pill status-pill--${statusLower}`}>{snapshot?.status ?? "UNKNOWN"}</span>
            </p>
          </div>

          <div className="public-card">
            <h2>What’s in it for everyone?</h2>

            {(affiliateLongDescription || walletPolicySummary) && (
              <div className="reward-block">
                <h3>For the affiliate</h3>
                <p>{affiliateLongDescription || walletPolicySummary}</p>
              </div>
            )}

            {(prospectDescriptionShort || prospectDescriptionLong || prospectOfferSummary) && (
              <div className="reward-block">
                <h3>For people referred</h3>
                {prospectDescriptionShort && <p>{prospectDescriptionShort}</p>}
                {prospectDescriptionLong && <p style={{ marginTop: 4 }}>{prospectDescriptionLong}</p>}
                {!prospectDescriptionShort && !prospectDescriptionLong && prospectOfferSummary && (
                  <p>{prospectOfferSummary}</p>
                )}
              </div>
            )}

            {!affiliateLongDescription &&
              !walletPolicySummary &&
              !prospectDescriptionShort &&
              !prospectDescriptionLong &&
              !prospectOfferSummary && <p>The business is still configuring the rewards for this campaign.</p>}

            {!primaryDisabled && (
              <button
                className="public-secondary-button"
                onClick={handlePrimaryCta}
                style={themeColor ? { borderColor: themeColor, color: themeColor } : undefined}
              >
                {!isLoggedIn
                  ? "Sign in to get started"
                  : isBusinessViewer
                    ? "Go to campaign dashboard"
                    : isInviteeAffiliateViewer
                      ? "Go to this invite thread"
                      : "Go to your invite thread"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicCampaignInvitePage;
