// src/pages/threads/ThreadsInboxPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { supabase } from "../../supabaseClient";
import { useThreadStore, type ThreadScope } from "../../context/ThreadStoreContext";
import { useNotificationsWS } from "../../context/NotificationsWSProvider";

import NewChatDrawer from "./NewChatDrawer";
import ReferralComposer from "../../components/referrals/ReferralComposer";
import BroadcastComposerModal from "./BroadcastComposerModal";

import { useIdentitySelector } from "./useIdentitySelector";
import type { IdentityOption } from "./useIdentitySelector";
import { sendThreadMessage, getThreadInboxComposerPermissions } from "../../services/threadService";
import { createBroadcast } from "../../services/broadcastService";

import type {
  ThreadSummaryDTO,
  ParticipantIdentity,
  ParticipantType,
  UUID,
  ThreadInboxComposerPermissionsDTO,
} from "../../types/threads";
import type { BroadcastItemCreateDTO, BroadcastRecipientCreateDTO } from "../../types/broadcasts";
import type { BusinessContextDTO } from "../../types/business";

import "../../css/threads.css";
import "../../css/new-chat-drawer.css";

/* -------------------------------- helpers -------------------------------- */

const API_BASE = import.meta.env.VITE_API_BASE as string;

function safeText(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

type MyProfileLike = {
  userId?: string;
  slug?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
};

function userDisplayName(u?: MyProfileLike | null) {
  const first = safeText(u?.firstName);
  const last = safeText(u?.lastName);
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  const slug = safeText(u?.slug);
  return slug || "You";
}

/**
 * IMPORTANT:
 * - Always include a USER identity (“You”)
 * - Then include BUSINESS identities from membership list
 */
function toIdentityOptionsFromStore(opts: {
  myProfile?: MyProfileLike | null;
  myUserId?: string | null;
  myBusinesses: any[];
  primaryBusiness: any | null;
}): { identities: IdentityOption[]; defaultIdentity: IdentityOption | null } {
  const userTitle = opts.myProfile ? userDisplayName(opts.myProfile) : "You";
  const userImageUrl = opts.myProfile?.profileImageUrl ?? null;

  const userIdentity: IdentityOption = {
    participantType: "USER",
    participantId: (String(opts.myUserId || "missing") as UUID),
    title: userTitle,
    subtitle: "Personal profile",
    imageUrl: userImageUrl,
  };

  const bizIdentities: IdentityOption[] = (opts.myBusinesses ?? []).map((b: any) => ({
    participantType: "BUSINESS",
    participantId: String(b.businessId ?? b.id) as UUID,
    title: safeText(b.businessName ?? b.name) || "Business",
    subtitle: safeText(b.role) ? `Business (${String(b.role)})` : "Business",
    imageUrl: b.businessLogoUrl ?? b.logoUrl ?? null,
  }));

  const identities = [userIdentity, ...bizIdentities];

  let defaultIdentity: IdentityOption | null = userIdentity;
  const primaryId = opts.primaryBusiness?.businessId
    ? String(opts.primaryBusiness.businessId)
    : opts.primaryBusiness?.id
      ? String(opts.primaryBusiness.id)
      : null;

  if (primaryId) {
    const match = bizIdentities.find((i) => String(i.participantId) === primaryId);
    if (match) defaultIdentity = match;
  }

  return { identities, defaultIdentity };
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    return sameDay
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function participantImageUrl(x: any): string | null {
  return x?.profileImageUrl ?? x?.imageUrl ?? null;
}

function participantDisplayName(x: any): string {
  const first = safeText(x?.firstName);
  const last = safeText(x?.lastName);
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  return safeText(x?.displayName) || safeText(x?.slug) || "User";
}

function participantInitial(x: any): string {
  const n = participantDisplayName(x);
  return initials(n);
}

function referralFaces(referral: ThreadSummaryDTO["referral"]) {
  if (!referral) return [];

  return [
    {
      key: "referrer",
      name: participantDisplayName(referral.referrer),
      imageUrl: participantImageUrl(referral.referrer),
      initial: participantInitial(referral.referrer),
    },
    {
      key: "prospect",
      name: participantDisplayName(referral.prospect),
      imageUrl: participantImageUrl(referral.prospect),
      initial: participantInitial(referral.prospect),
    },
    {
      key: "business",
      name: participantDisplayName(referral.business),
      imageUrl: participantImageUrl(referral.business),
      initial: participantInitial(referral.business),
    },
  ];
}


function threadTitle(t: ThreadSummaryDTO) {
  const ttl = safeText(t.title);
  if (ttl) return ttl;
  return t.type === "DIRECT" ? "Conversation" : "Group";
}

function parseCtaMessage(preview: any): string | null {
  try {
    const raw = preview?.configJson;
    if (!raw) return null;

    const cfg = JSON.parse(raw);
    const msg = safeText(cfg?.message);
    return msg || null;
  } catch {
    return null;
  }
}

function ctaLabel(kind: string) {
  const k = String(kind || "").toUpperCase();

  if (k === "RECOMMEND_BUSINESS") return "Recommendation ask";
  if (k === "REFERRAL_ADD") return "Referral ask";

  return k.replaceAll("_", " ").toLowerCase();
}

function threadPreview(t: ThreadSummaryDTO) {
  const p = safeText(t.lastMessagePreview);
  if (p) return p;

  const previews = Array.isArray((t as any).activeCtasPreview)
    ? (t as any).activeCtasPreview
    : [];

  if (previews.length > 0) {
    const first = previews[0];

    const label = ctaLabel(first.kind);
    const msg = parseCtaMessage(first);

    if (msg) {
      const trimmed = msg.length > 80 ? msg.slice(0, 77) + "…" : msg;
      return `${label} – ${trimmed}`;
    }

    return label;
  }

  const count = Number((t as any).activeCtaCount ?? 0);
  if (count > 0) {
    return count === 1 ? "1 active CTA" : `${count} active CTAs`;
  }

  return "—";
}

function initials(name: string) {
  const s = (name || "").trim();
  return s ? s[0].toUpperCase() : "•";
}

/**
 * ✅ EXACT SAME IdentityPicker UI + behavior as NewChatDrawer
 * Uses the same classNames from new-chat-drawer.css.
 */
function IdentityPicker(props: {
  identities: IdentityOption[];
  effectiveIdentity: IdentityOption;
  selectedKey: string;
  setSelectedKey: (k: string) => void;
  identityKey: (i: IdentityOption) => string;
  disabled?: boolean;
}) {
  const { identities, effectiveIdentity, selectedKey, setSelectedKey, identityKey, disabled } = props;

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onMouseDownCapture = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const btn = btnRef.current;
      const menu = menuRef.current;

      if (btn && btn.contains(t)) return;
      if (menu && menu.contains(t)) return;

      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDownCapture, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDownCapture, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="identity-select">
      <button
        ref={btnRef}
        type="button"
        className="identity-chip"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {effectiveIdentity.imageUrl ? (
          <img src={effectiveIdentity.imageUrl} alt="" />
        ) : (
          <div className="avatar-fallback">
            {effectiveIdentity.title?.[0]?.toUpperCase() ?? "•"}
          </div>
        )}

        <div className="identity-chip-text">
          <div className="identity-title">{effectiveIdentity.title}</div>
          {effectiveIdentity.subtitle ? (
            <div className="identity-subtitle">{effectiveIdentity.subtitle}</div>
          ) : (
            <div className="identity-subtitle">Choose who you are viewing as</div>
          )}
        </div>

        <div className="identity-chevron" aria-hidden="true">
          ▾
        </div>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="identity-menu identity-menu--inline"
          role="listbox"
          aria-label="Choose identity"
        >
          {identities.map((i) => {
            const k = identityKey(i);
            const isSel = k === selectedKey;

            return (
              <button
                key={k}
                type="button"
                className={"identity-option" + (isSel ? " is-selected" : "")}
                onClick={() => {
                  setSelectedKey(k);
                  setOpen(false);
                }}
                role="option"
                aria-selected={isSel}
              >
                {i.imageUrl ? (
                  <img className="identity-option-avatar" src={i.imageUrl} alt="" />
                ) : (
                  <div className="identity-option-avatarFallback">
                    {i.title?.[0]?.toUpperCase() ?? "•"}
                  </div>
                )}

                <div className="identity-option-text">
                  <div className="identity-option-title">{i.title}</div>
                  {i.subtitle ? <div className="identity-option-subtitle">{i.subtitle}</div> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- component -------------------------------- */

type ThreadsInboxPageProps = {
  myBusinesses?: BusinessContextDTO[];
  primaryBusiness?: BusinessContextDTO | null;
  myProfile?: MyProfileLike | null;
};

export default function ThreadsInboxPage(props: ThreadsInboxPageProps = {}) {
  const navigate = useNavigate();
  const store = useThreadStore();
  const { selectedScope, setSelectedScope } = store;
  const { seq: notifSeq, lastNotification } = useNotificationsWS();
  
  const [error, setError] = useState<string | null>(null);

  const limit = 30;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const [referralOpen, setReferralOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const [myUserId, setMyUserId] = useState<string>("");

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

 const [composerPermissions, setComposerPermissions] = useState<
    ThreadInboxComposerPermissionsDTO[]
  >([]);

  const [composerPermLoading, setComposerPermLoading] = useState(false);

  const { identities: derivedIdentities, defaultIdentity: derivedDefaultIdentity } = useMemo(() => {
    return toIdentityOptionsFromStore({
      myProfile: props.myProfile ?? null,
      myUserId: myUserId ?? null,
      myBusinesses: (props.myBusinesses ?? []) as any[],
      primaryBusiness: (props.primaryBusiness ?? null) as any,
    });
  }, [props.myBusinesses, props.primaryBusiness, props.myProfile, myUserId]);


const storeAsKey = useMemo(() => scopeToKey(selectedScope), [selectedScope]);

const {
  safeIdentities,
  selectedIdentity,
  asKey,
  setAsKey,
  identityKey: identityKeyFromHook,
} = useIdentitySelector({
    identities: derivedIdentities,
    defaultIdentity: derivedDefaultIdentity,

    // ✅ controlled mode: ThreadStore is the source of truth
    controlledKey: storeAsKey,
    setControlledKey: (k) => {
      const sc = keyToScope(k);
      if (!sc) return;
      // avoid loops
      if (scopeToKey(selectedScope) !== scopeToKey(sc)) {
        setSelectedScope(sc);
      }
    },

    debug: false,
  });

  function scopeToKey(sc: ThreadScope | null): string {
    if (!sc) return "";
    return `${String(sc.asType).toUpperCase()}:${String(sc.asId)}`;
  }

  function keyToScope(key: string): ThreadScope | null {
    const raw = String(key || "");
    const [t, ...rest] = raw.split(":");
    const id = rest.join(":");
    const asType = String(t || "").toUpperCase();
    const asId = String(id || "").trim();
    if ((asType !== "USER" && asType !== "BUSINESS") || !asId) return null;
    return { asType: asType as any, asId: asId as any };
  }


  const effectiveIdentity: IdentityOption | null = selectedIdentity ?? safeIdentities[0] ?? null;

  function identityKeyFromPerm(i: {
    participantType: string;
    participantId: string;
  }) {
    return `${i.participantType}:${String(i.participantId)}`;
  }

  const currentComposerPerm = useMemo(() => {
    if (!effectiveIdentity) return null;

    const key = identityKeyFromPerm(effectiveIdentity);

    return (
      composerPermissions.find(
        (p) => identityKeyFromPerm(p.asIdentity) === key
      ) ?? null
    );
  }, [composerPermissions, effectiveIdentity]);

  const hasAnyComposerAction = !!(
    currentComposerPerm?.canCreateDirectThread ||
    currentComposerPerm?.canCreateReferral ||
    currentComposerPerm?.canCreateAnnouncement
  );

  async function getTokenAndUserId(): Promise<{ token: string; userId: UUID } | null> {
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) return null;
    return { token, userId: String(userId) as UUID };
  }


  function buildScope(authUserId: UUID, ident: IdentityOption | null): ThreadScope | undefined {
    if (!ident) return undefined;

    const asType =
      String(ident.participantType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER";

    const rawId = safeText(ident.participantId);
    const asId = asType === "USER" ? rawId || String(authUserId) : rawId;

    if (!asId) return undefined;

    return { asType, asId: asId as UUID };
  }

  const scope: ThreadScope | null = useMemo(() => {
    if (!effectiveIdentity) return null;

    const asType =
      String(effectiveIdentity.participantType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER";

    const rawId = safeText(effectiveIdentity.participantId);
    const asId = asType === "USER" ? rawId || safeText(myUserId) : rawId;

    if (!asId) return null;
    return { asType, asId: asId as UUID };
  }, [effectiveIdentity, myUserId]);

  const threads: ThreadSummaryDTO[] = scope ? store.getThreadsFor(scope) : [];
  const loading: boolean = scope ? store.getLoadingFor(scope) : true;
  const loadingMore: boolean = scope ? store.getLoadingMoreFor(scope) : false;
  const hasMore: boolean = scope ? store.getHasMoreFor(scope) : true;

  const sortedThreads = useMemo(() => { 
    const copy = [...threads]; 
    copy.sort((a, b) => { 
      const aTs = a.lastMessageAt ?? a.updatedAt ?? ""; 
      const bTs = b.lastMessageAt ?? b.updatedAt ?? ""; 
      return (bTs || "").localeCompare(aTs || ""); 
    });
    return copy;
  }, [threads]);

  const visibleThreads = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return sortedThreads;

    return sortedThreads.filter((t) => {
      const title = threadTitle(t).toLowerCase();
      const subtitle = threadPreview(t).toLowerCase();
      const counterparty = safeText(t.counterparty?.displayName).toLowerCase();

      return (
        title.includes(q) ||
        subtitle.includes(q) ||
        counterparty.includes(q)
      );
    });
  }, [sortedThreads, searchText]);

  async function loadFirstPage() {
    setError(null);

    const auth = await getTokenAndUserId();
    if (!auth) {
      setError("Not logged in.");
      return;
    }

    if (!myUserId) setMyUserId(String(auth.userId));

    const sc = buildScope(auth.userId, effectiveIdentity) ?? ({
      asType: "USER",
      asId: String(auth.userId) as UUID,
    } as ThreadScope);

    try {
      await store.refreshThreadsFor(sc, limit);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load threads.");
    }
  }

  async function loadMore() {
    if (loadingMore || loading || !hasMore) return;

    setError(null);

    const auth = await getTokenAndUserId();
    if (!auth) {
      setError("Not logged in.");
      return;
    }

    if (!myUserId) setMyUserId(String(auth.userId));

    const sc = buildScope(auth.userId, effectiveIdentity) ?? ({
      asType: "USER",
      asId: String(auth.userId) as UUID,
    } as ThreadScope);

    try {
      await store.loadMoreThreadsFor(sc, limit);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more threads.");
    }
  }

  async function loadComposerPermissions() {
    const auth = await getTokenAndUserId();
    if (!auth) return;

    try {
      setComposerPermLoading(true);
      const res = await getThreadInboxComposerPermissions(auth.token);
      setComposerPermissions(res.permissions ?? []);
    } catch (e) {
      console.error("Failed to load composer permissions", e);
    } finally {
      setComposerPermLoading(false);
    }
  }

  // ✅ NEW: refresh inbox when notification arrives for this identity + thread context
  const notifRefreshTimerRef = useRef<number | null>(null);
  const lastNotifRefreshAtRef = useRef<number>(0);

  useEffect(() => {
    if (!scope) return;
    if (!lastNotification) return;

    if (String(lastNotification.contextType || "").toUpperCase() !== "THREAD") return;

    const identities = (lastNotification as any)?.metadata?.identities as
      | Array<{ type: string; id: string }>
      | undefined;

    if (Array.isArray(identities) && identities.length > 0) {
      const match = identities.some((x) => {
        const t = String(x?.type || "").toUpperCase();
        const id = String(x?.id || "");
        return t === String(scope.asType).toUpperCase() && id === String(scope.asId);
      });
      if (!match) return;
    }

    const now = Date.now();
    if (now - lastNotifRefreshAtRef.current < 600) return;
    lastNotifRefreshAtRef.current = now;

    if (notifRefreshTimerRef.current) {
      window.clearTimeout(notifRefreshTimerRef.current);
      notifRefreshTimerRef.current = null;
    }

    notifRefreshTimerRef.current = window.setTimeout(() => {
      store.refreshThreadsFor(scope, limit).catch(() => {});
    }, 150);

    return () => {
      if (notifRefreshTimerRef.current) {
        window.clearTimeout(notifRefreshTimerRef.current);
        notifRefreshTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifSeq, scope?.asType, scope?.asId]);

  // Load composer permissions
  useEffect(() => {
      loadComposerPermissions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  // Reload threads when identity changes
  useEffect(() => {
    if (!effectiveIdentity) return;
    if (!myUserId && String(effectiveIdentity.participantType).toUpperCase() === "USER") return;

    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id ? String(session.user.id) : "";
      if (!cancelled) setMyUserId(uid);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

// Automatically set new menu when idetity switches 
  useEffect(() => {
  setNewMenuOpen(false);
}, [asKey]);

  function handleOpenDirect() {
    if (!currentComposerPerm?.canCreateDirectThread) return;
    openNewChatDrawer();
  }

  function handleOpenReferral() {
    if (!currentComposerPerm?.canCreateReferral) return;
    setReferralOpen(true);
  }

  function handleOpenBroadcast() {
    if (!currentComposerPerm?.canCreateAnnouncement) return;
    setBroadcastOpen(true);
  }

  function openNewChatDrawer() {
    setDrawerError(null);
    setDrawerOpen(true);
  }

  function toParticipantIdentity(x: any): ParticipantIdentity {
    return { participantType: x.participantType, participantId: x.participantId };
  }

  async function createOrReuseDirectThread(
    token: string,
    a: ParticipantIdentity,
    b: ParticipantIdentity
  ): Promise<UUID> {
    const res = await axios.post(
      `${API_BASE}/threads/direct`,
      { a, b },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const threadId = res?.data?.threadId;
    if (!threadId) throw new Error("Invalid response: missing threadId");
    return String(threadId) as UUID;
  }

  async function onSelectContact(opts: {
    asIdentity: IdentityOption;
    target: { participantType: ParticipantType; participantId: UUID };
    initialMessage: string;
  }) {
    setDrawerError(null);

    const firstMsg = (opts.initialMessage ?? "").trim();
    if (!firstMsg) {
      setDrawerError("Type a message to start a chat.");
      return;
    }

    const auth = await getTokenAndUserId();
    if (!auth) {
      setDrawerError("Not logged in.");
      return;
    }

    if (!opts.asIdentity?.participantType || !opts.asIdentity?.participantId) {
      setDrawerError("Please choose who you are messaging as.");
      return;
    }

    try {
      const a = toParticipantIdentity(opts.asIdentity);
      const b: ParticipantIdentity = {
        participantType: opts.target.participantType,
        participantId: opts.target.participantId,
      };

      const threadId = await createOrReuseDirectThread(auth.token, a, b);

      await sendThreadMessage(auth.token, threadId, {
        asIdentity: a,
        text: firstMsg,
      });
      setDrawerOpen(false);
      navigate(`/threads/${encodeURIComponent(threadId)}`);
    } catch (e: any) {
      setDrawerError(e?.response?.data?.error ?? e?.message ?? "Failed to start chat.");
      throw e;
    }
  }

  function extractThreadIdFromCreateResult(result: any): string | null {
    const candidates = [
      result?.threadId,
      result?.thread?.threadId,
      result?.thread?.id,
      result?.directThreadId,
      result?.referralThreadId,
      result?.data?.threadId,
    ];
    for (const c of candidates) {
      const s = typeof c === "string" ? c.trim() : "";
      if (s) return s;
    }
    return null;
  }

  async function handleCreateBroadcast(args: {
    senderIdentity: ParticipantIdentity;
    title: string;
    recipients: BroadcastRecipientCreateDTO[];
    items: BroadcastItemCreateDTO[];
  }) {
    const auth = await getTokenAndUserId();
    if (!auth) {
      throw new Error("Not logged in.");
    }

    await createBroadcast(auth.token, {
      senderIdentity: args.senderIdentity,
      title: args.title,
      recipients: args.recipients,
      items: args.items,
    });

    setBroadcastOpen(false);

    const sc = buildScope(auth.userId, effectiveIdentity) ?? ({
      asType: "USER",
      asId: String(auth.userId) as UUID,
    } as ThreadScope);

    await store.refreshThreadsFor(sc, limit);
  }

  return (
  <div className="app-page app-page--full threads-inbox">
    <div className="app-stack">
      <div className="threads-inbox-header">
        <div className="threads-inbox-title app-header__main">
          <div className="threads-inbox-title__h1">Inbox</div>
          <div className="threads-inbox-title__sub">Your conversations</div>
        </div>

        <div className="threads-toolbar">
          <div className="threads-toolbar__left">
            {effectiveIdentity && safeIdentities.length > 0 && (
              <div className="threads-inbox-identity">
                <IdentityPicker
                  identities={safeIdentities}
                  effectiveIdentity={effectiveIdentity}
                  selectedKey={asKey}
                  setSelectedKey={setAsKey}
                  identityKey={identityKeyFromHook}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="threads-toolbar__center">
            <input
              type="text"
              className="threads-search"
              placeholder="Search conversations"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="threads-toolbar__right">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={loadFirstPage}
              disabled={loading}
              title="Refresh"
            >
              Refresh
            </button>

            {hasMore && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={loadMore}
                disabled={loadingMore || loading}
                title="Load more"
              >
                {loadingMore ? "Loading…" : "More"}
              </button>
            )}

            <div className="threads-newMenuWrap">
              <button
                type="button"
                className="btn btn--primary threads-newBtn"
                onClick={() => {
                  if (!hasAnyComposerAction) return;
                  setNewMenuOpen((v) => !v);
                }}
                aria-haspopup="menu"
                aria-expanded={newMenuOpen}
                disabled={composerPermLoading || !hasAnyComposerAction}
              >
                {composerPermLoading ? "Loading…" : "New ▾"}
              </button>

              {newMenuOpen && (
                <div className="threads-newMenu" role="menu">
                  {currentComposerPerm?.canCreateDirectThread && (
                    <button
                      type="button"
                      className="threads-newMenuItem"
                      onClick={() => {
                        setNewMenuOpen(false);
                        handleOpenDirect();
                      }}
                    >
                      New chat
                    </button>
                  )}

                  {currentComposerPerm?.canCreateReferral && (
                    <button
                      type="button"
                      className="threads-newMenuItem"
                      onClick={() => {
                        setNewMenuOpen(false);
                        handleOpenReferral();
                      }}
                    >
                      New referral
                    </button>
                  )}

                  {currentComposerPerm?.canCreateAnnouncement && (
                    <button
                      type="button"
                      className="threads-newMenuItem"
                      onClick={() => {
                        setNewMenuOpen(false);
                        handleOpenBroadcast();
                      }}
                    >
                      New broadcast
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {error && <div className="threads-inbox-error">{error}</div>}

      <div className="threads-inbox-body" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 12, opacity: 0.8 }}>Loading threads…</div>
        ) : visibleThreads.length === 0 ? (
          <div className="threads-empty">
            <div style={{ fontWeight: 700 }}>No threads yet</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              Use <b>New</b> to start a conversation, create a referral, or send a broadcast.
            </div>
          </div>
        ) : (
          <div className="threads-list">
            {visibleThreads.map((t, idx) => {
              const ts = t.lastMessageAt ?? t.updatedAt ?? null;
              const rightTime = fmtTime(ts);

              const title = threadTitle(t);
              const isReferral = t.contextType === "REFERRAL";
              const isGroup = !isReferral && t.type === "GROUP";

              const subtitle = threadPreview(t);

              const avatarUrl = t.type === "DIRECT" ? t.counterparty?.imageUrl ?? null : null;
              const avatarInitial = initials(t.counterparty?.displayName ?? title);

              const openThread = () => navigate(`/threads/${encodeURIComponent(t.threadId)}`);
              const openReferral = () => {
                const slug = t.referral?.referralSlug;
                if (slug) navigate(`/referral/${encodeURIComponent(slug)}`);
                else openThread();
              };

              return (
                <div
                  key={t.threadId}
                  className="thread-row"
                  role="button"
                  tabIndex={0}
                  onClick={openThread}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openThread();
                    }
                  }}
                  style={{ borderTop: idx === 0 ? "none" : "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="thread-rowInner">
                  {isReferral ? (
                    <div className="thread-referralRail">
                      <button
                        type="button"
                        className="thread-referralFaces"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReferral();
                        }}
                        title="Open referral"
                      >
                        {referralFaces(t.referral).map((p, i) => (
                          <span
                            key={p.key}
                            className={`thread-referralFace thread-referralFace--${i + 1}`}
                            title={p.name}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} />
                            ) : (
                              <span className="thread-referralFaceInitial">{p.initial}</span>
                            )}
                          </span>
                        ))}
                      </button>

                      <button
                        type="button"
                        className="thread-kind thread-kind--referral thread-kind--below"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReferral();
                        }}
                        title="Open referral"
                      >
                        Referral
                      </button>
                    </div>
                  ) : isGroup ? (
                      <div className="thread-kind thread-kind--group" aria-hidden="true">
                        Group
                      </div>
                    ) : (
                      <div className="thread-avatar" aria-hidden="true">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" />
                        ) : (
                          <span className="thread-avatar__initial">{avatarInitial}</span>
                        )}
                      </div>
                    )}

                    <div className="thread-cellMain">
                      <div className="thread-title" title={title}>
                        {title}
                      </div>
                      <div className="thread-subtitle" title={subtitle}>
                        {subtitle}
                      </div>
                    </div>

                    <div className="thread-time">{rightTime}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Referral Composer Modal */}
      <ReferralComposer
        open={referralOpen}
        onCancel={() => setReferralOpen(false)}
        onResult={(result: any) => {
          const tid = extractThreadIdFromCreateResult(result);
          setReferralOpen(false);

          if (tid) {
            navigate(`/threads/${encodeURIComponent(tid)}`);
            return;
          }

          loadFirstPage();
        }}
      />

      <BroadcastComposerModal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        identities={safeIdentities}
        defaultIdentity={effectiveIdentity}
        viewingAs={effectiveIdentity}
        uploaderUserId={props.myProfile?.userId ?? myUserId}
        uploadContextId={scope?.asId ?? myUserId ?? "inbox"}
        permissionsByIdentity={composerPermissions}
        onCreate={handleCreateBroadcast}
      />
      {/* Drawer */}
      <NewChatDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        myProfile={props.myProfile ?? null}
        myUserId={(props.myProfile?.userId ?? myUserId) as any}
        error={drawerError}
        onSelectContact={onSelectContact}

        // ✅ NEW: drive drawer identity from the same selection as the Inbox picker
        identitySelection={{
          selectedKey: asKey,
          setSelectedKey: setAsKey,
        }}
      />
      </div>
    </div>
  );
}