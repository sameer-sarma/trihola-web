import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BroadcastRecipientsPanel from "./components/BroadcastRecipientsPanel";
import BroadcastMessageItemPanel from "./components/BroadcastMessageItemPanel";
import BroadcastCtaItemPanel from "./components/BroadcastCtaItemPanel";
import BroadcastOfferItemPanel from "./components/BroadcastOfferItemPanel";
import BroadcastItemCard from "./components/BroadcastItemCard";
import BroadcastOrderItemPanel from "./components/BroadcastOrderItemPanel";
import { listOwnerProducts } from "../../services/productService";
import { listOwnerBundles } from "../../services/bundleService";
import type { OrderCatalogOption } from "../../components/CreateOrderModal";

import type { ContactLite } from "../../components/contacts/ContactMultiSelect";
import { useAppData } from "../../context/AppDataContext";

import type { IdentityOption } from "./useIdentitySelector";

import type { 
  ParticipantIdentity,
  ThreadInboxComposerPermissionsDTO,
 } from "../../types/threads";

import type {
  BroadcastDraft,
  BroadcastItemDraft,
  BroadcastMessageItemDraft,
  BroadcastCtaItemDraft,
  BroadcastOfferItemDraft,
  BroadcastOrderItemDraft,
  BroadcastRecipientCreateDTO,
} from "../../types/broadcasts";
import type { OfferTemplateResponse } from "../../types/offerTemplateTypes";

import { listOfferTemplates } from "../../services/offerTemplateService";

import {
  contactDisplayName,
  draftItemToCreateDto,
  mergeContacts,
  selectedContactsFromIds,
  selectedIdsToBroadcastRecipients,
} from "../../utils/broadcastHelpers";

import "../../css/new-chat-drawer.css";
import "../../css/add-referral-cta.css";
import "../../css/thread-page.css";
import "../../css/broadcast-composer.css";

type Props = {
  open: boolean;
  onClose: () => void;
  viewingAs: IdentityOption | null;
  identities: IdentityOption[];
  defaultIdentity: IdentityOption | null;
  uploaderUserId: string;
  uploadContextId: string;
  permissionsByIdentity?: ThreadInboxComposerPermissionsDTO[];
  onCreate: (payload: {
    senderIdentity: ParticipantIdentity;
    title: string;
    recipients: BroadcastRecipientCreateDTO[];
    items: ReturnType<typeof draftItemToCreateDto>[];
  }) => Promise<void>;
  onAccepted?: (message: string) => void;
};

function identityKey(i: IdentityOption | null | undefined) {
  if (!i?.participantType || !i?.participantId) return "";
  return `${i.participantType}:${String(i.participantId)}`;
}

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function emptyRewardDraft() {
  return {
    enabled: false,
    offerTemplateId: "",
    maxRedemptionsOverrideText: "",
    notes: "",
  };
}

function emptyRewardsDraft() {
  return {
    assigneeOnCompletion: emptyRewardDraft(),
    prospectOnReferralCreation: emptyRewardDraft(),
    referrerOnReferralCreation: emptyRewardDraft(),
  };
}

function makeEmptyMessageDraft(): BroadcastMessageItemDraft {
  return {
    localId: makeLocalId(),
    itemType: "MESSAGE",
    messageText: "",
    payload: { attachments: [] },
  };
}

function makeEmptyCtaDraft(
  kind: "REFERRAL_ADD" | "RECOMMEND_BUSINESS" = "REFERRAL_ADD"
): BroadcastCtaItemDraft {
  return {
    localId: makeLocalId(),
    itemType: "CTA",
    ctaKind: kind,
    ctaConfig: {
      message: "",
      requestedCount: 1,
      referralDefaults: {
        suggestedNote: "",
        attachments: [],
      },
      rewards: emptyRewardsDraft(),
    },
    schedule: {
      dueAt: null,
      expiresAt: null,
    },
  };
}

