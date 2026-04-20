import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../supabaseClient";

import { addContactByBusinessSlug } from "../services/contactService";

import {
  getBusinessPublicViewBySlug,
  getBusinessMembers,
  assignBusinessMember,
  changeMemberRoleOrDesignation,
  removeBusinessMember,
  leaveBusiness,
} from "../services/businessService";

import {
  listProductsForBusinessSlug,
  getProductForBusinessSlug,
} from "../services/productService";
import { listBundlesForBusinessSlug } from "../services/bundleService";
import { listOfferTemplates } from "../services/offerTemplateService";

import type { BusinessPublicViewDTO, BusinessMemberDTO } from "../types/business";
import type { BundleRecord, ProductRecord } from "../types/catalog";
import type { OfferTemplateResponse } from "../types/offerTemplateTypes";

import Modal from "../components/Modal";
import MembersModalBody from "../components/business/MembersModalBody";
import { useAppData } from "../context/AppDataContext";

import "../css/profile.css";

/* ---------- helpers ---------- */
function safeText(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}
function roleRank(role?: string) {
  switch ((role ?? "").toUpperCase()) {
    case "OWNER":
      return 3;
    case "ADMIN":
      return 2;
    case "STAFF":
      return 1;
    default:
      return 0;
  }
}
function memberDisplayName(m: BusinessMemberDTO) {
  const fn = (m.firstName ?? "").trim();
  const ln = (m.lastName ?? "").trim();
  return `${fn} ${ln}`.trim() || m.profileSlug || String(m.userId);
}
function initials(name: string) {
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] ?? "U") + (p[1]?.[0] ?? "")).toUpperCase();
}

function businessLogoUrl(ctx: BusinessPublicViewDTO | null): string | null {
  if (!ctx) return null;
  const anyCtx = ctx as any;
  return anyCtx.businessLogoUrl || anyCtx.logoUrl || anyCtx.logo || anyCtx.profileImageUrl || null;
}

function offerTemplatePreviewImage(t: OfferTemplateResponse): string | null {
  return t.primaryImageUrl || t.images?.find((img) => img?.isPrimary)?.url || t.images?.[0]?.url || null;
}

function offerTemplateKindLabel(t: OfferTemplateResponse): string {
  switch (t.offerType) {
    case "PERCENTAGE_DISCOUNT":
      return "PERCENTAGE";
    case "FIXED_DISCOUNT":
      return "FIXED";
    case "GRANT":
      return "GRANT";
    default:
      return t.offerType ?? "OFFER";
  }
}
/* ------------------------------------------------------- */

