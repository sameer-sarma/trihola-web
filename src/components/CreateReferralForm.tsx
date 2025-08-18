import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/EditProfile.css"; // keep if you already have base form styles
import "../css/CreateReferral.css"; // <-- add the CSS from the snippet below

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
  const [onlyBusinesses, setOnlyBusinesses] = useState(true);

  const [prospectQuery, setProspectQuery] = useState("");
  const [businessQuery, setBusinessQuery] = useState("");

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

  const fullName = (c: ContactResponse) =>
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

  const norm = (s: string) => s.toLowerCase();

  // Filtered lists (fast, dependency-free)
  const filteredProspects = useMemo(() => {
    const q = norm(prospectQuery);
    return contacts
      .filter((c) => c.userId !== businessUserId) // don't let the same person appear in the other picker
      .filter((c) => {
        if (!q) return true;
        return (
          norm(fullName(c)).includes(q) ||
          norm(c.businessName ?? "").includes(q)
        );
      })
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [contacts, prospectQuery, businessUserId]);

  const filteredBusinesses = useMemo(() => {
    const q = norm(businessQuery);
    return contacts
      .filter((c) => c.userId !== prospectUserId)
      .filter((c) => (onlyBusinesses ? !!c.businessName : true))
      .filter((c) => {
        if (!q) return true;
        return (
          norm(fullName(c)).includes(q) ||
          norm(c.businessName ?? "").includes(q)
        );
      })
      .sort((a, b) => {
        // prefer those with businessName at the top
        if (!!a.businessName && !b.businessName) return -1;
        if (!a.businessName && !!b.businessName) return 1;
        return (a.businessName ?? fullName(a)).localeCompare(
          b.businessName ?? fullName(b)
        );
      });
  }, [contacts, businessQuery, onlyBusinesses, prospectUserId]);

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
      if (slug) navigate(`/referral/${slug}/thread`);
      else setMessage("Referral created, but no slug returned.");
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

  const ContactRow: React.FC<{
    c: ContactResponse;
    selected: boolean;
    onSelect: (id: string) => void;
  }> = ({ c, selected, onSelect }) => (
    <button
      type="button"
      className={`crf-option${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(c.userId)}
      aria-pressed={selected}
    >
      <img
        className="crf-avatar"
        src={c.profileImageUrl || "/default-avatar.png"}
        alt=""
        loading="lazy"
      />
      <div className="crf-option-meta">
        <div className="crf-option-primary">
          {fullName(c) || c.businessName || "Unnamed"}
        </div>
        {c.businessName && (
          <div className="crf-option-secondary">{c.businessName}</div>
        )}
      </div>
    </button>
  );

  const SelectedCard: React.FC<{
    label: string;
    contact?: ContactResponse;
    onClear: () => void;
  }> = ({ label, contact, onClear }) => (
    <div className="crf-selected">
      <div className="crf-selected-header">
        <span className="crf-label">{label}</span>
        {contact && (
          <button type="button" className="crf-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {contact ? (
        <div className="crf-selected-body">
          <img
            className="crf-avatar lg"
            src={contact.profileImageUrl || "/default-avatar.png"}
            alt=""
          />
          <div>
            <div className="crf-selected-name">{fullName(contact)}</div>
            {contact.businessName && (
              <div className="crf-option-secondary">{contact.businessName}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="crf-selected-placeholder">No selection yet</div>
      )}
    </div>
  );

  const prospect = contacts.find((c) => c.userId === prospectUserId);
  const business = contacts.find((c) => c.userId === businessUserId);

  return (
    <form onSubmit={handleSubmit} className="crf">
      <h2 className="crf-title">Create a Referral</h2>

      <div className="crf-grid">
        {/* Prospect picker */}
        <div className="crf-column">
          <SelectedCard
            label="Prospect"
            contact={prospect}
            onClear={() => setProspectUserId("")}
          />
          <div className="crf-search">
            <input
              value={prospectQuery}
              onChange={(e) => setProspectQuery(e.target.value)}
              placeholder="Search contacts…"
              aria-label="Search prospects"
            />
          </div>
          <div className="crf-list" role="listbox" aria-label="Prospect list">
            {filteredProspects.map((c) => (
              <ContactRow
                key={c.userId}
                c={c}
                selected={c.userId === prospectUserId}
                onSelect={setProspectUserId}
              />
            ))}
            {!filteredProspects.length && (
              <div className="crf-empty">No matches.</div>
            )}
          </div>
        </div>

        {/* Business picker */}
        <div className="crf-column">
          <SelectedCard
            label="Business"
            contact={business}
            onClear={() => setBusinessUserId("")}
          />
          <div className="crf-search with-toggle">
            <input
              value={businessQuery}
              onChange={(e) => setBusinessQuery(e.target.value)}
              placeholder="Search businesses…"
              aria-label="Search businesses"
            />
            <label className="crf-toggle">
              <input
                type="checkbox"
                checked={onlyBusinesses}
                onChange={(e) => setOnlyBusinesses(e.target.checked)}
              />
              Only show businesses
            </label>
          </div>
          <div className="crf-list" role="listbox" aria-label="Business list">
            {filteredBusinesses.map((c) => (
              <ContactRow
                key={c.userId}
                c={c}
                selected={c.userId === businessUserId}
                onSelect={setBusinessUserId}
              />
            ))}
            {!filteredBusinesses.length && (
              <div className="crf-empty">No matches.</div>
            )}
          </div>
        </div>
      </div>

      <div className="crf-note">
        <label htmlFor="note">Note</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          required
          placeholder="Add context that helps the business act on this referral…"
        />
      </div>

      <div className="crf-actions">
        <button
          type="submit"
          className="crf-primary"
          disabled={
            loading || !prospectUserId || !businessUserId || prospectUserId === businessUserId
          }
        >
          {loading ? "Creating…" : "Submit Referral"}
        </button>
        {message && <p className="crf-msg ok">{message}</p>}
        {error && <p className="crf-msg err">{error}</p>}
      </div>
    </form>
  );
};

export default CreateReferralForm;
