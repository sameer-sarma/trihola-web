// src/pages/threads/components/BroadcastRecipientsPanel.tsx
import React, { useMemo } from "react";
import ContactMultiSelect, {
  type ContactLite,
} from "../../../components/contacts/ContactMultiSelect";
import DrawerSubmodal from "./DrawerSubModal";
import { mergeContacts } from "../../../utils/broadcastHelpers";
import type { BroadcastGroup } from "../../../types/broadcastGroups";

type Props = {
  open: boolean;
  onClose: () => void;

  userContacts?: ContactLite[];
  businessContacts?: ContactLite[];

  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;

  broadcastGroups?: BroadcastGroup[];
  selectedGroupIds: string[];
  setSelectedGroupIds: React.Dispatch<React.SetStateAction<string[]>>;

  contactsLoading?: boolean;
  groupsLoading?: boolean;

  refreshContacts?: () => Promise<void>;

  disabled?: boolean;
};

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

export default function BroadcastRecipientsPanel({
  open,
  onClose,
  userContacts = [],
  businessContacts = [],
  selectedIds,
  setSelectedIds,

  broadcastGroups = [],
  selectedGroupIds,
  setSelectedGroupIds,

  contactsLoading = false,
  groupsLoading = false,

  refreshContacts,
  disabled = false,
}: Props) {
  const mergedContacts = useMemo(() => {
    return mergeContacts(userContacts, businessContacts);
  }, [userContacts, businessContacts]);

  const userOnlyContacts = useMemo(() => {
    return mergedContacts.filter((c) => {
      const anyC = c as any;
      return !!clean(anyC.userId);
    });
  }, [mergedContacts]);

  const toggleGroup = (groupId: string) => {
    if (disabled) return;

    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  };

  return (
    <DrawerSubmodal
      open={open}
      onClose={onClose}
      title="Select recipients"
      footer={
        <div className="th-ctaFooter">
          <button className="btn" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="th-ctaGrid">
        {contactsLoading && userOnlyContacts.length === 0 ? (
          <div className="th-ctaHint">Loading user contacts…</div>
        ) : null}

        <div className="bc-recipient-section">
          <div className="bc-recipient-section__head">
            <div>
              <div className="bc-recipient-section__title">People</div>
              <div className="bc-recipient-section__sub">
                Select individual user contacts.
              </div>
            </div>
          </div>

          <ContactMultiSelect
            contacts={userOnlyContacts}
            value={selectedIds}
            onChange={(ids) =>
              setSelectedIds(Array.from(new Set(ids.map(String))))
            }
            placeholder="Search user contacts…"
            showBulkActions
            showAddContact
            addContactLabel="+ Add contact"
            refreshAfterAdd={refreshContacts}
            optimisticAppendOnAdd
            disabled={disabled}
          />
        </div>

        <div className="bc-recipient-section">
          <div className="bc-recipient-section__head">
            <div>
              <div className="bc-recipient-section__title">
                Broadcast Groups
              </div>
              <div className="bc-recipient-section__sub">
                Send to all active members in a group.
              </div>
            </div>
          </div>

          {groupsLoading ? (
            <div className="th-ctaHint">Loading groups…</div>
          ) : broadcastGroups.length === 0 ? (
            <div className="bc-group-empty">
              No broadcast groups found for this identity.
            </div>
          ) : (
            <div className="bc-group-list">
              {broadcastGroups.map((group) => {
                const selected = selectedGroupIds.includes(group.id);

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`bc-group-row ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleGroup(group.id)}
                    disabled={disabled}
                  >
                    <div className="bc-group-row__main">
                      <div className="bc-group-row__name">{group.name}</div>

                      <div className="bc-group-row__meta">
                        {group.memberCount} members
                      </div>

                      {group.description ? (
                        <div className="bc-group-row__desc">
                          {group.description}
                        </div>
                      ) : null}
                    </div>

                    <div className="bc-group-row__check">
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="th-ctaHint">
          Select individual contacts, broadcast groups, or both.
        </div>
      </div>
    </DrawerSubmodal>
  );
}