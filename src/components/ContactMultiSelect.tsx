// =============================================
// FILE: src/components/ContactMultiSelect.tsx
// (lightweight – expects contacts list provided by parent)
// =============================================
import type { Contact } from '../types/invites';

export type ContactMultiSelectProps = {
contacts: Contact[];
value: string[]; // array of selected userIds
onChange: (ids: string[]) => void;
disabled?: boolean;
placeholder?: string;
};


export default function ContactMultiSelect({ contacts, value, onChange, disabled, placeholder }: ContactMultiSelectProps) {
const toggle = (id: string) => {
if (value.includes(id)) onChange(value.filter(v => v !== id));
else onChange([...value, id]);
};


return (
<div className="contact-multi">
<div className="contact-multi__list" role="list">
{contacts.map((c) => {
const id = c.userId;
const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
const selected = value.includes(id);
return (
<button
type="button"
key={id}
className={`contact-multi__item ${selected ? 'is-selected' : ''}`}
onClick={() => toggle(id)}
disabled={disabled}
>
{c.profileImageUrl ? (
<img src={c.profileImageUrl} className="contact-multi__avatar" alt={name} />
) : (
<div className="contact-multi__avatar contact-multi__avatar--placeholder">{name.charAt(0).toUpperCase()}</div>
)}
<div className="contact-multi__meta">
<div className="contact-multi__name">{name}</div>
<div className="contact-multi__sub">{c.phone || c.email || '—'}</div>
</div>
<input type="checkbox" checked={selected} readOnly />
</button>
);
})}
</div>
{value.length === 0 && (
<div className="contact-multi__empty">{placeholder || 'Select contacts'}</div>
)}
</div>
);
}