// =============================================
// FILE: src/components/ContactMultiSelect.tsx
// List-only scalable contact picker
// - Search
// - Selected chips
// - Select all filtered / Deselect filtered
// - Clear
// - Render cap (default 250)
// =============================================
import { useMemo, useState } from "react";
import type { Contact } from "../types/invites";
import "../css/ContactMultiSelect.css";

export type ContactMultiSelectProps = {
  contacts: Contact[];
  value: string[]; // selected userIds
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxRender?: number; // default 250
};

export default function ContactMultiSelect({
  contacts,
  value,
  onChange,
  disabled,
  placeholder,
  maxRender = 250,
}: ContactMultiSelectProps) {
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;

    return contacts.filter((c) => {
      const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim().toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(needle) || phone.includes(needle) || email.includes(needle);
    });
  }, [contacts, q]);

  const filteredIds = useMemo(() => filtered.map((c) => c.userId), [filtered]);

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

  const total = contacts.length;
  const shown = renderList.length;

return (
  <div className="cms">
    {/* Top controls */}
    <div className="cms__top">
      <input
        className="th-input cms__search"
        placeholder={placeholder || "Search name or number"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
      />

      <div className="cms__topRight">
        {filteredIds.length > 0 && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={allFilteredSelected ? deselectFiltered : selectAllFiltered}
            disabled={disabled}
            title={
              allFilteredSelected
                ? "Remove all filtered contacts from selection"
                : "Add all filtered contacts to selection"
            }
          >
            {allFilteredSelected ? "Deselect filtered" : "Select all filtered"}
          </button>
        )}

        {value.length > 0 && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={clearAll}
            disabled={disabled}
            title="Clear all selected contacts"
          >
            Clear
          </button>
        )}
      </div>
    </div>

    {/* Selected chips */}
    {value.length > 0 && (
      <div className="cms__chips">
        {value.slice(0, 12).map((id) => {
          const c = contacts.find((x) => x.userId === id);
          const name = c
            ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Contact"
            : "Contact";

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
        {value.length > 12 && <span className="muted">+{value.length - 12} more</span>}
      </div>
    )}

    {/* Info line */}
    <div className="cms__meta muted">
      {q.trim() ? (
        <>
          Matches: <b>{filtered.length}</b>
        </>
      ) : (
        <>
          Total contacts: <b>{total}</b>
        </>
      )}
    </div>

    {/* Cap warning */}
    {filtered.length > maxRender && (
      <div className="cms__cap muted">
        Showing first {maxRender} matches. Refine your search to narrow results.
      </div>
    )}

    {/* WhatsApp-like List */}
    <div className="cms__list" role="list">
      {renderList.map((c) => {
        const id = c.userId;
        const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unknown";
        const subtitle = c.phone || c.email || "";
        const isOn = selectedSet.has(id);

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
              {c.profileImageUrl ? (
                <img src={c.profileImageUrl} alt={name} />
              ) : (
                <div className="cms__avatarSmPh">{name.charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div className="cms__rowText">
              <div className="cms__rowName" title={name}>
                {name}
              </div>
              <div className="cms__rowSub" title={subtitle || ""}>
                {subtitle || "—"}
              </div>
            </div>

            <div className="cms__rowCheck">
              <input type="checkbox" checked={isOn} readOnly />
            </div>
          </div>
        );
      })}
    </div>

    {/* Footer */}
    <div className="cms__footer muted">
      Showing {shown} of {filtered.length} matches
    </div>
  </div>
);
}
