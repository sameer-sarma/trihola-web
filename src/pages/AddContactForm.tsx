import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/EditProfile.css";

const AddContactForm: React.FC = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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

      const res = await axios.post(`${__API_BASE__}/contacts/add/byContactRequestForm`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage(`Contact added: ${res.data.firstName}`);
      setTimeout(() => navigate("/contacts"), 1000);
    } catch (err: unknown) {
      setError("Failed to add contact.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profile-container">
      <h2 className="text-xl font-semibold">Add a New Contact</h2>

      <div className="form-group">
      <label>First Name</label>
      <input
        name="firstName"
        placeholder="First Name"
        value={form.firstName}
        onChange={handleChange}
        required
      />
      </div>

      <div className="form-group">
      <label>Last Name</label>
      <input
        name="lastName"
        placeholder="Last Name"
        value={form.lastName}
        onChange={handleChange}
      />
      </div>
      
      <div className="form-group">
      <label>Email</label>
      <input
        name="email"
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={handleChange}
      />
      </div>

      <div className="form-group">
      <label>Phone</label>
      <input
        name="phone"
        placeholder="+91XXXXXXXXXX"
        value={form.phone}
        onChange={handleChange}
      />
      </div>

      <div className="form-group">
      <label>Business Name</label>
      <input
        name="businessName"
        placeholder="Business Name (optional)"
        value={form.businessName}
        onChange={handleChange}
      />
      </div>

      <button
        type="submit"
        className="primary-btn"
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Add Contact"}
      </button>

      {message && <p className="text-green-600">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
};

export default AddContactForm;
