// src/pages/GroupedReferralFeed.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../css/ReferralGrouping.css";

import type { MyReferralGroupsDTO, ReferralDTO, ReferralGroupDTO } from "../types/referral";
import { acceptReferral, cancelReferral, fetchMyReferralGroups, rejectReferral } from "../services/referralService";

import type { OpenReferralDTO, OpenReferralStatus } from "../types/openReferrals";
import { fetchMyOpenReferrals, updateOpenReferral } from "../services/openReferralService";

import ReferralCard from "../components/ReferralCard";

type NormalRole = "prospect" | "business" | "referrer";
type Primary =
  | { type: "open" }
  | { type: "normal"; role: NormalRole };

function roleLabel(role: ReferralGroupDTO["role"]) {
  if (role === "BUSINESS") return "You’re the business";
  if (role === "PROSPECT") return "You’re the prospect";
  if (role === "REFERRER") return "You’re the referrer";
  return String(role || "").toLowerCase();
}

function safeDateShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function snip(s?: string | null, max = 88) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function isPendingish(v: any) {
  const s = String(v || "").toUpperCase();
  return (
    s === "PENDING" ||
    s === "AWAITING" ||
    s === "AWAITING_RESPONSE" ||
    s === "ACTION_NEEDED" ||
    s === "REQUESTED"
  );
}

function actionNeededCount(group: ReferralGroupDTO) {
  const items = group.items || [];
  if (group.role === "PROSPECT") return items.filter((x: any) => isPendingish(x.prospectAcceptanceStatus)).length;
  if (group.role === "BUSINESS") return items.filter((x: any) => isPendingish(x.businessAcceptanceStatus)).length;
  return 0;
}

