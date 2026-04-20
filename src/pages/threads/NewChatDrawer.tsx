import { useEffect, useMemo, useRef, useState } from "react";
import type { ParticipantType, UUID } from "../../types/threads";

import { useAppData } from "../../context/AppDataContext";

import type { IdentityOption } from "./useIdentitySelector";

export type { IdentityOption } from "./useIdentitySelector";

import ContactPickerModal, { type PickerItem } from "../../components/contacts/ContactPickerModal";
import AddContactModal from "../../components/contacts/AddContactModal";

import "../../css/new-chat-drawer.css";

export type ChatContact = {
  userId: UUID | null;
  businessId: UUID | null;
  displayName: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

type MyProfileLike = {
  slug?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
};

type AddedContactLike = {
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileSlug?: string | null;
  profileImageUrl?: string | null;
  email?: string | null;
  phone?: string | null;
};

function safeText(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function userDisplayName(u: any): string {
  const fn = safeText(u?.firstName);
  const ln = safeText(u?.lastName);
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  const slug = safeText(u?.profileSlug ?? u?.slug);
  return slug || "You";
}

function addedContactToPendingTarget(contact: AddedContactLike): {
  participantType: ParticipantType;
  participantId: UUID;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
} | null {
  const userId = safeText(contact?.userId);
  if (!userId) return null;

  const title =
    `${safeText(contact?.firstName)} ${safeText(contact?.lastName)}`.trim() ||
    safeText(contact?.profileSlug) ||
    "User";

  return {
    participantType: "USER",
    participantId: userId as UUID,
    title,
    subtitle: safeText(contact?.profileSlug) || null,
    imageUrl: contact?.profileImageUrl ?? null,
  };
}

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
    participantId: String(opts.myUserId ?? "") as UUID,
    title: userTitle,
    subtitle: "Personal profile",
    imageUrl: userImageUrl,
  };

  const bizIdentities: IdentityOption[] = (opts.myBusinesses ?? []).map((b: any) => ({
    participantType: "BUSINESS",
    participantId: String(b.businessId) as UUID,
    title: safeText(b.businessName ?? b.name) || "Business",
    subtitle: safeText(b.role) ? `Business (${String(b.role)})` : "Business",
    imageUrl: b.businessLogoUrl ?? b.logoUrl ?? null,
  }));

  const identities = [userIdentity, ...bizIdentities];

  let defaultIdentity: IdentityOption | null = userIdentity;
  const primaryId = opts.primaryBusiness?.businessId ? String(opts.primaryBusiness.businessId) : null;

  if (primaryId) {
    const match = bizIdentities.find((i) => String(i.participantId) === primaryId);
    if (match) defaultIdentity = match;
  }

  return { identities, defaultIdentity };
}

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
            <div className="identity-subtitle">Choose who you are chatting as</div>
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

