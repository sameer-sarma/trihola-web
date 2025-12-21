import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { markFirstLoginDone, type BootstrapDTO } from "../hooks/useBootstrap";
import { supabase } from "../supabaseClient";
import { addContactByUserSlug } from "../services/contactService";
import "../css/StartWelcome.css";

type Props = { bootstrap: BootstrapDTO };

function formatExpiry(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  // Simple friendly format; adjust if you already have a date util
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StartWelcome({ bootstrap }: Props) {
  const nav = useNavigate();

  const profile = bootstrap.profile;
  const prior = bootstrap.priorActivity;
  const suggested = bootstrap.suggestedContacts ?? [];

  const rewards = bootstrap.rewards;
  const rewardsCta = rewards?.cta;

  const completion = profile?.completionPercent ?? 0;
  const isProfileComplete = (profile?.completionPercent ?? 0) >= 100;
  const hasReferrals = (prior?.referralsCreated ?? 0) > 0 || (prior?.referralsAccepted ?? 0) > 0;
  const hasRewards = !!rewards?.hasActivity && (rewards?.count ?? 0) > 0;

  const [addingContactSlug, setAddingContactSlug] = useState<string | null>(null);
  const [addedContactSlugs, setAddedContactSlugs] = useState<Set<string>>(() => new Set());

  const handleAddSuggestedContact = async (contactSlug?: string) => {
    if (!contactSlug) return;
    if (addedContactSlugs.has(contactSlug)) return;

    try {
      setAddingContactSlug(contactSlug);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      await addContactByUserSlug(contactSlug, token);
      setAddedContactSlugs((prev) => new Set(prev).add(contactSlug));
    } catch (err) {
      console.error("Failed to add contact", err);
    } finally {
      setAddingContactSlug(null);
    }
  };

  // helper
  const Mark = ({ ok, pulse }: { ok: boolean; pulse?: boolean }) => (
    <span className={`start-checkmark ${ok ? "ok" : "todo"} ${pulse ? "pulse" : ""}`}>
      {ok ? "✓" : "•"}
    </span>
  );

  const missing = profile?.missing ?? [];
  const missingPreview = missing.slice(0, 3).join(", ");
  const missingMoreCount = Math.max(0, missing.length - 3);

  const safeName =
    profile?.displayName && profile.displayName !== "Unknown"
      ? profile.displayName
      : "there";

  const featured = bootstrap.featuredBusiness;

  const referTrihola = () => {
    const note =
      "I’d like to refer you to Trihola — it helps small businesses grow through trusted referrals and rewards.";

    const p = new URLSearchParams();

    // ✅ This is the key fix: CreateReferralForm can resolve and prefill from businessSlug
    p.set("businessSlug", featured?.businessProfile?.businessSlug ?? "trihola");

    // ✅ Optional (kept): useful if the business is already a contact
    if (featured?.userId) p.set("businessUserId", featured.userId);

    p.set("onlyBusinesses", "true");
    p.set("note", note);

    nav(`/referrals/new?${p.toString()}`);
  };

  const onContinue = () => {
    markFirstLoginDone();
    // Keep your existing logic: contacts => referrals else contacts
    const contacts = prior?.contactsAdded ?? 0;
    nav(contacts > 0 ? "/referrals" : "/contacts");
  };

  const stats = useMemo(() => {
    return [
      {
        icon: "🤝",
        title: "Connections",
        value: `${prior?.contactsAdded ?? 0}`,
        sub: "contacts added",
      },
      {
        icon: "🔁",
        title: "Referrals",
        value: `${prior?.referralsAccepted ?? 0}`,
        sub: `accepted · ${prior?.referralsCreated ?? 0} created`,
      },
      {
        icon: "🎁",
        title: "Offers",
        value: `${prior?.offersPurchased ?? 0}`,
        sub: "offers unlocked",
      },
    ];
  }, [prior?.contactsAdded, prior?.referralsAccepted, prior?.referralsCreated, prior?.offersPurchased]);

const topReward = rewards?.topItems?.[0];
const rewardsTargetRoute = topReward?.route || rewardsCta?.route || "/my-offers";

  return (
    <div className="start-wrap">
      {/* HERO */}
      <section className="start-hero">
        <div className="start-hero-left">
          <div className="start-kicker">Welcome back, {safeName} 👋</div>
          <h1 className="start-title">You’re building your referral network</h1>
          <p className="start-subtitle">
            Discover rewards, track referrals, and grow a trusted circle — all in one place.
          </p>
            <div className="start-hero-actions">
              {isProfileComplete ? (
                <>
                  <button className="btn" onClick={onContinue}>
                    Continue
                  </button>
                  <button className="btn" onClick={() => nav("/profile")}>
                    View profile
                  </button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => nav(`/profile/edit`)}>
                    Complete profile ({completion}%)
                  </button>
                  <button className="btn" onClick={onContinue}>
                    Continue anyway
                  </button>
                </>
              )}
                  {!isProfileComplete && missing.length > 0 && (
                  <div className="start-profile-hint">
                    Missing: <span className="mono">{missingPreview}</span>
                    {missingMoreCount > 0 ? ` +${missingMoreCount} more` : ""}
                  </div>
                )}
            </div>
        </div>

        <div className="start-hero-right">
          <div className="start-ring" aria-hidden="true">
            <div className="start-ring-inner">✓</div>
          </div>
          <div className="start-checklist">
            <div className="start-check">
              <Mark ok={isProfileComplete} />
              <span>{isProfileComplete ? "Profile complete" : "Complete your profile"}</span>
            </div>

            <div className="start-check">
              <Mark ok={hasReferrals} />
              <span>{hasReferrals ? "First referrals done" : "Send your first referral"}</span>
            </div>

            <div className="start-check">
              <Mark ok={hasRewards} pulse={hasRewards} />
              <span>{hasRewards ? "Rewards waiting" : "Unlock rewards"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRIMARY CTA STRIP (Rewards) */}
      {featured && (
        <section className="start-cta" role="button" tabIndex={0} onClick={referTrihola}>
          <div className="start-cta-icon" aria-hidden="true">🚀</div>
          <div className="start-cta-body">
            <div className="start-cta-title">Refer a business to Trihola</div>
            <div className="start-cta-sub">
              Invite a business you trust — track it end-to-end and unlock rewards.
            </div>
            <div className="start-cta-meta">
              Featured: <span className="mono">{featured.businessProfile?.businessName ?? "Trihola"}</span>
            </div>
          </div>

          <div className="start-cta-action">
            <button
              className="btn btn-cta"
              onClick={(e) => {
                e.stopPropagation();
                referTrihola();
              }}
            >
              Create referral →
            </button>
          </div>
        </section>
      )}

      {/* PRIMARY CTA STRIP (Rewards) */}
      {rewards?.hasActivity && rewardsCta && (
        <section
          className="start-cta"
          role="button"
          tabIndex={0}
          onClick={() => nav(rewardsTargetRoute)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") nav(rewardsTargetRoute);
          }}
        >
          <div className="start-cta-icon" aria-hidden="true">
            🎁
          </div>
          <div className="start-cta-body">
            <div className="start-cta-title">{rewardsCta.title}</div>
            <div className="start-cta-sub">
              {topReward?.subtitle ? topReward.subtitle : rewardsCta.subtitle}
              {topReward?.subtitle?.includes("Expires") ? "" : topReward?.id ? "" : ""}
            </div>
              {topReward?.createdAtUtc && (
                <div className="start-cta-meta">
                  Latest: <span className="mono">{topReward.title}</span>
                  {topReward.subtitle ? ` · ${topReward.subtitle}` : ""}
                  {" · "}
                  <span className="mono">{formatExpiry(topReward.createdAtUtc)}</span>
                </div>
              )}
          </div>

          <div className="start-cta-action">
            <button className="btn btn-cta" onClick={(e) => { e.stopPropagation(); nav(rewardsTargetRoute); }}>
              View Reward →
            </button>
          </div>
        </section>
      )}

      {/* QUICK WINS */}
      <section className="start-stats">
        {stats.map((s) => (
          <div key={s.title} className="start-stat">
            <div className="start-stat-icon" aria-hidden="true">
              {s.icon}
            </div>
            <div className="start-stat-title">{s.title}</div>
            <div className="start-stat-value">{s.value}</div>
            <div className="start-stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* SUGGESTED CONTACTS */}
      {suggested.length > 0 && (
        <section className="start-section">
          <div className="start-section-head">
            <h2 className="start-h2">Suggested contacts</h2>
            <div className="start-muted">Grow your trusted referral circle</div>
          </div>

          <div className="start-list">
            {suggested.slice(0, 4).map((c) => (
            <div key={c.id} className="start-row">
              <div
                className="start-person"
                role="button"
                tabIndex={0}
                onClick={() => nav(`/profile/${c.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") nav(`/profile/${c.slug}`);
                }}
                style={{ cursor: "pointer" }}
              >
                {c.profileImageUrl ? (
                  <img className="start-avatar" src={c.profileImageUrl} alt="" />
                ) : (
                  <div className="start-avatar placeholder" aria-hidden="true" />
                )}

                <div className="start-person-text">
                  <div className="start-person-name">
                    {c.name === "Unknown" ? "Someone you may know" : c.name}
                  </div>
                  <div className="start-person-reason">{c.reason || "Suggested for you"}</div>
                </div>
              </div>

              <div className="start-row-actions">
                <button
                  className="btn"
                  disabled={!c.slug || addingContactSlug === c.slug || addedContactSlugs.has(c.slug)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddSuggestedContact(c.slug);
                  }}
                  title={!c.slug ? "Missing profile slug" : undefined}
                >
                  {addedContactSlugs.has(c.slug)
                    ? "Added"
                    : addingContactSlug === c.slug
                      ? "Adding…"
                      : "Add contact"}
                </button>
              </div>
            </div>
            ))}
          </div>

          <div className="start-bottom-actions">
            <button className="btn" onClick={() => nav("/contacts")}>
              Go to Contacts →
            </button>
            <button className="btn" onClick={onContinue}>
              Skip for now
            </button>
          </div>
        </section>
      )}

      {/* If no suggestions, keep a clean bottom action */}
      {suggested.length === 0 && (
        <section className="start-bottom-actions solo">
          <button className="btn" onClick={onContinue}>
            Continue
          </button>
          <button className="btn" onClick={() => nav("/profile")}>
            Skip
          </button>
        </section>
      )}

      {/* Optional: subtle “expires soon” helper (uses topReward.subtitle like "Expires soon: ...") */}
      {topReward?.subtitle?.toLowerCase().includes("expires") && (
        <div className="start-footnote">
          Tip: Open “My Offers” to act on rewards before expiry.
          {topReward?.subtitle?.includes(":") ? (
            <>
              {" "}
              (Next expiry: <span className="mono">{topReward.subtitle.split(":").slice(1).join(":").trim()}</span>)
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
