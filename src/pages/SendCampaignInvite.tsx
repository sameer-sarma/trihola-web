// =============================================
// FILE: src/pages/SendCampaignInvite.tsx
// =============================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import ContactMultiSelect from "../components/ContactMultiSelect";
import Modal from "../components/Modal";
import { sendCampaignInvites } from "../api/campaigninvitesapi";
import type { SendCampaignInvitesRequest, Contact } from "../types/invites";
import { useCampaignById } from "../queries/campaignQueries";
import "../css/SendCampaignInvite.css";

type VarToken = "{firstName}" | "{lastName}" | "{fullName}" | "{businessName}";
const TOKENS: { token: VarToken; label: string; desc: string }[] = [
  { token: "{firstName}", label: "First name", desc: "Recipient’s first name" },
  { token: "{lastName}", label: "Last name", desc: "Recipient’s last name" },
  { token: "{fullName}", label: "Full name", desc: "Recipient’s full name" },
  { token: "{businessName}", label: "Business name", desc: "Your business name" },
];

function buildDefaultSubject(c: any) {
  // Prefer a clear headline/title
  return (
    c?.affiliateHeadline ||
    c?.title ||
    "Invitation from {businessName}"
  );
}

function buildDefaultMessage(c: any) {
  // Prefer the explicit campaign message; otherwise fall back to longer affiliate description
  const body =
    c?.message ||
    c?.affiliateLongDescription ||
    c?.campaignDescription ||
    "You’ve been invited to check out a campaign on Trihola.";

  return `Hi {fullName},

${body}
`;
}

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
  // Campaign details (for better defaults + context)
  const { data: campaign, isLoading: campaignLoading, isError: campaignError } =
    useCampaignById(campaignId, { enabled: !!campaignId });

  // Recipients
  const [selected, setSelected] = useState<string[]>([]);

  // Modal state for ContactMultiSelect
  const [pickerOpen, setPickerOpen] = useState(false);

  // Subject + message (seeded from campaign, but user-editable)
  const [personalSubject, setPersonalSubject] = useState<string>(
    "Hey {firstName} — thought of you!"
  );
  const [personalMessage, setPersonalMessage] = useState<string>(
    "Hi {fullName}, {businessName} invited you to check this campaign."
  );

  // Track whether user has edited (so we don’t overwrite their changes when campaign loads)
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const subjectRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  // Seed subject/message from campaign once it loads (only if user hasn’t edited)
  useEffect(() => {
    if (!campaign) return;

    if (!subjectTouched) {
      setPersonalSubject(buildDefaultSubject(campaign));
    }
    if (!messageTouched) {
      setPersonalMessage(buildDefaultMessage(campaign));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign]);

  // Local preview renderer (client-side only, mirrors server behavior)
  const preview = useMemo(() => {
    const first = contacts.find((c) => c.userId === selected[0]);
    if (!first) return null;

    const fn = first.firstName || "there";
    const ln = first.lastName || "";
    const full = [first.firstName, first.lastName].filter(Boolean).join(" ") || fn;

    const vars: Record<string, string> = {
      firstName: fn,
      lastName: ln,
      fullName: full,
      businessName: businessName || "",
    };

    const rr = (tpl?: string) =>
      tpl?.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => vars[k] ?? `{${k}}`) ?? "";

    return {
      subject: rr(personalSubject),
      message: rr(personalMessage),
      name: full,
    };
  }, [selected, contacts, personalSubject, personalMessage, businessName]);

  const insertToken = (token: VarToken, target: "subject" | "message") => {
    if (target === "subject") {
      const el = subjectRef.current;
      if (!el) return;
      const start = el.selectionStart ?? personalSubject.length;
      const end = el.selectionEnd ?? personalSubject.length;
      const next = personalSubject.slice(0, start) + token + personalSubject.slice(end);
      setPersonalSubject(next);
      setSubjectTouched(true);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = messageRef.current;
      if (!el) return;
      const start = el.selectionStart ?? personalMessage.length;
      const end = el.selectionEnd ?? personalMessage.length;
      const next = personalMessage.slice(0, start) + token + personalMessage.slice(end);
      setPersonalMessage(next);
      setMessageTouched(true);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    }
  };

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
      setPickerOpen(false);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const campaignTitle = campaign?.title || "Invite affiliates";
  const campaignMsgHint = campaign?.message || campaign?.affiliateHeadline || "";

  return (
    <div className="th-page">
      {/* Hero */}
      <div className="hero hero--campaign-invite">
        <div className="hero__content">
          <div className="hero__left">
            <div className="hero__eyebrow">CAMPAIGNS • AFFILIATES • INVITES</div>
            <h1 className="hero__title">{campaignTitle}</h1>
            <p className="hero__subtitle">
              Select contacts in bulk, personalize the message, and preview how it will look
              for each recipient before sending.
            </p>

            {campaignMsgHint ? (
              <div className="hero__note">
                <span className="muted">Suggested note from campaign: </span>
                <span>{campaignMsgHint}</span>
              </div>
            ) : (
              <div className="hero__note">
                Tip: Use variables like <code>{"{firstName}"}</code> and{" "}
                <code>{"{businessName}"}</code> — Trihola will substitute them with the
                recipient’s details in the final message.
              </div>
            )}
          </div>

          <div className="hero__right">
            <div className="hero-card">
              <div className="hero-card__title">Personalization variables</div>
              <div className="token-row">
                {TOKENS.map((t) => (
                  <span key={t.token} className="token-chip">
                    {t.token}
                  </span>
                ))}
              </div>
              <div className="hero-card__hint">
                Click a token below to insert it into Subject/Message.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="form-card">
        <form className="th-form" onSubmit={onSubmit}>
          {/* Recipients (modal opener) */}
          <div className="card-section">
            <div className="section-hd">
              <h3 className="section-title">Recipients</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                Selected: <b>{selected.length}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setPickerOpen(true)}
                disabled={disabledByBusy(busy)}
              >
                {selected.length > 0 ? "Edit recipients" : "Select recipients"}
              </button>

              {selected.length > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setDone(false);
                    setSelected([]);
                  }}
                  disabled={disabledByBusy(busy)}
                >
                  Clear selection
                </button>
              )}
            </div>

            <div className="help" style={{ marginTop: 8 }}>
              Pick one or more contacts to invite. For large lists, use search + “Select all filtered”.
            </div>
          </div>

          {/* Personalization + Preview */}
          <div className="card-section">
            <div className="section-hd">
              <h3 className="section-title">Personalize message</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                Preview uses the first selected contact (if any).
              </div>
            </div>

            {/* campaign loading feedback */}
            {campaignLoading && (
              <div className="muted" style={{ marginBottom: 8 }}>
                Loading campaign details…
              </div>
            )}
            {campaignError && (
              <div className="error-banner" style={{ marginBottom: 8 }}>
                Couldn’t load campaign details. You can still send invites with a custom message.
              </div>
            )}

            <div className="invite-grid">
              {/* Left: editor */}
              <div className="invite-panel">
                <div className="th-field">
                  <label className="th-label">Subject</label>
                  <input
                    ref={subjectRef}
                    className="th-input"
                    value={personalSubject}
                    onChange={(e) => {
                      setDone(false);
                      setSubjectTouched(true);
                      setPersonalSubject(e.target.value);
                    }}
                    placeholder="Subject (supports {firstName} {fullName} {businessName})"
                  />
                  <div className="token-actions">
                    <span className="token-actions__label">Insert:</span>
                    {TOKENS.map((t) => (
                      <button
                        key={`sub-${t.token}`}
                        type="button"
                        className="btn btn--xs btn--ghost"
                        onClick={() => insertToken(t.token, "subject")}
                      >
                        {t.token}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="th-field" style={{ marginTop: 10 }}>
                  <label className="th-label">Message</label>
                  <textarea
                    ref={messageRef}
                    className="th-textarea"
                    value={personalMessage}
                    onChange={(e) => {
                      setDone(false);
                      setMessageTouched(true);
                      setPersonalMessage(e.target.value);
                    }}
                    rows={8}
                    placeholder="Message (supports {firstName} {lastName} {fullName} {businessName})"
                  />
                  <div className="token-actions">
                    <span className="token-actions__label">Insert:</span>
                    {TOKENS.map((t) => (
                      <button
                        key={`msg-${t.token}`}
                        type="button"
                        className="btn btn--xs btn--ghost"
                        onClick={() => insertToken(t.token, "message")}
                      >
                        {t.token}
                      </button>
                    ))}
                  </div>

                  <div className="tip-box">
                    <div className="tip-box__title">How personalization works</div>
                    <div className="tip-box__text">
                      To personalise your messages following options are available{" "}
                      <code>{"{firstName}"}</code>, <code>{"{lastName}"}</code>,{" "}
                      <code>{"{fullName}"}</code> and <code>{"{businessName}"}</code>.
                      In your final message they will be substituted with the prospect’s values
                      as can be seen in the preview.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: preview */}
              <div className="preview-card">
                <div className="preview-card__title">
                  Preview{preview?.name ? ` — for ${preview.name}` : ""}
                </div>

                <div className="preview-card__section">
                  <div className="preview-card__label">Subject</div>
                  <div className="preview-card__value">{preview?.subject || "—"}</div>
                </div>

                <div className="preview-card__section">
                  <div className="preview-card__label">Message</div>
                  <div className="preview-card__value preview-card__value--msg">
                    {preview?.message || "—"}
                  </div>
                </div>

                <div className="preview-card__foot muted">
                  Variables that don’t match will stay as-is (e.g. {"{unknown}"}).
                </div>
              </div>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {done && (
            <div className="success-banner">
              Invites sent successfully. You can invite more contacts anytime.
            </div>
          )}

          {/* Footer actions */}
          <div className="invite-footer">
            <div className="muted" style={{ fontSize: 13 }}>
              Sending to <b>{selected.length}</b> {selected.length === 1 ? "contact" : "contacts"}
            </div>

            <button
              className="btn btn--primary"
              type="submit"
              disabled={busy || selected.length === 0}
            >
              {busy ? "Sending…" : "Send invites"}
            </button>
          </div>
        </form>
      </div>

        <Modal
        open={pickerOpen}
        title="Select recipients"
        onClose={() => !busy && setPickerOpen(false)}
        width={900}
        footer={
            <>
            <div className="muted" style={{ fontSize: 13 }}>
                Tip: Search + “Select all filtered” works best for large lists.
            </div>
            <button
                type="button"
                className="btn btn--primary"
                onClick={() => setPickerOpen(false)}
                disabled={busy}
            >
                Done
            </button>
            </>
        }
        >
        <ContactMultiSelect
            contacts={contacts}
            value={selected}
            disabled={busy}
            onChange={(v) => {
            setDone(false);
            setSelected(v);
            }}
        />
        </Modal>

    </div>
  );
}

// small helper so the JSX reads cleaner
function disabledByBusy(busy: boolean) {
  return !!busy;
}
