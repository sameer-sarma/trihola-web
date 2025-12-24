import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  fetchPublicOpenReferral,
  claimOpenReferral,
} from "../services/openReferralService";
import ScopeCard from "../components/ScopeCard";
import type { PublicOpenReferralDTO } from "../types/openReferrals";
// import "../css/Thread.css";

const OpenReferralLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | undefined>();
  const [data, setData] = useState<PublicOpenReferralDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setToken(session?.access_token);
      setUserId(session?.user?.id);
    });
  }, []);

  // Load open referral
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    fetchPublicOpenReferral(slug)
      .then(setData)
      .catch((err) =>
        setError(err?.message || "Could not load this referral.")
      )
      .finally(() => setLoading(false));
  }, [slug]);

  const isLoggedIn = !!token && !!userId;

  const handleClaim = async () => {
    if (!slug) return;
    const nextPath = `/open/${slug}`;
    // If not logged in, send to email login preserving openSlug
    if (!token) {
      navigate(`/email-login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    try {
      setClaiming(true);
      setClaimError(null);
      const res = await claimOpenReferral(slug, token);

      // Happy path: backend returns referralSlug
      navigate(`/referral/${res.referralSlug}/thread`);
    } catch (err: any) {
      const code = err?.code as string | undefined;

      if (
        code === "DUPLICATE_REFERRAL_FOR_TARGET" ||
        code === "ALREADY_ACCEPTED_REFERRAL_FOR_TARGET"
      ) {
        // Soft landing: send them to the main referrals list
        // rather than leaving them on a “broken” page.
        navigate("/referrals");
        return;
      }

      if (code === "OPEN_REFERRAL_NO_REMAINING_USES") {
        setClaimError(
          "This open referral link has already been used the maximum number of times. Please ask the business for a fresh link."
        );
        return;
      }

      setClaimError(err?.message || "Could not claim this referral.");
    } finally {
      setClaiming(false);
    }
  };


  if (loading) {
    return (
      <div className="th-page">
        <div className="card">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="th-page">
        <div className="card">
          <h1 className="page-title">Link error</h1>
          <p className="th-muted">
            {error || "This referral link could not be found or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { business, affiliate, campaign, title, message, status, canClaim } =
    data;

  const heroImage =
    campaign?.primaryImageUrl ||
    business?.publicBusinessProfile?.primaryImageUrl ||
    business?.profileImageUrl ||
    undefined;

  const businessName =
    business?.publicBusinessProfile?.name ||
    [business?.firstName, business?.lastName].filter(Boolean).join(" ").trim() ||
    "this business";

  const prospectSummary = campaign?.prospectOfferSummary;
  const affiliateSummary = campaign?.affiliateRewardSummary;

  const initials = (name?: string | null) => {
    if (!name) return "";
    return name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const statusClass =
    status === "ACTIVE"
      ? "status-badge status-active"
      : status === "EXPIRED"
      ? "status-badge status-expired"
      : status === "COMPLETED"
      ? "status-badge status-completed"
      : "status-badge";

  return (
    <div className="th-page open-ref-page">
      {/* HERO */}
      <section className="open-ref-hero">
        <div className="open-ref-hero__left">
          <div className="open-ref-chip-row">
            <span className="open-ref-chip">Referral invite</span>
            {status && <span className={statusClass}>{status}</span>}
            {campaign?.title && (
              <span className="open-ref-chip open-ref-chip--soft">
                Campaign · {campaign.title}
              </span>
            )}
          </div>

          <h1 className="open-ref-title">
            {campaign?.title ||
              title ||
              `Discover ${businessName} with a Trihola referral`}
          </h1>

          <p className="open-ref-subtitle">
            {affiliate ? (
              <>
                <strong>{affiliate.firstName || "A referrer"}</strong> is
                inviting you to connect with{" "}
                <strong>{businessName}</strong> through Trihola. Claim this
                referral to start a private chat and unlock any offers connected
                to it.
              </>
            ) : (
              <>
                You&apos;re viewing an open referral for{" "}
                <strong>{businessName}</strong>. Claim it to start a private
                conversation and explore any rewards linked to this referral.
              </>
            )}
          </p>

          {prospectSummary && (
            <p className="open-ref-offer-highlight">
              {prospectSummary}
            </p>
          )}

          {affiliate && (
            <div className="open-ref-referrer">
              <div className="open-ref-referrer-avatar">
                {affiliate.profileImageUrl ? (
                  <img
                    src={affiliate.profileImageUrl}
                    alt={affiliate.firstName || "Referrer"}
                  />
                ) : (
                  <span>
                    {initials(
                      `${affiliate.firstName || ""} ${
                        affiliate.lastName || ""
                      }`
                    )}
                  </span>
                )}
              </div>
              <div className="open-ref-referrer-meta">
                <div className="open-ref-referrer-label">Referrer</div>
                <div className="open-ref-referrer-name">
                  {affiliate.firstName} {affiliate.lastName}
                </div>
                <div className="open-ref-referrer-tagline">
                  Shares this offer with their network via Trihola.
                </div>
              </div>
            </div>
          )}

          <div className="open-ref-cta-row">
            {!isLoggedIn && (
              <Link
                className="btn btn--primary open-ref-btn"
                to={`/email-login?next=${encodeURIComponent(`/open/${slug}`)}`}
              >
                Sign in and claim
              </Link>
            )}

            {isLoggedIn && (
              <button
                className="btn btn--primary open-ref-btn"
                disabled={!canClaim || claiming}
                onClick={handleClaim}
              >
                {claiming ? "Claiming…" : "Claim this referral"}
              </button>
            )}

            <p className="open-ref-cta-help">
              No spam. Your contact details are only shared with{" "}
              <strong>{businessName}</strong> after you claim this referral.
            </p>
          </div>
        </div>

        <div className="open-ref-hero__right">
          {heroImage ? (
            <div className="open-ref-hero__image">
              <img src={heroImage} alt={campaign?.title || businessName} />
            </div>
          ) : (
            <div className="open-ref-hero__placeholder">
              <div className="open-ref-hero__badge">Powered by Trihola</div>
              <p>
                Referrals, rewards, and private chats between you and brands
                you trust.
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
            <h3 className="card-title">What you unlock</h3>
            <p className="th-muted">
              {prospectSummary ? (
                prospectSummary
              ) : (
                <>
                  Claiming this referral creates a private Trihola thread
                  between you and <strong>{businessName}</strong>. You can ask
                  questions, understand the offer in detail, and redeem any
                  rewards connected to this referral.
                </>
              )}
            </p>
            {affiliateSummary && (
              <p className="open-ref-tagline">
                <span className="open-ref-tagline-label">
                  Also for your referrer:
                </span>{" "}
                Your referrer also benefits through Trihola for sharing this link,
                typically in the form of points or special offers.
              </p>
            )}
          </section>

          {(title || message) && (
            <section className="card open-ref-card">
              <h3 className="card-title">
                {affiliate?.firstName
                  ? `What ${affiliate.firstName} says`
                  : "A note from your referrer"}
              </h3>

              {title && (
                <p className="open-ref-note-title">
                  {title}
                </p>
              )}

              {message && <p className="th-muted">{message}</p>}
            </section>
          )}

          {campaign && (campaign as any).product && (
            <ScopeCard
              title="This referral is for"
              // @ts-expect-error backend may add these fields
              product={campaign.product}
              // @ts-expect-error backend may add these fields
              bundle={campaign.bundle}
              businessSlug={business?.publicBusinessProfile?.slug}
              appearance="flat"
            />
          )}

          {claimError && (
            <div className="error-banner" style={{ marginTop: 16 }}>
              {claimError}
            </div>
          )}
        </div>

        {/* Side column */}
        <aside className="open-ref-side">
          <section className="card open-ref-card">
            <h3 className="card-title">Talk to {businessName}</h3>
            <p className="th-muted">
              This referral connects you directly with <strong>{businessName}</strong> through a secure Trihola thread, 
              where even <strong>{affiliate?.firstName}</strong> can join in to provide context and support. 
              Once you claim it, you can ask questions, coordinate next steps, and redeem your offer 
              — all without revealing your phone number or personal contact details to the business.            </p>
          </section>

          <section className="card open-ref-card open-ref-card--accent">
            <h3 className="card-title">What is an open referral?</h3>
            <p className="th-muted">
              An open referral is a public invite that anyone with the link can
              use. When you claim it, Trihola creates a secure thread between
              you and the business. Your details stay private until you choose
              to claim.
            </p>
            <ul className="open-ref-list">
              <li>✅ Your details are not sold or shared broadly.</li>
              <li>✅ Only this business sees your contact after claim.</li>
              <li>✅ You control whether to continue or stop.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OpenReferralLandingPage;
