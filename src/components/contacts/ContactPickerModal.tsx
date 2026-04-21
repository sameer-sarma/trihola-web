import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "../Modal";
import type { UserMini, BusinessMini } from "../../types/referral";
import "../../css/contact-picker-modal.css";

type Filter = "ALL" | "BUSINESSES" | "USERS";

type UserPickerItem = { kind: "USER"; key: string; user: UserMini };
type BusinessPickerItem = { kind: "BUSINESS"; key: string; business: BusinessMini };

export type PickerItem = UserPickerItem | BusinessPickerItem;

function userName(u: UserMini) {
  const fn = (u.firstName ?? "").trim();
  const ln = (u.lastName ?? "").trim();
  return `${fn} ${ln}`.trim() || u.slug || String(u.userId);
}

function userSubtitle(u: UserMini) {
  const profession = u.profession;
  if (profession && String(profession).trim()) return String(profession).trim();
  return u.slug || "";
}

function businessSubtitle(b: BusinessMini) {
  return b.slug || "";
}

function initials(name: string) {
  const p = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "•";
}

function userKey(u: UserMini) {
  return `u:${u.userId}`;
}

function bizKey(b: BusinessMini) {
  return `b:${b.businessId}`;
}

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;

  users: UserMini[];
  businesses: BusinessMini[];

  multiple?: boolean;
  initialSelectedKeys?: string[];
  excludeKeys?: string[];
  defaultFilter?: Filter;

  onConfirm: (selected: PickerItem[]) => void;

  onAddContact?: () => void;
  addContactLabel?: string;

  mountIn?: HTMLElement | null;
};

