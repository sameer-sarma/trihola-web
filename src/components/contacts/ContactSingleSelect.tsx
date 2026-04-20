import { useMemo } from "react";
import ContactMultiSelect, { type ContactLite } from "./ContactMultiSelect";
import type { UserMini } from "../../types/referral";

function toUserMini(c: ContactLite): UserMini {
  return {
    userId: String(c.userId),
    slug: c.profileSlug ?? String(c.userId),
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    profileImageUrl: c.profileImageUrl ?? null,
  };
}

export default function ContactSingleSelect(props: {
  contacts: ContactLite[];
  value: UserMini | null;
  onChange: (u: UserMini | null) => void;
  disabled?: boolean;
  placeholder?: string;
  showAddContact?: boolean;
  onContactAdded?: (created: any) => void;
}) {
  const { contacts, value, onChange } = props;

  const selectedIds = useMemo(() => (value?.userId ? [value.userId] : []), [value]);

  return (
    <ContactMultiSelect
      contacts={contacts}
      value={selectedIds}
      onChange={(ids) => {
        // enforce single select
        const id = ids.length ? ids[ids.length - 1] : "";
        if (!id) return onChange(null);

        const found = contacts.find((c) => String(c.userId) === String(id));
        if (!found) return onChange(null);

        onChange(toUserMini(found));
      }}
      disabled={props.disabled}
      placeholder={props.placeholder}
      showBulkActions={false}
      showAddContact={props.showAddContact}
      onContactAdded={props.onContactAdded}
      autoSelectOnAdd={true}
      optimisticAppendOnAdd={true}
    />
  );
}
