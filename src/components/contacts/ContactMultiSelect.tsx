// src/components/contacts/ContactMultiSelect.tsx
import { useMemo, useState } from "react";
import "../../css/ContactMultiSelect.css";

import AddContactModal from "./AddContactModal";
import type { ContactResponse, ContactRequestForm } from "../../services/contactService";

export type ContactLite = {
  userId: string;
  profileSlug?: string | null;
  profileImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ContactMultiSelectProps = {
  contacts: ContactLite[];

  /** selected userIds */
  value: string[];
  onChange: (ids: string[]) => void;

  disabled?: boolean;
  placeholder?: string;

  /** cap list rendering for huge contact lists (default 250) */
  maxRender?: number;

  /** Optional eligibility filter */
  filterContact?: (c: ContactLite) => boolean;

  /** Optional: show/hide the “Select filtered” controls (default true) */
  showBulkActions?: boolean;

  // ---------------------------------------
  // Optional: Add contact UX inside picker
  // ---------------------------------------
  showAddContact?: boolean;
  addContactLabel?: string;
  addContactTitle?: string;
  addContactPreset?: Partial<ContactRequestForm>;

  /**
   * Called when a contact is created.
   * Parent may merge it into contacts state and/or trigger refresh.
   */
  onContactAdded?: (created: ContactResponse) => void;

  /** NEW: If provided, picker will await this after adding a contact (e.g. AppData.refreshContacts) */
  refreshAfterAdd?: () => Promise<void>;

  autoSelectOnAdd?: boolean;
  optimisticAppendOnAdd?: boolean;

  addContactPhoneValidation?: "INDIA_E164_ONLY" | "E164_ANY" | "LENIENT";
};

function isBusinessContact(c: any) {
  return !!String(c?.businessId ?? "").trim();
}

function displayName(c: ContactLite) {
  const anyC = c as any;

  // Business-first name resolution
  const bName = String(anyC?.businessName ?? anyC?.name ?? "").trim();
  if (bName) return bName;

  // Person name resolution
  const fn = (c.firstName ?? "").trim();
  const ln = (c.lastName ?? "").trim();
  const n = `${fn} ${ln}`.trim();
  return n || c.email || c.phone || "Unknown";
}

function subtitle(c: ContactLite) {
  const anyC = c as any;

  // For BUSINESS contacts, avoid showing email as the default “identity”
  if (isBusinessContact(anyC)) {
    const category = clean(anyC?.category);
    if (category) return category;

    const profession = clean(anyC?.profession);
    if (profession) return profession;

    const phone = clean(anyC?.phone);
    if (phone) return phone;

    const email = clean(anyC?.email);
    if (email) return email;

    return "Business";
  }

  // For USER contacts, keep your hierarchy email → phone → profession
  const email = clean((c as any).email);
  if (email) return email;

  const phone = clean((c as any).phone);
  if (phone) return phone;

  const profession = clean((c as any).profession);
  if (profession) return profession;

  return "-";
}

function avatarUrl(c: ContactLite) {
  const anyC = c as any;
  return (
    String(c.profileImageUrl ?? "").trim() ||
    String(anyC?.businessLogoUrl ?? "").trim()
  );
}

function clean(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

function initialLetter(name: string) {
  return (name.trim().charAt(0) || "U").toUpperCase();
}

function contactId(c: ContactLite) {
  const anyC = c as any;
  return String(c.userId ?? anyC.businessId ?? anyC.id ?? "").trim();
}

function toContactLiteFromCreated(created: ContactResponse): ContactLite | null {
  const userId = (created as any)?.userId ? String((created as any).userId) : "";
  if (!userId) return null;

  return {
    userId,
    profileSlug: (created as any)?.profileSlug ?? null,
    profileImageUrl: (created as any)?.profileImageUrl ?? null,
    firstName: (created as any)?.firstName ?? null,
    lastName: (created as any)?.lastName ?? null,
    phone: (created as any)?.phone ?? null,
    email: (created as any)?.email ?? null,
  };
}

export default function ContactMultiSelect({
  contacts,
  value,
  onChange,
  disabled,
  placeholder,
  maxRender = 250,
  filterContact,
  showBulkActions = true,

  showAddContact = false,
  addContactLabel = "+ Add contact",
  addContactTitle,
  addContactPreset,
  onContactAdded,
  refreshAfterAdd,

  autoSelectOnAdd = true,
  optimisticAppendOnAdd = false,
  addContactPhoneValidation,
}: ContactMultiSelectProps) {
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [refreshingAfterAdd, setRefreshingAfterAdd] = useState(false);

  // Optional: optimistic list injection
  const [optimisticContacts, setOptimisticContacts] = useState<ContactLite[]>([]);
  const mergedContacts = useMemo(() => {
    if (!optimisticAppendOnAdd || optimisticContacts.length === 0) return contacts;

    const byId = new Map<string, ContactLite>();
    for (const c of contacts) byId.set(contactId(c), c);
    for (const c of optimisticContacts) byId.set(contactId(c), c);
    return Array.from(byId.values()).filter((c) => !!contactId(c));
  }, [contacts, optimisticContacts, optimisticAppendOnAdd]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const eligible = useMemo(() => {
    if (!filterContact) return mergedContacts;
    return mergedContacts.filter(filterContact);
  }, [mergedContacts, filterContact]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return eligible;

    return eligible.filter((c) => {
      const name = displayName(c).toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      const slug = (c.profileSlug ?? "").toLowerCase();
      const id = (c.userId ?? "").toLowerCase();

      return (
        name.includes(needle) ||
        phone.includes(needle) ||
        email.includes(needle) ||
        slug.includes(needle) ||
        id.includes(needle)
      );
    });
  }, [eligible, q]);

  const filteredIds = useMemo(() => filtered.map(contactId).filter(Boolean), [filtered]);

  const allFilteredSelected = useMemo(() => {
    if (filteredIds.length === 0) return false;
    for (const id of filteredIds) if (!selectedSet.has(id)) return false;
    return true;
  }, [filteredIds, selectedSet]);

  const renderList = useMemo(() => filtered.slice(0, maxRender), [filtered, maxRender]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const remove = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const selectAllFiltered = () => {
    if (disabled) return;
    const merged = new Set(value);
    for (const id of filteredIds) merged.add(id);
    onChange(Array.from(merged));
  };

  const deselectFiltered = () => {
    if (disabled) return;
    const filteredSet = new Set(filteredIds);
    onChange(value.filter((id) => !filteredSet.has(id)));
  };

  const handleAdded = async (created: ContactResponse) => {
    // 1) notify parent
    onContactAdded?.(created);

    // 2) optimistic append (instant feedback)
    if (optimisticAppendOnAdd) {
      const lite = toContactLiteFromCreated(created);
      if (lite) {
        setOptimisticContacts((prev) => {
          const id = String(lite.userId);
          if (prev.some((x) => String(x.userId) === id)) return prev;
          return [...prev, lite];
        });
      }
    }

    // 3) auto-select newly created user
    if (autoSelectOnAdd) {
      const id = (created as any)?.userId ? String((created as any).userId) : "";
      if (id && !selectedSet.has(id)) {
        onChange([...value, id]);
      }
    }

    // 4) refresh bundle/source-of-truth (AppData) so list updates everywhere
    if (refreshAfterAdd) {
      try {
        setRefreshingAfterAdd(true);
        await refreshAfterAdd();
      } catch {
        // don’t block UI if refresh fails
      } finally {
        setRefreshingAfterAdd(false);
      }
    }

    // 5) close add modal
    setAddOpen(false);
  };

  const total = eligible.length;
  const shown = renderList.length;

  return (
    <div className="cms">
      {/* Top controls */}
      <div className="cms__top">
        <input
          className="th-input cms__search"
          placeholder={placeholder || "Search name, phone, email…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
        />

        <div className="cms__meta">
          <span className="muted cms__selectionSummary">
            {value.length} selected • {total} total
          </span>

          {showAddContact && (
            <button
              className="btn"
              type="button"
              onClick={() => setAddOpen(true)}
              disabled={disabled || refreshingAfterAdd}
              title="Add a contact, then select them"
            >
              {refreshingAfterAdd ? "Refreshing…" : addContactLabel}
            </button>
          )}

          <button
            className="btn btn--ghost"
            type="button"
            onClick={clearAll}
            disabled={disabled || value.length === 0}
          >
            Clear
          </button>

          {showBulkActions && (
            <button
              className="btn"
              type="button"
              onClick={allFilteredSelected ? deselectFiltered : selectAllFiltered}
              disabled={disabled || filteredIds.length === 0}
              title={allFilteredSelected ? "Deselect all currently filtered" : "Select all currently filtered"}
            >
              {allFilteredSelected ? "Deselect filtered" : "Select filtered"}
            </button>
          )}
        </div>
      </div>

      {/* Cap warning */}
      {filtered.length > maxRender && (
        <div className="cms__cap muted">Showing first {maxRender} matches. Refine your search to narrow results.</div>
      )}
      
      {/* Contact privacy message */}
      <div className="cms__privacy" role="note" aria-live="polite">
        <div className="cms__privacyIcon" aria-hidden="true">
          🔒
        </div>
        <div className="cms__privacyBody">
          <div className="cms__privacyTitle">Private contact details stay private</div>
          <div className="cms__privacyText">
            Phone numbers and email addresses are only used by TriHola to contact these
            people about this request. They are never shown to another TriHola user
            unless the contact chooses to share them.
          </div>
        </div>
      </div>
      
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="cms__chips">
          {value.slice(0, 20).map((id) => {
            const c = eligible.find((x) => contactId(x) === id);
            const name = c ? displayName(c) : id;
            return (
              <button
                key={id}
                type="button"
                className="cms__chip"
                onClick={() => remove(id)}
                disabled={disabled}
                title="Remove"
              >
                {name} <span className="cms__chipX">×</span>
              </button>
            );
          })}
          {value.length > 20 && <div className="cms__chipMore muted">+{value.length - 20} more</div>}
        </div>
      )}

      {/* List */}
      <div className="cms__list" role="list">
        {renderList.length === 0 ? (
          <div className="cms__empty muted">No contacts match your search.</div>
        ) : (
          renderList.map((c) => {
            const id = contactId(c);
            if (!id) return null;
            const name = displayName(c);
            const sub = subtitle(c);
            const isOn = selectedSet.has(id);
            const imgUrl = avatarUrl(c);

            return (
              <div
                key={id}
                className={`cms__row ${isOn ? "is-on" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={isOn}
                onClick={() => toggle(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggle(id);
                }}
              >
                <div className="cms__avatarSm">
                  {imgUrl ? (
                    <img src={imgUrl} alt={name} />
                  ) : (
                    <div className="cms__avatarSmPh">{initialLetter(name)}</div>
                  )}
                </div>

                <div className="cms__rowText">
                  <div className="cms__rowName" title={name}>
                    {name}
                  </div>
                  <div className="cms__rowSub" title={sub}>
                    {sub}
                  </div>
                </div>

                <div className="cms__rowCheck">
                  <input type="checkbox" checked={isOn} readOnly />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="cms__footer muted">Showing {shown} of {filtered.length} matches</div>

      {showAddContact && (
        <AddContactModal
          open={addOpen}
          title={addContactTitle ?? "Add contact"}
          preset={addContactPreset}
          onClose={() => setAddOpen(false)}
          onAdded={handleAdded}
          phoneValidation={addContactPhoneValidation}
        />
      )}
    </div>
  );
}