function makeEmptyOfferDraft(): BroadcastOfferItemDraft {
  return {
    localId: makeLocalId(),
    itemType: "OFFER",
    offerTemplateId: null,
    note: "",
    maxRedemptionsOverride: "",
    schedule: {
      dueAt: null,
      expiresAt: null,
    },
  };
}

function makeEmptyOrderDraft(): BroadcastOrderItemDraft {
  return {
    localId: makeLocalId(),
    itemType: "ORDER",
    grossAmount: "",
    inScopeAmount: "",
    summary: "",
    notes: "",
    paymentInstructionsJson: "",
    items: [],
  };
}

function makeUploadContextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `broadcast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
            {effectiveIdentity.subtitle || "Choose identity"}
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

export default function BroadcastComposerModal({
  open,
  onClose,
  identities,
  defaultIdentity,
  uploaderUserId,
  uploadContextId,
  permissionsByIdentity = [],
  onCreate,
  onAccepted,
}: Props) {
  const { userContacts, contactsLoading, refreshContacts } = useAppData() as any;

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const contacts: ContactLite[] = useMemo(() => {
    return mergeContacts((userContacts ?? []) as ContactLite[], []);
  }, [userContacts]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [draftUploadContextId, setDraftUploadContextId] = useState<string>("");

  const [offerTemplates, setOfferTemplates] = useState<OfferTemplateResponse[]>([]);
  const [offerTemplatesLoading, setOfferTemplatesLoading] = useState(false);

  const [orderProductOptions, setOrderProductOptions] = useState<OrderCatalogOption[]>([]);
  const [orderBundleOptions, setOrderBundleOptions] = useState<OrderCatalogOption[]>([]);

  const [draft, setDraft] = useState<BroadcastDraft>({
    senderIdentity: null,
    title: "",
    recipients: [],
    items: [],
  });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [stagedNewItem, setStagedNewItem] = useState<BroadcastItemDraft | null>(null);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [itemEditorType, setItemEditorType] = useState<"MESSAGE" | "CTA" | "OFFER" | "ORDER" | null>(null);

  const derivedDefaultKey = useMemo(
    () => identityKey(defaultIdentity ?? identities[0] ?? null),
    [defaultIdentity, identities]
  );

  useEffect(() => {
    if (!open) return;

    setSelectedKey(derivedDefaultKey);
    setSelectedIds([]);
    setSubmitting(false);
    setErr(null);
    setRecipientModalOpen(false);
    setItemEditorOpen(false);
    setEditingItemId(null);
    setStagedNewItem(null);
    setItemEditorType(null);
    setDraftUploadContextId(makeUploadContextId());
    setOfferTemplates([]);
    setOfferTemplatesLoading(false);
    setOrderProductOptions([]);
    setOrderBundleOptions([]);

    setDraft({
      senderIdentity: null,
      title: "",
      recipients: [],
      items: [],
    });
  }, [open, derivedDefaultKey]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if ((userContacts?.length ?? 0) > 0) return;
    if (contactsLoading) return;
    refreshContacts().catch(() => {});
  }, [open, userContacts?.length, contactsLoading, refreshContacts]);

  useEffect(() => {
    if (!identities.length) return;
    if (identities.some((i) => identityKey(i) === selectedKey)) return;
    setSelectedKey(derivedDefaultKey || identityKey(identities[0]));
  }, [identities, selectedKey, derivedDefaultKey]);

  const effectiveIdentity: IdentityOption | null = useMemo(() => {
    if (!identities.length) return null;
    return (
      identities.find((i) => identityKey(i) === selectedKey) ??
      identities.find((i) => identityKey(i) === derivedDefaultKey) ??
      identities[0] ??
      null
    );
  }, [identities, selectedKey, derivedDefaultKey]);

  const currentComposerPerm = useMemo(() => {
    if (!effectiveIdentity) return null;

    const key = `${effectiveIdentity.participantType}:${String(effectiveIdentity.participantId)}`;

    return (
      permissionsByIdentity.find(
        (p) =>
          `${p.asIdentity.participantType}:${String(p.asIdentity.participantId)}` === key
      ) ?? null
    );
  }, [permissionsByIdentity, effectiveIdentity]);

  const senderIdentity: ParticipantIdentity | null = useMemo(() => {
    if (!effectiveIdentity?.participantType || !effectiveIdentity?.participantId) return null;
    return {
      participantType: effectiveIdentity.participantType,
      participantId: effectiveIdentity.participantId,
    };
  }, [effectiveIdentity]);

  const actingBusinessId = useMemo(() => {
    return effectiveIdentity?.participantType === "BUSINESS"
      ? String(effectiveIdentity.participantId)
      : null;
  }, [effectiveIdentity]);

  const announcementPerm = currentComposerPerm?.announcement ?? null;

  const canAddMessageItem = !!announcementPerm?.canAddMessageItem;
  const canAddOfferItem = !!announcementPerm?.canAddOfferItem;
  const canAddOrderItem = !!announcementPerm?.canAddOrderItem;
  const canAddRequestItem = !!announcementPerm?.canAddRequestItem;

  const canAskForReferrals = !!announcementPerm?.canAskForReferrals;
  const canAskForRecommendations = !!announcementPerm?.canAskForRecommendations;

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      recipients: selectedIdsToBroadcastRecipients(contacts, selectedIds),
    }));
  }, [contacts, selectedIds]);

  useEffect(() => {
    if (!open) return;
    if (!actingBusinessId || !canAddOfferItem) {
      setOfferTemplates([]);
      setOfferTemplatesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setOfferTemplatesLoading(true);
      try {
        const res = await listOfferTemplates(actingBusinessId);

        if (!cancelled) {
          setOfferTemplates(res ?? []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setOfferTemplates([]);
          setErr((prev) => prev ?? (e?.message ?? "Failed to load offers"));
        }
      } finally {
        if (!cancelled) {
          setOfferTemplatesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, actingBusinessId, canAddOfferItem]);

  useEffect(() => {
    if (!open) return;
    if (!actingBusinessId || !canAddOrderItem) {
      setOrderProductOptions([]);
      setOrderBundleOptions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [products, bundles] = await Promise.all([
          listOwnerProducts(actingBusinessId),
          listOwnerBundles(actingBusinessId),
        ]);

        if (cancelled) return;

        setOrderProductOptions(
          (products ?? []).map((p: any) => ({
            id: String(p.productId ?? p.id),
            label: String(p.name ?? p.title ?? "Product"),
          }))
        );

        setOrderBundleOptions(
          (bundles ?? []).map((b: any) => ({
            id: String(b.bundleId ?? b.id),
            label: String(b.name ?? b.title ?? "Bundle"),
          }))
        );
      } catch (e: any) {
        if (cancelled) return;
        setOrderProductOptions([]);
        setOrderBundleOptions([]);
        setErr((prev) => prev ?? (e?.message ?? "Failed to load catalog"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, actingBusinessId, canAddOrderItem]);

  const editingItem = useMemo<BroadcastItemDraft | null>(() => {
    if (stagedNewItem) return stagedNewItem;
    return draft.items.find((x) => x.localId === editingItemId) ?? null;
  }, [draft.items, editingItemId, stagedNewItem]);

  const openMessageItemEditor = useCallback((localId?: string) => {
    setItemEditorType("MESSAGE");

    if (localId) {
      setEditingItemId(localId);
      setStagedNewItem(null);
      setItemEditorOpen(true);
      return;
    }

    setEditingItemId(null);
    setStagedNewItem(makeEmptyMessageDraft());
    setItemEditorOpen(true);
  }, []);

  const openCtaItemEditor = useCallback((localId?: string) => {
    setItemEditorType("CTA");

    if (localId) {
      setEditingItemId(localId);
      setStagedNewItem(null);
      setItemEditorOpen(true);
      return;
    }

    setEditingItemId(null);

    const defaultKind: "REFERRAL_ADD" | "RECOMMEND_BUSINESS" =
      canAskForReferrals
        ? "REFERRAL_ADD"
        : "RECOMMEND_BUSINESS";

    setStagedNewItem(makeEmptyCtaDraft(defaultKind));
    setItemEditorOpen(true);
  }, []);

  const openOfferItemEditor = useCallback((localId?: string) => {
    setItemEditorType("OFFER");

    if (localId) {
      setEditingItemId(localId);
      setStagedNewItem(null);
      setItemEditorOpen(true);
      return;
    }

    setEditingItemId(null);
    setStagedNewItem(makeEmptyOfferDraft());
    setItemEditorOpen(true);
  }, []);

  const openOrderItemEditor = useCallback((localId?: string) => {
    setItemEditorType("ORDER");

    if (localId) {
      setEditingItemId(localId);
      setStagedNewItem(null);
      setItemEditorOpen(true);
      return;
    }

    setEditingItemId(null);
    setStagedNewItem(makeEmptyOrderDraft());
    setItemEditorOpen(true);
  }, []);

  const closeItemEditor = useCallback(() => {
    setItemEditorOpen(false);
    setEditingItemId(null);
    setStagedNewItem(null);
    setItemEditorType(null);
  }, []);

  const deleteItem = useCallback((localId: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((x) => x.localId !== localId),
    }));
  }, []);

  const moveItem = useCallback((localId: string, dir: -1 | 1) => {
    setDraft((prev) => {
      const idx = prev.items.findIndex((x) => x.localId === localId);
      if (idx < 0) return prev;

      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.items.length) return prev;

      const next = [...prev.items];
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);

      return { ...prev, items: next };
    });
  }, []);

  const selectedContacts = useMemo(() => {
    return selectedContactsFromIds(contacts, selectedIds);
  }, [contacts, selectedIds]);

  const hasUsableItems = useMemo(() => {
    return draft.items.some((item) => {
      if (item.itemType === "MESSAGE") {
        const attachmentCount = item.payload?.attachments?.length ?? 0;
        return item.messageText.trim().length > 0 || attachmentCount > 0;
      }

      if (item.itemType === "CTA") {
        return typeof item.ctaKind === "string" && item.ctaKind.trim().length > 0;
      }

      if (item.itemType === "OFFER") {
        return typeof item.offerTemplateId === "string" && item.offerTemplateId.length > 0;
      }

      if (item.itemType === "ORDER") {
        return item.grossAmount.trim().length > 0;
      }

      return false;
    });
  }, [draft.items]);

  const canSubmit =
    !!senderIdentity &&
    draft.title.trim().length > 0 &&
    draft.recipients.length > 0 &&
    draft.items.length > 0 &&
    hasUsableItems &&
    !submitting;

  async function submit() {
    setErr(null);

    if (!senderIdentity) {
      setErr("Please choose who you are sending as.");
      return;
    }

    if (!draft.title.trim()) {
      setErr("Please enter an announcement title.");
      return;
    }

    if (draft.recipients.length === 0) {
      setErr("Please select at least one recipient.");
      return;
    }

    if (draft.items.length === 0) {
      setErr("Please add at least one announcement item.");
      return;
    }

    if (!hasUsableItems) {
      setErr("Please add valid content to at least one item.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreate({
        senderIdentity,
        title: draft.title.trim(),
        recipients: draft.recipients,
        items: draft.items.map(draftItemToCreateDto),
      });

      onAccepted?.("Announcement is being sent");
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to queue announcement.");
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
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="new-chat-drawer broadcast-drawer"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="new-chat-header">
            <div className="new-chat-title">New announcement</div>

            {effectiveIdentity ? (
              <IdentityPicker
                identities={identities}
                effectiveIdentity={effectiveIdentity}
                selectedKey={selectedKey || identityKey(effectiveIdentity)}
                setSelectedKey={setSelectedKey}
                disabled={identities.length === 0 || submitting}
              />
            ) : (
              <div className="loading">Loading profiles…</div>
            )}

            <button className="new-chat-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <BroadcastMessageItemPanel
            open={itemEditorOpen && itemEditorType === "MESSAGE"}
            onClose={closeItemEditor}
            initialValue={
              editingItem && editingItem.itemType === "MESSAGE"
                ? {
                    itemType: "MESSAGE",
                    messageText: editingItem.messageText ?? null,
                    payload:
                      (editingItem.payload?.attachments?.length ?? 0) > 0
                        ? { attachments: editingItem.payload!.attachments }
                        : null,
                  }
                : null
            }
            onSave={(item) => {
              const mapped: BroadcastMessageItemDraft = {
                localId:
                  editingItemId ??
                  (stagedNewItem?.itemType === "MESSAGE" ? stagedNewItem.localId : null) ??
                  makeLocalId(),
                itemType: "MESSAGE",
                messageText: item.messageText ?? "",
                payload: {
                  attachments: item.payload?.attachments ?? [],
                },
              };

              if (stagedNewItem && stagedNewItem.itemType === "MESSAGE") {
                setDraft((prev) => ({
                  ...prev,
                  items: [...prev.items, mapped],
                }));
              } else if (editingItemId) {
                setDraft((prev) => ({
                  ...prev,
                  items: prev.items.map((existing) =>
                    existing.localId === editingItemId ? mapped : existing
                  ),
                }));
              }

              closeItemEditor();
            }}
            uploaderUserId={uploaderUserId}
            uploadContextId={draftUploadContextId || uploadContextId}
          />

            <BroadcastCtaItemPanel
              open={itemEditorOpen && itemEditorType === "CTA"}
              onClose={closeItemEditor}
              initialValue={
                editingItem && editingItem.itemType === "CTA"
                  ? editingItem
                  : stagedNewItem && stagedNewItem.itemType === "CTA"
                  ? stagedNewItem
                  : null
              }
              onSave={(item) => {
              const mapped: BroadcastCtaItemDraft = {
                localId:
                  editingItemId ??
                  (stagedNewItem?.itemType === "CTA" ? stagedNewItem.localId : null) ??
                  makeLocalId(),
                itemType: "CTA",
                ctaKind: item.ctaKind,
                ctaConfig: item.ctaConfig,
                schedule: {
                  dueAt: item.schedule?.dueAt ?? null,
                  expiresAt: item.schedule?.expiresAt ?? null,
                },
              };

              if (stagedNewItem && stagedNewItem.itemType === "CTA") {
                setDraft((prev) => ({
                  ...prev,
                  items: [...prev.items, mapped],
                }));
              } else if (editingItemId) {
                setDraft((prev) => ({
                  ...prev,
                  items: prev.items.map((existing) =>
                    existing.localId === editingItemId ? mapped : existing
                  ),
                }));
              }

              closeItemEditor();
            }}
            uploaderUserId={uploaderUserId}
            uploadContextId={draftUploadContextId || uploadContextId}
            offerTemplates={offerTemplates ?? []}
            offerTemplatesLoading={offerTemplatesLoading ?? false}
            enableOfferRewards={canAddOfferItem}
            canAskForReferrals={canAskForReferrals}
            canAskForRecommendations={canAskForRecommendations}
          />

          <BroadcastOfferItemPanel
            open={itemEditorOpen && itemEditorType === "OFFER"}
            onClose={closeItemEditor}
            initialValue={
              editingItem && editingItem.itemType === "OFFER"
                ? editingItem
                : stagedNewItem && stagedNewItem.itemType === "OFFER"
                ? stagedNewItem
                : null
            }
            onSave={(item) => {
              const mapped: BroadcastOfferItemDraft = {
                localId:
                  editingItemId ??
                  (stagedNewItem?.itemType === "OFFER" ? stagedNewItem.localId : null) ??
                  makeLocalId(),
                itemType: "OFFER",
                offerTemplateId: item.offerTemplateId ?? null,
                note: item.note ?? "",
                maxRedemptionsOverride: item.maxRedemptionsOverride ?? "",
                schedule: {
                  dueAt: item.schedule?.dueAt ?? null,
                  expiresAt: item.schedule?.expiresAt ?? null,
                },
              };

              if (stagedNewItem && stagedNewItem.itemType === "OFFER") {
                setDraft((prev) => ({
                  ...prev,
                  items: [...prev.items, mapped],
                }));
              } else if (editingItemId) {
                setDraft((prev) => ({
                  ...prev,
                  items: prev.items.map((existing) =>
                    existing.localId === editingItemId ? mapped : existing
                  ),
                }));
              }

              closeItemEditor();
            }}
            uploaderUserId={uploaderUserId}
            uploadContextId={draftUploadContextId || uploadContextId}
            offerTemplates={offerTemplates ?? []}
            offerTemplatesLoading={offerTemplatesLoading ?? false}
          />
          
          <BroadcastOrderItemPanel
            open={itemEditorOpen && itemEditorType === "ORDER"}
            onClose={closeItemEditor}
            productOptions={orderProductOptions}
            bundleOptions={orderBundleOptions}
            initialValue={
              editingItem && editingItem.itemType === "ORDER"
                ? editingItem
                : stagedNewItem && stagedNewItem.itemType === "ORDER"
                ? stagedNewItem
                : null
            }
            onSave={(item) => {
              const mapped: BroadcastOrderItemDraft = {
                localId:
                  editingItemId ??
                  (stagedNewItem?.itemType === "ORDER" ? stagedNewItem.localId : null) ??
                  makeLocalId(),
                itemType: "ORDER",
                grossAmount: item.grossAmount ?? "",
                inScopeAmount: item.inScopeAmount ?? "",
                summary: item.summary ?? "",
                notes: item.notes ?? "",
                paymentInstructionsJson: item.paymentInstructionsJson ?? "",
                items: item.items ?? [],
              };

              if (stagedNewItem && stagedNewItem.itemType === "ORDER") {
                setDraft((prev) => ({
                  ...prev,
                  items: [...prev.items, mapped],
                }));
              } else if (editingItemId) {
                setDraft((prev) => ({
                  ...prev,
                  items: prev.items.map((existing) =>
                    existing.localId === editingItemId ? mapped : existing
                  ),
                }));
              }

              closeItemEditor();
            }}
            userId={uploaderUserId}
          />

          <div className="new-chat-body">
            <div className="th-ctaGrid">
              <div className="th-ctaField">
                <div className="th-ctaLabel">Announcement title</div>
                <input
                  ref={titleInputRef}
                  className="th-ctaInput"
                  type="text"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter announcement title…"
                  disabled={submitting}
                />
              </div>

              <div className="th-ctaField">
                <div className="th-ctaLabel">Recipients</div>

                <button
                  className="btn btn--primary"
                  onClick={() => setRecipientModalOpen(true)}
                  disabled={submitting}
                  type="button"
                >
                  Select recipients
                </button>

                {selectedContacts.length > 0 && (
                  <div className="bc-recipient-pills">
                    {selectedContacts.map((c: any) => {
                      const id = String(c?.userId ?? c?.businessId ?? c?.id ?? "");
                      return (
                        <div className="bc-recipient-pill" key={id}>
                          <span>{contactDisplayName(c)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedIds((prev) => prev.filter((x) => x !== id))
                            }
                            disabled={submitting}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="th-ctaField">
                <div className="th-ctaLabel">Announcement items</div>

                {draft.items.length === 0 ? (
                  <div className="th-ctaHint">
                    No items yet. Add a message, request, offer, or order to begin building this announcement.
                  </div>
                ) : (
                  <div className="broadcast-items-list">
                    {draft.items.map((item, idx) => (
                      <BroadcastItemCard
                        key={item.localId}
                        index={idx}
                        item={
                          item.itemType === "MESSAGE"
                            ? {
                                itemType: "MESSAGE",
                                messageText: item.messageText,
                                payload:
                                  (item.payload?.attachments?.length ?? 0) > 0
                                    ? { attachments: item.payload!.attachments }
                                    : undefined,
                              }
                            : item.itemType === "CTA"
                            ? {
                                itemType: "CTA",
                                ctaKind: item.ctaKind,
                                ctaConfigJson: JSON.stringify(item.ctaConfig ?? {}),
                                dueAt: item.schedule?.dueAt ?? null,
                                expiresAt: item.schedule?.expiresAt ?? null,
                              }
                            : item.itemType === "OFFER"
                            ? {
                                itemType: "OFFER",
                                offerTemplateId: item.offerTemplateId ?? "",
                                note: item.note?.trim() || null,
                                maxRedemptionsOverride:
                                  item.maxRedemptionsOverride.trim().length > 0
                                    ? Number(item.maxRedemptionsOverride.trim())
                                    : null,
                                dueAt: item.schedule?.dueAt ?? null,
                                expiresAt: item.schedule?.expiresAt ?? null,
                              }
                            : {
                                itemType: "ORDER",
                                orderPayload: {
                                  currencyCode: "INR",
                                  grossAmount: item.grossAmount,
                                  inScopeAmount: item.inScopeAmount?.trim() || null,
                                  summary: item.summary?.trim() || null,
                                  notes: item.notes?.trim() || null,
                                  paymentInstructionsJson: item.paymentInstructionsJson?.trim() || null,
                                  items: item.items ?? [],
                                  offerSelectionMode: "AUTO",
                                },
                              }
                        }
                        disabled={submitting}
                        isFirst={idx === 0}
                        isLast={idx === draft.items.length - 1}
                        onEdit={() => {
                          if (item.itemType === "MESSAGE") {
                            openMessageItemEditor(item.localId);
                          } else if (item.itemType === "CTA") {
                            openCtaItemEditor(item.localId);
                          } else if (item.itemType === "OFFER") {
                            openOfferItemEditor(item.localId);
                          } else {
                            openOrderItemEditor(item.localId);
                          }
                        }}
                        onMoveUp={() => moveItem(item.localId, -1)}
                        onMoveDown={() => moveItem(item.localId, 1)}
                        onDelete={() => deleteItem(item.localId)}
                      />
                    ))}
                  </div>
                )}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {canAddMessageItem && (
                      <button
                        className="btn btn--primary"
                        onClick={() => openMessageItemEditor()}
                        disabled={submitting}
                        type="button"
                        style={{ minWidth: 140 }}
                      >
                        + Add message
                      </button>
                    )}

                    {canAddRequestItem && (
                      <button
                        className="btn btn--primary"
                        onClick={() => openCtaItemEditor()}
                        disabled={submitting || (!canAskForReferrals && !canAskForRecommendations)}
                        type="button"
                        style={{ minWidth: 140 }}
                      >
                        + Add request
                      </button>
                    )}

                    {canAddOfferItem && (
                      <button
                        className="btn btn--primary"
                        onClick={() => openOfferItemEditor()}
                        disabled={submitting}
                        type="button"
                        style={{ minWidth: 140 }}
                      >
                        + Add offer
                      </button>
                    )}

                    {canAddOrderItem && (
                      <button
                        className="btn btn--primary"
                        onClick={() => openOrderItemEditor()}
                        disabled={submitting}
                        type="button"
                        style={{ minWidth: 140 }}
                      >
                        + Add order
                      </button>
                    )}
                  </div>
              </div>

              {err ? <div className="th-ctaError">{err}</div> : null}

              <div className="compose-actions">
                <button className="btn" onClick={onClose} disabled={submitting} type="button">
                  Cancel
                </button>
                <button
                  className="btn btn--primary"
                  onClick={submit}
                  disabled={!canSubmit}
                  type="button"
                >
                  {submitting ? "Sending…" : "Send announcement"}
                </button>
              </div>
            </div>
          </div>

          <BroadcastRecipientsPanel
            open={recipientModalOpen}
            onClose={() => setRecipientModalOpen(false)}
            userContacts={contacts}
            businessContacts={[]}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            contactsLoading={contactsLoading}
            refreshContacts={refreshContacts}
            disabled={submitting}
          />
        </div>
      </div>
    </>
  );
}