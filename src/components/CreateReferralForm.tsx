import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/ui-forms.css";

import { useBusinessProducts } from "../queries/productQueries";
import { useBusinessBundles } from "../queries/bundleQueries";

type TargetType = "none" | "product" | "bundle";

interface ContactResponse {
  userId: string;
  profileSlug: string;
  businessSlug?: string; // used for catalog endpoints
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
}

type BizProduct = {
  id: string;
  name: string;
  slug: string;
  primaryImageUrl?: string | null;
  isActive: boolean;
  description?: string | null;
  kind?: string | null;
};

type BizBundle = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  description?: string | null;
  items?: Array<any>;
};

const truncate = (s?: string | null, n = 200) =>
  s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "";

const StepDot = ({ active, done, label }: { active?: boolean; done?: boolean; label: string }) => (
  <div className={`th-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
    <span className="th-step-dot" />
    <span className="th-step-label">{label}</span>
  </div>
);

// Contacts-style avatar with "No Image" fallback
const ContactAvatar: React.FC<{ src?: string | null; alt: string }> = ({ src, alt }) => {
  const [ok, setOk] = React.useState(!!src);
  return (
    <div className="contact-row__img">
      {ok && src ? <img src={src} alt={alt} onError={() => setOk(false)} /> : <div className="contact-row__placeholder">No Image</div>}
    </div>
  );
};

// Helpers for naming: Full Name primary, Business secondary (if available)
const fullNameOf = (c?: ContactResponse | null) =>
  (c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "") || "";

const primaryNameOf = (c?: ContactResponse | null) =>
  fullNameOf(c) || c?.businessName || "Unnamed";

const secondaryNameOf = (c?: ContactResponse | null) => {
  const fn = fullNameOf(c);
  const biz = c?.businessName || "";
  return biz && biz !== fn ? biz : "";
};

// Row used in lists
const ContactRow: React.FC<{
  c: ContactResponse;
  selected: boolean;
  onSelect: (id: string) => void;
}> = ({ c, selected, onSelect }) => {
  const primary = primaryNameOf(c);
  const secondary = secondaryNameOf(c);
  return (
    <button
      type="button"
      className={`contact-row ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(c.userId)}
      aria-pressed={selected}
    >
      <ContactAvatar src={c.profileImageUrl} alt={primary} />
      <div className="contact-row__text">
        <div className="contact-row__primary">{primary}</div>
        {secondary ? <div className="contact-row__secondary">{secondary}</div> : null}
      </div>
    </button>
  );
};

// Compact summary line for collapsed steps
const ContactSummary: React.FC<{
  title: string;
  contact?: ContactResponse | null;
  onEdit: () => void;
}> = ({ title, contact, onEdit }) => {
  const primary = primaryNameOf(contact);
  const secondary = secondaryNameOf(contact);

  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <div className="th-row th-between" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>{title}</strong>
          {contact ? (
            <div className="contact-row contact-row--flat" style={{ padding: 6 }}>
              <ContactAvatar src={contact.profileImageUrl} alt={primary} />
              <div className="contact-row__text">
                <div className="contact-row__primary">{primary}</div>
                {secondary ? <div className="contact-row__secondary">{secondary}</div> : null}
              </div>
            </div>
          ) : (
            <span className="th-muted">No selection yet</span>
          )}
        </div>
        <button type="button" className="btn" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
};

