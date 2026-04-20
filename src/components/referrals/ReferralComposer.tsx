import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAppData } from "../../context/AppDataContext";

import type {
  CreateResult,
  TargetMini,
  UserMini,
  BusinessMini,
  CreateReferralV2Request,
} from "../../types/referral";
import { buildCreateReferralRequest } from "../../types/referral";
import { createReferralOrRecommendation } from "../../services/referralService";
import { listMyBusinesses } from "../../services/businessService";

import ReferralContactSelectPanel from "../../pages/threads/components/ReferralContactSelectPanel";

import "../../css/new-chat-drawer.css";
import "../../css/referral-composer-drawer.css";

type PickerMode = "PROSPECT" | "TARGET";
type TargetFilter = "ALL" | "BUSINESSES" | "USERS";

type IdentityOption = {
  participantType: "USER";
  participantId: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

export interface ReferralComposerIntent {
  initialProspect?: UserMini | null;
  initialTarget?: TargetMini | null;
  initialNote?: string;
}

export interface ReferralComposerProps {
  open: boolean;
  intent?: ReferralComposerIntent;
  onResult?: (result: CreateResult) => void;
  onCancel?: () => void;
  tokenOverride?: string;
}

type SelectorRowProps = {
  label: string;
  title: string;
  subtitle?: string | null;
  avatar?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

type SelectPanelProps = {
  mode: PickerMode;
  users: UserMini[];
  businesses: BusinessMini[];
  selectedProspect: UserMini | null;
  selectedTarget: TargetMini | null;
  contactsLoading?: boolean;
  businessLoading?: boolean;
  onPickProspect: (u: UserMini) => void;
  onPickBusinessTarget: (b: BusinessMini) => void;
  onPickUserTarget: (u: UserMini) => void;
  onRefreshContacts?: () => void | Promise<void>;
  onRefreshBusinesses?: () => void | Promise<void>;
};

type MyProfileLike = {
  userId?: string | null;
  slug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function safeTrim(v: string) {
  return (v ?? "").trim();
}

function userDisplayName(u: UserMini) {
  const fn = clean(u.firstName);
  const ln = clean(u.lastName);
  return `${fn} ${ln}`.trim() || clean(u.slug) || String(u.userId);
}

function myProfileDisplayName(u?: MyProfileLike | null) {
  const fn = clean(u?.firstName);
  const ln = clean(u?.lastName);
  return `${fn} ${ln}`.trim() || clean(u?.slug) || "User";
}

function targetDisplayName(t: TargetMini) {
  if (t.kind === "BUSINESS") return t.business.name || t.business.slug;
  return userDisplayName(t.user);
}

function targetSubtitle(t: TargetMini) {
  if (t.kind === "BUSINESS") return t.business.slug || null;
  return t.user.profession || t.user.slug || null;
}

function toUserMiniFromContact(c: any): UserMini {
  return {
    userId: String(c?.userId),
    slug: String(c?.profileSlug ?? c?.slug ?? c?.userId),
    firstName: c?.firstName ?? null,
    lastName: c?.lastName ?? null,
    profession: c?.profession ?? null,
    profileImageUrl: c?.profileImageUrl ?? null,
  };
}

function toBusinessMini(b: any): BusinessMini {
  return {
    businessId: String(b?.businessId ?? b?.id ?? ""),
    slug: String(b?.businessSlug ?? b?.slug ?? ""),
    name: String(
      b?.businessName ?? b?.name ?? b?.businessSlug ?? b?.slug ?? "Business"
    ),
    logoUrl: b?.businessLogoUrl ?? b?.logoUrl ?? null,
  };
}

function initialsFromName(name: string | null | undefined) {
  const raw = clean(name);
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function personAvatar(name: string, imageUrl?: string | null) {
  if (imageUrl) {
    return <img className="referral-composer__avatarImg" src={imageUrl} alt={name} />;
  }
  return <div className="referral-composer__avatarFallback">{initialsFromName(name)}</div>;
}

function businessAvatar(name: string, imageUrl?: string | null) {
  if (imageUrl) {
    return <img className="referral-composer__avatarImg" src={imageUrl} alt={name} />;
  }
  return <div className="referral-composer__avatarFallback">{initialsFromName(name)}</div>;
}

function identityKey(i: IdentityOption | null | undefined) {
  if (!i?.participantType || !i?.participantId) return "";
  return `${i.participantType}:${String(i.participantId)}`;
}

function IdentityPicker(props: {
  identities: IdentityOption[];
  effectiveIdentity: IdentityOption;
  selectedKey: string;
  setSelectedKey: (k: string) => void;
  disabled?: boolean;
}) {
  const { identities, effectiveIdentity, selectedKey, setSelectedKey, disabled } = props;

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onMouseDownCapture = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
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
          <div className="identity-subtitle">
            {effectiveIdentity.subtitle || "Personal profile"}
          </div>
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
                  {i.subtitle ? (
                    <div className="identity-option-subtitle">{i.subtitle}</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectorRow({
  label,
  title,
  subtitle,
  avatar,
  onClick,
  disabled,
}: SelectorRowProps) {
  return (
    <div className="referral-composer__row">
      <label className="referral-composer__label">{label}</label>

      <button
        type="button"
        className="referral-composer__selector"
        onClick={onClick}
        disabled={disabled}
      >
        <div className="referral-composer__selectorLeft">
          <div className="referral-composer__selectorAvatar">{avatar}</div>

          <div className="referral-composer__selectorText">
            <div className="referral-composer__selectorTitle">{title}</div>
            {subtitle ? (
              <div className="referral-composer__selectorSubtitle">{subtitle}</div>
            ) : null}
          </div>
        </div>

        <div className="referral-composer__selectorChevron">›</div>
      </button>
    </div>
  );
}

function ReferralSelectPanel({
  mode,
  users,
  businesses,
  selectedProspect,
  selectedTarget,
  contactsLoading,
  businessLoading,
  onPickProspect,
  onPickBusinessTarget,
  onPickUserTarget,
  onRefreshContacts,
  onRefreshBusinesses,
}: SelectPanelProps) {
  const [query, setQuery] = useState("");
  const [targetFilter, setTargetFilter] = useState<TargetFilter>("ALL");

  useEffect(() => {
    setQuery("");
    setTargetFilter("ALL");
  }, [mode]);

  const q = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    const excludeUserId =
      mode === "TARGET" && selectedProspect ? String(selectedProspect.userId) : null;

    return users
      .filter((u) => {
        if (excludeUserId && String(u.userId) === excludeUserId) return false;
        if (!q) return true;

        const haystack = [userDisplayName(u), u.profession ?? "", u.slug ?? ""]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => userDisplayName(a).localeCompare(userDisplayName(b)));
  }, [users, q, mode, selectedProspect]);

  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter((b) => {
        if (!q) return true;
        const haystack = [b.name ?? "", b.slug ?? ""].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [businesses, q]);

  const showUsers = mode === "PROSPECT" || targetFilter === "ALL" || targetFilter === "USERS";
  const showBusinesses =
    mode === "TARGET" && (targetFilter === "ALL" || targetFilter === "BUSINESSES");

  return (
    <div className="referral-composer__picker">
      <div className="referral-composer__pickerToolbar">
        <input
          className="referral-composer__pickerSearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "PROSPECT" ? "Search contacts..." : "Search businesses or users..."
          }
        />

        <div className="referral-composer__pickerActions">
          <button
            type="button"
            className="referral-composer__pickerLink"
            onClick={() => void onRefreshContacts?.()}
            disabled={!!contactsLoading}
          >
            {contactsLoading ? "Refreshing contacts..." : "Refresh contacts"}
          </button>

          {mode === "TARGET" && (
            <button
              type="button"
              className="referral-composer__pickerLink"
              onClick={() => void onRefreshBusinesses?.()}
              disabled={!!businessLoading}
            >
              {businessLoading ? "Refreshing businesses..." : "Refresh businesses"}
            </button>
          )}
        </div>
      </div>

      {mode === "TARGET" && (
        <div className="referral-composer__pickerTabs">
          <button
            type="button"
            className={`referral-composer__pickerTab ${
              targetFilter === "ALL" ? "is-active" : ""
            }`}
            onClick={() => setTargetFilter("ALL")}
          >
            All
          </button>
          <button
            type="button"
            className={`referral-composer__pickerTab ${
              targetFilter === "BUSINESSES" ? "is-active" : ""
            }`}
            onClick={() => setTargetFilter("BUSINESSES")}
          >
            Businesses
          </button>
          <button
            type="button"
            className={`referral-composer__pickerTab ${
              targetFilter === "USERS" ? "is-active" : ""
            }`}
            onClick={() => setTargetFilter("USERS")}
          >
            Users
          </button>
        </div>
      )}

      <div className="referral-composer__pickerList">
        {showBusinesses &&
          filteredBusinesses.map((b) => {
            const selected =
              selectedTarget?.kind === "BUSINESS" &&
              String(selectedTarget.business.businessId) === String(b.businessId);

            return (
              <button
                key={`b:${b.businessId}`}
                type="button"
                className={`referral-composer__pickerItem ${selected ? "is-selected" : ""}`}
                onClick={() => onPickBusinessTarget(b)}
              >
                <div className="referral-composer__pickerAvatar">
                  {businessAvatar(b.name || "Business", b.logoUrl)}
                </div>

                <div className="referral-composer__pickerText">
                  <div className="referral-composer__pickerTitle">{b.name || "Business"}</div>
                  <div className="referral-composer__pickerMeta">{b.slug || "Business"}</div>
                </div>
              </button>
            );
          })}

        {showUsers &&
          filteredUsers.map((u) => {
            const selected =
              (mode === "PROSPECT" &&
                selectedProspect &&
                String(selectedProspect.userId) === String(u.userId)) ||
              (mode === "TARGET" &&
                selectedTarget?.kind === "USER" &&
                String(selectedTarget.user.userId) === String(u.userId));

            return (
              <button
                key={`u:${u.userId}`}
                type="button"
                className={`referral-composer__pickerItem ${selected ? "is-selected" : ""}`}
                onClick={() => (mode === "PROSPECT" ? onPickProspect(u) : onPickUserTarget(u))}
              >
                <div className="referral-composer__pickerAvatar">
                  {personAvatar(userDisplayName(u), u.profileImageUrl)}
                </div>

                <div className="referral-composer__pickerText">
                  <div className="referral-composer__pickerTitle">{userDisplayName(u)}</div>
                  <div className="referral-composer__pickerMeta">
                    {u.profession || u.slug || "User"}
                  </div>
                </div>
              </button>
            );
          })}

        {!filteredBusinesses.length && !filteredUsers.length && (
          <div className="referral-composer__pickerEmpty">No matches found.</div>
        )}
      </div>
    </div>
  );
}

function selectedProspectId(prospect: UserMini | null): string | null {
  return prospect ? String(prospect.userId) : null;
}

function selectedTargetId(target: TargetMini | null): string | null {
  if (!target) return null;
  return target.kind === "BUSINESS"
    ? String(target.business.businessId)
    : String(target.user.userId);
}

export default function ReferralComposer({
  open,
  intent,
  onResult,
  onCancel,
  tokenOverride,
}: ReferralComposerProps) {
  const {
    userContacts,
    businessContacts,
    contactsLoading,
    refreshContacts,
    myUserProfile,
    myUserId,
  } = useAppData() as any;

  const [prospect, setProspect] = useState<UserMini | null>(null);
  const [referralTarget, setReferralTarget] = useState<TargetMini | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [prospectOpen, setProspectOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessMini[]>([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  const [authUserId, setAuthUserId] = useState<string>("");
  const [selectedIdentityKey, setSelectedIdentityKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;
      setAuthUserId(session?.user?.id ? String(session.user.id) : "");
    }

    void loadSessionUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const userIdentity: IdentityOption | null = useMemo(() => {
    const uid = clean(myUserId) || clean(authUserId);
    if (!uid) return null;

    return {
      participantType: "USER",
      participantId: uid,
      title: myProfileDisplayName(myUserProfile as MyProfileLike),
      subtitle: "Personal profile",
      imageUrl: (myUserProfile as MyProfileLike | null | undefined)?.profileImageUrl ?? null,
    };
  }, [myUserProfile, myUserId, authUserId]);

  const identities = useMemo<IdentityOption[]>(() => {
    return userIdentity ? [userIdentity] : [];
  }, [userIdentity]);

  useEffect(() => {
    if (!open) return;

    setProspect(intent?.initialProspect ?? null);
    setReferralTarget(intent?.initialTarget ?? null);
    setNote(intent?.initialNote ?? "");
    setSubmitting(false);
    setError("");
    setProspectOpen(false);
    setTargetOpen(false);
    setSelectedIdentityKey(identityKey(userIdentity));
  }, [open, intent?.initialProspect, intent?.initialTarget, intent?.initialNote, userIdentity]);

  const effectiveIdentity = useMemo(() => {
    if (!identities.length) return null;
    return identities.find((i) => identityKey(i) === selectedIdentityKey) ?? identities[0];
  }, [identities, selectedIdentityKey]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (prospectOpen) {
          setProspectOpen(false);
          return;
        }
        if (targetOpen) {
          setTargetOpen(false);
          return;
        }
        onCancel?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, prospectOpen, targetOpen, onCancel]);

  async function getToken(): Promise<string> {
    if (tokenOverride) return tokenOverride;

    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);

    const token = data?.session?.access_token;
    if (!token) throw new Error("Not logged in.");

    return token;
  }

  async function refreshBusinesses() {
    try {
      setBusinessLoading(true);
      const items = await listMyBusinesses();
      setAvailableBusinesses((items ?? []).map(toBusinessMini));
    } catch {
      setAvailableBusinesses([]);
    } finally {
      setBusinessLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!contactsLoading && !userContacts.length && !businessContacts.length) {
      void refreshContacts?.();
    }
  }, [open, contactsLoading, userContacts.length, businessContacts.length, refreshContacts]);

  useEffect(() => {
    if (!open) return;
    if (targetOpen && !businessLoading && availableBusinesses.length === 0) {
      void refreshBusinesses();
    }
  }, [open, targetOpen, businessLoading, availableBusinesses.length]);

  const userMinis: UserMini[] = useMemo(() => {
    return (userContacts ?? [])
      .filter((c: any) => !!c?.userId)
      .map(toUserMiniFromContact);
  }, [userContacts]);

  const businessMinis: BusinessMini[] = useMemo(() => {
    const byId = new Map<string, BusinessMini>();

    (businessContacts ?? []).forEach((b: any) => {
      const id = String(b?.businessId ?? "");
      if (!id) return;
      byId.set(id, {
        businessId: id,
        slug: String(b?.businessSlug ?? b?.slug ?? ""),
        name: String(b?.businessName ?? b?.name ?? b?.businessSlug ?? "Business"),
        logoUrl: b?.businessLogoUrl ?? b?.logoUrl ?? null,
      });
    });

    (availableBusinesses ?? []).forEach((b) => {
      const id = String(b?.businessId ?? "");
      if (!id) return;
      if (!byId.has(id)) byId.set(id, b);
    });

    return Array.from(byId.values());
  }, [businessContacts, availableBusinesses]);

  const userMiniById = useMemo(() => {
    const map = new Map<string, UserMini>();
    userMinis.forEach((u) => map.set(String(u.userId), u));
    return map;
  }, [userMinis]);

  const businessMiniById = useMemo(() => {
    const map = new Map<string, BusinessMini>();
    businessMinis.forEach((b) => map.set(String(b.businessId), b));
    return map;
  }, [businessMinis]);

  function handleProspectSelectedId(id: string | null) {
  if (!id) {
    setProspect(null);
    return;
  }

  const found = userMiniById.get(String(id)) ?? null;
  setProspect(found);
}

function handleTargetSelectedId(id: string | null) {
  if (!id) {
    setReferralTarget(null);
    return;
  }

  const business = businessMiniById.get(String(id));
  if (business) {
    setReferralTarget({ kind: "BUSINESS", business });
    return;
  }

  const user = userMiniById.get(String(id));
  if (user) {
    if (prospect && String(prospect.userId) === String(user.userId)) {
      return;
    }
    setReferralTarget({ kind: "USER", user });
  }
}

  useEffect(() => {
    if (!prospect || !referralTarget) return;

    if (
      referralTarget.kind === "USER" &&
      String(referralTarget.user.userId) === String(prospect.userId)
    ) {
      setReferralTarget(null);
    }
  }, [prospect, referralTarget]);

  const canSubmit = useMemo(() => {
    if (!effectiveIdentity) return false;
    if (!prospect) return false;
    if (!referralTarget) return false;

    if (
      referralTarget.kind === "USER" &&
      String(referralTarget.user.userId) === String(prospect.userId)
    ) {
      return false;
    }

    return true;
  }, [effectiveIdentity, prospect, referralTarget]);

  const validationMessage = useMemo(() => {
    if (!effectiveIdentity) return "Loading your profile.";
    if (!prospect) return "Select a prospect.";
    if (!referralTarget) return "Select a business.";
    if (
      referralTarget.kind === "USER" &&
      String(referralTarget.user.userId) === String(prospect.userId)
    ) {
      return "Prospect and business user cannot be the same.";
    }
    return "";
  }, [effectiveIdentity, prospect, referralTarget]);

  async function handleSubmit() {
    setError("");

    if (!canSubmit) {
      setError(validationMessage || "Please complete all fields.");
      return;
    }

    if (!prospect || !referralTarget) return;

    setSubmitting(true);
    try {
      const token = await getToken();

      const req: CreateReferralV2Request = buildCreateReferralRequest({
        prospect,
        target: referralTarget,
        note: safeTrim(note),
      });

      const result = await createReferralOrRecommendation(token, req);
      onResult?.(result);
      onCancel?.();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }


  if (!open) return null;

  return (
    <>
      <div
        className="new-chat-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onCancel?.();
        }}
      >
        <div
          className="new-chat-drawer referral-drawer"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="new-chat-header referral-composer__drawerHeader">
            <div className="new-chat-title">Create referral</div>

            {effectiveIdentity ? (
              <IdentityPicker
                identities={identities}
                effectiveIdentity={effectiveIdentity}
                selectedKey={selectedIdentityKey || identityKey(effectiveIdentity)}
                setSelectedKey={setSelectedIdentityKey}
                disabled={identities.length <= 1 || submitting}
              />
            ) : (
              <div className="loading">Loading profile…</div>
            )}

            <button
              className="new-chat-close"
              onClick={onCancel}
              aria-label="Close"
              disabled={submitting}
            >
              ✕
            </button>
          </div>

          <div className="new-chat-body referral-composer__body">
            <div className="referral-composer__subtitle">
              Choose a prospect and who the referral is for.
            </div>

            <SelectorRow
              label="Prospect"
              title={prospect ? userDisplayName(prospect) : "Select a prospect"}
              subtitle={
                prospect ? prospect.profession || prospect.slug || null : "Choose from contacts"
              }
              avatar={
                prospect ? (
                  personAvatar(userDisplayName(prospect), prospect.profileImageUrl)
                ) : (
                  <div className="referral-composer__avatarFallback">+</div>
                )
              }
              onClick={() => setProspectOpen(true)}
              disabled={submitting || contactsLoading}
            />

            <SelectorRow
              label="Business"
              title={
                referralTarget ? targetDisplayName(referralTarget) : "Select a business or user"
              }
              subtitle={
                referralTarget
                  ? targetSubtitle(referralTarget)
                  : "Choose a business or a user acting as the business side"
              }
              avatar={
                referralTarget ? (
                  referralTarget.kind === "BUSINESS" ? (
                    businessAvatar(
                      referralTarget.business.name || "Business",
                      referralTarget.business.logoUrl
                    )
                  ) : (
                    personAvatar(
                      userDisplayName(referralTarget.user),
                      referralTarget.user.profileImageUrl
                    )
                  )
                ) : (
                  <div className="referral-composer__avatarFallback">+</div>
                )
              }
              onClick={() => setTargetOpen(true)}
              disabled={submitting}
            />

            <div className="referral-composer__row">
              <label className="referral-composer__label">Note (optional)</label>
              <div className="referral-composer__control">
                <textarea
                  className="referral-composer__textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add context..."
                  rows={4}
                  disabled={submitting}
                />
              </div>
            </div>

            {!error && !canSubmit && validationMessage ? (
              <div className="referral-composer__hint">{validationMessage}</div>
            ) : null}

            {error ? <div className="referral-composer__error">{error}</div> : null}
          </div>

          <div className="referral-composer__footer">
            <button
              type="button"
              className="referral-composer__cancel"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="referral-composer__submit"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              title={!canSubmit ? validationMessage : ""}
            >
              {submitting ? "Creating..." : "Create referral"}
            </button>
          </div>

          {/* Prospect selector */}
          <ReferralContactSelectPanel
            open={prospectOpen}
            onClose={() => setProspectOpen(false)}
            mode="PROSPECT"
            userContacts={userContacts}
            businessContacts={[]}
            selectedId={selectedProspectId(prospect)}
            setSelectedId={(id) => {
              handleProspectSelectedId(id);
              if (id) setProspectOpen(false);
            }}
            contactsLoading={contactsLoading}
            refreshContacts={refreshContacts}
            disabled={submitting}
          />

          {/* Target selector */}
          <ReferralContactSelectPanel
            open={targetOpen}
            onClose={() => setTargetOpen(false)}
            mode="TARGET"
            userContacts={userContacts}
            businessContacts={businessContacts as any}
            selectedId={selectedTargetId(referralTarget)}
            setSelectedId={(id) => {
              handleTargetSelectedId(id);
              if (id) setTargetOpen(false);
            }}
            contactsLoading={contactsLoading}
            refreshContacts={refreshContacts}
            disabled={submitting}
            excludeUserId={prospect ? String(prospect.userId) : null}
          />
        </div>
      </div>
    </>
  );
}