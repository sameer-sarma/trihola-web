import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { Link } from "react-router-dom";
import "../css/ContactsPage.css"; // ✅ Import the CSS file

interface ContactResponse {
  userId: string;
  profileSlug: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/contacts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setContacts(response.data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Failed to load contacts");
        } else {
          setError("Unexpected error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  return (
    <div style={{ padding: "1rem", maxWidth: "768px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1>Your Contacts</h1>
        <Link to="/contacts/add">+ Add Contact</Link>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && contacts.length === 0 && <p>No contacts found.</p>}

      <ul className="contact-list">
        {contacts.map((contact) => (
          <li key={contact.userId} className="contact-item">
            <div className="contact-image">
              {contact.profileImageUrl ? (
                <img src={contact.profileImageUrl} alt="Profile" />
              ) : (
                <div style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  color: "#6b7280"
                }}>
                  No Image
                </div>
              )}
            </div>
            <div className="contact-details">
              <p className="contact-name">
                {contact.firstName} {contact.lastName || ""}
              </p>
              {contact.businessName && <p className="contact-business">{contact.businessName}</p>}
              <Link to={`/profile/${contact.profileSlug}`} className="contact-link">
                View Profile
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContactsPage;