const CreateReferralForm: React.FC = () => {
  // stepper
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // contacts + pickers
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [prospectUserId, setProspectUserId] = useState("");
  const [businessUserId, setBusinessUserId] = useState("");
  const [onlyBusinesses, setOnlyBusinesses] = useState(true);
  const [prospectQuery, setProspectQuery] = useState("");
  const [businessQuery, setBusinessQuery] = useState("");

  // target & note
  const [targetType, setTargetType] = useState<TargetType>("none");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [note, setNote] = useState("");

  // feedback
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"products" | "bundles">("products");
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  // fetch contacts once
  useEffect(() => {
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) return setError("You must be logged in.");
      try {
        const res = await axios.get(`${__API_BASE__}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContacts(res.data);
      } catch (e) {
        console.error(e);
        setError("Failed to load contacts.");
      }
    })();
  }, []);

  const fullName = (c: ContactResponse) => `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  const norm = (s: string) => (s || "").toLowerCase();

  // selected contact objects
  const prospect = contacts.find((c) => c.userId === prospectUserId) || null;
  const business = contacts.find((c) => c.userId === businessUserId) || null;
  const businessSlug = business?.businessSlug ?? "";

  // catalog queries (enabled after business chosen)
  const qProducts = useBusinessProducts(
    businessSlug,
    { active: true, limit: 200, offset: 0 },
    { enabled: !!businessSlug }
  );
  const qBundles = useBusinessBundles(businessSlug, { active: true, limit: 200, offset: 0 }, !!businessSlug);

  // reset target selection when business changes
  useEffect(() => {
    setTargetType("none");
    setSelectedProductId("");
    setSelectedBundleId("");
  }, [businessUserId]);

  // filtered contacts
  const filteredProspects = useMemo(() => {
    const q = norm(prospectQuery);
    return contacts
      .filter((c) => c.userId !== businessUserId)
      .filter((c) => !q || norm(fullName(c)).includes(q) || norm(c.businessName ?? "").includes(q))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [contacts, prospectQuery, businessUserId]);

  const filteredBusinesses = useMemo(() => {
    const q = norm(businessQuery);
    return contacts
      .filter((c) => c.userId !== prospectUserId)
      .filter((c) => (onlyBusinesses ? !!c.businessName : true))
      .filter((c) => !q || norm(fullName(c)).includes(q) || norm(c.businessName ?? "").includes(q))
      .sort((a, b) => {
        if (!!a.businessName && !b.businessName) return -1;
        if (!a.businessName && !!b.businessName) return 1;
        return (a.businessName ?? fullName(a)).localeCompare(b.businessName ?? fullName(b));
      });
  }, [contacts, businessQuery, onlyBusinesses, prospectUserId]);

  // step navigation
  const canNextFrom1 = !!prospectUserId;
  const canNextFrom2 = !!businessUserId;
  const goNext = () => {
    if (step === 1 && canNextFrom1) setStep(2);
    else if (step === 2 && canNextFrom2) setStep(3);
  };
  const goBack = () => setStep((s) => (s === 3 ? 2 : 1));

  // drawer helpers
  const openDrawer = (tab: "products" | "bundles") => {
    setDrawerTab(tab);
    setSearch("");
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);

  const attachSelection = () => {
    if (drawerTab === "products") {
      if (!selectedProductId) return;
      setTargetType("product");
      setSelectedBundleId("");
    } else {
      if (!selectedBundleId) return;
      setTargetType("bundle");
      setSelectedProductId("");
    }
    closeDrawer();
  };

  // keyboard close for drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setMessage(null);

      if (!prospectUserId || !businessUserId) {
        setError("Pick both a prospect and a business.");
        return;
      }

      let productId: string | undefined;
      let bundleId: string | undefined;
      if (targetType === "product") productId = selectedProductId || undefined;
      if (targetType === "bundle") bundleId = selectedBundleId || undefined;

      try {
        setLoading(true);
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token;
        if (!token) throw new Error("You must be logged in.");

        const body = { prospectUserId, businessUserId, note, productId, bundleId };
        const res = await axios.post(`${__API_BASE__}/referral/create`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const slug = res.data?.slug;
        if (slug) navigate(`/referral/${slug}/thread`);
        else setMessage("Referral created.");
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data ?? err?.message ?? "Failed to create referral.");
      } finally {
        setLoading(false);
      }
    },
    [prospectUserId, businessUserId, note, targetType, selectedProductId, selectedBundleId, navigate]
  );

  // filter products/bundles by search
  const filteredProducts = useMemo(() => {
    const q = norm(search);
    const list = qProducts.data ?? [];
    if (!q) return list;
    return list.filter((p: BizProduct) => norm(p.name).includes(q));
  }, [qProducts.data, search]);

  const filteredBundles = useMemo(() => {
    const q = norm(search);
    const list = qBundles.data ?? [];
    if (!q) return list;
    return list.filter((b: BizBundle) => norm(b.title).includes(q));
  }, [qBundles.data, search]);

  return (
    <div className="th-page">
      <div className="card">
        {/* Stepper */}
        <div className="th-steps">
          <StepDot active={step === 1} done={step > 1} label="Prospect" />
          <StepDot active={step === 2} done={step > 2} label="Business" />
          <StepDot active={step === 3} label="Attach & Submit" />
        </div>

        <form onSubmit={handleSubmit} className="crf" noValidate>
          {/* Collapsed summaries above the active step */}
          {step > 1 && <ContactSummary title="Prospect" contact={prospect} onEdit={() => setStep(1)} />}
          {step > 2 && <ContactSummary title="Business" contact={business} onEdit={() => setStep(2)} />}

          {/* STEP 1: Prospect */}
          {step === 1 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="crf-selected">
                <div className="crf-selected-label">Prospect</div>
                {prospect ? (
                  <div className="contact-row contact-row--flat" style={{ padding: 6 }}>
                    <ContactAvatar src={prospect.profileImageUrl} alt={primaryNameOf(prospect)} />
                    <div className="contact-row__text">
                      <div className="contact-row__primary">{primaryNameOf(prospect)}</div>
                      {secondaryNameOf(prospect) ? (
                        <div className="contact-row__secondary">{secondaryNameOf(prospect)}</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="crf-selected-empty">No selection yet</div>
                )}
              </div>

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
                  <ContactRow key={c.userId} c={c} selected={c.userId === prospectUserId} onSelect={setProspectUserId} />
                ))}
                {!filteredProspects.length && <div className="crf-empty">No matches.</div>}
              </div>

              <div className="th-row th-right" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn--primary" onClick={goNext} disabled={!canNextFrom1}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Business */}
          {step === 2 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="crf-selected">
                <div className="crf-selected-label">Business</div>
                {business ? (
                  <div className="contact-row contact-row--flat" style={{ padding: 6 }}>
                    <ContactAvatar src={business.profileImageUrl} alt={primaryNameOf(business)} />
                    <div className="contact-row__text">
                      <div className="contact-row__primary">{primaryNameOf(business)}</div>
                      {secondaryNameOf(business) ? (
                        <div className="contact-row__secondary">{secondaryNameOf(business)}</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="crf-selected-empty">No selection yet</div>
                )}
              </div>

              <div className="crf-search with-toggle">
                <input
                  value={businessQuery}
                  onChange={(e) => setBusinessQuery(e.target.value)}
                  placeholder="Search businesses…"
                  aria-label="Search businesses"
                />
                <label className="crf-toggle">
                  <input type="checkbox" checked={onlyBusinesses} onChange={(e) => setOnlyBusinesses(e.target.checked)} />
                  Only show businesses
                </label>
              </div>
              <div className="crf-list" role="listbox" aria-label="Business list">
                {filteredBusinesses.map((c) => (
                  <ContactRow key={c.userId} c={c} selected={c.userId === businessUserId} onSelect={setBusinessUserId} />
                ))}
                {!filteredBusinesses.length && <div className="crf-empty">No matches.</div>}
              </div>

              <div className="th-row th-between" style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={goBack}>
                  ← Back
                </button>
                <button type="button" className="btn btn--primary" onClick={goNext} disabled={!canNextFrom2}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Attach & Submit */}
          {step === 3 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="th-header" style={{ margin: "4px 0 6px", alignItems: "center", gap: 8 }}>
                <h3 className="page-title" style={{ fontSize: 18, marginRight: 8 }}>Attach & Submit</h3>
                <span className="badge-optional" aria-label="Optional">Optional</span>
              </div>
              <p className="th-help" id="attach-help">
                Attaching a product or bundle is <strong>optional</strong>. You can submit this referral only on the business.
              </p>

              {targetType === "none" ? (
                <div className="optional-hint" role="note" aria-live="polite">
                  If you want to refer a particular product or bundle from the business please select accordingly.
                </div>
              ) : (
                <div className="th-row" style={{ marginBottom: 8, gap: 8 }}>
                  <span className="th-chip">Attached: {targetType === "product" ? "Product" : "Bundle"}</span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setTargetType("none");
                      setSelectedProductId("");
                      setSelectedBundleId("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}

              {businessSlug && (
                <div className="th-header-actions" style={{ gap: 8, marginBottom: 10 }}>
                  <button type="button" className="btn" onClick={() => openDrawer("products")} aria-describedby="attach-help" disabled={!businessSlug}>
                    Attach product…
                  </button>
                  <button type="button" className="btn" onClick={() => openDrawer("bundles")} aria-describedby="attach-help" disabled={!businessSlug}>
                    Attach bundle…
                  </button>
                </div>
              )}

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

              <div className="th-row th-between">
                <button type="button" className="btn" onClick={goBack}>
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading || !prospectUserId || !businessUserId || prospectUserId === businessUserId}
                >
                  {loading ? "Creating…" : "Submit Referral"}
                </button>
              </div>
              {message && <p className="crf-msg ok">{message}</p>}
              {error && <p className="crf-msg err">{error}</p>}
            </div>
          )}
        </form>
      </div>

      {/* RIGHT DRAWER */}
      {drawerOpen && (
        <div className="th-drawer" role="dialog" aria-modal="true" aria-label="Attach item">
          <div className="th-drawer__backdrop" onClick={closeDrawer} />
          <div className="th-drawer__panel">
            <div className="th-drawer__header">
              <div className="th-tabs">
                <button className={`th-tab ${drawerTab === "products" ? "is-active" : ""}`} onClick={() => setDrawerTab("products")}>
                  Products
                </button>
                <button className={`th-tab ${drawerTab === "bundles" ? "is-active" : ""}`} onClick={() => setDrawerTab("bundles")}>
                  Bundles
                </button>
              </div>
              <button className="th-drawer__close" onClick={closeDrawer} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="th-drawer__search">
              <input className="input" placeholder={`Search ${drawerTab}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="th-drawer__content">
              {drawerTab === "products" && (
                <>
                  {qProducts.isLoading ? (
                    <div className="th-muted">Loading products…</div>
                  ) : qProducts.error ? (
                    <div className="th-error">{(qProducts.error as Error).message}</div>
                  ) : (filteredProducts?.length ?? 0) === 0 ? (
                    <div className="th-empty">No active products.</div>
                  ) : (
                    <div className="th-list">
                      {filteredProducts.map((p: BizProduct) => (
                        <button
                          type="button"
                          key={p.id}
                          className={`th-list-row drawer-row ${selectedProductId === p.id ? "is-selected" : ""}`}
                          onClick={() => setSelectedProductId(p.id)}
                          aria-pressed={selectedProductId === p.id}
                        >
                          {/* Left column: image + title */}
                          <div className="drawer-col-left">
                            <div className="drawer-thumb">
                              {p.primaryImageUrl ? (
                                <img src={p.primaryImageUrl} alt={p.name} className="img-cover" />
                              ) : (
                                <div className="drawer-thumb--blank" />
                              )}
                            </div>
                            <div className="drawer-title" title={p.name}>{p.name}</div>
                          </div>

                          {/* Right column: truncated description */}
                          <div className="drawer-col-right">
                            <div className="drawer-desc">{truncate(p.description)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {/* Bundles list */}
              {drawerTab === "bundles" && (
                <>
                  {qBundles.isLoading ? (
                    <div className="th-muted">Loading bundles…</div>
                  ) : qBundles.error ? (
                    <div className="th-error">{(qBundles.error as Error).message}</div>
                  ) : (filteredBundles?.length ?? 0) === 0 ? (
                    <div className="th-empty">No active bundles.</div>
                  ) : (
                    <div className="th-list">
                      {filteredBundles.map((b: BizBundle) => (
                        <button
                          type="button"
                          key={b.id}
                          className={`th-list-row drawer-row ${selectedBundleId === b.id ? "is-selected" : ""}`}
                          onClick={() => setSelectedBundleId(b.id)}
                          aria-pressed={selectedBundleId === b.id}
                        >
                          {/* Left column: (no image for bundles) + title */}
                          <div className="drawer-col-left">
                            <div className="drawer-thumb">
                              <div className="drawer-thumb--blank" />
                            </div>
                            <div className="drawer-title" title={b.title}>{b.title}</div>
                          </div>

                          {/* Right column: truncated description */}
                          <div className="drawer-col-right">
                            <div className="drawer-desc">{truncate(b.description)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>

            <div className="th-drawer__footer">
              <button className="btn" onClick={closeDrawer}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={attachSelection}
                disabled={drawerTab === "products" ? !selectedProductId : !selectedBundleId}
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateReferralForm;
