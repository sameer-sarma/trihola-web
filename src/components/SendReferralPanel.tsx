// src/components/SendReferralPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { sendCampaignReferrals } from "../services/referralService";
import type { SendReferralsRequest } from "../types/invites";
import "../css/ui-forms.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type ContactResponse = {
  userId: string;
  profileSlug: string;
  businessSlug?: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
};

const fullNameOf = (c?: ContactResponse | null) =>
  (c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "") || "";

const primaryNameOf = (c?: ContactResponse | null) =>
  fullNameOf(c) || c?.businessName || "Unnamed";

export type SendReferralPanelProps = {
  open: boolean;
  onClose: () => void;
  token?: string;
  campaignId: string;
  inviteId: string;
  defaultNote: string;
  onSent?: (count: number) => void;
};

const SendReferralPanel: React.FC<SendReferralPanelProps> = ({
  open,
  onClose,
  token,
  campaignId,
  inviteId,
  defaultNote,
  onSent,
}) => {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState(defaultNote);

  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Keep note in sync if defaultNote changes while open
  useEffect(() => {
    if (open) setNote(defaultNote);
  }, [defaultNote, open]);

  // Load contacts when panel opens
  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;

    async function loadContacts() {
      setContactsLoading(true);
      setContactsError(null);
      try {
        const res = await axios.get<ContactResponse[]>(`${API_BASE}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setContacts(res.data ?? []);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setContactsError(
            e?.response?.data ?? e?.message ?? "Failed to load contacts."
          );
        }
      } finally {
        if (!cancelled) {
          setContactsLoading(false);
        }
      }
    }

    void loadContacts();
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const filteredContacts = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = `${c.firstName ?? ""} ${c.lastName ?? ""} ${
        c.businessName ?? ""
      }`
        .toLowerCase()
        .trim();
      return name.includes(q);
    });
  }, [contacts, search]);

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const canSend =
    !!token &&
    !!campaignId &&
    !!inviteId &&
    selectedIds.length > 0 &&
    note.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: SendReferralsRequest = {
      inviteId,
      note,
      prospects: selectedIds.map((id) => ({ prospectUserId: id })),
    };

    try {
      const { createdReferralIds } = await sendCampaignReferrals(
        campaignId,
        payload,
        token!
      );
      const count = createdReferralIds.length;
      setSuccessMsg(`Sent ${count} referral${count === 1 ? "" : "s"}.`);
      setSelectedIds([]);
      onSent?.(count);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(
        e?.response?.data ??
          e?.message ??
          "Failed to send referrals. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <section className="card invite-send-panel">
      <div className="th-row th-between" style={{ marginBottom: 8 }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          Send referrals from this invite
        </h3>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="th-muted">
        Select one or more contacts and customize your message. You can use
        placeholders like <code>{`{firstName}`}</code>,{" "}
        <code>{`{fullName}`}</code> and <code>{`{myName}`}</code>.
      </p>

      {/* Contacts list */}
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="th-row th-between" style={{ marginBottom: 8 }}>
          <strong>Prospects</strong>
          <span className="th-muted">{selectedIds.length} selected</span>
        </div>

        <div className="crf-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            aria-label="Search contacts"
          />
        </div>

        {contactsLoading && <div className="th-muted">Loading contacts…</div>}
        {contactsError && (
          <div className="th-error" style={{ marginTop: 8 }}>
            {contactsError}
          </div>
        )}

        {!contactsLoading && !contactsError && (
          <div className="crf-list" role="listbox" aria-label="Prospects">
            {filteredContacts.map((c) => {
              const primary = primaryNameOf(c);
              const selected = selectedIds.includes(c.userId);
              return (
                <button
                  type="button"
                  key={c.userId}
                  className={`contact-row ${selected ? "is-selected" : ""}`}
                  onClick={() => toggleSelect(c.userId)}
                  aria-pressed={selected}
                >
                  <div className="contact-row__img">
                    {c.profileImageUrl ? (
                      <img src={c.profileImageUrl} alt={primary} />
                    ) : (
                      <div className="contact-row__placeholder">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="contact-row__text">
                    <div className="contact-row__primary">{primary}</div>
                    {c.businessName && (
                      <div className="contact-row__secondary">
                        {c.businessName}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            {!filteredContacts.length && (
              <div className="crf-empty">No contacts match your search.</div>
            )}
          </div>
        )}
      </div>

      {/* Note field */}
      <div className="crf-note" style={{ marginBottom: 12 }}>
        <label htmlFor="invite-note">Message to prospects</label>
        <textarea
          id="invite-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Explain why you’re recommending this business or offer…"
        />
      </div>

      {errorMsg && <p className="crf-msg err">{errorMsg}</p>}
      {successMsg && <p className="crf-msg ok">{successMsg}</p>}

      <div className="th-row th-right">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canSend || sending}
          onClick={handleSend}
        >
          {sending ? "Sending…" : "Send referrals"}
        </button>
      </div>
    </section>
  );
};

export default SendReferralPanel;
