// =============================================
// FILE: src/pages/SendCampaignInvite.tsx
// =============================================
import React, { useMemo, useState } from 'react';
import ContactMultiSelect from '../components/ContactMultiSelect';
import { sendCampaignInvites } from '../api/campaigninvitesapi';
import type { SendCampaignInvitesRequest, Contact } from '../types/invites';


export default function SendCampaignInvite({
campaignId,
token,
contacts,
businessName,
}: {
campaignId: string;
token?: string;
contacts: Contact[];
businessName?: string | null;
}) {
const [selected, setSelected] = useState<string[]>([]);
const [personalSubject, setPersonalSubject] = useState<string>('Hey {firstName} — thought of you!');
const [personalMessage, setPersonalMessage] = useState<string>('Hi {fullName}, {businessName} invited you to check this campaign.');
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string | null>(null);
const [done, setDone] = useState(false);


// simple local preview renderer (client-side only, mirrors server behavior)
const preview = useMemo(() => {
const first = contacts.find(c => c.userId === selected[0]);
if (!first) return null;
const fn = first.firstName || 'there';
const ln = first.lastName || '';
const full = [first.firstName, first.lastName].filter(Boolean).join(' ') || fn;
const vars: Record<string, string> = {
firstName: fn,
lastName: ln,
fullName: full,
businessName: businessName || '',
};
const rr = (tpl?: string) => tpl?.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => vars[k] ?? `{${k}}`) ?? '';
return {
subject: rr(personalSubject),
message: rr(personalMessage),
name: full,
};
}, [selected, contacts, personalSubject, personalMessage, businessName]);


const onSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setError(null);
setBusy(true);
try {
const payload: SendCampaignInvitesRequest = {
affiliateUserIds: selected,
personalSubject,
personalMessage,
};
await sendCampaignInvites(campaignId, payload, token);
setDone(true);
setSelected([]);
} catch (err: any) {
setError(err.message || String(err));
} finally {
setBusy(false);
}
};

return (
<div className="page-wrap">
<div className="form-card">
<h2 className="page-title">Send Campaign Invites</h2>
<form className="th-form" onSubmit={onSubmit}>
<div className="card-section">
<h4 className="section-title">Recipients</h4>
<ContactMultiSelect contacts={contacts} value={selected} onChange={setSelected} />
<div className="help-text">Pick one or more contacts to invite.</div>
</div>


<div className="card-section">
<h4 className="section-title">Personalization</h4>
<div className="th-grid-2">
<div className="th-field">
<label className="th-label">Subject</label>
<input className="th-input" value={personalSubject} onChange={e => setPersonalSubject(e.target.value)} placeholder="Subject (supports {firstName} {fullName} {businessName})" />
</div>
<div className="th-field">
<label className="th-label">Message</label>
<textarea className="th-textarea" value={personalMessage} onChange={e => setPersonalMessage(e.target.value)} rows={4} placeholder="Message (supports {firstName} {lastName} {fullName} {businessName})" />
</div>
</div>
<div className="preview">
<div className="preview__title">Preview {preview?.name ? `for ${preview.name}` : ''}</div>
<div className="preview__item"><strong>Subject:</strong> {preview?.subject || '—'}</div>
<div className="preview__item"><strong>Message:</strong> {preview?.message || '—'}</div>
</div>
</div>


{error && <div className="error-banner">{error}</div>}
{done && <div className="success-banner">Invites sent!</div>}


<div className="actions">
<button className="btn btn--primary" type="submit" disabled={busy || selected.length === 0}>
{busy ? 'Sending…' : `Send to ${selected.length} contact${selected.length === 1 ? '' : 's'}`}
</button>
</div>
</form>
</div>
</div>
);
}