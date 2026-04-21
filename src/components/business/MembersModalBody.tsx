// src/components/business/MembersModalBody.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Contact, BusinessMemberDTO } from "../../types/business";

import ContactMultiSelect from "../contacts/ContactMultiSelect";
import AddContactModal from "../contacts/AddContactModal";
import Modal from "../Modal";

import { supabase } from "../../supabaseClient";
import { fetchMyContactsBundle, type ContactResponse } from "../../services/contactService";

import "../../css/members-modal.css";

function safeText(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}

function memberDisplayName(m: BusinessMemberDTO) {
  const fn = (m.firstName ?? "").trim();
  const ln = (m.lastName ?? "").trim();
  return `${fn} ${ln}`.trim() || m.profileSlug || String(m.userId);
}

function initials(name: string) {
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] ?? "U") + (p[1]?.[0] ?? "")).toUpperCase();
}

function roleLabel(role?: string) {
  return (role ?? "STAFF").toUpperCase();
}

function contactDisplayName(c: any) {
  const fn = (c?.firstName ?? "").trim();
  const ln = (c?.lastName ?? "").trim();
  const n = `${fn} ${ln}`.trim();
  return n || c?.email || c?.phone || c?.profileSlug || c?.userId || "Unknown";
}

type Props = {
  members: BusinessMemberDTO[];
  canManage: boolean;
  saving: boolean;
  viewerRole?: string | null;

  onRefresh: () => void;
  onChangeMember: (userId: string, role: string, designation: string) => void;
  onRemoveMember: (userId: string) => void;

  // bulk add by selected TriHola userIds
  onAddMembers: (userIds: string[], role: "STAFF" | "ADMIN", designation: string) => void;

  // what roles can the viewer invite as
  availableInviteRoles: readonly ("STAFF" | "ADMIN")[];
};

export default function MembersModalBody(props: Props) {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
//  const [filter, setFilter] = useState<"ALL" | "OWNER" | "ADMIN" | "STAFF">("ALL");

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("STAFF");
  const [editDesignation, setEditDesignation] = useState<string>("");

  // Contacts bundle users for “Add members”
  const [contactsBusy, setContactsBusy] = useState(false);
  const [userContacts, setUserContacts] = useState<Contact[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [inviteDesignation, setInviteDesignation] = useState("Staff");

  // picker modal + add contact modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

  const memberIdSet = useMemo(
    () => new Set(props.members.map((m) => String(m.userId))),
    [props.members]
  );

  const filteredMembers = useMemo(() => {
    const query = q.trim().toLowerCase();
    return props.members.filter((m) => {
      //const r = roleLabel(m.role);
      //if (filter !== "ALL" && r !== filter) return false;

      if (!query) return true;
      const name = memberDisplayName(m).toLowerCase();
      const designation = String((m as any).designation ?? "").toLowerCase();
      const slug = String(m.profileSlug ?? "").toLowerCase();
      return (
        name.includes(query) ||
        designation.includes(query) ||
        slug.includes(query) ||
        String(m.userId).toLowerCase().includes(query)
      );
    });
//  }, [props.members, q, filter]);
  }, [props.members, q]);

  function openEditor(m: BusinessMemberDTO) {
    setExpandedUserId(String(m.userId));
    setEditRole(roleLabel(m.role));
    setEditDesignation(String((m as any).designation ?? ""));
  }

  function closeEditor() {
    setExpandedUserId(null);
    setEditRole("STAFF");
    setEditDesignation("");
  }

  function applyEditor(userId: string) {
    props.onChangeMember(userId, editRole, editDesignation.trim());
    closeEditor();
  }

  function removeMember(userId: string, name: string) {
    const ok = window.confirm(`Remove ${name} from this business?`);
    if (!ok) return;
    props.onRemoveMember(userId);
    if (expandedUserId === userId) closeEditor();
  }

  // Load “user contacts” (TriHola users only)
  const loadUserContacts = async () => {
    setContactsBusy(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      const bundle = await fetchMyContactsBundle(token);

      const mapped: Contact[] = (bundle.users ?? []).map((u: ContactResponse) => ({
        userId: u.userId,
        profileSlug: u.profileSlug,
        profileImageUrl: u.profileImageUrl ?? null,
        firstName: u.firstName,
        lastName: u.lastName ?? null,
        phone: u.phone ?? null,
        email: u.email ?? null,
      })) as any;

      mapped.sort((a: any, b: any) => (a.firstName ?? "").localeCompare(b.firstName ?? ""));
      setUserContacts(mapped);

      // If only one role is available, lock it
      if (props.availableInviteRoles.length === 1) {
        setInviteRole(props.availableInviteRoles[0]);
      }
    } finally {
      setContactsBusy(false);
    }
  };

  useEffect(() => {
    if (!props.canManage) return;
    loadUserContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.canManage]);

  const canAddSelected = props.canManage && selectedUserIds.length > 0 && !props.saving;

  const addSelectedToBusiness = () => {
    if (!canAddSelected) return;
    props.onAddMembers(selectedUserIds, inviteRole, inviteDesignation.trim() || "Staff");
    setSelectedUserIds([]);
  };

  // chips (shown under Select contacts in main panel)
  const selectedContacts = useMemo(() => {
    const byId = new Map(userContacts.map((c: any) => [String(c.userId), c]));
    return selectedUserIds.map((id) => ({ id, c: byId.get(String(id)) }));
  }, [userContacts, selectedUserIds]);

  const removeSelectedId = (id: string) => {
    setSelectedUserIds((prev) => prev.filter((x) => x !== id));
  };

  const canShowDelete = (m: BusinessMemberDTO) => {
    // Safety: don’t show delete for OWNER to avoid accidental lockouts.
    return props.canManage && roleLabel(m.role) !== "OWNER";
  };

  return (
    <div className="mm">
      {/* Top bar */}
      <div className="mm-top">
        <div className="mm-topLeft">
          <div className="mm-searchRow">
            <input
              className="mm-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members…"
              aria-label="Search members"
            />
            <button className="btn" onClick={props.onRefresh} disabled={props.saving}>
              Refresh
            </button>
          </div>

        </div>

      </div>

      {/* Member list */}
      <div className="mm-list">
        {filteredMembers.length === 0 ? (
          <div className="mm-empty">No members match your search.</div>
        ) : (
          filteredMembers.map((m) => {
            const id = String(m.userId);
            const name = memberDisplayName(m);
            const designation = safeText((m as any).designation);
            const expanded = expandedUserId === id;

            const goToProfile = () => {
              if (!m.profileSlug) return;
              navigate(`/profile/${encodeURIComponent(m.profileSlug)}`);
            };

            return (
              <div key={id} className={`mm-row ${expanded ? "mm-row--expanded" : ""}`}>
                <div className="mm-rowMain">
                  {/* Identity */}
                  <div className="mm-identity">
                    {/* ONLY avatar is a link */}
                    <button
                      type="button"
                      className="mm-avatarLink"
                      onClick={goToProfile}
                      disabled={!m.profileSlug}
                      aria-label={`Open profile for ${name}`}
                      title={m.profileSlug ? `Open ${name}'s profile` : "No profile link available"}
                    >
                      <div className="mm-avatar" title={name}>
                        {m.profileImageUrl ? (
                          <img src={m.profileImageUrl} alt={name} />
                        ) : (
                          <span>{initials(name)}</span>
                        )}
                      </div>
                    </button>

                    <div className="mm-meta">
                      <div className="mm-nameLine">
                        <div className="mm-name">{name}</div>
                      </div>

                      <div className="mm-subLine">
                        <span className="mm-designation">
                          {designation === "—" ? "No designation" : designation}
                        </span>
                        <span className="mm-dot">•</span>
                        <span className="mm-status">{safeText(m.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions + inline editor (RIGHT of Manage) */}
                  <div className="mm-actions">
                    {canShowDelete(m) && (
                      <button
                        type="button"
                        className="mm-iconBtn mm-iconBtn--danger"
                        onClick={() => removeMember(id, name)}
                        disabled={props.saving}
                        aria-label={`Remove ${name}`}
                        title="Remove"
                      >
                        🗑
                      </button>
                    )}

                    {props.canManage && (
                      <button
                        type="button"
                        className="mm-iconBtn"
                        onClick={() => (expanded ? closeEditor() : openEditor(m))}
                        disabled={props.saving}
                        aria-label={expanded ? "Close editor" : "Edit member"}
                        title={expanded ? "Close" : "Edit"}
                      >
                        {expanded ? "✖️" : "✏️"}
                      </button>
                    )}

                    {props.canManage && expanded && (
                      <div className="mm-inlineEditor">
                        <div className="mm-inlineField">
                          <div className="mm-label">Role</div>
                          <select
                            className="mm-input"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                          >
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="OWNER">OWNER</option>
                          </select>
                        </div>

                        <div className="mm-inlineField">
                          <div className="mm-label">Designation</div>
                          <input
                            className="mm-input"
                            value={editDesignation}
                            onChange={(e) => setEditDesignation(e.target.value)}
                            placeholder="e.g., Sales, Manager"
                          />
                        </div>

                        <button
                          type="button"
                          className="mm-iconBtn mm-iconBtn--ok"
                          onClick={() => applyEditor(id)}
                          disabled={props.saving}
                          aria-label="Save"
                          title="Save"
                        >
                          ✅
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add members */}
      {props.canManage && (
        <div className="mm-add">
          <div className="mm-addHeader">
            <div>
              <div className="mm-addTitle">Add members</div>
            </div>

          </div>

          <div className="mm-addPanel">
            <div className="mm-addGrid">
              <div className="mm-field mm-field--span2">
                <div className="mm-label">Select contacts</div>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setPickerOpen(true)}
                  disabled={props.saving || contactsBusy}
                >
                  Select contacts…
                </button>

                {selectedUserIds.length > 0 && (
                  <div className="mm-selectedChips" aria-label="Selected contacts">
                    {selectedContacts.map(({ id, c }) => {
                      const nm = c ? contactDisplayName(c) : id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="mm-selectedChip"
                          onClick={() => removeSelectedId(id)}
                          disabled={props.saving}
                          title="Remove"
                        >
                          {nm} <span className="mm-selectedChipX">×</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mm-field">
                <div className="mm-label">Role</div>
                <select
                  className="mm-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  disabled={props.availableInviteRoles.length <= 1}
                >
                  {props.availableInviteRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mm-field">
                <div className="mm-label">Designation</div>
                <input
                  className="mm-input"
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                  placeholder="e.g., Sales, Manager"
                />
              </div>
            </div>

            <div className="mm-addActions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={addSelectedToBusiness}
                disabled={!canAddSelected}
              >
                {props.saving ? "Adding…" : `Add selected (${selectedUserIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts picker modal (SELECTION ONLY) */}
      <Modal
        open={pickerOpen}
        title="Select contacts"
        onClose={() => setPickerOpen(false)}
        //width={860}
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
            <button
              type="button"
              className="btn"
              onClick={() => setPickerOpen(false)}
              disabled={props.saving}
            >
              Done
            </button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div className="mm-hint">Only TriHola users appear here.</div>

          <ContactMultiSelect
            contacts={userContacts as any}
            value={selectedUserIds}
            onChange={setSelectedUserIds}
            disabled={props.saving || contactsBusy}
            placeholder={contactsBusy ? "Loading contacts…" : "Search name, phone, email"}
            maxRender={250}
            filterContact={(c: any) => !memberIdSet.has(String(c.userId))}
            showAddContact
            onContactAdded={(created) => {
              console.debug("Contact added", created);
              // IMPORTANT: update your parent list here (merge or refresh bundle)
              loadUserContacts();
            }}
          />
        </div>
      </Modal>

      {/* Add contact modal */}
      <AddContactModal
        open={addContactOpen}
        title="Add contact"
        onClose={() => setAddContactOpen(false)}
        onAdded={() => {
          // Auto reload after adding contact
          loadUserContacts();
        }}
      />
    </div>
  );
}
