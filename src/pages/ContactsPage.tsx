import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { Link } from "react-router-dom";
import "../css/ContactsPage.css";
import { importContactsCsv } from "../services/contactService";
import Modal from "../components/Modal"; // ✅ adjust path if your Modal lives elsewhere

interface ContactResponse {
  userId: string;
  profileSlug: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
}

type ContactImportErrorDTO = {
  row: number;
  message: string;
  raw?: Record<string, string> | null;
};

type ContactImportResultDTO = {
  totalRows: number;
  processed: number;
  importedOrUpdated: number;
  skipped: number;
  errors: ContactImportErrorDTO[];
};

const ContactsImportCsvModal = ({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void; // refresh contacts after success
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ContactImportResultDTO | null>(null);
  const sampleCsv = `First Name,Last Name,Email,Phone,Business Name
  Sweta,Bhattacharjee,sweta@example.com,+919900000000,
  Investor,,investor@fund.com,,Alpha Ventures
  `;

  useEffect(() => {
    if (!open) return;
    // reset each time modal opens
    setFile(null);
    setErr(null);
    setResult(null);
    setLoading(false);
  }, [open]);

  const upload = async () => {
    setErr(null);
    setResult(null);

    if (!file) {
      setErr("Please choose a CSV file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErr("Only .csv files are supported.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      setErr("User not authenticated");
      return;
    }

    try {
      setLoading(true);

      // ✅ Use existing service
      const res = await importContactsCsv(token, file);

      setResult(res);
      onImported();
    } catch (e: any) {
      setErr(e?.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, width: "100%" }}>
      <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
        Close
      </button>

      <button
        type="button"
        className="btn btn--primary"
        onClick={upload}
        disabled={loading || !file}
      >
        {loading ? "Importing…" : "Import CSV"}
      </button>
    </div>
  );

  return (
    <Modal open={open} title="Import contacts from CSV" onClose={onClose} footer={footer} width={820}>
      <p className="th-muted" style={{ marginTop: 0 }}>
        Upload a CSV file. Each record must have at least a phone number or an email address.
      </p>
      <div style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "center" }}>
        <a
          className="btn btn--ghost"
          href={URL.createObjectURL(new Blob([sampleCsv], { type: "text/csv;charset=utf-8" }))}
          download="trihola_contacts_sample.csv"
          onClick={(e) => {
            // Prevent leak: revoke after click
            const a = e.currentTarget;
            setTimeout(() => URL.revokeObjectURL(a.href), 0);
          }}
        >
          Download sample CSV
        </a>

        <span className="th-muted" style={{ fontSize: 12 }}>
          Includes headers. Column order doesn’t matter.
        </span>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file && (
        <div className="th-muted" style={{ fontSize: 12, marginTop: 8 }}>
          Selected: <strong>{file.name}</strong>
        </div>
      )}

      {err && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          {err}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 8px" }}>Import summary</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="pill pill--muted">Total rows: {result.totalRows}</span>
            <span className="pill pill--muted">Processed: {result.processed}</span>
            <span className="pill pill--muted">Imported/Updated: {result.importedOrUpdated}</span>
            <span className="pill pill--muted">Skipped: {result.skipped}</span>
            <span className="pill pill--muted">Errors: {result.errors.length}</span>
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: "10px 0" }}>Issues</h4>
              <div className="th-stack">
                {result.errors.slice(0, 25).map((e, idx) => (
                  <div key={idx} className="card" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>Row {e.row}</div>
                    <div className="th-muted">{e.message}</div>
                    {e.raw && (
                      <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(e.raw, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {result.errors.length > 25 && (
                  <div className="th-muted" style={{ fontSize: 12 }}>
                    Showing first 25 issues…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);

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
      const response = await axios.get(`${__API_BASE__}/contacts`, {
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

  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div style={{ padding: "1rem", maxWidth: "768px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Your Contacts</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn btn--primary" onClick={() => setShowImport(true)}>
            Import CSV
          </button>

          <Link to="/contacts/add" className="btn btn--primary">
            + Add Contact
          </Link>
        </div>

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
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
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

      <ContactsImportCsvModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchContacts}
      />
    </div>
  );
};

export default ContactsPage;
