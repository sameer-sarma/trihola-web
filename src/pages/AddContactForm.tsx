import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  addContactByContactRequestForm,
  type ContactRequestForm,
} from "../services/contactService";

// reuse the same look as the modal
import "../css/AddContactModal.css";

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
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setError("User not authenticated.");
        return;
      }

      const payload: ContactRequestForm = {
        firstName: form.firstName.trim(),
        lastName: (form.lastName ?? "").trim(),
        email: (form.email ?? "").trim(),
        phone: (form.phone ?? "").trim(),
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
                <label>Last Name</label>
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
                />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Phone</label>
                <input
                  name="phone"
                  placeholder="+91XXXXXXXXXX"
                  value={form.phone ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group th-modal__colspan">
                <label>Business Name</label>
                <input
                  name="businessName"
                  value={form.businessName ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

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

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactForm;
