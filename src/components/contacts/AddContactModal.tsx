import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import Modal from "../Modal";

import {
  addContactByContactRequestForm,
  type ContactRequestForm,
  type ContactResponse,
  type ContactsBundleResponse,
} from "../../services/contactService";
import { useAppData } from "../../context/AppDataContext";

import "../../css/AddContactModal.css";

type PhoneValidationMode = "INDIA_E164_ONLY" | "E164_ANY" | "LENIENT";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;

  /** return added contact so caller can select it */
  onAdded: (c: ContactResponse) => void;

  /** optional prefill */
  preset?: Partial<ContactRequestForm>;

  /**
   * Phone validation mode.
   * - INDIA_E164_ONLY: require +91 prefix when phone is provided (default)
   * - E164_ANY: require E.164-style +<countrycode>... when phone is provided
   * - LENIENT: accept any non-empty phone value
   */
  phoneValidation?: PhoneValidationMode;
};

const empty: ContactRequestForm = {
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

function isValidPhone(phoneNormalized: string, mode: PhoneValidationMode): boolean {
  if (!phoneNormalized) return true;

  if (mode === "LENIENT") return true;
  if (mode === "E164_ANY") return /^\+\d{6,15}$/.test(phoneNormalized);

  return phoneNormalized.startsWith("+91");
}

function phoneHint(mode: PhoneValidationMode) {
  if (mode === "LENIENT") return "Any format accepted";
  if (mode === "E164_ANY") return "Format: +<countrycode> (example: +491701234567)";
  return "Format: +91 followed by number (example: +919901234567)";
}

function phoneError(mode: PhoneValidationMode) {
  if (mode === "LENIENT") return "Please enter a valid phone number.";
  if (mode === "E164_ANY") return "Phone must be in E.164 format (+countrycode…).";
  return "Phone must start with +91.";
}

function normalizeSingleContact(x: any): ContactResponse | null {
  if (!x || typeof x !== "object") return null;
  if (typeof x.userId !== "string") return null;

  return {
    userId: String(x.userId),
    profileSlug: String(x.profileSlug ?? x.slug ?? ""),
    profileImageUrl: x.profileImageUrl ?? x.profile_image_url ?? null,
    firstName: String(x.firstName ?? x.first_name ?? ""),
    lastName: x.lastName ?? x.last_name ?? null,
    profession: x.profession ?? null,
    phone: x.phone ?? null,
    email: x.email ?? null,
  };
}

function normalizeCreatedContact(
  response: ContactResponse | ContactsBundleResponse | any,
  submitted: ContactRequestForm
): ContactResponse | null {
  if (!response || typeof response !== "object") return null;

  if (
    typeof (response as any).userId === "string" &&
    typeof (response as any).profileSlug === "string"
  ) {
    return normalizeSingleContact(response);
  }

  const users = Array.isArray((response as any).users) ? (response as any).users : [];
  if (!users.length) return null;

  const submittedEmail = String(submitted.email ?? "").trim().toLowerCase();
  const submittedPhone = normalizePhoneUI(String(submitted.phone ?? "").trim());
  const submittedFirst = String(submitted.firstName ?? "").trim().toLowerCase();
  const submittedLast = String(submitted.lastName ?? "").trim().toLowerCase();

  if (submittedEmail) {
    const byEmail = users.find(
      (u: any) => String(u?.email ?? "").trim().toLowerCase() === submittedEmail
    );
    if (byEmail) return normalizeSingleContact(byEmail);
  }

  if (submittedPhone) {
    const byPhone = users.find(
      (u: any) => normalizePhoneUI(String(u?.phone ?? "").trim()) === submittedPhone
    );
    if (byPhone) return normalizeSingleContact(byPhone);
  }

  const byName = users.find((u: any) => {
    const first = String(u?.firstName ?? "").trim().toLowerCase();
    const last = String(u?.lastName ?? "").trim().toLowerCase();
    return first === submittedFirst && last === submittedLast;
  });
  if (byName) return normalizeSingleContact(byName);

  if (!submittedLast && submittedFirst) {
    const byFirstName = users.find(
      (u: any) => String(u?.firstName ?? "").trim().toLowerCase() === submittedFirst
    );
    if (byFirstName) return normalizeSingleContact(byFirstName);
  }

  return null;
}

function toContactLite(contact: ContactResponse) {
  return {
    userId: contact.userId,
    profileSlug: contact.profileSlug,
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? null,
    profileImageUrl: contact.profileImageUrl ?? null,
    profession: contact.profession ?? null,
    phone: contact.phone ?? null,
    email: contact.email ?? null,
  };
}

const AddContactModal: React.FC<Props> = ({
  open,
  title,
  onClose,
  onAdded,
  preset,
  phoneValidation = "INDIA_E164_ONLY",
}) => {
  const { upsertUserContact } = useAppData();

  const initialForm = useMemo(() => ({ ...empty, ...(preset ?? {}) }), [preset]);

  const [form, setForm] = useState<ContactRequestForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean }>({});

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
    setError(null);
    setSubmitting(false);
    setTouched({});
  }, [open, initialForm]);

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
  const phoneOk = isValidPhone(phoneNormalized, phoneValidation);

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
      setError(
        phoneValidation === "E164_ANY"
          ? "Phone number must be in E.164 format (e.g., +491701234567)."
          : phoneValidation === "LENIENT"
            ? "Please enter a valid phone number."
            : "Phone number must start with +91 (e.g., +919901234567)."
      );
      return;
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated.");

      const payload: ContactRequestForm = {
        firstName: form.firstName.trim(),
        lastName: (form.lastName ?? "").trim(),
        email: emailTrimmed,
        phone: phoneNormalized,
        businessName: (form.businessName ?? "").trim(),
      };

      const created = await addContactByContactRequestForm(payload, token);
      const createdContact = normalizeCreatedContact(created, payload);

      if (createdContact) {
        upsertUserContact(toContactLite(createdContact));
        onAdded(createdContact);
      } else {
        console.warn(
          "Could not identify created contact from addContact response:",
          created,
          payload
        );
      }

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
    <Modal
      open={open}
      title={title ?? "Add contact"}
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
            form="add-contact-form"
            className="btn btn--primary"
            disabled={!canSubmit}
          >
            {submitting ? "Adding…" : "Add contact"}
          </button>
        </div>
      }
    >
      <form id="add-contact-form" onSubmit={submit} className="acm th-form">
        <div className="acm__intro">
          <div className="acm__introTitle">Add a contact safely</div>
          <div className="acm__introText">
            Add someone by phone number, email, or both. At least one is required.
          </div>
        </div>

        <div className="acm__privacy" role="note" aria-live="polite">
          <div className="acm__privacyIcon" aria-hidden="true">
            🔒
          </div>
          <div className="acm__privacyBody">
            <div className="acm__privacyTitle">Private contact details stay private</div>
            <div className="acm__privacyText">
              TriHola may use the phone number or email you add here to get in touch with this
              contact about your request, but that information will not be shared with another
              TriHola user unless the contact chooses to share it.
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
              placeholder={phoneValidation === "INDIA_E164_ONLY" ? "+919901234567" : "+491701234567"}
            />
            <div className="th-help">{phoneHint(phoneValidation)}</div>
            {showPhoneError && <div className="th-error">{phoneError(phoneValidation)}</div>}
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
              placeholder="Only if this is a business contact"
            />
            <div className="th-help">
              Use this when you’re adding a business rather than an individual person.
            </div>
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

export default AddContactModal;