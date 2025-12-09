import React, { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

import { useInviteThread } from "../queries/inviteThreadQueries";
import {
  useInviteDetail,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
} from "../queries/campaignInvitesQueries";
import {
  fetchOpenReferralForInvite,
  createOpenReferral,
  updateOpenReferral,
} from "../services/openReferralService";
import type {
  CreateOpenReferralRequest,
  OpenReferralDTO,
} from "../types/openReferrals";
import type { InviteThreadEventDTO } from "../types/invites";
import CampaignOfferCard from "../components/CampaignOfferCard";
import ScopeCard from "../components/ScopeCard";
import SendReferralPanel from "../components/SendReferralPanel";
import MessageBubble from "../components/MessageBubble"; // same path as in ReferralThread
import "../css/Thread.css";

const InviteThreadPage: React.FC = () => {
  const { campaignId, inviteId } = useParams<{
    campaignId: string;
    inviteId: string;
  }>();

  // --- Auth: get Supabase session token once ---
  const [token, setToken] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | undefined>();
  const [showSendReferralPanel, setShowSendReferralPanel] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);

  // Open referral state
  const [openReferral, setOpenReferral] = useState<OpenReferralDTO | null>(null);
  const [affiliateLink, setAffiliateLink] = useState<string | null>(null);
  const [isLoadingOpenReferral, setIsLoadingOpenReferral] = useState(false);

  // Editor modal state (create or edit)
  const [showOpenReferralEditor, setShowOpenReferralEditor] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [isSavingOpenReferral, setIsSavingOpenReferral] = useState(false);
  const [openReferralError, setOpenReferralError] = useState<string | null>(
    null
  );

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const session = data.session;
        setToken(session?.access_token);
        setUserId(session?.user?.id);
      })
      .catch(() => {
        setToken(undefined);
        setUserId(undefined);
      });
  }, []);

  // --- Invite & campaign header data ---
  const {
    data: inviteDetail,
    isLoading: headerLoading,
    error: headerError,
    refetch: refetchInviteDetail,
  } = useInviteDetail(campaignId, inviteId, token);

  const campaign = inviteDetail?.snapshot.campaign;
  const invite = inviteDetail?.invite;
  const rewards = inviteDetail?.snapshot.rewards;
  
  const themeColor = (campaign as any)?.themeColor as string | undefined;
  const affiliateHeadline = (campaign as any)
    ?.affiliateHeadline as string | undefined;
  const affiliateSubheading = (campaign as any)
    ?.affiliateSubheading as string | undefined;
  const prospectDescriptionShort = (campaign as any)
    ?.prospectDescriptionShort as string | undefined;

    // Role / permissions from backend
  const myRole = inviteDetail?.myParticipantRole; // "BUSINESS" | "AFFILIATE" | null
  const isAffiliate = myRole === "AFFILIATE";
  const isBusiness = myRole === "BUSINESS";
  const canSend = inviteDetail?.canSendReferrals === true;
  const status = invite?.status;

// Offer + policy for both roles
const offerLinks = rewards?.offer ? [rewards.offer] : undefined;

// Normalise affiliate policy to the shape CampaignOfferCard expects
const affiliatePolicy =
  (rewards?.affiliatePolicy as
    | {
        pointsPerCampaignReferral?: number;
        pointsPerCampaignReferralAcceptance?: number;
        percentOfCampaignReferralProspectPurchase?: number;
        maxPointsPerProspectPurchase?: number;
        isActive?: boolean;
      }
    | null
    | undefined) ?? undefined;

  // Invitee / business names
  const inviteeName =
    invite?.recipient?.firstName ||
    invite?.recipient?.businessName ||
    "your contact";

  const businessName = invite?.business?.businessName ?? "this business";

  const affiliateName =
    invite?.recipient?.firstName ||
    invite?.recipient?.businessName ||
    "the affiliate";

  const referralsSent = inviteDetail?.referralsSent ?? 0;
  const referrals = inviteDetail?.referrals ?? [];

  const referralsSectionTitle =
    myRole === "AFFILIATE"
      ? "Referrals you’ve sent"
      : `Referrals sent by ${affiliateName}`;

  // Scope helpers: bundle / product
  const bundle = campaign?.bundle;
  const hasBundle = !!bundle && !!bundle.slug;

  const product = campaign?.product;
  const hasProduct = !!product && !!product.slug;

  // --- Thread hook: events + send logic ---
