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

const AddContactModal: React.FC<Props> = ({ open, title, onClose, onAdded, preset }) => {
  const initialForm = useMemo(() => ({ ...empty, ...(preset ?? {}) }), [preset]);

  const [form, setForm] = useState<ContactRequestForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens / preset changes
  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setError(null);
      setSubmitting(false);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated.");

      // Trim to avoid accidental whitespace
      const payload: ContactRequestForm = {
        firstName: form.firstName.trim(),
        lastName: (form.lastName ?? "").trim(),
        email: (form.email ?? "").trim(),
        phone: (form.phone ?? "").trim(),
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
            <div className="th-modal__grid">
              <div className="form-group">
                <label>First Name</label>
                <input name="firstName" value={form.firstName} onChange={onChange} required />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input name="lastName" value={form.lastName ?? ""} onChange={onChange} />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Email</label>
                <input name="email" type="email" value={form.email ?? ""} onChange={onChange} />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Phone</label>
                <input
                  name="phone"
                  value={form.phone ?? ""}
                  onChange={onChange}
                  placeholder="+91XXXXXXXXXX"
                />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Business Name</label>
                <input name="businessName" value={form.businessName ?? ""} onChange={onChange} />
              </div>
            </div>

            {error && <p className="crf-msg err">{error}</p>}
          </div>

          <div className="th-modal__footer">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;

