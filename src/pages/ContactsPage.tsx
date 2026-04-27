import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import "../css/ContactsPage.css";
import Modal from "../components/Modal";
import EditContactModal from "../components/contacts/EditContactModal";

import {
  fetchMyContactsBundle,
  importContactsCsv,
  deleteUserContact,
  type ContactResponse,
  type ContactsBundleResponse,
  type ContactImportErrorDTO,
  type ContactImportResultDTO,
} from "../services/contactService";

const ContactsImportCsvModal = ({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
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
    <div className="contacts-import-modal__footer">
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
    <Modal
      open={open}
      title="Import contacts from CSV"
      onClose={onClose}
      footer={footer}
      maxWidth={820}
    >
      <p className="contacts-import-modal__intro">
        Upload a CSV file. Each record must have at least a phone number or an email address.
      </p>

      <div className="contacts-import-modal__sampleRow">
        <a
          className="btn btn--ghost"
          href={URL.createObjectURL(new Blob([sampleCsv], { type: "text/csv;charset=utf-8" }))}
          download="trihola_contacts_sample.csv"
          onClick={(e) => {
            const a = e.currentTarget;
            setTimeout(() => URL.revokeObjectURL(a.href), 0);
          }}
        >
          Download sample CSV
        </a>

        <span className="contacts-import-modal__helper">
          Includes headers. Column order doesn’t matter.
        </span>
      </div>

      <input
        className="contacts-import-modal__fileInput"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file && (
        <div className="contacts-import-modal__selected">
          Selected: <strong>{file.name}</strong>
        </div>
      )}

      {err && <div className="contacts-import-modal__error">{err}</div>}

      {result && (
        <div className="contacts-import-modal__result">
          <h3 className="contacts-import-modal__resultTitle">Import summary</h3>

          <div className="contacts-import-modal__summary">
            <span className="pill pill--muted">Total rows: {result.totalRows}</span>
            <span className="pill pill--muted">Processed: {result.processed}</span>
            <span className="pill pill--muted">Imported/Updated: {result.importedOrUpdated}</span>
            <span className="pill pill--muted">Skipped: {result.skipped}</span>
            <span className="pill pill--muted">Errors: {result.errors.length}</span>
          </div>

          {result.errors.length > 0 && (
            <div className="contacts-import-modal__issues">
              <h4 className="contacts-import-modal__issuesTitle">Issues</h4>

              <div className="th-stack">
                {result.errors.slice(0, 25).map((e: ContactImportErrorDTO, idx: number) => (
                  <div key={idx} className="card contacts-import-modal__issueCard">
                    <div className="contacts-import-modal__issueRow">Row {e.row}</div>
                    <div className="contacts-import-modal__issueMessage">{e.message}</div>

                    {e.raw && (
                      <pre className="contacts-import-modal__issueRaw">
                        {JSON.stringify(e.raw, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}

                {result.errors.length > 25 && (
                  <div className="contacts-import-modal__helper">Showing first 25 issues…</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

function getInitials(first?: string | null, last?: string | null, fallback?: string | null) {
  const a = (first ?? "").trim().charAt(0);
  const b = (last ?? "").trim().charAt(0);

  if (a || b) return `${a}${b}`.toUpperCase();

  const fb = (fallback ?? "").trim();
  return fb ? fb.slice(0, 2).toUpperCase() : "?";
}

function formatPersonName(contact: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || "Unnamed contact";
}

const ContactsPage: React.FC = () => {
  const [bundle, setBundle] = useState<ContactsBundleResponse>({ users: [], businesses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const data = await fetchMyContactsBundle(token);
      setBundle(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const userContacts = bundle.users ?? [];
  const businessContacts = bundle.businesses ?? [];

  const handleDeleteContact = async (contact: ContactResponse) => {
    const ok = window.confirm(
      `Remove ${formatPersonName(contact)} from your contacts? This will not delete their TriHola profile.`
    );

    if (!ok) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      setError("User not authenticated");
      return;
    }

    try {
      setDeletingId(contact.userId);
      await deleteUserContact(contact.userId, token);

      setBundle((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.userId !== contact.userId),
      }));
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove contact");
    } finally {
      setDeletingId(null);
    }
  };

  const totalLabel = useMemo(() => {
    const people = userContacts.length;
    const businesses = businessContacts.length;
    return `${people} ${people === 1 ? "person" : "people"} · ${businesses} ${
      businesses === 1 ? "business" : "businesses"
    }`;
  }, [userContacts.length, businessContacts.length]);

  return (
    <div className="app-page app-page--default contactsPage">
      <div className="app-stack">
        <header className="app-header">
          <div className="app-header__main">
            <h1 className="app-title">Contacts</h1>
            <p className="app-subtitle">
              Manage people and businesses you may want to refer, connect, or work with.
            </p>

            {!loading && (
              <div className="app-meta" aria-label="Contacts summary">
                <span className="app-chip">{totalLabel}</span>
              </div>
            )}
          </div>

          <div className="contactsPage__headerRight">
            <div className="app-header__actions">
              <button
                type="button"
                className="btn btn--ghost contactsPage__cta"
                onClick={() => setShowImport(true)}
              >
                Import CSV
              </button>

              <Link to="/contacts/add" className="btn btn--primary contactsPage__cta">
                + Add Contact
              </Link>
            </div>

            <div className="contactsPage__privacyNote">
              Phone numbers and email addresses of contacts you enter are never shared with other
              users.
            </div>
          </div>
        </header>

        <main className="app-stack">
          {loading && <div className="contactsPage__stateCard">Loading contacts…</div>}

          {error && <div className="contactsPage__stateCard contactsPage__stateCard--error">{error}</div>}

          {!loading && !error && userContacts.length === 0 && businessContacts.length === 0 && (
            <div className="contactsPage__stateCard">
              <div className="contactsPage__emptyTitle">No contacts yet</div>
              <div className="contactsPage__emptyText">
                Add contacts manually or import them from CSV to get started.
              </div>
            </div>
          )}

          {!loading && !error && userContacts.length > 0 && (
            <section className="app-section contactsSection">
              <div className="app-section__header">
                <div className="app-section__main">
                  <h2 className="app-section__title">People</h2>
                </div>
                <span className="contactsSection__count">{userContacts.length}</span>
              </div>

              <ul className="contact-list">
                {userContacts.map((contact) => {
                  const name = formatPersonName(contact);
                  const subtitle = contact.profession || contact.email || contact.phone || "Person";
                  const meta = contact.phone || contact.email || null;

                  return (
                    <li key={contact.userId} className="contact-item">
                      <Link
                        to={`/profile/${contact.profileSlug}`}
                        className="contact-image contact-image--clickable"
                        aria-label={`Open profile for ${name}`}
                        title={`Open profile for ${name}`}
                      >
                        {contact.profileImageUrl ? (
                          <img src={contact.profileImageUrl} alt={name} />
                        ) : (
                          <div className="contact-avatar-fallback">
                            {getInitials(contact.firstName, contact.lastName, name)}
                          </div>
                        )}
                      </Link>

                      <div className="contact-details">
                        <p className="contact-name">{name}</p>
                        <p className="contact-sub">{subtitle}</p>
                        {meta && <p className="contact-meta">📞 {meta}</p>}
                      </div>

                      <div className="contact-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setEditingContact(contact)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleDeleteContact(contact)}
                          disabled={deletingId === contact.userId}
                        >
                          {deletingId === contact.userId ? "Removing…" : "Remove"}
                        </button>
                      </div>

                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!loading && !error && businessContacts.length > 0 && (
            <section className="app-section contactsSection">
              <div className="app-section__header">
                <div className="app-section__main">
                  <h2 className="app-section__title">Businesses</h2>
                </div>
                <span className="contactsSection__count">{businessContacts.length}</span>
              </div>

              <ul className="contact-list">
                {businessContacts.map((b) => {
                  const subtitle = b.email || b.phone || "Business";
                  const metaParts = [b.phone, b.email].filter(Boolean);

                  return (
                    <li key={b.businessId} className="contact-item">
                      <Link
                        to={`/businesses/${encodeURIComponent(b.slug)}`}
                        className="contact-image contact-image--clickable"
                        aria-label={`Open business profile for ${b.name}`}
                        title={`Open business profile for ${b.name}`}
                      >
                        {b.businessLogoUrl ? (
                          <img src={b.businessLogoUrl} alt={b.name} />
                        ) : (
                          <div className="contact-avatar-fallback">
                            {getInitials(b.name, "", b.name)}
                          </div>
                        )}
                      </Link>

                      <div className="contact-details">
                        <p className="contact-name">
                          {b.name}
                          <span className="contact-typePill">Business</span>
                        </p>
                        <p className="contact-sub">{subtitle}</p>
                        {metaParts.length > 0 && (
                          <p className="contact-meta">{metaParts.join(" · ")}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      </div>

      <ContactsImportCsvModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchContacts}
      />

      <EditContactModal
        open={!!editingContact}
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onUpdated={(updatedBundle) => {
          setBundle(updatedBundle);
          setEditingContact(null);
        }}
      />
      
    </div>
  );
};

export default ContactsPage;