const BusinessPage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const navigate = useNavigate();
  const { businessContacts, upsertBusinessContact } = useAppData();

  const [ctx, setCtx] = useState<BusinessPublicViewDTO | null>(null);
  const [members, setMembers] = useState<BusinessMemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [membersOpen, setMembersOpen] = useState(false);

  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement | null>(null);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [bundles, setBundles] = useState<BundleRecord[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [offersOpen, setOffersOpen] = useState(false);
  const [offers, setOffers] = useState<OfferTemplateResponse[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  const suppressOpenUntilRef = useRef<number>(0);
  const suppressOpens = (ms: number = 350) => {
    suppressOpenUntilRef.current = Date.now() + ms;
  };

  const viewerRole = useMemo(
    () => (ctx?.viewerRelation ?? "").toUpperCase(),
    [ctx?.viewerRelation]
  );

  const canManageMembers = viewerRole === "OWNER" || viewerRole === "ADMIN";
  const canEditBusiness = canManageMembers;
  const canManageCatalog = canManageMembers;
  const canManageOffers = canManageMembers;

  const isMember =
    viewerRole === "OWNER" || viewerRole === "ADMIN" || viewerRole === "STAFF";

  const canShowAddToContacts = !isMember;

  const hasBusinessContact = useMemo(() => {
    if (!canShowAddToContacts || !businessSlug) return false;
    return (businessContacts ?? []).some(
      (b: any) =>
        String(b?.slug || "").toLowerCase() === String(businessSlug).toLowerCase()
    );
  }, [canShowAddToContacts, businessSlug, businessContacts]);

  const availableInviteRoles = useMemo(() => {
    if (viewerRole === "OWNER") return ["STAFF", "ADMIN"] as const;
    if (viewerRole === "ADMIN") return ["STAFF"] as const;
    return [] as const;
  }, [viewerRole]);

  useEffect(() => {
    if (!businessSlug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await getBusinessPublicViewBySlug(businessSlug);
        if (cancelled) return;
        setCtx(c);

        const m = await getBusinessMembers((c as any).businessId ?? c.businessId);
        if (cancelled) return;
        setMembers(m);

        refreshCatalog().catch(() => {});
        refreshOffers(c).catch(() => {});
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load business");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessSlug]);

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

  const onAddBusinessToContacts = async () => {
    if (!businessSlug || !ctx) return;
    try {
      setAddingContact(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You need to be logged in.");

      await addContactByBusinessSlug(businessSlug, token);

      upsertBusinessContact({
        businessId: (ctx as any).businessId ?? ctx.businessId,
        slug: (ctx as any).slug ?? businessSlug,
        name: ctx.name,
        businessLogoUrl: businessLogoUrl(ctx),
        phone: (ctx as any).phone ?? null,
        email: (ctx as any).email ?? null,
      });

      setContactMenuOpen(false);
    } catch (e: any) {
      console.error("Failed to add business to contacts", e);
      setError(e?.message ?? "Failed to add to contacts");
    } finally {
      setAddingContact(false);
    }
  };

  const refreshMembers = async () => {
    if (!ctx) return;
    setSaving(true);
    try {
      setMembers(await getBusinessMembers((ctx as any).businessId ?? ctx.businessId));
    } finally {
      setSaving(false);
    }
  };

  const refreshCatalog = async () => {
    if (!businessSlug) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [p, b] = await Promise.all([
        listProductsForBusinessSlug(businessSlug, {
          active: undefined,
          limit: 200,
          offset: 0,
        }),
        listBundlesForBusinessSlug(businessSlug, {
          active: undefined,
          limit: 200,
          offset: 0,
        }),
      ]);
      setProducts(p ?? []);
      setBundles(b ?? []);
    } catch (e: any) {
      setCatalogError(e?.message ?? "Failed to load catalog");
    } finally {
      setCatalogLoading(false);
    }
  };

  const refreshOffers = async (businessCtx?: BusinessPublicViewDTO | null) => {
    const effectiveCtx = businessCtx ?? ctx;
    const actingBusinessId = (effectiveCtx as any)?.businessId ?? effectiveCtx?.businessId;
    if (!actingBusinessId) return;

    setOffersLoading(true);
    setOffersError(null);
    try {
      const rows = await listOfferTemplates(actingBusinessId);
      setOffers(rows ?? []);
    } catch (e: any) {
      setOffersError(e?.message ?? "Failed to load offer templates");
    } finally {
      setOffersLoading(false);
    }
  };

  const openProduct = async (productSlug: string) => {
    if (!businessSlug) return;
    setCatalogError(null);

    try {
      await getProductForBusinessSlug(businessSlug, productSlug);
      navigate(
        `/businesses/${encodeURIComponent(businessSlug)}/p/${encodeURIComponent(productSlug)}`
      );
    } catch (e: any) {
      console.error("openProduct failed", e);
      setCatalogError(e?.message ?? "Failed to open product");
    }
  };

  const onAddMembers = async (
    userIds: string[],
    role: "STAFF" | "ADMIN",
    designation: string
  ) => {
    if (!ctx) return;

    const existing = new Set(members.map((m) => String(m.userId)));

    const ids = Array.from(new Set(userIds.map((s) => s.trim()).filter(Boolean))).filter(
      (id) => !existing.has(id)
    );

    if (ids.length === 0) return;

    setSaving(true);
    try {
      let nextMembers = members;
      for (const uid of ids) {
        nextMembers = await assignBusinessMember(ctx.businessId, {
          targetUserId: uid,
          role,
          designation: designation.trim() || "Staff",
        });
      }
      setMembers(nextMembers);
    } finally {
      setSaving(false);
    }
  };

  const onChangeMember = async (uid: string, role: string, designation: string) => {
    if (!ctx) return;
    setSaving(true);
    try {
      setMembers(
        await changeMemberRoleOrDesignation((ctx as any).businessId ?? ctx.businessId, uid, {
          role,
          designation,
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const onRemoveMember = async (uid: string) => {
    if (!ctx) return;
    setSaving(true);
    try {
      setMembers(await removeBusinessMember((ctx as any).businessId ?? ctx.businessId, uid));
    } finally {
      setSaving(false);
    }
  };

  const onLeave = async () => {
    if (!ctx) return;
    setSaving(true);
    try {
      await leaveBusiness((ctx as any).businessId ?? ctx.businessId);
      navigate("/profile", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-page app-page--default">
        <div className="app-stack">
          <div className="card card--narrow" style={{ margin: "0 auto" }}>
            <p className="card-subtle">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="app-page app-page--default">
        <div className="app-stack">
          <div className="card card--narrow" style={{ margin: "0 auto" }}>
            <h1 className="card-title">Business not found</h1>
            <p className="card-subtle">This business link may be invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedMembers = members.slice().sort((a, b) => roleRank(b.role) - roleRank(a.role));
  const logoUrl = businessLogoUrl(ctx);

  return (
    <div className="app-page app-page--default">
      <div className="app-stack">
        <div className="card th-card">
          <div className="th-profile__header">
            <div className="th-profile__avatar" aria-label="Business logo">
              {logoUrl ? (
                <img src={logoUrl} alt={safeText(ctx.name)} />
              ) : (
                <div className="th-profile__avatarPlaceholder">
                  {initials(safeText(ctx.name))}
                </div>
              )}
            </div>

            <div className="th-profile__headText">
              <div className="th-profile__name">{safeText(ctx.name)}</div>
              <div className="th-profile__bio">
                {safeText((ctx as any).description ?? (ctx as any).bio)}
              </div>
            </div>

            <div className="th-profile__actions">
              {canShowAddToContacts && !hasBusinessContact && (
                <div ref={contactMenuRef} style={{ position: "relative", display: "inline-flex" }}>
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
                      aria-label="Business actions"
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
                        onClick={onAddBusinessToContacts}
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

              {canEditBusiness && (
                <button
                  className="btn btn--primary"
                  onClick={() =>
                    navigate(`/businesses/${(ctx as any).slug ?? (ctx as any).businessSlug}/edit`)
                  }
                >
                  Edit business
                </button>
              )}

              <button className="btn" onClick={() => navigate("/profile")}>
                Back to profile
              </button>
            </div>
          </div>

          <div className="th-divider" />

          <div className="bp-stripsRow">
            <button
              type="button"
              className="bp-memberStrip"
              onClick={() => {
                if (Date.now() < suppressOpenUntilRef.current) return;
                setMembersOpen(true);
              }}
              aria-label="Open members"
            >
              <div className="bp-memberStrip-avatars" aria-hidden="true">
                {sortedMembers.slice(0, 6).map((m) => {
                  const name = memberDisplayName(m);
                  return (
                    <div key={String(m.userId)} className="bp-miniAvatar" title={name}>
                      {m.profileImageUrl ? (
                        <img src={m.profileImageUrl} alt={name} />
                      ) : (
                        <span className="bp-miniAvatarText">{initials(name)}</span>
                      )}
                    </div>
                  );
                })}

                {sortedMembers.length > 6 && (
                  <div className="bp-miniAvatar bp-miniAvatar--more" title="More members">
                    <span className="bp-miniAvatarText">+{sortedMembers.length - 6}</span>
                  </div>
                )}
              </div>

              <div className="bp-memberStrip-label">
                Members
                <span className="bp-memberStrip-count">{sortedMembers.length}</span>
              </div>
            </button>

            <button
              type="button"
              className="bp-memberStrip"
              onClick={() => {
                if (Date.now() < suppressOpenUntilRef.current) return;
                setCatalogOpen(true);
                if (products.length === 0 && bundles.length === 0) {
                  refreshCatalog().catch(() => {});
                }
              }}
              aria-label="Open catalog"
            >
              <div className="bp-memberStrip-avatars" aria-hidden="true">
                {[
                  ...products.slice(0, 4).map((p) => ({
                    key: `p-${p.id}`,
                    label: p.name,
                    img: p.primaryImageUrl,
                    initials: initials(safeText(p.name)),
                  })),
                  ...bundles.slice(0, 2).map((b) => ({
                    key: `b-${b.id}`,
                    label: b.title,
                    img: b.items?.find((x) => !!x.primaryImageUrl)?.primaryImageUrl ?? null,
                    initials: initials(safeText(b.title)),
                  })),
                ]
                  .slice(0, 6)
                  .map((x) => (
                    <div key={x.key} className="bp-miniAvatar" title={x.label}>
                      {x.img ? (
                        <img src={x.img} alt={x.label} />
                      ) : (
                        <span className="bp-miniAvatarText">{x.initials}</span>
                      )}
                    </div>
                  ))}

                {products.length + bundles.length > 6 && (
                  <div className="bp-miniAvatar bp-miniAvatar--more" title="More items">
                    <span className="bp-miniAvatarText">
                      +{products.length + bundles.length - 6}
                    </span>
                  </div>
                )}
              </div>

              <div className="bp-memberStrip-label">
                Catalog
                <span className="bp-memberStrip-count">{products.length + bundles.length}</span>
              </div>
            </button>

            <button
              type="button"
              className="bp-memberStrip"
              onClick={() => {
                if (Date.now() < suppressOpenUntilRef.current) return;
                setOffersOpen(true);
                if (offers.length === 0) {
                  refreshOffers().catch(() => {});
                }
              }}
              aria-label="Open offer templates"
            >
              <div className="bp-memberStrip-avatars" aria-hidden="true">
                {offers.slice(0, 6).map((t) => {
                  const img = offerTemplatePreviewImage(t);
                  const title = safeText(t.templateTitle);
                  return (
                    <div key={String(t.offerTemplateId)} className="bp-miniAvatar" title={title}>
                      {img ? (
                        <img src={img} alt={title} />
                      ) : (
                        <span className="bp-miniAvatarText">{initials(title)}</span>
                      )}
                    </div>
                  );
                })}

                {offers.length > 6 && (
                  <div className="bp-miniAvatar bp-miniAvatar--more" title="More offers">
                    <span className="bp-miniAvatarText">+{offers.length - 6}</span>
                  </div>
                )}
              </div>

              <div className="bp-memberStrip-label">
                Offers
                <span className="bp-memberStrip-count">{offers.length}</span>
              </div>
            </button>
          </div>

          {error && (
            <>
              <div className="th-divider" />
              <div className="error-banner">{error}</div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={membersOpen}
        title="Members"
        onClose={() => setMembersOpen(false)}
        footer={
          isMember ? (
            <button className="btn" onClick={onLeave} disabled={saving}>
              Leave business
            </button>
          ) : null
        }
      >
        <MembersModalBody
          members={sortedMembers}
          canManage={canManageMembers}
          saving={saving}
          viewerRole={viewerRole}
          onRefresh={refreshMembers}
          onChangeMember={onChangeMember}
          onRemoveMember={onRemoveMember}
          availableInviteRoles={availableInviteRoles}
          onAddMembers={onAddMembers}
        />
      </Modal>

      <Modal
        open={catalogOpen}
        title="Catalog"
        onClose={() => {
          suppressOpens();
          setCatalogOpen(false);
        }}
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
            <button className="btn" onClick={() => refreshCatalog()} disabled={catalogLoading}>
              Refresh
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                suppressOpens();
                setCatalogOpen(false);
              }}
            >
              Close
            </button>
          </div>
        }
      >
        {catalogError && (
          <div className="th-text-muted" style={{ marginBottom: 10 }}>
            {catalogError}
          </div>
        )}

        {canManageCatalog && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                suppressOpens();
                setCatalogOpen(false);
                navigate(`/businesses/${encodeURIComponent(businessSlug!)}/products/new`);
              }}
            >
              + Add product
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                suppressOpens();
                setCatalogOpen(false);
                navigate(`/businesses/${encodeURIComponent(businessSlug!)}/bundles/new`);
              }}
            >
              + Add bundle
            </button>
          </div>
        )}

        {catalogLoading ? (
          <div className="th-text-muted">Loading catalog…</div>
        ) : (
          <div className="th-form">
            <div className="th-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>Products</div>
                <div className="th-text-muted">{products.length}</div>
              </div>

              {products.length === 0 ? (
                <div className="th-text-muted" style={{ marginTop: 10 }}>
                  No products yet.
                </div>
              ) : (
                <div className="th-form" style={{ marginTop: 10 }}>
                  {products.map((p) => (
                    <button
                      key={String(p.id)}
                      type="button"
                      className="th-item-card"
                      onClick={() => {
                        suppressOpens();
                        setCatalogOpen(false);
                        void openProduct(p.slug);
                      }}
                      style={{ cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                        {p.primaryImageUrl ? (
                          <img
                            src={p.primaryImageUrl}
                            alt={safeText(p.name)}
                            style={{
                              width: 44,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: 12,
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
                              borderRadius: 12,
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
                            {initials(safeText(p.name)).slice(0, 2)}
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
                            {safeText(p.name)}
                          </div>
                          <div className="th-text-muted" style={{ marginTop: 2 }}>
                            {safeText(p.kind)} • {p.isActive ? "ACTIVE" : "INACTIVE"} • {p.slug}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {canManageCatalog && (
                          <button
                            type="button"
                            className="btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              suppressOpens();
                              setCatalogOpen(false);
                              navigate(
                                `/businesses/${encodeURIComponent(
                                  businessSlug!
                                )}/products/${encodeURIComponent(p.slug)}/edit`
                              );
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <span className="th-text-muted" style={{ fontWeight: 900 }}>
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                <div style={{ fontWeight: 900, fontSize: 16 }}>Bundles</div>
                <div className="th-text-muted">{bundles.length}</div>
              </div>

              {bundles.length === 0 ? (
                <div className="th-text-muted" style={{ marginTop: 10 }}>
                  No bundles yet.
                </div>
              ) : (
                <div className="th-form" style={{ marginTop: 10 }}>
                  {bundles.map((b) => {
                    const img =
                      b.items?.find((x) => !!x.primaryImageUrl)?.primaryImageUrl ?? null;
                    return (
                      <button
                        key={String(b.id)}
                        type="button"
                        className="th-item-card"
                        onClick={() => {
                          suppressOpens();
                          setCatalogOpen(false);
                          navigate(
                            `/businesses/${encodeURIComponent(businessSlug!)}/b/${encodeURIComponent(
                              b.slug
                            )}`
                          );
                        }}
                        style={{ cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                          {img ? (
                            <img
                              src={img}
                              alt={safeText(b.title)}
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: 12,
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
                                borderRadius: 12,
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
                              {initials(safeText(b.title)).slice(0, 2)}
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
                              {safeText(b.title)}
                            </div>
                            <div className="th-text-muted" style={{ marginTop: 2 }}>
                              {b.items?.length ?? 0} item(s) • {b.isActive ? "ACTIVE" : "INACTIVE"} • {b.slug}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {canManageCatalog && (
                            <button
                              type="button"
                              className="btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                suppressOpens();
                                setCatalogOpen(false);
                                navigate(
                                  `/businesses/${encodeURIComponent(
                                    businessSlug!
                                  )}/bundles/${encodeURIComponent(b.slug)}/edit`
                                );
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <span className="th-text-muted" style={{ fontWeight: 900 }}>
                            →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={offersOpen}
        title="Offer templates"
        onClose={() => {
          suppressOpens();
          setOffersOpen(false);
        }}
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
            <button className="btn" onClick={() => refreshOffers()} disabled={offersLoading}>
              Refresh
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                suppressOpens();
                setOffersOpen(false);
              }}
            >
              Close
            </button>
          </div>
        }
      >
        {offersError && (
          <div className="th-text-muted" style={{ marginBottom: 10 }}>
            {offersError}
          </div>
        )}

        {canManageOffers && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                suppressOpens();
                setOffersOpen(false);
                navigate(`/businesses/${encodeURIComponent(businessSlug!)}/offers/new`);
              }}
            >
              + Add offer template
            </button>
          </div>
        )}

        {offersLoading ? (
          <div className="th-text-muted">Loading offer templates…</div>
        ) : (
          <div className="th-form">
            <div className="th-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>Templates</div>
                <div className="th-text-muted">{offers.length}</div>
              </div>

              {offers.length === 0 ? (
                <div className="th-text-muted" style={{ marginTop: 10 }}>
                  No offer templates yet.
                </div>
              ) : (
                <div className="th-form" style={{ marginTop: 10 }}>
                  {offers.map((t) => {
                    const img = offerTemplatePreviewImage(t);
                    const title = safeText(t.templateTitle);

                    return (
                      <button
                        key={String(t.offerTemplateId)}
                        type="button"
                        className="th-item-card"
                        onClick={() => {
                          suppressOpens();
                          setOffersOpen(false);
                          navigate(
                            `/businesses/${encodeURIComponent(
                              businessSlug!
                            )}/offers/${encodeURIComponent(t.offerTemplateId)}`
                          );
                        }}
                        style={{ cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                          {img ? (
                            <img
                              src={img}
                              alt={title}
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: 12,
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
                                borderRadius: 12,
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
                              {initials(title).slice(0, 2)}
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
                              {title}
                            </div>
                            <div className="th-text-muted" style={{ marginTop: 2 }}>
                              {offerTemplateKindLabel(t)} • {t.isActive ? "ACTIVE" : "INACTIVE"}
                              {t.claimPolicy ? ` • ${t.claimPolicy}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {canManageOffers && (
                            <button
                              type="button"
                              className="btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                suppressOpens();
                                setOffersOpen(false);
                                navigate(
                                  `/businesses/${encodeURIComponent(
                                    businessSlug!
                                  )}/offers/${encodeURIComponent(t.offerTemplateId)}/edit`
                                );
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <span className="th-text-muted" style={{ fontWeight: 900 }}>
                            →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BusinessPage;