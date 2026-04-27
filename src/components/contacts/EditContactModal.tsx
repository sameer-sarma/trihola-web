// src/components/contacts/EditContactModal.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Modal from "../Modal";

import {
  updateUserContact,
  type ContactResponse,
  type ContactsBundleResponse,
  type UpdateContactRequestForm,
} from "../../services/contactService";

import "../../css/AddContactModal.css";

type Props = {
  open: boolean;
  contact: ContactResponse | null;
  onClose: () => void;
  onUpdated: (bundle: ContactsBundleResponse) => void;
};

const empty: UpdateContactRequestForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  businessName: "",
};

function normalizePhoneUI(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

function isValidEmailOrEmpty(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const EditContactModal: React.FC<Props> = ({ open, contact, onClose, onUpdated }) => {
  const [form, setForm] = useState<UpdateContactRequestForm>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean }>({});

  useEffect(() => {
    if (!open || !contact) return;

    setForm({
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      businessName: "",
    });

    setSubmitting(false);
    setError(null);
    setTouched({});
  }, [open, contact]);

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
  const phoneOk = !hasPhone || phoneNormalized.startsWith("+91");

  const showRequiredError = (touched.email || touched.phone) && !hasRequiredContactInfo;
  const showEmailError = touched.email && hasEmail && !emailOk;
  const showPhoneError = touched.phone && hasPhone && !phoneOk;

  const canSubmit =
    !!contact &&
    !submitting &&
    form.firstName.trim().length > 0 &&
    hasRequiredContactInfo &&
    emailOk &&
    phoneOk;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact) return;

    setSubmitting(true);
    setError(null);
    setTouched({ email: true, phone: true });

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
      setError("Phone number must start with +91.");
      return;
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated.");

      const payload: UpdateContactRequestForm = {
        firstName: form.firstName.trim(),
        lastName: (form.lastName ?? "").trim(),
        email: emailTrimmed,
        phone: phoneNormalized,
        businessName: (form.businessName ?? "").trim(),
      };

      const updatedBundle = await updateUserContact(contact.userId, payload, token);
      onUpdated(updatedBundle);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update contact.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Edit contact"
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      footer={
        <div className="th-actions" style={{ width: "100%", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>

          <button
            type="submit"
            form="edit-contact-form"
            className="btn btn--primary"
            disabled={!canSubmit}
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      <form id="edit-contact-form" onSubmit={submit} className="acm th-form">
        <div className="acm__intro">
          <div className="acm__introTitle">Edit contact details</div>
          <div className="acm__introText">
            Changes update your private contact entry. They do not delete or overwrite a registered
            user’s TriHola profile.
          </div>
        </div>

        <div className="acm__privacy" role="note" aria-live="polite">
          <div className="acm__privacyIcon" aria-hidden="true">
            🔒
          </div>
          <div className="acm__privacyBody">
            <div className="acm__privacyTitle">Private address-book update</div>
            <div className="acm__privacyText">
              Email and phone changes are saved to your contact list. Registered users keep control
              of their own profile information.
            </div>
          </div>
        </div>

        <div className="th-form-row--2 acm-grid">
          <div className="th-field">
            <label className="th-label">First name</label>
            <input
              className="th-input"
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              required
              placeholder="Enter first name"
            />
          </div>

          <div className="th-field">
            <label className="th-label">
              Last name <span className="th-label__optional">(optional)</span>
            </label>
            <input
              className="th-input"
              name="lastName"
              value={form.lastName ?? ""}
              onChange={onChange}
              placeholder="Enter last name"
            />
          </div>

          <div className="th-field acm-span2">
            <label className="th-label">
              Email <span className="th-label__optional">(optional)</span>
            </label>
            <input
              className="th-input"
              name="email"
              type="email"
              value={form.email ?? ""}
              onChange={onChange}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              placeholder="name@example.com"
            />
            <div className="th-help">Add email, phone, or both.</div>
            {showEmailError && <div className="th-error">Please enter a valid email address.</div>}
          </div>

          <div className="th-field acm-span2">
            <label className="th-label">
              Phone <span className="th-label__optional">(optional)</span>
            </label>
            <input
              className="th-input"
              name="phone"
              value={form.phone ?? ""}
              onChange={onChange}
              onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
              placeholder="+919901234567"
            />
            <div className="th-help">Format: +91 followed by number.</div>
            {showPhoneError && <div className="th-error">Phone must start with +91.</div>}
          </div>

          <div className="th-field acm-span2">
            <label className="th-label">
              Business name <span className="th-label__optional">(optional)</span>
            </label>
            <input
              className="th-input"
              name="businessName"
              value={form.businessName ?? ""}
              onChange={onChange}
              placeholder="Business or company name"
            />
          </div>
        </div>

        {showRequiredError && (
          <div className="th-error">Please enter an email and/or phone number.</div>
        )}

        {error && <div className="th-error">{error}</div>}
      </form>
    </Modal>
  );
};

export default EditContactModal;