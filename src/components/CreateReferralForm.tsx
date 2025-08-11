import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/EditProfile.css";

interface ContactResponse {
  userId: string;
  profileSlug: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
}

const CreateReferralForm: React.FC = () => {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [prospectUserId, setProspectUserId] = useState("");
  const [businessUserId, setBusinessUserId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContacts = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) return setError("You must be logged in.");

      try {
        const res = await axios.get(`${__API_BASE__}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContacts(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load contacts.");
      }
    };

    fetchContacts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!note.trim()) return setError("Note is required.");
    if (!prospectUserId || !businessUserId)
      return setError("Please select both a prospect and a business.");
    if (prospectUserId === businessUserId)
      return setError("Prospect and business must be different people.");

    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    if (!token) return setError("You must be logged in.");

    setLoading(true);
    try {
      const res = await axios.post(
        `${__API_BASE__}/referral/create`,
        { prospectUserId, businessUserId, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const slug = res.data?.slug;
      if (slug) {
        navigate(`/referral/${slug}`);
      } else {
        setMessage("Referral created, but no slug returned.");
      }
    } catch (err: unknown) {
  console.error(err);
  if (axios.isAxiosError(err)) {
    setError(err.response?.data || "Failed to create referral.");
  } else {
    setError("An unexpected error occurred.");
  }
} finally {
      setLoading(false);
    }
  };

  const renderContactOption = (
    c: ContactResponse,
    selectedId: string,
    setSelectedId: (id: string) => void
  ) => (
    <div
      key={c.userId}
      className={`select-option ${selectedId === c.userId ? "selected" : ""}`}
      onClick={() => setSelectedId(c.userId)}
    >
      <img
        src={c.profileImageUrl || "/default-avatar.png"}
        alt="Profile"
        className="thumb"
      />
      <div>
        <strong>
          {c.firstName} {c.lastName || ""}
        </strong>
        {c.businessName && <div className="text-muted">{c.businessName}</div>}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="profile-container">
      <h2 className="text-xl font-semibold mb-4">Create a Referral</h2>

      <div className="form-group">
        <label>Prospect</label>
        <div className="custom-select">
          {contacts.map((c) =>
            renderContactOption(c, prospectUserId, setProspectUserId)
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Business</label>
        <div className="custom-select">
          {contacts.map((c) =>
            renderContactOption(c, businessUserId, setBusinessUserId)
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          required
        />
      </div>

      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? "Creating..." : "Submit Referral"}
      </button>

      {message && <p className="text-green-600 mt-2">{message}</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </form>
  );
};

export default CreateReferralForm;
