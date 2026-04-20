// src/pages/threads/components/BroadcastRecipientsPanel.tsx
import React, { useMemo } from "react";
import ContactMultiSelect, {
  type ContactLite,
} from "../../../components/contacts/ContactMultiSelect";
import DrawerSubmodal from "./DrawerSubModal";
import { mergeContacts } from "../../../utils/broadcastHelpers";

type Props = {
  open: boolean;
  onClose: () => void;

  userContacts?: ContactLite[];
  businessContacts?: ContactLite[];

  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;

  contactsLoading?: boolean;
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
  contactsLoading = false,
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

        <ContactMultiSelect
          contacts={userOnlyContacts}
          value={selectedIds}
          onChange={(ids) => setSelectedIds(Array.from(new Set(ids.map(String))))}
          placeholder="Search user contacts…"
          showBulkActions
          showAddContact
          addContactLabel="+ Add contact"
          refreshAfterAdd={refreshContacts}
          optimisticAppendOnAdd
          disabled={disabled}
        />

        <div className="th-ctaHint">
          Only user contacts can receive announcement items at this stage.
        </div>
      </div>
    </DrawerSubmodal>
  );
}