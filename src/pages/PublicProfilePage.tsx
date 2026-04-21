import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getProfileBySlug, type UserProfileDTO } from "../services/profileService";
import { listBusinessesForUser } from "../services/businessService";
import {
  addContactByUserSlug,
  getRelationshipProfileBySlug,
  type UserRelationshipProfileDTO,
} from "../services/contactService";
import type { BusinessContextDTO } from "../types/business";
import Modal from "../components/Modal";
import ImageLightbox from "../components/ImageLightbox";
import { useAppData } from "../context/AppDataContext";
import "../css/profile.css";

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET as string;

function fullName(p: UserProfileDTO) {
  const fn = (p.firstName ?? "").trim();
  const ln = (p.lastName ?? "").trim();
  const name = `${fn} ${ln}`.trim();
  return name || p.slug || "Profile";
}

function safeText(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}

function isBlank(v: any) {
  return v === null || v === undefined || String(v).trim() === "";
}

function normUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function initialsFromName(name: string) {
  const p = String(name || "")
    .split(" ")
    .filter(Boolean);
  return ((p[0]?.[0] ?? "B") + (p[1]?.[0] ?? "")).toUpperCase();
}

function resolvePublicImageUrl(raw?: string | null) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw);
  return data?.publicUrl ?? null;
}

function relationshipBadgeLabel(r: UserRelationshipProfileDTO | null): string | null {
  if (!r) return null;
  if (r.isMutualContact) return "Mutual contact";
  if (r.isInMyContacts) return "In your contacts";
  if (r.hasMeInTheirContacts) return "Has saved you";
  return "Not connected yet";
}

