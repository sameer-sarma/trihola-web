// components/AddContactModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  addContactByContactRequestForm,
  type ContactRequestForm,
  type ContactResponse,
} from "../services/contactService";
import "../css/AddContactModal.css";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onAdded: (c: ContactResponse) => void; // return added contact so caller can select it
  preset?: Partial<ContactRequestForm>; // optional prefill
};

const empty: ContactRequestForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  businessName: "",
};

// UI-only normalization (service-side can be more robust later)
function normalizePhoneUI(phone: string): string {
  // remove spaces, hyphens, parentheses etc.
  return phone.replace(/[\s\-()]/g, "");
}

function isValidEmailOrEmpty(email: string): boolean {
  if (!email.trim()) return true;
  // light check; browser type="email" also helps
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const AddContactModal: React.FC<Props> = ({ open, title, onClose, onAdded, preset }) => {
  const initialForm = useMemo(() => ({ ...empty, ...(preset ?? {}) }), [preset]);

  const [form, setForm] = useState<ContactRequestForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field-level UX
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean }>({});

  // Reset form when modal opens / preset changes
  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setError(null);
      setSubmitting(false);
      setTouched({});
    }
  }, [open, initialForm]);

  // ESC key closes
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const emailTrimmed = (form.email ?? "").trim();
  const phoneTrimmed = (form.phone ?? "").trim();
  const phoneNormalized = normalizePhoneUI(phoneTrimmed);

  const hasEmail = emailTrimmed.length > 0;
  const hasPhone = phoneNormalized.length > 0;

  const hasRequiredContactInfo = hasEmail || hasPhone;
  const emailOk = isValidEmailOrEmpty(emailTrimmed);

  // Phone rule: only enforce +91 if user provided a phone at all
  const phoneOk = !hasPhone || phoneNormalized.startsWith("+91");

  const showRequiredError = (touched.email || touched.phone) && !hasRequiredContactInfo;
  const showPhoneError = touched.phone && hasPhone && !phoneOk;
  const showEmailError = touched.email && hasEmail && !emailOk;

  const canSubmit =
    !submitting &&
    form.firstName.trim().length > 0 &&
    hasRequiredContactInfo &&
    emailOk &&
    phoneOk;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Mark touched so errors appear if needed
    setTouched({ email: true, phone: true });

    // Final validation guard
    if (!hasRequiredContactInfo) {
      setSubmitting(false);
      setError("Please enter an email and/or phone number.");
      return;
    }
    if (!emailOk) {
      setSubmitting(false);
      setError("Please enter a valid email address.");
      return;
    }
    if (!phoneOk) {
      setSubmitting(false);
      setError("Phone number must start with +91 (e.g., +919901234567).");
      return;
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated.");

      // Trim to avoid accidental whitespace
      const payload: ContactRequestForm = {
        firstName: form.firstName.trim(),
        lastName: (form.lastName ?? "").trim(),
        email: emailTrimmed,
        phone: phoneNormalized,
        businessName: (form.businessName ?? "").trim(),
      };

      const created = await addContactByContactRequestForm(payload, token);
      onAdded(created);

      onClose();
      setForm({ ...empty });
    } catch (err) {
      console.error(err);
      setError("Failed to add contact.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="th-modal" role="dialog" aria-modal="true" aria-label={title ?? "Add contact"}>
      {/* Backdrop */}
      <div className="th-modal__backdrop" onMouseDown={onClose} />

      {/* Panel */}
      <div className="th-modal__panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="th-modal__header">
          <strong className="th-modal__title">{title ?? "Add contact"}</strong>
          <button
            type="button"
            className="btn btn--ghost th-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="th-modal__form">
          <div className="th-modal__body">
            <div className="th-muted" style={{ fontSize: 13, marginBottom: 10 }}>
              At least one of email or phone number is required.
            </div>

            <div className="th-modal__grid">
              <div className="form-group">
                <label>First Name</label>
                <input name="firstName" value={form.firstName} onChange={onChange} required />
              </div>

              <div className="form-group">
                <label>Last Name (Optional)</label>
                <input name="lastName" value={form.lastName ?? ""} onChange={onChange} />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={onChange}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  placeholder="name@example.com"
                />
                {showEmailError && (
                  <div className="th-muted" style={{ color: "var(--danger, #b42318)", fontSize: 12 }}>
                    Please enter a valid email address.
                  </div>
                )}
              </div>

              <div className="form-group th-modal__colspan">
                <label>Phone</label>
                <input
                  name="phone"
                  value={form.phone ?? ""}
                  onChange={onChange}
                  onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                  placeholder="+919901234567"
                />
                <div className="th-muted" style={{ fontSize: 12 }}>
                  Format: <b>+91</b> followed by number (example: +919901234567)
                </div>
                {showPhoneError && (
                  <div className="th-muted" style={{ color: "var(--danger, #b42318)", fontSize: 12 }}>
                    Phone must start with +91.
                  </div>
                )}
              </div>

              <div className="form-group th-modal__colspan">
                <label>Business Name (Optional)</label>
                <input name="businessName" value={form.businessName ?? ""} onChange={onChange} />
              </div>
            </div>

            {showRequiredError && (
              <p className="crf-msg err">Please enter an email and/or phone number.</p>
            )}
            {error && <p className="crf-msg err">{error}</p>}
          </div>

          <div className="th-modal__footer">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              {submitting ? "Adding…" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