const GroupedReferralFeed: React.FC = () => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normal (grouped)
  const [groups, setGroups] = useState<MyReferralGroupsDTO | null>(null);
  const [selectedGroupKeyId, setSelectedGroupKeyId] = useState<string | null>(null);

  // Open referrals
  const [openReferrals, setOpenReferrals] = useState<OpenReferralDTO[]>([]);
  const [loadingOpen, setLoadingOpen] = useState(false);

  // Primary selection
  const [primary, setPrimary] = useState<Primary>({ type: "normal", role: "prospect" });

  const counts = useMemo(() => {
    return {
      prospect: groups?.asProspect?.length ?? 0,
      business: groups?.asBusiness?.length ?? 0,
      referrer: groups?.asReferrer?.length ?? 0,
    };
  }, [groups]);

  const tabsAvailable = useMemo(() => {
    const g = groups;
    return {
      business: !!g?.asBusiness?.length,
      prospect: !!g?.asProspect?.length,
      referrer: !!g?.asReferrer?.length,
    };
  }, [groups]);

  const chooseDefaultRole = (g: MyReferralGroupsDTO): NormalRole => {
    if (g.asProspect?.length) return "prospect";
    if (g.asBusiness?.length) return "business";
    if (g.asReferrer?.length) return "referrer";
    return "prospect";
  };

  const currentRole: NormalRole = primary.type === "normal" ? primary.role : "prospect";

  const currentGroupList: ReferralGroupDTO[] = useMemo(() => {
    if (!groups) return [];
    if (currentRole === "business") return groups.asBusiness || [];
    if (currentRole === "prospect") return groups.asProspect || [];
    return groups.asReferrer || [];
  }, [groups, currentRole]);

  const sortedGroupList = useMemo(() => {
    const copy = [...currentGroupList];
    copy.sort((a, b) => new Date(b.latestCreatedAt || 0).getTime() - new Date(a.latestCreatedAt || 0).getTime());
    return copy;
  }, [currentGroupList]);

  const selectedGroup: ReferralGroupDTO | null = useMemo(() => {
    if (!sortedGroupList.length) return null;
    if (!selectedGroupKeyId) return sortedGroupList[0];
    return sortedGroupList.find((g) => g.groupKeyId === selectedGroupKeyId) ?? sortedGroupList[0];
  }, [selectedGroupKeyId, sortedGroupList]);

  const selectedReferrals: ReferralDTO[] = useMemo(() => {
    const items = selectedGroup?.items || [];
    const copy = [...items];
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [selectedGroup]);

  // HERO metrics: unique referral count across all roles (dedupe by id)
  const heroMetrics = useMemo(() => {
    const all = [
      ...(groups?.asProspect || []),
      ...(groups?.asBusiness || []),
      ...(groups?.asReferrer || []),
    ];

    const unique = new Map<string, ReferralDTO>();
    for (const g of all) {
      for (const r of g.items || []) {
        if (r?.id) unique.set(r.id, r);
      }
    }

    const total = unique.size;
    const waiting = Array.from(unique.values()).filter((r: any) => {
      const s = String(r?.status || "").toUpperCase();
      return s === "PENDING" || s === "PARTIALLY_ACCEPTED" || s === "AWAITING_RESPONSE";
    }).length;

    const accepted = Array.from(unique.values()).filter((r: any) => String(r?.status || "").toUpperCase() === "ACCEPTED").length;

    const actionNeeded =
      (groups?.asProspect || []).reduce((acc, g) => acc + actionNeededCount(g), 0) +
      (groups?.asBusiness || []).reduce((acc, g) => acc + actionNeededCount(g), 0);

    return { total, accepted, waiting, actionNeeded };
  }, [groups]);

  const loadOpenReferrals = async (t: string) => {
    try {
      setLoadingOpen(true);
      const data = await fetchMyOpenReferrals(t);
      setOpenReferrals(data || []);
    } catch (err) {
      console.error("Error fetching open referrals:", err);
    } finally {
      setLoadingOpen(false);
    }
  };

  const refreshGroups = async (t: string) => {
    const data = await fetchMyReferralGroups(t);
    setGroups(data);

    // keep role if possible, otherwise choose default
    const nextRole = (() => {
      if (primary.type === "normal") {
        if (primary.role === "prospect" && data.asProspect?.length) return "prospect" as const;
        if (primary.role === "business" && data.asBusiness?.length) return "business" as const;
        if (primary.role === "referrer" && data.asReferrer?.length) return "referrer" as const;
      }
      return chooseDefaultRole(data);
    })();

    // If currently normal, ensure role valid
    setPrimary((prev) => {
      if (prev.type === "open") return prev;
      return { type: "normal", role: nextRole };
    });

    // Ensure group selection valid for new role
    const list =
      nextRole === "prospect"
        ? data.asProspect || []
        : nextRole === "business"
          ? data.asBusiness || []
          : data.asReferrer || [];

    const sorted = [...list].sort(
      (a, b) => new Date(b.latestCreatedAt || 0).getTime() - new Date(a.latestCreatedAt || 0).getTime()
    );

    if (!sorted.length) {
      setSelectedGroupKeyId(null);
      return;
    }

    if (!selectedGroupKeyId || !sorted.some((g) => g.groupKeyId === selectedGroupKeyId)) {
      setSelectedGroupKeyId(sorted[0].groupKeyId);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token || !session.user?.id) {
          setLoading(false);
          setError("You’re not logged in.");
          return;
        }

        setUserId(session.user.id);
        setToken(session.access_token);

        await refreshGroups(session.access_token);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load referrals.");
      } finally {
        setLoading(false);
      }
    };

    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy-load open referrals when switching to Open
  useEffect(() => {
    if (primary.type !== "open") return;
    if (!token) return;
    // refresh every time you enter open (feels more “inbox” than stale)
    void loadOpenReferrals(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary.type, token]);

  const handleAccept = async (id: string) => {
    if (!token) return;
    await acceptReferral(token, id);
    await refreshGroups(token);
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    await rejectReferral(token, id);
    await refreshGroups(token);
  };

  const handleCancel = async (id: string) => {
    if (!token) return;
    await cancelReferral(token, id);
    await refreshGroups(token);
  };

  const handleCopyReferralLink = (slug: string) => {
    if (!slug) return;
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url).catch((err) => console.error("Failed to copy referral link", err));
  };

  const handleCopyOpenReferralLink = (slug?: string | null) => {
    if (!slug) return;
    const url = `${window.location.origin}/open/${slug}`;
    navigator.clipboard.writeText(url).catch((err) => console.error("Failed to copy open referral link", err));
  };

  const handleToggleOpenReferralStatus = async (o: OpenReferralDTO) => {
    if (!token) return;
    const id = o.id;
    if (!id) return;

    const current: OpenReferralStatus = (o.status || "ACTIVE") as OpenReferralStatus;
    const next: OpenReferralStatus = current === "ACTIVE" ? "PAUSED" : "ACTIVE";

    try {
      await updateOpenReferral(id, { status: next }, token);
      await loadOpenReferrals(token);
    } catch (err) {
      console.error("Error updating open referral status:", err);
    }
  };

  const handleRefresh = async () => {
    if (!token) return;
    if (primary.type === "open") {
      await loadOpenReferrals(token);
    } else {
      await refreshGroups(token);
    }
  };

  const renderGroupRow = (g: ReferralGroupDTO) => {
    const title = g.groupTitle?.trim() || "Group";
    const needs = actionNeededCount(g);
    const isSelected = g.groupKeyId === (selectedGroup?.groupKeyId ?? null);

    return (
      <div
        key={`${g.role}:${g.groupKeyId}`}
        className={`th-grouprow ${isSelected ? "is-selected" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedGroupKeyId(g.groupKeyId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedGroupKeyId(g.groupKeyId);
          }
        }}
      >
        <div className="th-grouprow__avatar">
          {g.groupImageUrl ? (
            <img src={g.groupImageUrl} alt={title} className="th-grouprow__avatarImg" />
          ) : (
            <div className="th-grouprow__avatarFallback" aria-hidden="true">
              {title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="th-grouprow__body">
          <div className="th-grouprow__top">
            <div className="th-grouprow__title" title={title}>
              {title}
            </div>
            <div className="th-grouprow__time">{safeDateShort(g.latestCreatedAt)}</div>
          </div>

          <div className="th-grouprow__chips">
            <span className="th-chip th-chip--info">{roleLabel(g.role)}</span>
            <span className="th-chip">
              {g.count} referral{g.count === 1 ? "" : "s"}
            </span>
            {needs > 0 ? <span className="th-chip th-chip--warn">{needs} need action</span> : null}
          </div>
        </div>
      </div>
    );
  };


  const renderOpenReferralCard = (o: OpenReferralDTO) => {
    const { id, slug, business, product, bundle } = o;

    const status: string = (o.status || "ACTIVE").toString();
    const statusUpper = status.toUpperCase();
    const isActive = statusUpper === "ACTIVE";
    const toggleLabel = isActive ? "Pause link" : "Activate link";

    const businessName =
      business.businessName || `${business.firstName ?? ""} ${business.lastName ?? ""}`.trim() || "Business";
    const avatarUrl = business.profileImageUrl || null;

    const productName = product?.name ?? null;
    const bundleTitle = bundle?.title ?? null;

    return (
      <div key={id || slug} className="card th-openCard">
        <div className="th-row th-between" style={{ marginBottom: 6 }}>
          <div className="th-row th-middle" style={{ gap: 10 }}>
            {avatarUrl ? <img src={avatarUrl} alt={businessName} className="avatar avatar--sm" /> : null}
            <div style={{ minWidth: 0 }}>
              <div className="th-label">Open referral</div>
              <div className="ref-card__title" style={{ marginTop: 2 }}>
                {o.title?.trim() || businessName}
              </div>
              <div className="th-muted" style={{ fontSize: 12, marginTop: 2 }}>
                {snip(o.message || "", 120)}
              </div>
              {productName || bundleTitle ? (
                <div className="th-muted" style={{ marginTop: 6, fontSize: 12 }}>
                  {productName ? <span>Product: {productName}</span> : null}
                  {productName && bundleTitle ? <span> • </span> : null}
                  {bundleTitle ? <span>Bundle: {bundleTitle}</span> : null}
                </div>
              ) : null}
            </div>
          </div>

          <span className={`status-pill status-pill--${status.toLowerCase()}`}>{statusUpper}</span>
        </div>

        <div className="th-row th-between th-middle" style={{ marginTop: 10 }}>
          <div className="th-muted" style={{ fontSize: 12 }}>
            Created {o.createdAt ? new Date(o.createdAt).toLocaleString() : "recently"}
          </div>

          <div className="th-row" style={{ gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={() => handleCopyOpenReferralLink(slug)}>
              Copy link
            </button>
            <button type="button" className="btn" onClick={() => slug && navigate(`/open/${slug}`)}>
              Preview
            </button>
            {id ? (
              <button type="button" className="btn btn--ghost" onClick={() => handleToggleOpenReferralStatus(o)}>
                {toggleLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error-banner">{error}</div>;

  const showMiddle = primary.type === "normal";

  return (
    <div className="th-inboxPage">
      {/* HERO (compact, full-width, uses screen better) */}
      <section className="th-inboxHero">
        <div className="th-inboxHero__copy">
          <div className="th-inboxHero__eyebrow">REFERRALS • OFFERS • REWARDS</div>
          <h1 className="th-inboxHero__title">
            Referrals made simple.
            <br />
            Rewards made real.
          </h1>

          <p className="th-inboxHero__sub">
            Track every recommendation you make, see who has responded, and jump into the live thread with a single click.
            When the right people connect, everyone wins.
          </p>

          <div className="th-inboxHero__actions">
            <button type="button" className="btn" onClick={() => navigate("/referrals/new")}>
              + New referral
            </button>
            <button type="button" className="btn" onClick={() => navigate("/referrals/new?mode=open")}>
              + New open referral
            </button>
            <button type="button" className="btn" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </div>

        <aside className="th-inboxHero__panel">
          <div className="th-inboxHero__panelTitle">Your referral snapshot</div>
          <div className="th-inboxHero__metrics">
            <div className="th-inboxMetric">
              <div className="th-inboxMetric__label">Total</div>
              <div className="th-inboxMetric__value">{heroMetrics.total}</div>
            </div>
            <div className="th-inboxMetric">
              <div className="th-inboxMetric__label">Accepted</div>
              <div className="th-inboxMetric__value">{heroMetrics.accepted}</div>
            </div>
            <div className="th-inboxMetric">
              <div className="th-inboxMetric__label">Waiting</div>
              <div className="th-inboxMetric__value">{heroMetrics.waiting}</div>
            </div>
            <div className="th-inboxMetric">
              <div className="th-inboxMetric__label">Need action</div>
              <div className="th-inboxMetric__value">{heroMetrics.actionNeeded}</div>
            </div>
          </div>

          <div className="th-inboxHero__hint">
            Tip: Use the left column to switch roles. Use the middle column to pick a group.
          </div>
        </aside>
      </section>

      {/* GRID */}
      <div className={`th-inboxGrid ${showMiddle ? "is-3col" : "is-2col"}`}>
        {/* LEFT */}
        <div className="th-inboxCol th-inboxCol--nav">
          <div className="th-inboxCol__header">Inbox</div>

          <button
            type="button"
            className={`th-navItem ${primary.type === "open" ? "is-active" : ""}`}
            onClick={() => setPrimary({ type: "open" })}
          >
            <span className="th-navItem__label">Open referrals</span>
            <span className="th-navItem__count">{openReferrals.length || 0}</span>
          </button>

          <div className="th-navSectionTitle">Normal referrals</div>

          <button
            type="button"
            className={`th-navItem ${primary.type === "normal" && primary.role === "prospect" ? "is-active" : ""}`}
            onClick={() => {
              setPrimary({ type: "normal", role: "prospect" });
              setSelectedGroupKeyId(null);
            }}
            disabled={!tabsAvailable.prospect}
          >
            <span className="th-navItem__label">As Prospect</span>
            <span className="th-navItem__count">{counts.prospect}</span>
          </button>

          <button
            type="button"
            className={`th-navItem ${primary.type === "normal" && primary.role === "business" ? "is-active" : ""}`}
            onClick={() => {
              setPrimary({ type: "normal", role: "business" });
              setSelectedGroupKeyId(null);
            }}
            disabled={!tabsAvailable.business}
          >
            <span className="th-navItem__label">As Business</span>
            <span className="th-navItem__count">{counts.business}</span>
          </button>

          <button
            type="button"
            className={`th-navItem ${primary.type === "normal" && primary.role === "referrer" ? "is-active" : ""}`}
            onClick={() => {
              setPrimary({ type: "normal", role: "referrer" });
              setSelectedGroupKeyId(null);
            }}
            disabled={!tabsAvailable.referrer}
          >
            <span className="th-navItem__label">As Referrer</span>
            <span className="th-navItem__count">{counts.referrer}</span>
          </button>

          <div className="th-navActions">
            <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={() => navigate("/referrals/new")}>
              + New referral
            </button>
            <button type="button" className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => navigate("/referrals/new?mode=open")}>
              + New open referral
            </button>
          </div>
        </div>

        {/* MIDDLE */}
        {showMiddle ? (
          <div className="th-inboxCol th-inboxCol--list">
            <div className="th-inboxCol__header">Groups ({sortedGroupList.length})</div>

            <div className="th-inboxCol__scroll">
              {sortedGroupList.length === 0 ? (
                <div className="th-empty">
                  <div className="th-empty__title">No referrals yet</div>
                  <div className="th-empty__sub">
                    When you get referred, refer others, or receive prospects as a business, they’ll show up here.
                  </div>
                </div>
              ) : (
                sortedGroupList.map(renderGroupRow)
              )}
            </div>
          </div>
        ) : null}

        {/* RIGHT */}
        <div className="th-inboxCol th-inboxCol--detail">
          <div className="th-inboxCol__header">
            {primary.type === "open" ? "Open referrals" : selectedGroup?.groupTitle?.trim() || "Select a group"}
            <div className="th-inboxCol__sub">
              {primary.type === "open"
                ? "Shareable links you’ve published. No grouping applies here."
                : selectedGroup
                  ? `${selectedGroup.count} referral${selectedGroup.count === 1 ? "" : "s"} in this group`
                  : "Pick a group from the middle column."}
            </div>
          </div>

          <div className="th-inboxCol__scroll th-inboxCol__pad">
            {primary.type === "open" ? (
              loadingOpen && !openReferrals.length ? (
                <div className="card">
                  <p className="th-muted">Loading open referrals…</p>
                </div>
              ) : openReferrals.length === 0 ? (
                <div className="card">
                  <div style={{ fontWeight: 800 }}>No open referrals yet</div>
                  <div className="th-muted" style={{ marginTop: 6 }}>
                    Create an open referral for your business and share it anywhere.
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ marginTop: 10 }}
                    onClick={() => navigate("/referrals/new?mode=open")}
                  >
                    Create your first open referral
                  </button>
                </div>
              ) : (
                openReferrals.map(renderOpenReferralCard)
              )
            ) : !selectedGroup ? (
              <div className="card">
                <div style={{ fontWeight: 800 }}>No group selected</div>
                <div className="th-muted" style={{ marginTop: 6 }}>
                  Choose a group from the middle column to see its referrals.
                </div>
              </div>
            ) : selectedReferrals.length === 0 ? (
              <div className="card">
                <div style={{ fontWeight: 800 }}>No referrals in this group</div>
                <div className="th-muted" style={{ marginTop: 6 }}>
                  This group is empty (unexpected). Try Refresh.
                </div>
              </div>
            ) : (
              selectedReferrals.map((r) => (
                <div key={r.id} style={{ marginBottom: 12 }}>
                  <ReferralCard
                    referral={r}
                    userId={userId || ""}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onCancel={handleCancel}
                    onCopyReferralLink={r.slug ? () => handleCopyReferralLink(r.slug) : undefined}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupedReferralFeed;
