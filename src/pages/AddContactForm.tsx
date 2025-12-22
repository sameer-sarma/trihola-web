import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  addContactByContactRequestForm,
  type ContactRequestForm,
} from "../services/contactService";

// reuse the same look as the modal
import "../css/AddContactModal.css";

// UI-only normalization (service-side can be more robust later)
function normalizePhoneUI(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

function isValidEmailOrEmpty(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const AddContactForm: React.FC = () => {
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
      setMessage(`Contact added: ${created.firstName}`);
      setTimeout(() => navigate("/contacts"), 800);
    } catch (err: unknown) {
      setError("Failed to add contact.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="th-pageCenter">
      <div className="th-card">
        <div className="th-modal__header">
          <strong className="th-modal__title">Add a New Contact</strong>
        </div>

        <form onSubmit={handleSubmit} className="th-modal__form">
          <div className="th-modal__body">
            <div className="th-muted" style={{ fontSize: 13, marginBottom: 10 }}>
              At least one of email or phone number is required.
            </div>

            <div className="th-modal__grid">
              <div className="form-group">
                <label>First Name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name (Optional)</label>
                <input
                  name="lastName"
                  value={form.lastName ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={handleChange}
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
                  placeholder="+919901234567"
                  value={form.phone ?? ""}
                  onChange={handleChange}
                  onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
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
                <input
                  name="businessName"
                  value={form.businessName ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            {showRequiredError && (
              <p className="crf-msg err">Please enter an email and/or phone number.</p>
            )}

            {message && <p className="crf-msg ok">{message}</p>}
            {error && <p className="crf-msg err">{error}</p>}
          </div>

          <div className="th-modal__footer">
            <button
              type="button"
              className="btn"
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
