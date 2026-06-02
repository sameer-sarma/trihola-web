import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Modal from "../Modal";
import ContactMultiSelect, { type ContactLite } from "./ContactMultiSelect";
import { supabase } from "../../supabaseClient";
import { useAppData } from "../../context/AppDataContext";

import ThreadIdentityMenu from "../../pages/threads/components/ThreadIdentityMenu";
import {
  useIdentitySelector,
  identityKey,
  type IdentityOption,
} from "../../pages/threads/useIdentitySelector";

import {
  addBroadcastGroupMembers,
  createBroadcastGroup,
  listBroadcastGroupMembers,
  listBroadcastGroupsForOwner,
  removeBroadcastGroupMember,
  updateBroadcastGroup,
} from "../../services/broadcastGroupService";

import type {
  BroadcastGroup,
  BroadcastGroupMember,
  BroadcastGroupMemberInput,
} from "../../types/broadcastGroups";

import "../../css/BroadcastGroupsModal.css";
import "../../css/new-chat-drawer.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

function memberName(member: BroadcastGroupMember) {
  return (
    member.currentDisplayName ||
    member.displayNameSnapshot ||
    member.phoneSnapshot ||
    member.emailSnapshot ||
    `${member.participantIdentity.participantType} contact`
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function participantLabel(type?: string | null) {
  if (!type) return "Contact";
  return type === "BUSINESS" ? "Business" : "Person";
}

function contactToMemberInput(contact: ContactLite): BroadcastGroupMemberInput | null {
  const anyC = contact as any;

  const userId = String(anyC.userId ?? "").trim();
  if (userId) {
    return {
      participantIdentity: {
        participantType: "USER",
        participantId: userId,
      },
      source: "WEB_CONTACT_PICKER",
    };
  }

  const businessId = String(anyC.businessId ?? "").trim();
  if (businessId) {
    return {
      participantIdentity: {
        participantType: "BUSINESS",
        participantId: businessId,
      },
      source: "WEB_CONTACT_PICKER",
    };
  }

  return null;
}

export default function BroadcastGroupsModal({ open, onClose }: Props) {
  const {
    myUserId,
    myUserProfile,
    myBusinesses,
    userContacts,
    tierContext,
  } = useAppData() as any;

  const [showIdentityMenu, setShowIdentityMenu] = useState(false);
  const identityMenuRef = useRef<HTMLDivElement | null>(null);
  const identityRef = useRef<IdentityOption | null>(null);

  const identityOptions = useMemo<IdentityOption[]>(() => {
    const out: IdentityOption[] = [];

    if (myUserId) {
      const name =
        [myUserProfile?.firstName, myUserProfile?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "Me";

      out.push({
        participantType: "USER",
        participantId: myUserId,
        title: name,
        subtitle: "Personal profile",
        imageUrl: myUserProfile?.profileImageUrl ?? null,
      });
    }

    for (const business of myBusinesses ?? []) {
      const businessId = String(business.businessId ?? "").trim();
      if (!businessId) continue;

      out.push({
        participantType: "BUSINESS",
        participantId: businessId,
        title:
          business.businessName ||
          business.name ||
          business.businessSlug ||
          "Business",
        subtitle: business.role ? `Business (${business.role})` : "Business",
        imageUrl: business.businessLogoUrl ?? business.logoUrl ?? null,
      });
    }

    return out;
  }, [myUserId, myUserProfile, myBusinesses]);

  const {
    safeIdentities,
    selectedIdentity,
    asKey,
    setAsKey,
    hasIdentities,
  } = useIdentitySelector({
    identities: identityOptions,
    defaultIdentity: identityOptions[0] ?? null,
    persistKey: "trihola:broadcast-groups-owner",
  });

  const selectedOwnerIdentity = useMemo(() => {
    if (!selectedIdentity) return null;

    return {
      participantType: selectedIdentity.participantType,
      participantId: selectedIdentity.participantId,
    };
  }, [
    selectedIdentity?.participantType,
    selectedIdentity?.participantId,
  ]);

  const ownerTier = useMemo(() => {
    if (!selectedOwnerIdentity || !tierContext) return null;

    if (selectedOwnerIdentity.participantType === "USER") {
      return tierContext.user?.participantId === selectedOwnerIdentity.participantId
        ? tierContext.user.tier
        : null;
    }

    return (
      tierContext.businesses?.find(
        (item: any) =>
          item.participantType === "BUSINESS" &&
          item.participantId === selectedOwnerIdentity.participantId
      )?.tier ?? null
    );
  }, [selectedOwnerIdentity, tierContext]);

  const maxGroupMembers = ownerTier?.maxBroadcastGroupMembers ?? null;

  const [groups, setGroups] = useState<BroadcastGroup[]>([]);
  const [members, setMembers] = useState<BroadcastGroupMember[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<BroadcastGroup | null>(null);
  const [addMembersOpen, setAddMembersOpen] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [groupSearchText, setGroupSearchText] = useState("");
  const [memberSearchText, setMemberSearchText] = useState("");

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        identityMenuRef.current &&
        !identityMenuRef.current.contains(e.target as Node)
      ) {
        setShowIdentityMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadGroups = useCallback(async () => {
    if (!selectedOwnerIdentity) return;

    const token = await getToken();
    if (!token) {
      setError("User not authenticated");
      return;
    }

    setLoadingGroups(true);
    setError(null);

    try {
      const res = await listBroadcastGroupsForOwner(token, selectedOwnerIdentity);
      setGroups(res ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not load groups.");
    } finally {
      setLoadingGroups(false);
    }
    }, [
    selectedOwnerIdentity?.participantType,
    selectedOwnerIdentity?.participantId,
  ]);

  const loadMembers = useCallback(async (group: BroadcastGroup) => {
    const token = await getToken();
    if (!token) {
      setError("User not authenticated");
      return;
    }

    setLoadingMembers(true);
    setError(null);

    try {
      const res = await listBroadcastGroupMembers(token, group.id);
      setMembers(res ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not load members.");
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setSelectedGroup(null);
    setMembers([]);
    setGroupName("");
    setGroupDescription("");
    setEditingGroupId(null);
    setShowGroupForm(false);
    setSelectedContactIds([]);
    setGroupSearchText("");
    setMemberSearchText("");
    setError(null);
    setShowIdentityMenu(false);
  }, [open]);

  useEffect(() => {
    if (!open || !selectedOwnerIdentity) return;

    setSelectedGroup(null);
    setMembers([]);
    loadGroups();
  }, [
    open,
    selectedOwnerIdentity?.participantType,
    selectedOwnerIdentity?.participantId,
    loadGroups,
  ]);

  const filteredGroups = useMemo(() => {
    const q = groupSearchText.trim().toLowerCase();
    if (!q) return groups;

    return groups.filter((group) =>
      [group.name, group.description, String(group.memberCount)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [groups, groupSearchText]);

  const filteredMembers = useMemo(() => {
    const q = memberSearchText.trim().toLowerCase();
    if (!q) return members;

    return members.filter((member) =>
      [
        member.currentDisplayName,
        member.displayNameSnapshot,
        member.phoneSnapshot,
        member.emailSnapshot,
        member.profileSlug,
        member.businessSlug,
        member.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [members, memberSearchText]);

  const existingMemberKeys = useMemo(() => {
    return new Set(
      members.map(
        (m) =>
          `${String(
            m.participantIdentity.participantType
          ).toUpperCase()}:${m.participantIdentity.participantId}`
      )
    );
  }, [members]);

  const addableContacts = useMemo(() => {
    return (userContacts ?? []).filter((c: any) => {
      const userId = String(c.userId ?? "").trim();
      if (userId && existingMemberKeys.has(`USER:${userId}`)) {
        return false;
      }

      const businessId = String(c.businessId ?? "").trim();
      if (
        businessId &&
        existingMemberKeys.has(`BUSINESS:${businessId}`)
      ) {
        return false;
      }

      return true;
    });
  }, [userContacts, existingMemberKeys]);

  const remainingGroupSlots = useMemo(() => {
    if (maxGroupMembers == null) return null;
    return Math.max(0, maxGroupMembers - members.length);
  }, [maxGroupMembers, members.length]);


  function startCreateGroup() {
    setEditingGroupId(null);
    setGroupName("");
    setGroupDescription("");
    setShowGroupForm(true);
  }

  function startRenameGroup(group: BroadcastGroup) {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description ?? "");
    setShowGroupForm(true);
  }

  function cancelGroupForm() {
    setEditingGroupId(null);
    setGroupName("");
    setGroupDescription("");
    setShowGroupForm(false);
  }

  async function saveGroup() {
    if (!selectedOwnerIdentity) return;

    const name = groupName.trim();
    if (!name) {
      setError("Please enter a group name.");
      return;
    }

    const token = await getToken();
    if (!token) {
      setError("User not authenticated");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingGroupId) {
        await updateBroadcastGroup(token, editingGroupId, {
          name,
          description: groupDescription.trim() || null,
        });
      } else {
        await createBroadcastGroup(token, {
          ownerIdentity: selectedOwnerIdentity,
          name,
          description: groupDescription.trim() || null,
        });
      }

      cancelGroupForm();
      await loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not save group.");
    } finally {
      setSaving(false);
    }
  }

  async function openGroup(group: BroadcastGroup) {
    setSelectedGroup(group);
    setSelectedContactIds([]);
    setAddMembersOpen(false);
    await loadMembers(group);
  }

  async function addSelectedMembers() {
    if (!selectedGroup) return;

    const selectedContacts = (userContacts ?? []).filter((c: any) =>
      selectedContactIds.includes(String(c.userId ?? c.businessId ?? c.id ?? ""))
    );

    const inputs = selectedContacts
      .map(contactToMemberInput)
      .filter(Boolean) as BroadcastGroupMemberInput[];

    if (inputs.length === 0) {
      setError("Please select at least one valid contact.");
      return;
    }

    if (maxGroupMembers !== null && members.length + inputs.length > maxGroupMembers) {
      setError(`This group can have at most ${maxGroupMembers} members.`);
      return;
    }

    const token = await getToken();
    if (!token) {
      setError("User not authenticated");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addBroadcastGroupMembers(token, selectedGroup.id, { members: inputs });
      setSelectedContactIds([]);
      setAddMembersOpen(false);
      await loadMembers(selectedGroup);
      await loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not add members.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: BroadcastGroupMember) {
    if (!selectedGroup) return;

    const ok = window.confirm(`Remove ${memberName(member)} from this group?`);
    if (!ok) return;

    const token = await getToken();
    if (!token) {
      setError("User not authenticated");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await removeBroadcastGroupMember(
        token,
        selectedGroup.id,
        member.participantIdentity
      );

      await loadMembers(selectedGroup);
      await loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not remove member.");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <div className="broadcastGroupsModal__footer">
      <button type="button" className="btn btn--ghost" onClick={onClose}>
        Close
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      title={selectedGroup ? selectedGroup.name : "Broadcast groups"}
      onClose={onClose}
      footer={footer}
      maxWidth={960}
    >
      <div className="broadcastGroupsModal">
        {error && <div className="broadcastGroupsModal__error">{error}</div>}

        {!selectedGroup && (
          <div className="broadcastGroupsModal__topbar">
            <div className="broadcastGroupsModal__identityBlock">
              <div className="broadcastGroupsModal__eyebrow">Manage groups as</div>

              <ThreadIdentityMenu
                showIdentityMenu={showIdentityMenu}
                setShowIdentityMenu={setShowIdentityMenu}
                identityMenuRef={identityMenuRef}
                hasIdentities={hasIdentities}
                effectiveIdentity={selectedIdentity}
                myDisplayName={selectedIdentity?.title ?? "Me"}
                safeIdentities={safeIdentities}
                asKey={asKey}
                keyOf={identityKey}
                setAsKey={(key) => {
                  setAsKey(key);
                  setSelectedGroup(null);
                  setMembers([]);
                  setShowGroupForm(false);
                }}
                identityRef={identityRef}
              />
            </div>

            <button
              type="button"
              className="btn btn--primary broadcastGroupsModal__createBtn"
              onClick={startCreateGroup}
              disabled={saving || !selectedOwnerIdentity}
            >
              + Create group
            </button>
          </div>
        )}

        {!selectedGroup && ownerTier && maxGroupMembers && (
          <div className="broadcastGroupsModal__limit">
            <span className="broadcastGroupsModal__limitIcon">👥</span>
            <span>
              <strong>{maxGroupMembers}</strong> members per group are allowed for{" "}
              <strong>
                {selectedIdentity?.title ??
                  (selectedOwnerIdentity?.participantType === "BUSINESS"
                    ? "this business"
                    : "this profile")}
              </strong>
            </span>
          </div>
        )}

        {(loadingGroups || loadingMembers || saving) && (
          <div className="broadcastGroupsModal__loading">Fetching…</div>
        )}

        {!selectedGroup ? (
          <>
            {showGroupForm && (
              <div className="broadcastGroupsModal__formCard">
                <div className="broadcastGroupsModal__formHeader">
                  <div>
                    <h3>{editingGroupId ? "Rename group" : "Create group"}</h3>
                    <p>{editingGroupId ? "Update the group name or notes." : "Create a reusable list for broadcasts."}</p>
                  </div>
                </div>

                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                />

                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Description optional"
                />

                <div className="broadcastGroupsModal__formActions">
                  <button type="button" className="btn btn--ghost" onClick={cancelGroupForm}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn--primary" onClick={saveGroup}>
                    {editingGroupId ? "Save" : "Create"}
                  </button>
                </div>
              </div>
            )}

            <div className="broadcastGroupsModal__searchCard">
              <input
                className="broadcastGroupsModal__search"
                value={groupSearchText}
                onChange={(e) => setGroupSearchText(e.target.value)}
                placeholder="Search groups"
              />
            </div>

            <div className="broadcastGroupsModal__groups">
              {filteredGroups.length === 0 ? (
                <div className="broadcastGroupsModal__empty">No groups found.</div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.id} className="broadcastGroupsModal__groupRow">
                    <button
                      type="button"
                      className="broadcastGroupsModal__groupMainBtn"
                      onClick={() => openGroup(group)}
                    >
                      <div className="broadcastGroupsModal__groupAvatar">
                        {initials(group.name)}
                      </div>

                      <div className="broadcastGroupsModal__groupMain">
                        <strong>{group.name}</strong>
                        <span>
                          {group.description?.trim() || "Broadcast group"}
                        </span>
                      </div>

                      <div className="broadcastGroupsModal__groupMeta">
                        <span className="broadcastGroupsModal__pill">
                          {group.memberCount}
                          {maxGroupMembers ? ` / ${maxGroupMembers}` : ""} members
                        </span>
                        <span className="broadcastGroupsModal__chevron">›</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="broadcastGroupsModal__iconBtn"
                      onClick={() => startRenameGroup(group)}
                      aria-label={`Rename ${group.name}`}
                      title="Rename group"
                    >
                      ✎
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="broadcastGroupsModal__detail">
            <div className="broadcastGroupsModal__detailHeader">
              <button
                type="button"
                className="btn btn--ghost broadcastGroupsModal__backBtn"
                onClick={() => {
                  setSelectedGroup(null);
                  setMembers([]);
                  setAddMembersOpen(false);
                }}
              >
                ← Groups
              </button>

              <div className="broadcastGroupsModal__detailTitleBlock">
                <div className="broadcastGroupsModal__detailTitle">{selectedGroup.name}</div>
                <div className="broadcastGroupsModal__memberCount">
                  {members.length}
                  {maxGroupMembers ? ` / ${maxGroupMembers}` : ""} members

                  {remainingGroupSlots !== null && (
                    <span className="broadcastGroupsModal__remaining">
                      {" "}
                      • {remainingGroupSlots} remaining
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setAddMembersOpen(true)}
                disabled={
                  saving ||
                  addMembersOpen ||
                  (remainingGroupSlots !== null &&
                    remainingGroupSlots <= 0)
                }
              >
                + Add members
              </button>
            </div>

            {addMembersOpen ? (
              <div className="broadcastGroupsModal__addMembers">
                <div className="broadcastGroupsModal__addMembersHeader">
                  <div>
                    <strong>Add members</strong>
                    <span>Select contacts to add to this group.</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setSelectedContactIds([]);
                      setAddMembersOpen(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

                <ContactMultiSelect
                  contacts={addableContacts}
                  value={selectedContactIds}
                  onChange={(ids) => {
                    const unique = Array.from(new Set(ids.map(String)));

                    if (
                      remainingGroupSlots !== null &&
                      unique.length > remainingGroupSlots
                    ) {
                      setError(
                        `You can add only ${remainingGroupSlots} more member${
                          remainingGroupSlots === 1 ? "" : "s"
                        } to this group.`
                      );

                      setSelectedContactIds(
                        unique.slice(0, remainingGroupSlots)
                      );
                      return;
                    }

                    setError(null);
                    setSelectedContactIds(unique);
                  }}
                  placeholder="Search contacts to add…"
                  showBulkActions
                  disabled={saving}
                  maxRender={80}
                />

                <div className="broadcastGroupsModal__addMembersFooter">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={addSelectedMembers}
                    disabled={saving || selectedContactIds.length === 0}
                  >
                    Add {selectedContactIds.length || ""} selected
                  </button>
                </div>
              </div>
            ) : null}

            <div className="broadcastGroupsModal__searchCard">
              <input
                className="broadcastGroupsModal__search"
                value={memberSearchText}
                onChange={(e) => setMemberSearchText(e.target.value)}
                placeholder="Search members"
              />
            </div>

            <div className="broadcastGroupsModal__members">
              {filteredMembers.length === 0 ? (
                <div className="broadcastGroupsModal__empty">No members found.</div>
              ) : (
                filteredMembers.map((member) => {
                  const name = memberName(member);

                  return (
                    <div key={member.id} className="broadcastGroupsModal__memberRow">
                      <div className="broadcastGroupsModal__avatar">
                        {member.currentImageUrl || member.imageUrlSnapshot ? (
                          <img
                            src={member.currentImageUrl || member.imageUrlSnapshot || ""}
                            alt={name}
                          />
                        ) : (
                          <span>{initials(name)}</span>
                        )}
                      </div>

                      <div className="broadcastGroupsModal__memberMain">
                        <strong>{name}</strong>
                        <span>
                          {member.phoneSnapshot ||
                            member.emailSnapshot ||
                            member.source ||
                            participantLabel(member.participantIdentity.participantType)}
                        </span>
                      </div>

                      <span className="broadcastGroupsModal__memberType">
                        {participantLabel(member.participantIdentity.participantType)}
                      </span>

                      <button
                        type="button"
                        className="broadcastGroupsModal__iconBtn broadcastGroupsModal__iconBtn--danger"
                        onClick={() => removeMember(member)}
                        aria-label={`Remove ${name}`}
                        title="Remove member"
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}