export default function ContactPickerModal(props: Props) {
  const multiple = !!props.multiple;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(props.defaultFilter ?? "ALL");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(props.initialSelectedKeys ?? [])
  );

  const exclude = useMemo(() => new Set(props.excludeKeys ?? []), [props.excludeKeys]);

  useEffect(() => {
    if (!props.open) return;
    setQ("");
    setFilter(props.defaultFilter ?? "ALL");
    setSelectedKeys(new Set(props.initialSelectedKeys ?? []));
  }, [props.open, props.defaultFilter, props.initialSelectedKeys]);

  const allUsers = useMemo<UserPickerItem[]>(() => {
    return (props.users ?? [])
      .map((u) => ({ kind: "USER" as const, key: userKey(u), user: u }))
      .filter((it) => !exclude.has(it.key));
  }, [props.users, exclude]);

  const allBusinesses = useMemo<BusinessPickerItem[]>(() => {
    return (props.businesses ?? [])
      .map((b) => ({ kind: "BUSINESS" as const, key: bizKey(b), business: b }))
      .filter((it) => !exclude.has(it.key));
  }, [props.businesses, exclude]);

  const allItems = useMemo<PickerItem[]>(
    () => [...allBusinesses, ...allUsers],
    [allBusinesses, allUsers]
  );

  const selectedItems = useMemo(
    () => allItems.filter((it) => selectedKeys.has(it.key)),
    [allItems, selectedKeys]
  );

  const normalizedQuery = q.trim().toLowerCase();

  const filteredBusinesses = useMemo(() => {
    if (filter === "USERS") return [] as BusinessPickerItem[];

    const base = allBusinesses;
    if (!normalizedQuery) return base;

    return base.filter((it) => {
      const title = it.business.name.toLowerCase();
      const subtitle = businessSubtitle(it.business).toLowerCase();
      return title.includes(normalizedQuery) || subtitle.includes(normalizedQuery);
    });
  }, [allBusinesses, filter, normalizedQuery]);

  const filteredUsers = useMemo(() => {
    if (filter === "BUSINESSES") return [] as UserPickerItem[];

    const base = allUsers;
    if (!normalizedQuery) return base;

    return base.filter((it) => {
      const title = userName(it.user).toLowerCase();
      const subtitle = userSubtitle(it.user).toLowerCase();
      return title.includes(normalizedQuery) || subtitle.includes(normalizedQuery);
    });
  }, [allUsers, filter, normalizedQuery]);

  const totalVisibleCount = filteredBusinesses.length + filteredUsers.length;

  function toggle(it: PickerItem) {
    if (multiple) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(it.key)) next.delete(it.key);
        else next.add(it.key);
        return next;
      });
      return;
    }

    props.onConfirm([it]);
  }

  function confirmMulti() {
    props.onConfirm(selectedItems);
  }

  function handleAddContact() {
    props.onClose();
    props.onAddContact?.();
  }

  function renderRow(it: PickerItem) {
    const isSelected = selectedKeys.has(it.key);
    const title = it.kind === "BUSINESS" ? it.business.name : userName(it.user);
    const subtitle = it.kind === "BUSINESS" ? businessSubtitle(it.business) : userSubtitle(it.user);
    const img = it.kind === "BUSINESS" ? it.business.logoUrl : it.user.profileImageUrl;

    return (
      <button
        type="button"
        key={it.key}
        className={`cpm__row ${isSelected ? "is-selected" : ""}`}
        onClick={() => toggle(it)}
      >
        <div className="cpm__avatar">
          {img ? <img src={img} alt={title} /> : <span>{initials(title)}</span>}
        </div>

        <div className="cpm__main">
          <div className="cpm__title">{title}</div>
          {subtitle ? <div className="cpm__subtitle">{subtitle}</div> : null}
        </div>

        <div className="cpm__right">
          <span
            className={`cpm__badge cpm__badge--${
              it.kind === "BUSINESS" ? "business" : "user"
            }`}
          >
            {it.kind === "BUSINESS" ? "Business" : "User"}
          </span>

          {multiple ? (
            <span className={`cpm__check ${isSelected ? "is-on" : ""}`} />
          ) : (
            <span className="cpm__chev">›</span>
          )}
        </div>
      </button>
    );
  }

  const footer = multiple ? (
    <div className="cpm__footer">
      <div className="cpm__count">{selectedItems.length} selected</div>
      <div className="cpm__footerRight">
        <button type="button" className="cpm__btn cpm__btn--ghost" onClick={props.onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="cpm__btn cpm__btn--primary"
          onClick={confirmMulti}
          disabled={selectedItems.length === 0}
        >
          Select
        </button>
      </div>
    </div>
  ) : (
    <div className="cpm__footer">
      <div className="cpm__count">
        {totalVisibleCount} {totalVisibleCount === 1 ? "match" : "matches"}
      </div>
      <div className="cpm__footerRight">
        <button type="button" className="cpm__btn cpm__btn--ghost" onClick={props.onClose}>
          Close
        </button>
      </div>
    </div>
  );

  const content = (
    <div className="cpm">
      <div className="cpm__toolbar">
        <div className="cpm__toolbarTop">
          <input
            className="cpm__search"
            placeholder="Search by name or slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />

          <div className="cpm__toolbarMeta">
            {multiple ? `${selectedItems.length} selected · ${allItems.length} total` : `${allItems.length} total`}
          </div>

          {props.onAddContact ? (
            <button
              type="button"
              className="cpm__btn cpm__btn--ghost"
              onClick={handleAddContact}
            >
              {props.addContactLabel ?? "Add contact"}
            </button>
          ) : null}

          {!!q && (
            <button
              type="button"
              className="cpm__btn cpm__btn--ghost"
              onClick={() => setQ("")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="cpm__chips">
          <button
            type="button"
            className={`cpm__chip ${filter === "ALL" ? "is-on" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All
          </button>
          <button
            type="button"
            className={`cpm__chip ${filter === "BUSINESSES" ? "is-on" : ""}`}
            onClick={() => setFilter("BUSINESSES")}
          >
            Businesses
          </button>
          <button
            type="button"
            className={`cpm__chip ${filter === "USERS" ? "is-on" : ""}`}
            onClick={() => setFilter("USERS")}
          >
            Users
          </button>
        </div>
      </div>

      <div className="cpm__privacy" role="note" aria-live="polite">
        <div className="cpm__privacyIcon" aria-hidden="true">
          🔒
        </div>
        <div className="cpm__privacyBody">
          <div className="cpm__privacyTitle">Private contact details stay private</div>
          <div className="cpm__privacyText">
            Phone numbers and email addresses are only used by TriHola to contact these people about
            this request. They are never shown to another TriHola user unless the contact chooses to
            share them.
          </div>
        </div>
      </div>

      <div className="cpm__list">
        {totalVisibleCount === 0 ? (
          <div className="cpm__empty">
            <div className="cpm__emptyTitle">No matches found</div>
            <div className="cpm__emptyText">
              Try a different search, switch filters, or add a new contact.
            </div>
            {props.onAddContact ? (
              <div className="cpm__emptyActions">
                <button
                  type="button"
                  className="cpm__btn cpm__btn--ghost"
                  onClick={handleAddContact}
                >
                  {props.addContactLabel ?? "Add contact"}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {filter !== "USERS" && (
              <div className="cpm__section">
                <div className="cpm__sectionTitle">Businesses</div>
                {filteredBusinesses.length === 0 ? (
                  <div className="cpm__sectionEmpty">No matching businesses</div>
                ) : (
                  <div className="cpm__sectionList">
                    {filteredBusinesses.map(renderRow)}
                  </div>
                )}
              </div>
            )}

            {filter !== "BUSINESSES" && (
              <div className="cpm__section">
                <div className="cpm__sectionTitle">Users</div>
                {filteredUsers.length === 0 ? (
                  <div className="cpm__sectionEmpty">No matching users</div>
                ) : (
                  <div className="cpm__sectionList">
                    {filteredUsers.map(renderRow)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (!props.mountIn) {
    return (
      <Modal open={props.open} title={props.title} onClose={props.onClose} footer={footer}>
        {content}
      </Modal>
    );
  }

  if (!props.open) return null;

  return createPortal(
    <div className="cpmDrawerOverlay" role="dialog" aria-modal="true">
      <div className="cpmDrawerBackdrop" onMouseDown={props.onClose} />
      <div className="cpmDrawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cpmDrawerHeader">
          <div className="cpmDrawerTitle">{props.title}</div>
          <button className="cpmDrawerClose" onClick={props.onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="cpmDrawerBody">{content}</div>
        <div className="cpmDrawerFooter">{footer}</div>
      </div>
    </div>,
    props.mountIn
  );
}