export default function NewChatDrawer(props: {
  isOpen: boolean;
  onClose: () => void;

  identitySelection?: {
    selectedKey: string | null;
    setSelectedKey: (k: string) => void;
  };

  identities?: Array<IdentityOption | null | undefined>;
  defaultIdentity?: IdentityOption | null;

  contacts?: ChatContact[];
  loading?: boolean;
  error?: string | null;

  myProfile?: MyProfileLike | null;
  myUserId?: string | null;

  onSelectContact: (opts: {
    asIdentity: IdentityOption;
    target: { participantType: ParticipantType; participantId: UUID };
    initialMessage: string;
  }) => void;
}) {
  const {
    isOpen,
    onClose,
    onSelectContact,

    identitySelection,

    identities: identitiesOverride,
    defaultIdentity: defaultIdentityOverride,
    contacts: contactsOverride,
    loading: loadingOverride,
    error: errorOverride,

    myProfile,
    myUserId,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<{
    participantType: ParticipantType;
    participantId: UUID;
    title: string;
    subtitle?: string | null;
    imageUrl?: string | null;
  } | null>(null);
  const [draftMessage, setDraftMessage] = useState("");

  const {
    userContacts,
    businessContacts,
    contactsLoading,
    myBusinesses,
    primaryBusiness,
    businessLoading,
  } = useAppData();

  const derivedLoading = loadingOverride ?? contactsLoading ?? businessLoading ?? false;
  const derivedError = errorOverride ?? null;

  const { identities: derivedIdentities, defaultIdentity: derivedDefaultIdentity } = useMemo(() => {
    if (identitiesOverride && identitiesOverride.length) {
      return {
        identities: identitiesOverride.filter(Boolean) as IdentityOption[],
        defaultIdentity: defaultIdentityOverride ?? null,
      };
    }

    return toIdentityOptionsFromStore({
      myProfile: myProfile ?? null,
      myUserId: myUserId ?? null,
      myBusinesses: (myBusinesses ?? []) as any[],
      primaryBusiness: (primaryBusiness ?? null) as any,
    });
  }, [
    identitiesOverride,
    defaultIdentityOverride,
    myProfile,
    myUserId,
    myBusinesses,
    primaryBusiness,
  ]);

  const safeIdentities = useMemo(() => derivedIdentities.filter(Boolean), [derivedIdentities]);

  const identityKey = (i: IdentityOption) => `${i.participantType}:${String(i.participantId)}`;
  const derivedDefaultKey = useMemo(() => {
    const def = (defaultIdentityOverride ?? derivedDefaultIdentity ?? null) as IdentityOption | null;
    const fallback = safeIdentities[0] ?? null;
    const picked = def ?? fallback;
    return picked ? identityKey(picked) : "";
  }, [defaultIdentityOverride, derivedDefaultIdentity, safeIdentities]);

  const STORAGE_KEY = "threads.identity.selected";

  const [internalSelectedKey, setInternalSelectedKey] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const selectedKey =
    identitySelection?.selectedKey ?? (internalSelectedKey || derivedDefaultKey);

  const setSelectedKey =
    identitySelection?.setSelectedKey ?? setInternalSelectedKey;

  useEffect(() => {
    if (!safeIdentities.length) return;
    const exists = safeIdentities.some((i) => identityKey(i) === selectedKey);
    if (!exists) {
      setSelectedKey(derivedDefaultKey || identityKey(safeIdentities[0]));
    }
  }, [safeIdentities, selectedKey, derivedDefaultKey, setSelectedKey]);

  useEffect(() => {
    if (identitySelection) return;
    if (!selectedKey) return;
    try {
      localStorage.setItem(STORAGE_KEY, selectedKey);
    } catch {
      // ignore
    }
  }, [identitySelection, selectedKey]);

  const effectiveIdentity: IdentityOption | null = useMemo(() => {
    if (!safeIdentities.length) return null;
    const match = safeIdentities.find((i) => identityKey(i) === selectedKey);
    return match ?? safeIdentities[0] ?? null;
  }, [safeIdentities, selectedKey]);

  const pickerUsers = useMemo(() => {
    if (contactsOverride) {
      return (contactsOverride ?? [])
        .filter((c) => !!c.userId)
        .map((c) => ({
          userId: c.userId,
          firstName: c.displayName,
          lastName: "",
          slug: c.subtitle ?? c.displayName,
          profileImageUrl: c.imageUrl ?? null,
        })) as any[];
    }

    return ((userContacts as any) ?? []).map((u: any) => ({
      userId: String(u.userId),
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      slug: u.profileSlug ?? u.slug ?? String(u.userId),
      profileImageUrl: u.profileImageUrl ?? null,
      profession: u.profession ?? null,
      email: u.email ?? null,
      phone: u.phone ?? null,
    }));
  }, [contactsOverride, userContacts]);

  const pickerBusinesses = useMemo(() => {
    if (contactsOverride) {
      return (contactsOverride ?? [])
        .filter((c) => !!c.businessId)
        .map((c) => ({
          businessId: c.businessId,
          name: c.displayName,
          slug: c.subtitle ?? c.displayName,
          logoUrl: c.imageUrl ?? null,
          profession: c.subtitle ?? null,
        })) as any[];
    }

    return ((businessContacts as any) ?? []).map((b: any) => ({
      businessId: String(b.businessId),
      name: b.name ?? "Business",
      slug: b.slug ?? String(b.businessId),
      logoUrl: b.businessLogoUrl ?? b.logoUrl ?? null,
    }));
  }, [contactsOverride, businessContacts]);

  useEffect(() => {
    if (!isOpen) {
      setPickerOpen(false);
      setAddContactOpen(false);
      setPendingTarget(null);
      setDraftMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!effectiveIdentity) {
    return (
      <div
        className="new-chat-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="new-chat-drawer">
          <div className="new-chat-header">
            <div className="new-chat-title">New chat</div>
            <div style={{ padding: 12, opacity: 0.7 }}>Loading profiles…</div>
          </div>
        </div>
      </div>
    );
  }

  const nothingToPick = pickerUsers.length + pickerBusinesses.length === 0;
  const canSend = draftMessage.trim().length > 0;

  function stageCreatedContact(contact: AddedContactLike) {
    const target = addedContactToPendingTarget(contact);
    if (!target) return;

    setPickerOpen(false);
    setAddContactOpen(false);
    setDraftMessage("");
    setPendingTarget(target);
  }

  return (
    <div
      className="new-chat-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="new-chat-drawer"
        ref={containerRef}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="new-chat-header">
          <div className="new-chat-title">New chat</div>

          <IdentityPicker
            identities={safeIdentities}
            effectiveIdentity={effectiveIdentity}
            selectedKey={selectedKey || identityKey(effectiveIdentity)}
            setSelectedKey={setSelectedKey}
            identityKey={identityKey}
            disabled={safeIdentities.length === 0}
          />

          <button className="new-chat-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="new-chat-body">
          {derivedLoading && <div className="loading">Loading contacts…</div>}
          {derivedError && <div className="error">{derivedError}</div>}

          {!derivedLoading && !derivedError && nothingToPick && (
            <div className="new-chat-picker">
              <div className="empty">No contacts available</div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setAddContactOpen(true)}
                >
                  Add contact
                </button>
              </div>
            </div>
          )}

          {!derivedLoading && !derivedError && !nothingToPick && (
            <>
              {!pendingTarget && (
                <div className="new-chat-picker">
                  <button
                    type="button"
                    className="pick-contact-btn"
                    onClick={() => setPickerOpen(true)}
                  >
                    Pick a contact…
                  </button>
                  <div className="hint">Choose a person or business to start a new thread.</div>
                </div>
              )}

              {pendingTarget && (
                <div className="new-chat-compose">
                  <button
                    type="button"
                    className="to-chip"
                    onClick={() => {
                      setPendingTarget(null);
                      setDraftMessage("");
                      setPickerOpen(true);
                    }}
                  >
                    {pendingTarget.imageUrl ? (
                      <img src={pendingTarget.imageUrl} alt="" />
                    ) : (
                      <div className="to-avatar-fallback">
                        {pendingTarget.title?.[0]?.toUpperCase() ?? "•"}
                      </div>
                    )}

                    <div className="to-chip-text">
                      <div className="to-title">{pendingTarget.title}</div>
                      <div className="to-subtitle">
                        {pendingTarget.subtitle ? pendingTarget.subtitle : "Selected recipient"}
                      </div>
                    </div>

                    <div className="to-chevron" aria-hidden="true">
                      ▾
                    </div>
                  </button>

                  <textarea
                    className="compose-textarea"
                    placeholder="Type your first message…"
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    rows={4}
                  />

                  <div className="compose-actions">
                    <button
                      type="button"
                      className="cpm__btn cpm__btn--ghost"
                      onClick={() => {
                        setPendingTarget(null);
                        setDraftMessage("");
                      }}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="cpm__btn cpm__btn--primary"
                      disabled={!canSend}
                      onClick={() => {
                        const msg = draftMessage.trim();
                        if (!msg || !pendingTarget) return;

                        onSelectContact({
                          asIdentity: effectiveIdentity,
                          target: {
                            participantType: pendingTarget.participantType,
                            participantId: pendingTarget.participantId,
                          },
                          initialMessage: msg,
                        });

                        onClose();
                      }}
                    >
                      Send
                    </button>
                  </div>

                  {!canSend && (
                    <div className="hint" style={{ marginTop: 10 }}>
                      Type a message to start the thread.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <ContactPickerModal
            open={pickerOpen}
            title="Start a new chat"
            onClose={() => setPickerOpen(false)}
            users={pickerUsers as any}
            businesses={pickerBusinesses as any}
            multiple={false}
            excludeKeys={myUserId ? [`u:${myUserId}`] : []}
            defaultFilter="ALL"
            mountIn={containerRef.current}
            onAddContact={() => {
              setPickerOpen(false);
              setAddContactOpen(true);
            }}
            addContactLabel="Add contact"
            onConfirm={(items: PickerItem[]) => {
              const it = items?.[0];
              if (!it) return;

              const target =
                it.kind === "USER"
                  ? ({
                      participantType: "USER" as const,
                      participantId: String(it.user.userId) as UUID,
                    } as const)
                  : ({
                      participantType: "BUSINESS" as const,
                      participantId: String(it.business.businessId) as UUID,
                    } as const);

              setPickerOpen(false);
              setDraftMessage("");

              if (it.kind === "USER") {
                const title =
                  `${it.user?.firstName ?? ""} ${it.user?.lastName ?? ""}`.trim() ||
                  it.user?.slug ||
                  "User";

                setPendingTarget({
                  ...target,
                  title,
                  subtitle: it.user?.profession ?? it.user?.slug ?? null,
                  imageUrl: it.user?.profileImageUrl ?? null,
                });
              } else {
                setPendingTarget({
                  ...target,
                  title: it.business?.name ?? "Business",
                  subtitle: it.business?.slug ?? null,
                  imageUrl: it.business?.logoUrl ?? null,
                });
              }
            }}
          />

          <AddContactModal
            open={addContactOpen}
            title="Add contact to start chat"
            onClose={() => setAddContactOpen(false)}
            onAdded={(createdContact) => {
              stageCreatedContact(createdContact);
            }}
          />
        </div>
      </div>
    </div>
  );
}