const {
  events,
  isLoading: threadLoading,
  wsConnected,
  isSending,
  sendMessage,
  sendTyping,
} = useInviteThread(campaignId, inviteId, token, {
  initialLimit: 50,
  onInviteUpdated: () => {
    // re-pull invite + snapshot + referrals + canSendReferrals
    refetchInviteDetail();
  },
});

  const [draft, setDraft] = useState("");

  // Load the already-created open referral for this invite (affiliate side)
  useEffect(() => {
    if (
      !token ||
      !campaignId ||
      !inviteId ||
      !isAffiliate ||
      status !== "ACCEPTED"
    ) {
      setOpenReferral(null);
      setAffiliateLink(null);
      return;
    }

    let cancelled = false;
    setIsLoadingOpenReferral(true);

    fetchOpenReferralForInvite(campaignId, inviteId, token)
      .then((dto) => {
        if (cancelled) return;
        if (dto?.slug) {
          setOpenReferral(dto);
          const url = `${window.location.origin}/open/${dto.slug}`;
          setAffiliateLink(url);
        } else {
          setOpenReferral(null);
          setAffiliateLink(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load open referral for invite", err);
        setOpenReferral(null);
        setAffiliateLink(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingOpenReferral(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, campaignId, inviteId, isAffiliate, status]);

  const handleCopyAffiliateLink = () => {
    if (!affiliateLink) return;
    navigator.clipboard
      .writeText(affiliateLink)
      .catch((err) =>
        console.error("Failed to copy open referral link", err)
      );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    await sendMessage(text);
    setDraft("");
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    sendTyping();
  };

  // --- Small helpers for dates ---
  const formatDateTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };
  const formatDate = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };
  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // --- Accept / Decline mutations ---
  const acceptMutation = useAcceptInviteMutation(inviteId ?? "", token);
  const declineMutation = useDeclineInviteMutation(inviteId ?? "", token);

  const handleAccept = () => {
    if (!inviteId) return;
    acceptMutation.mutate(undefined, {
      onSuccess: () => {
        // refresh invite details so status, canSendReferrals, etc. update
        refetchInviteDetail();
      },
    });
  };

  const handleDecline = () => {
    if (!inviteId) return;
    declineMutation.mutate(undefined, {
      onSuccess: () => {
        refetchInviteDetail();
      },
    });
  };

  // --- Open referral editor (create or edit) ---

const openEditorWithDefaults = () => {
const businessName = invite?.business?.businessName;
const firstName = invite?.recipient?.firstName;

const defaultTitle = businessName
  ? `Discover ${businessName} with Trihola`
  : "Discover something I love on Trihola";

const defaultMessage =
  businessName && firstName
    ? `Hi, ${firstName} here 👋 I’m inviting you to check out ${businessName} through Trihola, a referral and rewards platform. Sign in to Trihola, accept this referral, and chat directly with the business to explore what they offer and the rewards or special offers you can unlock.`
    : `Hi 👋 I’m sharing something I love with you through Trihola, a referral and rewards platform. Sign in to Trihola, accept this referral, and chat directly with the business to explore what they offer and the rewards you can unlock.`;

    setEditTitle(openReferral?.title ?? defaultTitle);
    setEditMessage(openReferral?.message ?? defaultMessage);
    setEditStatus(openReferral?.status ?? "ACTIVE");
    setOpenReferralError(null);
    setShowOpenReferralEditor(true);
  };

  const handleOpenReferralCreateClick = () => {
    // create flow uses same editor, but openReferral is null
    openEditorWithDefaults();
  };

  const handleOpenReferralEditClick = () => {
    // edit flow uses existing openReferral values
    openEditorWithDefaults();
  };

  const handleSaveOpenReferral = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !campaignId || !inviteId) return;

  // 1) Prefer the businessId from the affiliate policy snapshot
  // 2) Fallback to the business.userId from the invite
  const businessId =
    (rewards as any)?.affiliatePolicy?.businessId ||
    (invite as any)?.business?.businessId ||
    (invite as any)?.business?.userId;

    if (!businessId) {
      setOpenReferralError(
        "Missing business for this invite. Please check the invite snapshot (no businessId found)."
      );
      return;
    }

    try {
      setIsSavingOpenReferral(true);
      setOpenReferralError(null);

      const trimmedTitle = editTitle.trim();
      const trimmedMessage = editMessage.trim();

      if (openReferral) {
        // UPDATE existing
        const updated = await updateOpenReferral(
          openReferral.id,
          {
            title: trimmedTitle || undefined,
            message: trimmedMessage || undefined,
            status: editStatus as any,
          },
          token
        );
        setOpenReferral(updated);
        const url = `${window.location.origin}/open/${updated.slug}`;
        setAffiliateLink(url);
      } else {
        // CREATE new (fallback when one wasn't auto-created)
        const payload: CreateOpenReferralRequest = {
          businessId,
          campaignId,
          campaignInviteId: inviteId,
          title: trimmedTitle || undefined,
          message: trimmedMessage || undefined,
          publishNow: editStatus === "ACTIVE",
        };
        const created = await createOpenReferral(payload, token);
        setOpenReferral(created);
        const url = `${window.location.origin}/open/${created.slug}`;
        setAffiliateLink(url);
      }

      setShowOpenReferralEditor(false);
    } catch (err: any) {
      console.error("Failed to save open referral", err);
      setOpenReferralError(
        err?.message || "Failed to save open referral changes."
      );
    } finally {
      setIsSavingOpenReferral(false);
    }
  };

const publicInviteUrl = React.useMemo(() => {
  if (!invite?.id) return "";
  return `${window.location.origin}/campaign-invite/${invite.id}`;
}, [invite?.id]);

  return (
    <div className="th-page invite-thread-page">
      {/* ── Top header pane spanning full width ── */}
      <div className="invite-thread-header invite-thread-header--hero"
              style={
          themeColor
            ? { borderBottom: `2px solid ${themeColor}` }
            : undefined
        }
      >
        <div className="invite-thread-header-left">
          <div className="breadcrumb">Invite → Invite</div>
          <h1 className="page-title">
            Invite — {campaign?.title ?? "Campaign"}
          </h1>
          <div className="page-subtitle">
            {isBusiness ? (
              <>
                Invite for <strong>{inviteeName}</strong>
              </>
            ) : (
              <>
                Invite for <strong>{businessName}</strong>
              </>
            )}
          </div>
        </div>

        <div className="invite-thread-header-right">
          {invite?.createdAt && (
            <div className="header-meta-item">
              Invited on{" "}
              <span className="header-meta-strong">
                {formatDateTime(invite.createdAt)}
              </span>
            </div>
          )}

          {/* Link buttons: affiliate gets share link when ACCEPTED; others get plain invite link */}
          {isAffiliate ? (
            status === "ACCEPTED" ? (
              <>
                {openReferral ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={handleCopyAffiliateLink}
                      disabled={!affiliateLink}
                    >
                      {isLoadingOpenReferral
                        ? "Loading link…"
                        : "Copy shareable link"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={handleOpenReferralEditClick}
                      disabled={isLoadingOpenReferral || !token}
                    >
                      Edit link details
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={handleOpenReferralCreateClick}
                    disabled={isLoadingOpenReferral || !token}
                  >
                    {isLoadingOpenReferral
                      ? "Loading link…"
                      : "Create shareable link"}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => {
                  const url = publicInviteUrl || window.location.href;
                  navigator.clipboard.writeText(url).catch(() => {});
                }}
                disabled={!publicInviteUrl}
              >
                Copy invite link
              </button>
            )
          ) : (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => {
                const url = publicInviteUrl || window.location.href;
                navigator.clipboard.writeText(url).catch(() => {});
              }}
              disabled={!publicInviteUrl}
            >
              Copy invite link
            </button>
          )}

          {status && (
            <span
              className={`status-pill status-pill--${String(
                status
              ).toLowerCase()}`}
              style={
                themeColor
                  ? { borderColor: themeColor, color: themeColor }
                  : undefined
              }
            >
              {status}
            </span>
          )}

          {/* Only the affiliate can accept / decline when still invited */}
          {isAffiliate && status === "INVITED" && (
            <div className="invite-thread-header-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? "Accepting…" : "Accept invite"}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleDecline}
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? "Declining…" : "Decline"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Second top-level panel: 2-column layout ── */}
      <div className="referral-layout">
        {/* LEFT: static definition panel */}
        <div className="thread-sidebar">
          {/* 1. Campaign image + view details */}
          {campaign && (
            <section className="card invite-campaign-card">
              {campaign.primaryImageUrl && (
                <div className="invite-campaign-image-wrap">
                  <img
                    src={campaign.primaryImageUrl}
                    alt={campaign.title}
                    className="invite-campaign-image"
                  />
                </div>
              )}
              <div className="invite-campaign-meta">
                <div className="invite-campaign-title">
                  {affiliateHeadline || campaign.title || "Campaign"}
                </div>
                {affiliateSubheading && (
                  <div className="invite-campaign-subtitle">
                    {affiliateSubheading}
                  </div>
                )}
                {campaign.id && (
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="link invite-campaign-link"
                  >
                    View campaign details
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* 2. Scope section */}
          {campaign && (hasBundle || hasProduct) && (
            <ScopeCard
              title="What this invite is for"
              businessSlug={campaign.businessSlug}
              product={campaign.product ?? undefined}
              bundle={campaign.bundle ?? undefined}
              appearance="flat"
            />
          )}

          {/* 3. Rewards (CampaignOfferCard) spanning full left panel */}
          <section className="card invite-rewards-card">
            <h3 className="card-title">Prospect &amp; affiliate rewards</h3>
            <CampaignOfferCard
              offers={offerLinks}
              affiliatePolicy={affiliatePolicy}
              token={token}
              showDetailsInCard={true}
              className="invite-offer-card"
            />
          </section>
        </div>

        {/* RIGHT: chat / thread column */}
        <div className="thread-main card">
          <div className="thread-scroll">
            {(headerLoading || threadLoading) && (
              <div className="invite-thread-loading">Loading…</div>
            )}
            {headerError && (
              <div className="invite-thread-error">
                Failed to load invite details
              </div>
            )}

            {events && events.length === 0 && !threadLoading && (
              <div className="invite-thread-empty">
                No messages yet. Start the conversation!
              </div>
            )}

            {events?.map((ev) => (
              <InviteThreadRow
                key={ev.id}
                event={ev}
                isMine={ev.senderUserId === userId}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            ))}
          </div>

          <div className="composer-wrap">
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
              <button
                className="composer-btn composer-btn--icon"
                type="button"
              >
                +
              </button>
              <textarea
                className="composer-input"
                placeholder="Type a message…"
                rows={1}
                value={draft}
                onChange={handleDraftChange}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn--primary"
                type="submit"
                disabled={isSending || !draft.trim()}
              >
                {isSending ? "Sending…" : "Send"}
              </button>
            </form>
            <div className="invite-thread-footer-meta">
              {wsConnected ? "Live updates on" : "Reconnecting…"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-width referrals panel for both roles ── */}
      {referrals.length > 0 && (
        <section className="card invite-referrals-card invite-referrals-card--fullwidth">
          <div className="invite-referrals-header">
            <h3 className="card-title">{referralsSectionTitle}</h3>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setShowReferrals((open) => !open)}
            >
              {showReferrals
                ? "Hide referrals"
                : `Show referrals (${referrals.length})`}
            </button>
          </div>

          {showReferrals && (
            <ul className="invite-referrals-list">
              {referrals.map((r) => {
                const displayName = r.prospectName || "Referral";

                return (
                  <li key={r.referralId} className="invite-referral-row">
                    <div className="invite-referral-main">
                      <div className="invite-referral-head">
                        {r.prospectProfileImageUrl ? (
                          <img
                            src={r.prospectProfileImageUrl}
                            alt={displayName}
                            className="invite-referral-avatar"
                          />
                        ) : (
                          <div className="invite-referral-avatar invite-referral-avatar--placeholder">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="invite-referral-text">
                          <div className="invite-referral-title">
                            {displayName}
                          </div>

                          <div className="invite-referral-meta">
                            {r.status && (
                              <span
                                className={`status-pill status-pill--${r.status.toLowerCase()}`}
                              >
                                {r.status.toLowerCase()}
                              </span>
                            )}
                            {r.createdAt && (
                              <span className="th-muted">
                                &nbsp;• Created {formatDateTime(r.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      className="btn btn--sm btn--ghost"
                      to={`/referral/${r.slug}/thread`}
                    >
                      Open referral thread
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {isAffiliate && (
        <section className="card invite-cta-card invite-cta-card--fullwidth">
          <div className="invite-cta-layout">
            <div className="invite-cta-copy">
              {canSend ? (
                <>
                  <h3 className="card-title">Start sending referrals</h3>
                  <p className="th-muted">
                    {prospectDescriptionShort
                      ? prospectDescriptionShort
                      : `You’ve sent ${referralsSent} referral${
                          referralsSent === 1 ? "" : "s"
                        } so far for this campaign.`}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="card-title">
                    Accept invite to start referring
                  </h3>
                  <p className="th-muted">
                    Once you accept this invite, you’ll be able to send
                    referrals to <strong>{businessName}</strong>{" "}
                    {prospectDescriptionShort
                      ? `and help people discover this: ${prospectDescriptionShort}`
                      : "and earn rewards."}
                  </p>
                </>
              )}
            </div>

            {canSend && (
              <div className="invite-cta-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setShowSendReferralPanel(true)}
                  style={
                    themeColor
                      ? {
                          backgroundColor: themeColor,
                          borderColor: themeColor,
                        }
                      : undefined
                  }
                >
                  Send a new referral
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* SendReferralPanel (unchanged) */}
      {campaignId && inviteId && showSendReferralPanel && (
        <SendReferralPanel
          open={showSendReferralPanel}
          onClose={() => setShowSendReferralPanel(false)}
          token={token}
          campaignId={campaignId}
          inviteId={inviteId}
          defaultNote={
            inviteDetail?.invite.personalMessage ??
            `Hi {firstName}, I found this offer from ${
              inviteDetail?.snapshot.campaign.title ?? "this campaign"
            } and thought of you.`
          }
          onSent={() => {
            setShowSendReferralPanel(false);
          }}
        />
      )}

      {/* Open referral edit/create modal */}
      {showOpenReferralEditor && (
        <div className="th-modal-backdrop">
          <div className="th-modal">
            <div className="card open-referral-edit-card">
              <div className="card-header">
                <h2 className="card-title">
                  {openReferral
                    ? "Edit shareable link"
                    : "Create shareable link"}
                </h2>
                <button
                  type="button"
                  className="btn btn--ghost tiny"
                  onClick={() => setShowOpenReferralEditor(false)}
                  disabled={isSavingOpenReferral}
                >
                  Close
                </button>
              </div>

              <form className="form" onSubmit={handleSaveOpenReferral}>
                <div className="form-group">
                  <label className="label">Title (optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Message (optional)</label>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="DRAFT">Draft</option>
                    <option value="EXHAUSTED">Exhausted</option>
                  </select>
                  <p className="help">
                    Active links can be used immediately. Draft/paused links
                    won’t accept new referrals.
                  </p>
                </div>

                {openReferralError && (
                  <p className="crf-msg err">{openReferralError}</p>
                )}

                <div className="actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setShowOpenReferralEditor(false)}
                    disabled={isSavingOpenReferral}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={isSavingOpenReferral}
                  >
                    {isSavingOpenReferral ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Row renderer for events / messages ---

type InviteThreadRowProps = {
  event: InviteThreadEventDTO;
  isMine: boolean;
  formatDate: (iso?: string) => string;
  formatTime: (iso?: string) => string;
};

const InviteThreadRow: React.FC<InviteThreadRowProps> = ({
  event,
  isMine,
  formatDate,
  //formatTime,
}) => {
  const isSystem = event.eventType !== "USER_MESSAGE";

  if (isSystem) {
    // System / timeline event – center it like other system messages
    return (
      <div className="event-row msg-system">
        <span className="thread-event-text">
          {formatDate(event.createdAt)} · {event.content}
        </span>
      </div>
    );
  }

  const meta = (event.metadata ?? {}) as {
    actorName?: string;
    message?: string;
    attachmentUrls?: string[];
    [k: string]: any;
  };

  return (
    <div className={`event-row ${isMine ? "msg-self" : "msg-other"}`}>
      <MessageBubble
        actorName={isMine ? "You" : meta.actorName ?? "Contact"}
        message={meta.message ?? event.content}
        timestamp={event.createdAt}
        isMine={isMine}
        attachments={meta.attachmentUrls || []}
      />
    </div>
  );
};

export default InviteThreadPage;
