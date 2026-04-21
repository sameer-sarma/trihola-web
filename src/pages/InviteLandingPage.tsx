// =============================================
// FILE: src/pages/InviteLandingPage.tsx
// (Invitee-facing: Accept / Decline)
// =============================================
import { useState } from 'react';
import { acceptInvite, declineInvite } from '../api/campaigninvitesapi';


export default function InviteLandingPage({ inviteId, token, onDone }: { inviteId: string; token?: string; onDone?: (status: 'ACCEPTED' | 'DECLINED') => void }) {
const [busy, setBusy] = useState<'ACCEPT' | 'DECLINE' | null>(null);
const [err, setErr] = useState<string | null>(null);
const [status, setStatus] = useState<'ACCEPTED' | 'DECLINED' | null>(null);


const doAccept = async () => {
setBusy('ACCEPT'); setErr(null);
try {
await acceptInvite(inviteId, token);
setStatus('ACCEPTED');
onDone?.('ACCEPTED');
} catch (e: any) { setErr(e.message || String(e)); }
finally { setBusy(null); }
};


const doDecline = async () => {
setBusy('DECLINE'); setErr(null);
try {
await declineInvite(inviteId, token);
setStatus('DECLINED');
onDone?.('DECLINED');
} catch (e: any) { setErr(e.message || String(e)); }
finally { setBusy(null); }
};

return (
<div className="invite-landing">
<div className="invite-card">
<h2 className="page-title">Campaign Invitation</h2>
<p className="help-text">You've been invited to join this campaign. You can accept or decline below.</p>
{err && <div className="error-banner">{err}</div>}
{status ? (
<div className="success-banner">Thanks! You have {status.toLowerCase()} this invite.</div>
) : (
<div className="actions">
<button className="btn btn--primary" onClick={doAccept} disabled={busy !== null}>{busy === 'ACCEPT' ? 'Accepting…' : 'Accept & Continue'}</button>
<button className="btn" onClick={doDecline} disabled={busy !== null}>{busy === 'DECLINE' ? 'Declining…' : 'No thanks'}</button>
</div>
)}
</div>
</div>
);
}