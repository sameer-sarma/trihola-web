import { useMemo } from "react";
import ContactMultiSelect, {
  type ContactLite,
} from "../../../components/contacts/ContactMultiSelect";
import DrawerSubmodal from "./DrawerSubModal";
import { mergeContacts } from "../../../utils/broadcastHelpers";

type Mode = "PROSPECT" | "TARGET";

type Props = {
  open: boolean;
  onClose: () => void;

  mode: Mode;

  userContacts?: ContactLite[];
  businessContacts?: ContactLite[];

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  contactsLoading?: boolean;
  refreshContacts?: () => Promise<void>;

  disabled?: boolean;

  /**
   * For TARGET mode, exclude the currently selected prospect user id
   * so prospect and target cannot be the same USER.
   */
  excludeUserId?: string | null;
};

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function isUserContact(c: ContactLite) {
  return !!clean((c as any)?.userId);
}

function isBusinessContact(c: ContactLite) {
  return !!clean((c as any)?.businessId);
}

function contactId(c: ContactLite) {
  const anyC = c as any;
  return clean(anyC.userId || anyC.businessId || anyC.id);
}

export default function ReferralContactSelectPanel({
  open,
  onClose,
  mode,
  userContacts = [],
  businessContacts = [],
  selectedId,
  setSelectedId,
  contactsLoading = false,
  refreshContacts,
  disabled = false,
  excludeUserId,
}: Props) {
  const mergedContacts = useMemo(() => {
    return mergeContacts(userContacts, businessContacts);
  }, [userContacts, businessContacts]);

  const selectableContacts = useMemo(() => {
    if (mode === "PROSPECT") {
      return mergedContacts.filter((c) => isUserContact(c));
    }

    return mergedContacts.filter((c) => {
      const anyC = c as any;

      if (isBusinessContact(c)) return true;

      if (isUserContact(c)) {
        const uid = clean(anyC.userId);
        if (excludeUserId && uid === clean(excludeUserId)) return false;
        return true;
      }

      return false;
    });
  }, [mergedContacts, mode, excludeUserId]);

  const value = selectedId ? [selectedId] : [];

  return (
    <DrawerSubmodal
      open={open}
      onClose={onClose}
      title={mode === "PROSPECT" ? "Select prospect" : "Select business / target"}
      footer={
        <div className="th-ctaFooter">
          <button className="btn" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="th-ctaGrid">
        {contactsLoading && selectableContacts.length === 0 ? (
          <div className="th-ctaHint">
            {mode === "PROSPECT" ? "Loading user contacts…" : "Loading contacts…"}
          </div>
        ) : null}

        <ContactMultiSelect
          contacts={selectableContacts}
          value={value}
          onChange={(ids) => {
            const normalized = Array.from(new Set(ids.map(String)));
            const next = normalized[0] ?? null;
            setSelectedId(next);
          }}
          placeholder={
            mode === "PROSPECT"
              ? "Search user contacts…"
              : "Search user and business contacts…"
          }
          showBulkActions={false}
          showAddContact
          addContactLabel="+ Add contact"
          refreshAfterAdd={refreshContacts}
          optimisticAppendOnAdd
          disabled={disabled}
        />

        <div className="th-ctaHint">
          {mode === "PROSPECT"
            ? "Only user contacts can be chosen as the prospect."
            : "Target can be either a user or a business. If target is a user, it cannot be the same as the prospect."}
        </div>
      </div>
    </DrawerSubmodal>
  );
}