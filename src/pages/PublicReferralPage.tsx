// src/pages/PublicReferralPage.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { fetchPublicReferral } from "../services/referralService";
import type { ReferralPublicView } from "../types/referral";

const PublicReferralPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [referral, setReferral] = useState<ReferralPublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 1) Check Supabase session (are we logged in?)
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    void checkSession();
  }, []);

  // 2) Load public referral
  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    fetchPublicReferral(slug)
      .then((data) => {
        setReferral(data);
      })
      .catch((err) => {
        console.error(err);
        setError("This referral link looks invalid or may have expired.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // 3) If this user is a participant → go straight to referral thread
  useEffect(() => {
    if (!slug || !referral) return;

    if (isLoggedIn && referral.isParticipant) {
      navigate(`/referral/${slug}/thread`, { replace: true });
    }
  }, [slug, referral, isLoggedIn, navigate]);

  const handleContinue = () => {
    if (!slug) return;

    if (isLoggedIn) {
      // Logged-in but not auto-redirected (e.g. not a participant)
      navigate(`/referral/${slug}/thread`);
    } else {
      // Not logged-in → go to login and then to referral thread
      const nextPath = `/referral/${slug}/thread`;
      navigate(`/email-login?next=${encodeURIComponent(nextPath)}`);
    }
  };

  if (loading) {
    return (
      <div className="public-referral-page th-page th-page--centered">
        <div className="th-card th-card--narrow">
          <div className="th-skeleton-line th-skeleton-line--lg" />
          <div className="th-skeleton-line" />
        </div>
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="public-referral-page th-page th-page--centered">
        <div className="th-card th-card--narrow">
          <h1 className="th-page-title">Referral not available</h1>
          <p className="th-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const {
    status,
    note,
    referrerName,
    referrerProfileImageUrl,
    businessName,
    businessProfileImageUrl,
    prospectName,
    prospectProfileImageUrl,
    productName,
    productImageUrl,
    bundleTitle,
    prospectOffer,
  } = referral;

  const hasProductOrBundle = Boolean(productName || bundleTitle);

  const heroTitle = productName
    ? `${productName}${businessName ? ` at ${businessName}` : ""}`
    : bundleTitle
    ? `${bundleTitle}${businessName ? ` at ${businessName}` : ""}`
    : businessName || "Referral";

  const heroSubtitle = (() => {
    if (prospectName && businessName && referrerName) {
      return `${prospectName} has been referred to ${businessName} by ${referrerName}.`;
    }
    if (businessName && referrerName) {
      return `A prospect has been referred to ${businessName} by ${referrerName}.`;
    }
    if (businessName) {
      return `A prospect has been referred to ${businessName} via TriHola.`;
    }
    return "This is a TriHola referral connection.";
  })();

  const statusClass = `status-pill status-pill--${String(status).toLowerCase()}`;

  return (
    <div className="public-referral-page">
      {/* HERO */}
      <section className="public-referral-hero">
        <div className="public-referral-hero-overlay" />
        <div className="public-referral-hero-content">
          <div className="public-referral-breadcrumb">Referral</div>
          <h1 className="public-referral-title">{heroTitle}</h1>
          <p className="public-referral-subtitle">{heroSubtitle}</p>

          {hasProductOrBundle && (
            <p className="public-referral-meta">
              This referral is for{" "}
              {productName ? (
                <>
                  the product <strong>{productName}</strong>
                  {businessName ? ` at ${businessName}` : ""}
                </>
              ) : (
                <>
                  the bundle <strong>{bundleTitle}</strong>
                  {businessName ? ` at ${businessName}` : ""}
                </>
              )}
              .
            </p>
          )}
        </div>
      </section>

      {/* PARTICIPANT CLUSTER */}
      <section className="public-referral-profiles">
        <div className="public-referral-profile-cluster">
          {prospectName && (
            <div className="public-referral-profile">
              <div className="public-referral-avatar-wrap">
                {prospectProfileImageUrl && (
                  <img src={prospectProfileImageUrl} alt={prospectName} />
                )}
              </div>
              <div className="public-referral-profile-label">Prospect</div>
              <div className="public-referral-profile-name">{prospectName}</div>
            </div>
          )}

          <div className="public-referral-profile">
            <div className="public-referral-avatar-wrap">
              {referrerProfileImageUrl && (
                <img
                  src={referrerProfileImageUrl}
                  alt={referrerName ?? "Referrer"}
                />
              )}
            </div>
            <div className="public-referral-profile-label">Referred by</div>
            <div className="public-referral-profile-name">
              {referrerName ?? "A TriHola user"}
            </div>
          </div>

          {businessName && (
            <div className="public-referral-profile">
              <div className="public-referral-avatar-wrap">
                {businessProfileImageUrl && (
                  <img src={businessProfileImageUrl} alt={businessName} />
                )}
              </div>
              <div className="public-referral-profile-label">Business</div>
              <div className="public-referral-profile-name">
                {businessName}
              </div>
            </div>
          )}
        </div>

        {status && <span className={statusClass}>{status}</span>}
      </section>

      {/* MAIN CONTENT */}
      <section className="public-referral-content">
        <div className="public-referral-grid">
          {/* Left card: What you get */}
          <div className="public-referral-card">
            <h2 className="public-referral-section-title">What you get</h2>

            {productImageUrl && (
              <div className="public-referral-product-image-wrap">
                <img
                  src={productImageUrl}
                  alt={productName ?? bundleTitle ?? "Product"}
                />
              </div>
            )}

            {hasProductOrBundle && (
              <p className="public-referral-body">
                This referral connects{" "}
                {prospectName ? (
                  <strong>{prospectName}</strong>
                ) : (
                  <>a prospect</>
                )}{" "}
                with{" "}
                {businessName ? <strong>{businessName}</strong> : "a business"}{" "}
                for{" "}
                {productName ? (
                  <>
                    the product <strong>{productName}</strong>
                  </>
                ) : (
                  <>
                    the bundle <strong>{bundleTitle}</strong>
                  </>
                )}
                .
              </p>
            )}

            {prospectOffer?.title && (
              <div className="public-referral-offer">
                <h3 className="public-referral-offer-title">
                  {prospectOffer.title}
                </h3>
              </div>
            )}

            {!prospectOffer?.title && !hasProductOrBundle && (
              <p className="public-referral-body">
                This referral highlights a trusted connection between the
                prospect and the business and can unlock special attention and
                benefits when they engage.
              </p>
            )}

            {note && (
              <div className="public-referral-note">
                <div className="public-referral-note-label">
                  Message from {referrerName ?? "your contact"}
                </div>
                <p>{note}</p>
              </div>
            )}
          </div>

          {/* Right card: How it works + CTA */}
          <div className="public-referral-card">
            <h2 className="public-referral-section-title">How it works</h2>
            <ol className="public-referral-steps">
              <li>
                The person being referred
                {prospectName && (
                  <>
                    {" "}
                    (e.g. <strong>{prospectName}</strong>)
                  </>
                )}{" "}
                signs up or logs in to <strong>TriHola</strong>.
              </li>
              <li>
                The referral is linked to their TriHola account and they confirm
                that they’d like to be referred
                {businessName ? ` to ${businessName}` : " to the business"}.
              </li>
              <li>
                When they engage with the business
                {hasProductOrBundle && (
                  <>
                    {" "}
                    for the referred {productName ? "product" : "bundle"}
                  </>
                )}
                , any applicable referral benefits or offers can be applied and
                tracked through TriHola.
              </li>
            </ol>

            <button
              type="button"
              className="public-referral-cta"
              onClick={handleContinue}
            >
              Continue with TriHola
            </button>

            <p className="public-referral-footnote">
              You’ll be redirected to TriHola to securely continue. If you’re
              new here, we’ll help you create an account and link this referral
              to the right person.
            </p>

            {prospectName && (
              <p className="public-referral-footnote">
                This link was intended for <strong>{prospectName}</strong>. If
                that’s not you, please do not proceed.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicReferralPage;
