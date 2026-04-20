// src/utils/broadcastHelpers.ts

import type { ContactLite } from "../components/contacts/ContactMultiSelect";
import type {
  BroadcastRecipientCreateDTO,
  BroadcastItemDraft,
  BroadcastItemCreateDTO,
} from "../types/broadcasts";
import type { ParticipantIdentity, UUID } from "../types/threads";

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

export function contactSelectionId(c: ContactLite): string {
  const anyC = c as any;
  return clean(anyC.userId) || clean(anyC.businessId) || clean(anyC.id);
}

export function mergeContacts(
  userContacts: ContactLite[] = [],
  businessContacts: ContactLite[] = []
): ContactLite[] {
  const byId = new Map<string, ContactLite>();

  for (const c of [...userContacts, ...businessContacts]) {
    const id = contactSelectionId(c);
    if (!id) continue;
    byId.set(id, c);
  }

  return Array.from(byId.values());
}

export function selectedContactsFromIds(
  contacts: ContactLite[],
  selectedIds: string[]
): ContactLite[] {
  const byId = new Map<string, ContactLite>();

  for (const c of contacts) {
    const id = contactSelectionId(c);
    if (!id) continue;
    byId.set(id, c);
  }

  return selectedIds
    .map((id) => byId.get(clean(id)))
    .filter(Boolean) as ContactLite[];
}

export function contactToParticipantIdentity(
  c: ContactLite
): ParticipantIdentity | null {
  const anyC = c as any;

  const userId = clean(anyC.userId);
  if (userId) {
    return {
      participantType: "USER",
      participantId: userId as UUID,
    };
  }

  const businessId = clean(anyC.businessId) || clean(anyC.id);
  if (businessId) {
    return {
      participantType: "BUSINESS",
      participantId: businessId as UUID,
    };
  }

  return null;
}

export function contactToBroadcastRecipient(
  c: ContactLite
): BroadcastRecipientCreateDTO | null {
  const recipientIdentity = contactToParticipantIdentity(c);
  if (!recipientIdentity) return null;

  return {
    recipientIdentity,
  };
}

export function contactsToBroadcastRecipients(
  contacts: ContactLite[]
): BroadcastRecipientCreateDTO[] {
  const out: BroadcastRecipientCreateDTO[] = [];
  const seen = new Set<string>();

  for (const c of contacts) {
    const recipient = contactToBroadcastRecipient(c);
    if (!recipient) continue;

    const key = `${recipient.recipientIdentity.participantType}:${recipient.recipientIdentity.participantId}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(recipient);
  }

  return out;
}

export function selectedIdsToBroadcastRecipients(
  contacts: ContactLite[],
  selectedIds: string[]
): BroadcastRecipientCreateDTO[] {
  const selected = selectedContactsFromIds(contacts, selectedIds);
  return contactsToBroadcastRecipients(selected);
}

export function contactDisplayName(c: ContactLite): string {
  const anyC = c as any;

  const businessName = clean(anyC.businessName) || clean(anyC.name);
  if (businessName) return businessName;

  const firstName = clean(c.firstName);
  const lastName = clean(c.lastName);
  const full = `${firstName} ${lastName}`.trim();
  if (full) return full;

  return clean(c.email) || clean(c.phone) || "Unknown";
}

export function draftItemToCreateDto(
  item: BroadcastItemDraft
): BroadcastItemCreateDTO {

  if (item.itemType === "MESSAGE") {
    return {
      itemType: "MESSAGE",
      messageText: item.messageText || null,
      payload: item.payload ?? null,
      dueAt: null,
      expiresAt: null,
    };
  }

  if (item.itemType === "OFFER") {
    if (!item.offerTemplateId) {
      throw new Error("Offer item must have an offerTemplateId");
    }

    const parsed =
      item.maxRedemptionsOverride?.trim()?.length > 0
        ? Number(item.maxRedemptionsOverride.trim())
        : null;

    return {
      itemType: "OFFER",
      offerTemplateId: item.offerTemplateId,
      note: item.note?.trim() || null,
      maxRedemptionsOverride:
        parsed != null && Number.isFinite(parsed) && parsed > 0
          ? parsed
          : null,
      dueAt: item.schedule?.dueAt ?? null,
      expiresAt: item.schedule?.expiresAt ?? null,
    };
  }

  if (item.itemType === "ORDER") {
    return {
      itemType: "ORDER",
      orderPayload: {
        currencyCode: "INR",
        grossAmount: item.grossAmount,
        inScopeAmount: item.inScopeAmount?.trim() || null,
        summary: null,
        notes: item.notes?.trim() || null,
        paymentInstructionsJson: item.paymentInstructionsJson?.trim() || null,
        items: item.items ?? [],
        offerSelectionMode: "AUTO",
      },
      dueAt: null,
      expiresAt: null,
    };
  }

  if (item.itemType === "CTA") {
    return {
      itemType: "CTA",
      ctaKind: item.ctaKind,
      ctaConfigJson: JSON.stringify(item.ctaConfig ?? {}),
      dueAt: item.schedule?.dueAt ?? null,
      expiresAt: item.schedule?.expiresAt ?? null,
    };
  }

  throw new Error(`Unsupported item type: ${(item as any).itemType}`);
}