const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { userContacts, upsertUserContact } = useAppData();

  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [relationship, setRelationship] = useState<UserRelationshipProfileDTO | null>(null);
  const [userIdFromToken, setUserIdFromToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [relationshipLoading, setRelationshipLoading] = useState(false);

  const [businesses, setBusinesses] = useState<BusinessContextDTO[]>([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);

  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);

  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement | null>(null);

  const [imgOpen, setImgOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgAlt, setImgAlt] = useState<string>("");

  const openImage = (src: string, alt: string) => {
    setImgSrc(src);
    setImgAlt(alt);
    setImgOpen(true);
  };

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setLoading(true);
      setRelationshipLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        const userId = session?.user?.id ?? null;

        setUserIdFromToken(userId);

        if (!token) {
          setProfile(null);
          setRelationship(null);
          return;
        }

        const [fetchedProfile, fetchedRelationship] = await Promise.all([
          getProfileBySlug(slug, token),
          getRelationshipProfileBySlug(slug, token).catch((err) => {
            console.error("Failed to load relationship profile", err);
            return null;
          }),
        ]);

        setProfile(fetchedProfile);
        setRelationship(fetchedRelationship);
      } catch (e) {
        console.error("Failed to load profile", e);
        setProfile(null);
        setRelationship(null);
      } finally {
        setLoading(false);
        setRelationshipLoading(false);
      }
    };

    void load();
  }, [slug]);

  const displayProfile = useMemo(() => {
    if (!profile) return null;

    const raw = profile.profileImageUrl;
    let resolved: string | null = null;

    if (raw) {
      if (/^https?:\/\//i.test(raw)) {
        resolved = raw;
      } else {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw);
        resolved = data?.publicUrl ?? null;
      }
    }

    return { ...profile, profileImageUrl: resolved };
  }, [profile]);

  const isOwnProfile =
    !!displayProfile?.userId &&
    !!userIdFromToken &&
    displayProfile.userId === userIdFromToken;

  const canShowAddToContacts = !isOwnProfile;

  const hasUserContact = useMemo(() => {
    if (!canShowAddToContacts || !slug) return false;
    return (userContacts ?? []).some(
      (u: any) =>
        String(u?.profileSlug || "").toLowerCase() === String(slug).toLowerCase()
    );
  }, [canShowAddToContacts, slug, userContacts]);

  useEffect(() => {
    if (!contactMenuOpen) return;

    const onDown = (e: MouseEvent) => {
      const el = contactMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setContactMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContactMenuOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [contactMenuOpen]);

  const onAddProfileToContacts = async () => {
    if (!slug || !displayProfile?.userId) return;
    try {
      setAddingContact(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You need to be logged in.");

      await addContactByUserSlug(slug, token);

      upsertUserContact({
        userId: displayProfile.userId,
        profileSlug: displayProfile.slug,
        firstName: displayProfile.firstName ?? "",
        lastName: displayProfile.lastName ?? null,
        profileImageUrl: displayProfile.profileImageUrl ?? null,
        phone: (displayProfile as any).phone ?? null,
        email: (displayProfile as any).email ?? null,
      });

      setRelationship((prev) =>
        prev
          ? {
              ...prev,
              isInMyContacts: true,
              isMutualContact: prev.hasMeInTheirContacts ? true : prev.isMutualContact,
            }
          : prev
      );

      setContactMenuOpen(false);
    } catch (e: any) {
      console.error("Failed to add profile to contacts", e);
    } finally {
      setAddingContact(false);
    }
  };

  const onEdit = () => navigate("/profile/edit");

  useEffect(() => {
    if (!displayProfile?.userId) return;

    let cancelled = false;

    const loadBiz = async () => {
      setBizLoading(true);
      setBizError(null);
      try {
        const items = await listBusinessesForUser(displayProfile.userId);
        if (!cancelled) setBusinesses(items ?? []);
      } catch (e: any) {
        console.error("Failed to load businesses", e);
        if (!cancelled) setBizError(e?.message || "Failed to load businesses");
      } finally {
        if (!cancelled) setBizLoading(false);
      }
    };

    void loadBiz();
    return () => {
      cancelled = true;
    };
  }, [displayProfile?.userId]);

  const linkedinHref = useMemo(
    () => normUrl((displayProfile as any)?.linkedinUrl ?? null),
    [displayProfile]
  );

  const metaParts = useMemo(() => {
    const loc = safeText((displayProfile as any)?.location);
    const hasLoc = !isBlank((displayProfile as any)?.location);

    if (!hasLoc) return null;

    return (
      <div className="th-profile__meta" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {hasLoc && <span>{loc}</span>}

        {linkedinHref && (
          <>
            <span className="th-dot">•</span>
            <a
              href={linkedinHref}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                fontWeight: 900,
                color: "var(--text)",
              }}
            >
              in
            </a>
          </>
        )}
      </div>
    );
  }, [displayProfile, linkedinHref]);

  const registerBusinessCta = useMemo(() => {
    if (!isOwnProfile) return null;

    return (
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate("/business/register")}
        >
          + Register a business
        </button>
      </div>
    );
  }, [isOwnProfile, navigate]);

  if (loading) {
    return (
      <div className="app-page app-page--default">
        <div className="app-stack">
          <div className="card card--narrow" style={{ margin: "0 auto" }}>
            <div className="th-skeleton-line th-skeleton-line--lg" />
            <div className="th-skeleton-line" style={{ marginTop: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!displayProfile) {
    return (
      <div className="app-page app-page--default">
        <div className="app-stack">
          <div className="card card--narrow" style={{ margin: "0 auto" }}>
            <h1 className="card-title">Profile not found</h1>
            <p className="card-subtle">This profile link may be invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  const relationshipBadge = relationshipBadgeLabel(relationship);

  return (
    <div className="app-page app-page--default">
      <div className="app-stack">
        <div className="card th-card">
          <div className="th-profile">
            <div className="th-profile__header">
              <div className="th-profile__avatar">
                {displayProfile.profileImageUrl ? (
                  <button
                    type="button"
                    onClick={() => openImage(displayProfile.profileImageUrl!, fullName(displayProfile))}
                    aria-label="View profile photo"
                    title="View photo"
                    style={{
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "zoom-in",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <img src={displayProfile.profileImageUrl} alt={fullName(displayProfile)} />
                  </button>
                ) : (
                  <div className="th-profile__avatarPlaceholder">No Photo</div>
                )}
              </div>

              <div className="th-profile__headText">
                <div className="th-profile__name">{fullName(displayProfile)}</div>

                {metaParts}

                {displayProfile.bio ? (
                  <div className="th-profile__bio">{displayProfile.bio}</div>
                ) : (
                  <div className="th-profile__bio th-text-muted">No bio yet.</div>
                )}

                <div className="pp-stripsRow">
                  {/* ===== Relationship Strip ===== */}
                  {!isOwnProfile && relationship && (
                    <button
                      type="button"
                      className="pp-strip"
                      onClick={() => setRelationshipModalOpen(true)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="pp-strip-avatars">
                          {(relationship.commonContactsPreview ?? []).slice(0, 3).map((c) => {
                            const name =
                              [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
                              c.slug ||
                              "Contact";

                            const avatar = resolvePublicImageUrl(c.profileImageUrl);

                            return (
                              <div key={c.userId} className="pp-miniAvatar" title={name}>
                                {avatar ? (
                                  <img src={avatar} alt={name} />
                                ) : (
                                  <span className="pp-miniAvatarText">
                                    {initialsFromName(name)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="pp-strip-label">
                          Relationship
                          {relationship.commonContactsCount > 0 && (
                            <span className="pp-strip-count">
                              {relationship.commonContactsCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="pp-strip-arrow">→</span>
                    </button>
                  )}

                  {/* ===== Businesses Strip ===== */}
                  {businesses && businesses.length > 0 && (
                    <button
                      type="button"
                      className="pp-strip"
                      onClick={() => setBizModalOpen(true)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="pp-strip-avatars">
                          {businesses.slice(0, 3).map((b) => {
                            const name = safeText(b.businessName);
                            const logo = b.businessLogoUrl;

                            return (
                              <div key={b.businessId} className="pp-miniAvatar" title={name}>
                                {logo ? (
                                  <img src={logo} alt={name} />
                                ) : (
                                  <span className="pp-miniAvatarText">
                                    {initialsFromName(name)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="pp-strip-label">
                          Businesses
                          <span className="pp-strip-count">
                            {businesses.length}
                          </span>
                        </div>
                      </div>

                      <span className="pp-strip-arrow">→</span>
                    </button>
                  )}
                </div>

                {registerBusinessCta}
              </div>

              {(isOwnProfile || (canShowAddToContacts && !hasUserContact)) && (
                <div className="th-profile__actions">
                  {isOwnProfile ? (
                    <button className="btn btn--primary" onClick={onEdit}>
                      Edit Profile
                    </button>
                  ) : (
                    <div
                      ref={contactMenuRef}
                      style={{ position: "relative", display: "inline-flex" }}
                    >
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setContactMenuOpen((v) => !v)}
                        aria-label="More actions"
                        title="More"
                        style={{
                          width: 40,
                          height: 40,
                          padding: 0,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                        }}
                      >
                        +
                      </button>

                      {contactMenuOpen && (
                        <div
                          role="menu"
                          aria-label="Profile actions"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 8px)",
                            right: 0,
                            minWidth: 220,
                            borderRadius: 16,
                            border: "1px solid var(--border)",
                            background: "rgba(255,255,255,0.92)",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                            padding: 8,
                            zIndex: 20,
                          }}
                        >
                          <button
                            type="button"
                            className="btn"
                            role="menuitem"
                            onClick={onAddProfileToContacts}
                            disabled={addingContact}
                            style={{
                              width: "100%",
                              justifyContent: "flex-start",
                              borderRadius: 12,
                            }}
                          >
                            Add to Contacts
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={relationshipModalOpen}
        title="Relationship"
        onClose={() => setRelationshipModalOpen(false)}
        maxWidth={760}
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {!isOwnProfile && !hasUserContact ? (
              <button
                type="button"
                className="btn"
                onClick={onAddProfileToContacts}
                disabled={addingContact}
              >
                {addingContact ? "Adding…" : "Add to Contacts"}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setRelationshipModalOpen(false)}
            >
              Close
            </button>
          </div>
        }
      >
        {relationshipLoading ? (
          <div className="th-text-muted">Loading relationship…</div>
        ) : !relationship ? (
          <div className="th-text-muted">Relationship details are not available.</div>
        ) : (
          <div className="th-form">
            <div className="th-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>Status</div>

                {relationshipBadge ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "5px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.82)",
                      fontWeight: 800,
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    {relationshipBadge}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.72)",
                  }}
                >
                  <div className="th-text-muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                    Saved
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4, lineHeight: 1.1 }}>
                    {relationship.followingCount}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.72)",
                  }}
                >
                  <div className="th-text-muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                    Saved by
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4, lineHeight: 1.1 }}>
                    {relationship.followersCount}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.72)",
                  }}
                >
                  <div className="th-text-muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                    Common
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4, lineHeight: 1.1 }}>
                    {relationship.commonContactsCount}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 900,
                      border: "1px solid var(--border)",
                      background: relationship.isInMyContacts
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(0,0,0,0.05)",
                      color: relationship.isInMyContacts ? "#059669" : "var(--muted)",
                    }}
                  >
                    {relationship.isInMyContacts ? "✓" : "–"}
                  </span>
                  <span>In your contact list</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 900,
                      border: "1px solid var(--border)",
                      background: relationship.hasMeInTheirContacts
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(0,0,0,0.05)",
                      color: relationship.hasMeInTheirContacts ? "#059669" : "var(--muted)",
                    }}
                  >
                    {relationship.hasMeInTheirContacts ? "✓" : "–"}
                  </span>
                  <span>Has you in their contact list</span>
                </div>
              </div>
            </div>
            <div className="th-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>Common contacts</div>
                <div className="th-text-muted">{relationship.commonContactsCount}</div>
              </div>

              {relationship.commonContactsCount === 0 ? (
                <div className="th-text-muted" style={{ marginTop: 10 }}>
                  No common contacts yet.
                </div>
              ) : (
                <div className="th-form" style={{ marginTop: 10 }}>
                  {(relationship.commonContactsPreview ?? []).map((c) => {
                    const name =
                      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
                      c.slug ||
                      "Contact";
                    const avatar = resolvePublicImageUrl(c.profileImageUrl);

                    return (
                      <button
                        key={String(c.userId)}
                        type="button"
                        className="th-item-card"
                        onClick={() => {
                          if (c.slug) {
                            setRelationshipModalOpen(false);
                            navigate(`/profile/${encodeURIComponent(c.slug)}`);
                          }
                        }}
                        disabled={!c.slug}
                        style={{ cursor: c.slug ? "pointer" : "default", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={name}
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "rgba(255,255,255,0.7)",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "rgba(255,255,255,0.6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                color: "var(--muted)",
                                flexShrink: 0,
                              }}
                            >
                              {initialsFromName(name).slice(0, 2)}
                            </div>
                          )}

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {name}
                            </div>
                            <div className="th-text-muted" style={{ marginTop: 2 }}>
                              {c.slug ? c.slug : "No public profile link"}
                            </div>
                          </div>
                        </div>

                        <div className="th-text-muted" style={{ fontWeight: 900 }}>
                          {c.slug ? "→" : ""}
                        </div>
                      </button>
                    );
                  })}

                  {relationship.commonContactsCount >
                  (relationship.commonContactsPreview?.length ?? 0) ? (
                    <div className="th-text-muted" style={{ marginTop: 2 }}>
                      +{relationship.commonContactsCount - (relationship.commonContactsPreview?.length ?? 0)} more common contact
                      {relationship.commonContactsCount - (relationship.commonContactsPreview?.length ?? 0) === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={bizModalOpen}
        title="Businesses"
        onClose={() => setBizModalOpen(false)}
        maxWidth={720}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setBizModalOpen(false)}
            >
              Close
            </button>
          </div>
        }
      >
        {bizLoading ? (
          <div className="th-text-muted">Loading businesses…</div>
        ) : bizError ? (
          <div className="th-text-muted">Could not load businesses: {bizError}</div>
        ) : businesses.length === 0 ? (
          <div className="th-text-muted">No businesses to show.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {businesses.map((b) => {
              const s = b.businessSlug;
              const logo = b.businessLogoUrl;
              const name = safeText(b.businessName);
              const designation = safeText((b as any).designation);

              return (
                <button
                  key={String(b.businessId)}
                  type="button"
                  onClick={() => {
                    if (s) navigate(`/businesses/${encodeURIComponent(s)}`);
                    setBizModalOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.7)",
                    cursor: s ? "pointer" : "default",
                  }}
                  disabled={!s}
                  aria-label={`Open business ${name}`}
                  title={s ? "Open business" : "No business link available"}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (logo) openImage(logo, name);
                    }}
                    aria-label="View business logo"
                    title={logo ? "View logo" : "No logo"}
                    disabled={!logo}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      cursor: logo ? "zoom-in" : "default",
                    }}
                  >
                    {logo ? (
                      <img
                        src={logo}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)" }}>
                        {initialsFromName(name)}
                      </span>
                    )}
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        lineHeight: 1.2,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{name}</span>
                      <span className="th-text-muted" style={{ fontWeight: 800 }}>
                        ({safeText(b.role)} • {safeText(b.membershipStatus)})
                      </span>
                    </div>

                    <div className="th-text-muted" style={{ marginTop: 4 }}>
                      {designation !== "—" ? designation : "No designation"}
                    </div>
                  </div>

                  <div className="th-text-muted" style={{ fontWeight: 900 }}>
                    {s ? "→" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <ImageLightbox
        open={imgOpen}
        items={imgSrc ? [{ src: imgSrc, alt: imgAlt, title: imgAlt }] : []}
        startIndex={0}
        onClose={() => setImgOpen(false)}
      />
    </div>
  );
};

export default PublicProfilePage;