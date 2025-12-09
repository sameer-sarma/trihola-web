// src/pages/ReferralFeed.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ReferralDTO } from "../types/referral";
import {
  fetchMyReferrals,
  acceptReferral,
  rejectReferral,
  cancelReferral,
} from "../services/referralService";
import {
  fetchMyOpenReferrals,
  updateOpenReferral,
} from "../services/openReferralService";
import type { OpenReferralDTO,  OpenReferralStatus, UpdateOpenReferralRequest } from "../types/openReferrals";
import ReferralCard from "../components/ReferralCard";

const ReferralFeed: React.FC = () => {
  const [referrals, setReferrals] = useState<ReferralDTO[]>([]);
  const [openReferrals, setOpenReferrals] = useState<OpenReferralDTO[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "open">("overview");

  // edit state for open referrals
  const [editingOpenId, setEditingOpenId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editStatus, setEditStatus] = useState<OpenReferralStatus>("ACTIVE");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editMaxUses, setEditMaxUses] = useState<string>("");
  const [editMaxUsesEnabled, setEditMaxUsesEnabled] = useState<boolean>(false);
  
  const navigate = useNavigate();

  const loadReferrals = async (token: string) => {
    try {
      const data = await fetchMyReferrals(token);
      setReferrals(data);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOpenReferrals = async (token: string) => {
    try {
      setLoadingOpen(true);
      const data = await fetchMyOpenReferrals(token);
      setOpenReferrals(data || []);
    } catch (err) {
      console.error("Error fetching open referrals:", err);
    } finally {
      setLoadingOpen(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token && session.user?.id) {
        setAccessToken(session.access_token);
        setUserId(session.user.id);
        await loadReferrals(session.access_token);
      } else {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // When switching to "Open referrals" tab, lazy-load the list
  useEffect(() => {
    if (activeTab === "open" && accessToken) {
      if (!openReferrals.length) {
        void loadOpenReferrals(accessToken);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, accessToken]);

  const handleAccept = async (id: string) => {
    if (!accessToken) return;
    await acceptReferral(accessToken, id);
    await loadReferrals(accessToken);
  };

  const handleReject = async (id: string) => {
    if (!accessToken) return;
    await rejectReferral(accessToken, id);
    await loadReferrals(accessToken);
  };

  const handleCancel = async (id: string) => {
    if (!accessToken) return;
    try {
      await cancelReferral(accessToken, id);
      await loadReferrals(accessToken);
    } catch (err) {
      console.error("Error cancelling referral:", err);
    }
  };

  const handleCopyReferralLink = (slug: string) => {
    if (!slug) return;
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url).catch((err) => {
      console.error("Failed to copy referral link", err);
    });
  };

  const handleCopyOpenReferralLink = (slug: string | undefined | null) => {
    if (!slug) return;
    const url = `${window.location.origin}/open/${slug}`;
    navigator.clipboard.writeText(url).catch((err) => {
      console.error("Failed to copy open referral link", err);
    });
  };

  const handleToggleOpenReferralStatus = async (o: OpenReferralDTO) => {
    if (!accessToken) return;

    const id = o.id;
    if (!id) return;

    const currentStatus: OpenReferralStatus = (o.status || "ACTIVE") as OpenReferralStatus;
    const nextStatus: OpenReferralStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

    try {
      await updateOpenReferral(id, { status: nextStatus }, accessToken);
      await loadOpenReferrals(accessToken);
    } catch (err) {
      console.error("Error updating open referral status:", err);
    }
  };

  // start editing a specific open referral
  const startEditOpenReferral = (o: OpenReferralDTO) => {
    setEditingOpenId(o.id);
    setEditTitle(o.title ?? "");
    setEditMessage(o.message ?? "");
    setEditStatus((o.status || "ACTIVE") as OpenReferralStatus);
    setEditError(null);
      // maxUses
    if (o.maxUses != null && o.maxUses !== undefined) {
      setEditMaxUses(String(o.maxUses));
      setEditMaxUsesEnabled(true);
    } else {
      setEditMaxUses("");
      setEditMaxUsesEnabled(false); // "No limit"
    }
    };

  const cancelEditOpenReferral = () => {
    setEditingOpenId(null);
    setEditSaving(false);
    setEditError(null);
    setEditMaxUses("");
    setEditMaxUsesEnabled(false);
  };

  const handleSaveOpenReferralEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpenId || !accessToken) return;

    try {
      setEditSaving(true);
      setEditError(null);

      let maxUsesPayload: number | null = null;

      if (editMaxUsesEnabled && editMaxUses.trim()) {
        const parsed = Number.parseInt(editMaxUses.trim(), 10);
        maxUsesPayload = Number.isNaN(parsed) ? null : parsed;
      } else {
        // checkbox says "No limit" → null
        maxUsesPayload = null;
      }

      const payload: UpdateOpenReferralRequest = {
        title: editTitle.trim() || undefined,
        message: editMessage.trim() || undefined,
        status: editStatus, // already typed as OpenReferralStatus
        maxUses: maxUsesPayload,
      };

      await updateOpenReferral(editingOpenId, payload, accessToken);
      await loadOpenReferrals(accessToken);
      cancelEditOpenReferral();
    } catch (err: any) {
      console.error("Failed to update open referral", err);
      setEditError(
        err?.message || "Failed to save changes. Please try again."
      );
    } finally {
      setEditSaving(false);
    }
  };

  // Simple, friendly metrics for the hero
  const totalReferrals = referrals.length;
  const acceptedCount = referrals.filter(
    (r) => r.status === "ACCEPTED"
  ).length;
  const waitingCount = referrals.filter(
    (r) => r.status === "PENDING" || r.status === "PARTIALLY_ACCEPTED"
  ).length;

  // Helper to render each open referral card with new business mini
  const renderOpenReferralCard = (o: OpenReferralDTO) => {
    const { id, slug, business, product, bundle } = o;

    const status: string = (o.status || "ACTIVE").toString();
    const createdAt = o.createdAt || "";
    const note = o.message || "";

    const businessName =
      business.businessName ||
      `${business.firstName ?? ""} ${business.lastName ?? ""}`.trim() ||
      "Business";

    const avatarUrl = business.profileImageUrl || null;
    const businessSlug = business.businessSlug || business.slug || null;

    const productName = product?.name ?? null;
    const bundleTitle = bundle?.title ?? null;

    const statusUpper = status.toUpperCase();
    const isActive = statusUpper === "ACTIVE";
    const statusToggleLabel = isActive ? "Pause link" : "Activate link";

    const title = o.title || "";

    return (
      <div key={id || slug} className="card">
        <div className="th-row th-between" style={{ marginBottom: 6 }}>
          <div className="th-row th-middle" style={{ gap: 8 }}>
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={businessName}
                className="avatar avatar--sm"
              />
            )}
            <div>
              <div className="th-label">Open referral</div>
              <h3 style={{ margin: "4px 0" }}>{businessName}</h3>
              {businessSlug && (
                <div className="th-muted" style={{ fontSize: 12 }}>
                  @{businessSlug}
                </div>
              )}
            </div>
          </div>
          <span
            className={`status-pill status-pill--${status.toLowerCase()}`}
          >
            {statusUpper}
          </span>
        </div>

        {title && (
          <p
            style={{
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            {title}
          </p>
        )}

        {productName || bundleTitle ? (
          <div className="th-muted" style={{ marginBottom: 6 }}>
            {productName && <span>Product: {productName}</span>}
            {productName && bundleTitle && <span> • </span>}
            {bundleTitle && <span>Bundle: {bundleTitle}</span>}
          </div>
        ) : null}

        {note && (
          <p className="th-muted" style={{ marginBottom: 6 }}>
            {note}
          </p>
        )}

        <div className="th-row th-between th-middle" style={{ marginTop: 8 }}>
          <div className="th-muted" style={{ fontSize: 12 }}>
            Created{" "}
            {createdAt
              ? new Date(createdAt).toLocaleString()
              : "recently"}
          </div>
          <div className="th-row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => handleCopyOpenReferralLink(slug)}
            >
              Copy link
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                slug && navigate(`/open/${slug}`)
              }
            >
              Preview
            </button>
            {id && (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => handleToggleOpenReferralStatus(o)}
                >
                  {statusToggleLabel}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => startEditOpenReferral(o)}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="referrals-page">
      {/* Hero – aligns with home page look & feel */}
      <section className="referrals-hero-card">
        <div className="referrals-hero-copy-block">
          <div className="referrals-hero-eyebrow">
            REFERRALS • OFFERS • REWARDS
          </div>
          <h1 className="referrals-hero-title">
            Referrals made simple.
            <br />
            Rewards made real.
          </h1>
          <p className="referrals-hero-copy">
            Track every recommendation you make, see who has responded,
            and jump into the live thread with a single click. When the
            right people connect, everyone wins.
          </p>

          <div className="referrals-hero-actions">
            <button
              onClick={() => navigate("/referrals/new")}
              className="btn btn--primary"
            >
              + New referral
            </button>
            <button
              onClick={() => navigate("/referrals/new?mode=open")}
              className="btn"
            >
              + New open referral
            </button>
            <span className="hero-note">
              Share a referral link, or publish an open referral that
              anyone can claim — then continue the conversation in a
              WhatsApp-style thread.
            </span>
          </div>
        </div>

        <aside className="referrals-hero-panel">
          <div className="referrals-hero-panel-title">
            Your referral snapshot
          </div>
          <div className="referrals-hero-metrics">
            <div className="referrals-metric">
              <div className="referrals-metric-label">
                Total referrals
              </div>
              <div className="referrals-metric-value">
                {totalReferrals}
              </div>
            </div>
            <div className="referrals-metric">
              <div className="referrals-metric-label">Accepted</div>
              <div className="referrals-metric-value">
                {acceptedCount}
              </div>
            </div>
            <div className="referrals-metric">
              <div className="referrals-metric-label">
                Waiting on reply
              </div>
              <div className="referrals-metric-value">
                {waitingCount}
              </div>
            </div>
          </div>
          <p className="referrals-hero-footnote">
            Click any referral below to open the live thread — all
            messages, offers, and claim activity in one place.
          </p>
        </aside>
      </section>

      {/* Tabs: Overview / Open referrals */}
      <div className="th-tabs" style={{ marginTop: 24, marginBottom: 12 }}>
        <button
          className={`th-tab ${
            activeTab === "overview" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`th-tab ${
            activeTab === "open" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("open")}
        >
          Open referrals
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <section className="referrals-list-section">
          <div className="referrals-list-header">
            <div>
              <h2 className="referrals-list-title">Your referrals</h2>
              <p className="referrals-list-subtitle">
                Every referral you&apos;re part of — as referrer,
                prospect, or business — shown as a timeline card.
              </p>
            </div>
            <button
              onClick={() => navigate("/referrals/new")}
              className="btn btn--ghost"
            >
              + New referral
            </button>
          </div>

          {loading ? (
            <div className="card">
              <p className="th-muted">Loading referrals…</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="card">
              <h3 style={{ margin: "0 0 6px" }}>No referrals yet</h3>
              <p
                className="th-muted"
                style={{ marginBottom: 12 }}
              >
                Start by sending your first referral. We’ll keep track of
                the conversation and rewards for you.
              </p>
              <button
                onClick={() => navigate("/referrals/new")}
                className="btn btn--primary"
              >
                Create your first referral
              </button>
            </div>
          ) : (
            <div className="th-stack">
              {referrals.map((ref) => (
                <ReferralCard
                  key={ref.id}
                  referral={ref}
                  userId={userId ?? ""}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCancel={handleCancel}
                  onCopyReferralLink={
                    ref.slug
                      ? () => handleCopyReferralLink(ref.slug)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* OPEN REFERRALS TAB */}
      {activeTab === "open" && (
        <section className="referrals-list-section">
          <div className="referrals-list-header">
            <div>
              <h2 className="referrals-list-title">
                Your open referrals
              </h2>
              <p className="referrals-list-subtitle">
                Open referral links you&apos;ve published as a business
                or affiliate. Share these anywhere — people can claim a
                referral from the public page.
              </p>
            </div>
            <button
              onClick={() => navigate("/referrals/new?mode=open")}
              className="btn btn--ghost"
            >
              + New open referral
            </button>
          </div>

          {/* Inline edit panel */}
          {editingOpenId && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Edit open referral</h3>
              <form
                onSubmit={handleSaveOpenReferralEdit}
                className="crf"
                noValidate
              >
                <div className="crf-note">
                  <label htmlFor="edit-open-title">Title (optional)</label>
                  <input
                    id="edit-open-title"
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="crf-note">
                  <label htmlFor="edit-open-message">
                    Message (optional)
                  </label>
                  <textarea
                    id="edit-open-message"
                    className="textarea"
                    rows={3}
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                  />
                </div>

                <div className="crf-note">
                  <label htmlFor="edit-open-status">Status</label>
                  <select
                    id="edit-open-status"
                    className="input"
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as OpenReferralStatus)
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="DRAFT">Draft</option>
                    <option value="EXHAUSTED">Exhausted</option>
                  </select>
                  <p className="th-help">
                    Active links can be used immediately. Paused/Draft links
                    won&apos;t accept new referrals.
                  </p>
                </div>

                <div className="crf-note">
                  <label htmlFor="edit-open-max-uses">Max uses</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      id="edit-open-max-uses"
                      type="number"
                      min={1}
                      className="input"
                      style={{ flex: "0 0 160px" }}
                      value={editMaxUses}
                      onChange={(e) => setEditMaxUses(e.target.value)}
                      disabled={!editMaxUsesEnabled}
                      placeholder="10"
                    />
                    <label
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <input
                        type="checkbox"
                        checked={!editMaxUsesEnabled}
                        onChange={(e) => {
                          const noLimit = e.target.checked;
                          setEditMaxUsesEnabled(!noLimit);
                          if (noLimit) {
                            setEditMaxUses("");
                          }
                        }}
                      />
                      <span>No limit</span>
                    </label>
                  </div>
                </div>

                {editError && <p className="crf-msg err">{editError}</p>}

                <div className="th-row th-between">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={cancelEditOpenReferral}
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={editSaving}
                  >
                    {editSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loadingOpen && !openReferrals.length ? (
            <div className="card">
              <p className="th-muted">Loading open referrals…</p>
            </div>
          ) : openReferrals.length === 0 ? (
            <div className="card">
              <h3 style={{ margin: "0 0 6px" }}>
                No open referrals yet
              </h3>
              <p
                className="th-muted"
                style={{ marginBottom: 12 }}
              >
                Create an open referral for your business and share the
                link on WhatsApp, email, or social. Anyone who clicks
                can claim the referral.
              </p>
              <button
                onClick={() => navigate("/referrals/new?mode=open")}
                className="btn btn--primary"
              >
                Create your first open referral
              </button>
            </div>
          ) : (
            <div className="th-stack">
              {openReferrals.map(renderOpenReferralCard)}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ReferralFeed;
