import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  addContactByContactRequestForm,
  type ContactRequestForm,
  type ContactResponse,
  type ContactsBundleResponse,
} from "../services/contactService";
import { useAppData } from "../context/AppDataContext";

import "../css/form.css";
import "../css/AddContactModal.css";

function normalizePhoneUI(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

function isValidEmailOrEmpty(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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

const AddContactForm: React.FC = () => {
  const { upsertUserContact } = useAppData();
  const [form, setForm] = useState<ContactRequestForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
  });

  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean }>({});

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
  const showPhoneError = touched.phone && hasPhone && !phoneOk;
  const showEmailError = touched.email && hasEmail && !emailOk;

  const canSubmit =
    !submitting &&
    form.firstName.trim().length > 0 &&
    hasRequiredContactInfo &&
    emailOk &&
    phoneOk;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
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
      setError("Phone number must start with +91 (e.g., +919901234567).");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setError("User not authenticated.");
        setSubmitting(false);
        return;
      }

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
      } else {
        console.warn(
          "Could not identify created contact from addContact response:",
          created,
          payload
        );
      }

      setMessage("Contact added.");
      setTimeout(() => navigate("/contacts"), 500);
    } catch (err: unknown) {
      setError("Failed to add contact.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="th-form-page">
      <div className="form-card">
        <div className="th-form-header">
          <div className="th-form-header__main">
            <h1 className="th-form-title">Add a new contact</h1>
            <p className="th-form-subtitle">
              Add a person or business you may want to refer, connect with, or work with later.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="th-form acm">
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
              <label htmlFor="firstName" className="th-label">
                First name
              </label>
              <input
                id="firstName"
                className="th-input"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                placeholder="Enter first name"
              />
            </div>

            <div className="th-field">
              <label htmlFor="lastName" className="th-label">
                Last name <span className="th-label__optional">(optional)</span>
              </label>
              <input
                id="lastName"
                className="th-input"
                name="lastName"
                value={form.lastName ?? ""}
                onChange={handleChange}
                placeholder="Enter last name"
              />
            </div>

            <div className="th-field acm-span2">
              <label htmlFor="email" className="th-label">
                Email <span className="th-label__optional">(optional)</span>
              </label>
              <input
                id="email"
                className="th-input"
                name="email"
                type="email"
                value={form.email ?? ""}
                onChange={handleChange}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="name@example.com"
              />
              <div className="th-help">Add email, phone, or both.</div>
              {showEmailError && <div className="th-error">Please enter a valid email address.</div>}
            </div>

            <div className="th-field acm-span2">
              <label htmlFor="phone" className="th-label">
                Phone <span className="th-label__optional">(optional)</span>
              </label>
              <input
                id="phone"
                className="th-input"
                name="phone"
                value={form.phone ?? ""}
                onChange={handleChange}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder="+919901234567"
              />
              <div className="th-help">
                Format: <b>+91</b> followed by number, for example <b>+919901234567</b>
              </div>
              {showPhoneError && <div className="th-error">Phone must start with +91.</div>}
            </div>

            <div className="th-field acm-span2">
              <label htmlFor="businessName" className="th-label">
                Business name <span className="th-label__optional">(optional)</span>
              </label>
              <input
                id="businessName"
                className="th-input"
                name="businessName"
                value={form.businessName ?? ""}
                onChange={handleChange}
                placeholder="If this contact also represents a business"
              />
            </div>
          </div>

          {showRequiredError && (
            <div className="th-error">Please enter an email and/or phone number.</div>
          )}

          {message && <div className="th-help">{message}</div>}

          {error && <div className="th-error">{error}</div>}

          <div className="th-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/contacts")}
              disabled={submitting}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              {submitting ? "Submitting..." : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactForm;