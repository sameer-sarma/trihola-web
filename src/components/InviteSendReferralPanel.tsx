import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { sendCampaignReferrals } from "../services/referralService";
import type { SendReferralsRequest, Contact } from "../types/invites";
import ContactMultiSelect from "./ContactMultiSelect";
import AddContactModal from "../components/AddContactModal";
import type { ContactResponse as ServiceContactResponse } from "../services/contactService";
import "../css/ui-forms.css";

function buildDefaultMessage(opts: {
  campaignTitle: string;
  businessName: string;
  defaultNote?: string;
}) {
  const base = (opts.defaultNote || "").trim();
  if (base) return `Hi {fullName},\n\n${base}`;
  return `Hi {fullName},\n\nI’m inviting you to check out ${opts.campaignTitle} on Trihola.`;
}

export default function InviteSendReferralPanel(props: {
  token?: string;
  campaignId?: string;
  inviteId?: string;
  campaignTitle: string;
  businessName: string;
  themeColor?: string;
  defaultNote?: string;
  onSent: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState<string>(() =>
    buildDefaultMessage({
      campaignTitle: props.campaignTitle,
      businessName: props.businessName,
      defaultNote: props.defaultNote,
    })
  );

  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // ✅ NEW: AddContactModal state
  const [addContactOpen, setAddContactOpen] = useState(false);

  // Fetch contacts (same as CreateReferralForm-style)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingContacts(true);
      setErr(null);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = props.token || session?.access_token;
        if (!token) throw new Error("You must be logged in.");
        const res = await axios.get(`${__API_BASE__}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setContacts(res.data || []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load contacts.");
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.token]);

  // ✅ NEW: when a contact is created, insert into local list and auto-select it
  const upsertLocalContactAndSelect = (c: ServiceContactResponse) => {
    setContacts((prev) => {
      const exists = prev.some((x: any) => x.userId === c.userId);
      // Cast is intentional: your contacts endpoint already returns compatible objects
      return exists ? prev : ([c as any, ...prev] as any);
    });

    setSelectedIds((prev) => (prev.includes(c.userId) ? prev : [...prev, c.userId]));
  };

  const handleSend = async () => {
    setErr(null);
    setOk(null);

    if (!props.campaignId || !props.inviteId) {
      setErr("Missing campaign/invite context.");
      return;
    }
    if (!selectedIds.length) {
      setErr("Please select at least one prospect.");
      return;
    }
    if (!note.trim()) {
      setErr("Please enter a message.");
      return;
    }

    try {
      setSending(true);

      const session = (await supabase.auth.getSession()).data.session;
      const token = props.token || session?.access_token;
      if (!token) throw new Error("You must be logged in.");

      const payload: SendReferralsRequest = {
        inviteId: props.inviteId,
        note: note.trim(),
        prospects: selectedIds.map((id) => ({ prospectUserId: id })),
      };

      const resp = await sendCampaignReferrals(props.campaignId, payload, token);

      const created = resp.createdReferralIds?.length ?? 0;
      const duped = resp.duplicateReferralIdsMessaged?.length ?? 0;

      if (created > 0 && duped > 0) {
        setOk(
          `Sent ${created} new referral${created === 1 ? "" : "s"} and added your message to ${duped} existing referral${
            duped === 1 ? "" : "s"
          }.`
        );
      } else if (created > 0) {
        setOk(`Sent ${created} new referral${created === 1 ? "" : "s"}.`);
      } else if (duped > 0) {
        setOk(`Added your message to ${duped} existing referral${duped === 1 ? "" : "s"}.`);
      } else {
        setOk("No referrals were sent.");
      }

      setSelectedIds([]);
      props.onSent();
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to send referrals.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="crf" style={{ paddingTop: 4 }}>
      <div className="card" style={{ marginBottom: 14 }}>

        <div
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "nowrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <strong>Prospects</strong>
            <span className="th-muted">{selectedIds.length} selected</span>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => setAddContactOpen(true)}
            disabled={sending || loadingContacts}
            title="Add a new contact without leaving this flow"
            style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
          >
            + Add contact
          </button>
        </div>

        <ContactMultiSelect
          contacts={contacts}
          value={selectedIds}
          onChange={setSelectedIds}
          disabled={sending || loadingContacts}
          placeholder="Search name, phone, email…"
          maxRender={250}
        />

        {loadingContacts && <div className="th-muted" style={{ marginTop: 8 }}>Loading contacts…</div>}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="crf-note">
          <label htmlFor="invite-note">Message to prospect</label>
          <textarea
            id="invite-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            placeholder="Write your message…"
          />
        </div>

        <div className="th-row th-between" style={{ marginTop: 8 }}>
          <button type="button" className="btn" onClick={props.onSent}>
            Close
          </button>

          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSend}
            disabled={sending || !selectedIds.length || !note.trim()}
            style={
              props.themeColor
                ? { backgroundColor: props.themeColor, borderColor: props.themeColor }
                : undefined
            }
          >
            {sending ? "Sending…" : "Send referral"}
          </button>
        </div>

        {ok && <p className="crf-msg ok">{ok}</p>}
        {err && <p className="crf-msg err">{err}</p>}
      </div>

      {/* ✅ NEW: AddContactModal */}
      <AddContactModal
        open={addContactOpen}
        title="Add contact"
        onClose={() => setAddContactOpen(false)}
        onAdded={(c) => upsertLocalContactAndSelect(c)}
      />
    </div>
  );
}
