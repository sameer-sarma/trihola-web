// src/pages/CreateReferralForm.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../css/ui-forms.css";

import { useBusinessProducts } from "../queries/productQueries";
import { useBusinessBundles } from "../queries/bundleQueries";
import { createOpenReferral } from "../services/openReferralService";
import type { CreateOpenReferralRequest } from "../types/openReferrals";
import { useResolvedBusinessFromUrl } from "../hooks/useResolvedBusinessFromUrl";
import { ResolvedBusinessCard } from "../components/ResolvedBusinessCard";
import AddContactModal from "../components/AddContactModal";
import type { ContactResponse as ServiceContactResponse } from "../services/contactService";

// ✅ NEW: services you said you implemented
import { addContactByUserSlug } from "../services/contactService";

// If your PublicProfile interface lives elsewhere, import it instead of redeclaring.
// (Keeping minimal here to avoid extra wiring.)
type PublicProfile = {
  userId: string;
  slug: string;
  profileImageUrl: string | null;
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role?: string | null;
  address: string | null;
  bio: string | null;
  location?: string;
  profession?: string;
  birthday?: string;
  linkedinUrl?: string;
  registeredAsBusiness?: boolean;
  businessProfile?: {
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
    businessSlug?: string;
  } | null;
  isContact?: boolean;
};

type TargetType = "none" | "product" | "bundle";

interface ContactResponse {
  userId: string;
  profileSlug: string;
  businessSlug?: string; // used for catalog endpoints
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
  isContact?: boolean; // ✅ NEW (used for resolved business)
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

type ReferralMode = "DIRECT" | "OPEN";

const truncate = (s?: string | null, n = 200) =>
  s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "";

const StepDot = ({
  active,
  done,
  label,
}: {
  active?: boolean;
  done?: boolean;
  label: string;
}) => (
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
      {ok && src ? (
        <img src={src} alt={alt} onError={() => setOk(false)} />
      ) : (
        <div className="contact-row__placeholder">No Image</div>
      )}
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

  // referral mode: Direct vs Open
  const [referralMode, setReferralMode] = useState<ReferralMode>("DIRECT");

  // contacts + pickers
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [prospectUserId, setProspectUserId] = useState("");
  const [businessUserId, setBusinessUserId] = useState("");
  const [onlyBusinesses, setOnlyBusinesses] = useState(true);
  const [prospectQuery, setProspectQuery] = useState("");
  const [businessQuery, setBusinessQuery] = useState("");

  // ✅ NEW: resolved business (when not in contacts) + guardrail checkbox

  // target & note
  const [targetType, setTargetType] = useState<TargetType>("none");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [note, setNote] = useState("");

  // OPEN referral title
  const [openTitle, setOpenTitle] = useState("");
  const [openMaxUses, setOpenMaxUses] = useState<string>(""); // text box
  const [openMaxUsesEnabled, setOpenMaxUsesEnabled] = useState(false); // false => "No limit"

  // feedback
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // for open referrals: remember created slug for copy/preview
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"products" | "bundles">("products");
  const [search, setSearch] = useState("");

  // Add contact state
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactTarget, setAddContactTarget] = useState<"prospect" | "business">("prospect");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // detect mode from URL (?mode=open)
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "open") {
      setReferralMode("OPEN");
      setStep(1);
      setProspectUserId(""); // just in case
    }
  }, [searchParams]);

  // Prefill from URL (?businessUserId=...&prospectUserId=...&note=...&onlyBusinesses=true/false)
  useEffect(() => {
    const qBusiness = searchParams.get("businessUserId");
    const qProspect = searchParams.get("prospectUserId");
    const qNote = searchParams.get("note");
    const qOnlyBiz = searchParams.get("onlyBusinesses");

    if (qBusiness) setBusinessUserId(qBusiness);
    if (qProspect && referralMode === "DIRECT") setProspectUserId(qProspect);
    if (qNote) setNote(qNote);

    if (qOnlyBiz === "false") setOnlyBusinesses(false);
    else if (qOnlyBiz === "true") setOnlyBusinesses(true);
  }, [searchParams, referralMode]);

  // ✅ NEW: Resolve business by businessSlug when present (?businessSlug=trihola)
const {
  business: resolvedBusiness,
  loading: resolvingBusiness,
  error: resolvedBusinessError,
  addToContacts,
  setAddToContacts,
  clear: clearResolvedBusiness,
} = useResolvedBusinessFromUrl();

  // Auto-step advancement based on prefill/resolve
  useEffect(() => {
    if (referralMode === "DIRECT") {
      if (prospectUserId && businessUserId) setStep(3);
      else if (prospectUserId) setStep(2);
    } else {
      if (businessUserId) setStep(2);
    }
  }, [referralMode, prospectUserId, businessUserId]);

  // fetch contacts once
  useEffect(() => {
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) {
        setError("You must be logged in.");
        return;
      }
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

  const businessFromContacts = contacts.find((c) => c.userId === businessUserId) || null;
const business =
  businessFromContacts ||
  (resolvedBusiness ? resolvedBusiness : null);

  const businessSlug = business?.businessSlug ?? "";

  // catalog queries (enabled after business chosen)
  const qProducts = useBusinessProducts(
    businessSlug,
    { active: true, limit: 200, offset: 0 },
    { enabled: !!businessSlug }
  );

  const qBundles = useBusinessBundles(
    businessSlug,
    { active: true, limit: 200, offset: 0 },
    !!businessSlug
  );

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
  const canNextFromProspect = !!prospectUserId;
  const canNextFromBusiness = !!businessUserId;

  const goNext = () => {
    if (referralMode === "DIRECT") {
      if (step === 1 && canNextFromProspect) setStep(2);
      else if (step === 2 && canNextFromBusiness) setStep(3);
    } else {
      if (step === 1 && canNextFromBusiness) setStep(2);
    }
  };

  const goBack = () => {
    if (referralMode === "DIRECT") setStep((s) => (s === 3 ? 2 : 1));
    else setStep((s) => (s === 2 ? 1 : 1));
  };

  // handle mode change – reset steps appropriately
  const handleModeChange = (mode: ReferralMode) => {
    setReferralMode(mode);
    setMessage(null);
    setError(null);
    setOpenSlug(null);
    setOpenTitle("");

    if (mode === "DIRECT") {
      setStep(1);
    } else {
      setProspectUserId("");
      setStep(1);
    }
  };

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
      setOpenSlug(null);

      if (referralMode === "DIRECT") {
        if (!prospectUserId || !businessUserId) {
          setError("Pick both a prospect and a business.");
          return;
        }
      } else {
        if (!businessUserId) {
          setError("Pick a business for your open referral.");
          return;
        }
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

        // ✅ If business was resolved (not in contacts) and user wants it added, add it first
        if (business && !businessFromContacts && addToContacts) {
          await addContactByUserSlug(business.profileSlug, token);

          // refresh contacts so subsequent screens see it
          try {
            const res = await axios.get(`${__API_BASE__}/contacts`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setContacts(res.data);
          } catch {
            // non-fatal
          }
        }

        if (referralMode === "DIRECT") {
          const body = { prospectUserId, businessUserId, note, productId, bundleId };
          const res = await axios.post(`${__API_BASE__}/referral/create`, body, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const slug = res.data?.slug;
          if (slug) navigate(`/referral/${slug}/thread`);
          else setMessage("Referral created.");
        } else {
          let maxUsesValue: number | null = null;
          if (openMaxUsesEnabled && openMaxUses.trim()) {
            const parsed = Number.parseInt(openMaxUses.trim(), 10);
            maxUsesValue = Number.isNaN(parsed) ? null : parsed;
          }

          const body: CreateOpenReferralRequest = {
            businessId: businessUserId,
            title: openTitle || undefined,
            message: note || undefined,
            productId,
            bundleId,
            maxUses: maxUsesValue,
            publishNow: true,
          };

          const data = await createOpenReferral(body, token);
          const slug = data.slug || null;

          if (slug) {
            setOpenSlug(slug);
            setMessage("Open referral created.");
          } else {
            setMessage("Open referral created, but slug was not returned.");
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data ?? err?.message ?? "Failed to create referral.");
      } finally {
        setLoading(false);
      }
    },
    [
      referralMode,
      prospectUserId,
      businessUserId,
      note,
      targetType,
      selectedProductId,
      selectedBundleId,
      openTitle,
      openMaxUsesEnabled,
      openMaxUses,
      navigate,
      business,
      businessFromContacts,
      addToContacts,
    ]
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

  const isDirect = referralMode === "DIRECT";

  const submitLabel =
    referralMode === "DIRECT"
      ? loading
        ? "Creating…"
        : "Submit referral"
      : loading
      ? "Publishing…"
      : "Publish open referral";

  const submitDisabled =
    loading ||
    !businessUserId ||
    (isDirect && (!prospectUserId || prospectUserId === businessUserId));

  const publicOpenUrl = openSlug ? `${window.location.origin}/open/${openSlug}` : null;

  const handleCopyOpenLink = () => {
    if (!publicOpenUrl) return;
    navigator.clipboard.writeText(publicOpenUrl).catch((err) => {
      console.error("Failed to copy open referral link", err);
    });
  };

  const handlePreviewOpenPage = () => {
    if (!openSlug) return;
    navigate(`/open/${openSlug}`);
  };

  const upsertLocalContactAndSelect = (c: ServiceContactResponse) => {
  setContacts((prev) => {
    const exists = prev.some((x) => x.userId === c.userId);
    return exists ? prev : [c as any, ...prev];
  });

  if (addContactTarget === "prospect") {
    setProspectUserId(c.userId);
  } else {
    setBusinessUserId(c.userId);
  }
};

  return (
    <div className="th-page">
      <div className="card">
        {/* Referral mode toggle */}
        <div className="th-row th-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="th-label">Referral mode</div>
            <p className="th-help">
              Use <strong>Direct referral</strong> when you already know the prospect. Use{" "}
              <strong>Open referral</strong> to publish a link anyone can claim.
            </p>
          </div>
          <div className="th-tabs">
            <button
              type="button"
              className={`th-tab ${referralMode === "DIRECT" ? "is-active" : ""}`}
              onClick={() => handleModeChange("DIRECT")}
            >
              Direct referral
            </button>
            <button
              type="button"
              className={`th-tab ${referralMode === "OPEN" ? "is-active" : ""}`}
              onClick={() => handleModeChange("OPEN")}
            >
              Open referral
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="th-steps">
          {referralMode === "DIRECT" ? (
            <>
              <StepDot active={step === 1} done={step > 1} label="Prospect" />
              <StepDot active={step === 2} done={step > 2} label="Business" />
              <StepDot active={step === 3} label="Attach & Submit" />
            </>
          ) : (
            <>
              <StepDot active={step === 1} done={step > 1} label="Business" />
              <StepDot active={step === 2} label="Attach & Publish" />
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="crf" noValidate>
          {/* Collapsed summaries above the active step (only meaningful in DIRECT mode) */}
          {referralMode === "DIRECT" && step > 1 && (
            <ContactSummary title="Prospect" contact={prospect} onEdit={() => setStep(1)} />
          )}
          {((referralMode === "DIRECT" && step > 2) || (referralMode === "OPEN" && step > 1)) && (
            <ContactSummary
              title="Business"
              contact={business}
              onEdit={() => setStep(referralMode === "DIRECT" ? 2 : 1)}
            />
          )}

          {/* STEP 1: Prospect (DIRECT mode only) */}
          {referralMode === "DIRECT" && step === 1 && (
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

              <div className="crf-search" style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  value={prospectQuery}
                  onChange={(e) => setProspectQuery(e.target.value)}
                  placeholder="Search contacts…"
                  aria-label="Search prospects"
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAddContactTarget("prospect");
                    setAddContactOpen(true);
                  }}
                >
                  + Add contact
                </button>
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
                {!filteredProspects.length && <div className="crf-empty">No matches.</div>}
              </div>

              <div className="th-row th-right" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={goNext}
                  disabled={!canNextFromProspect}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* BUSINESS STEP:
              - DIRECT mode: step === 2
              - OPEN mode: step === 1
          */}
          {((referralMode === "DIRECT" && step === 2) || (referralMode === "OPEN" && step === 1)) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="crf-selected">
                <div className="crf-selected-label">Business</div>

                {resolvedBusiness ? (
                  <ResolvedBusinessCard
                    business={resolvedBusiness}
                    addToContacts={addToContacts}
                    onToggleAddToContacts={setAddToContacts}
                    onChange={() => {
                      clearResolvedBusiness();
                      setBusinessUserId("");
                      setBusinessQuery("");
                    }}
                  />
                ) : resolvingBusiness ? (
                  <div className="crf-selected-empty">Resolving business…</div>
                ) : business ? (
                  <div className="contact-row contact-row--flat" style={{ padding: 6 }}>
                    <ContactAvatar src={business.profileImageUrl} alt={primaryNameOf(business)} />
                    <div className="contact-row__text">
                      <div className="contact-row__primary">{primaryNameOf(business)}</div>
                      {secondaryNameOf(business) && (
                        <div className="contact-row__secondary">{secondaryNameOf(business)}</div>
                      )}
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
                  disabled={!!resolvedBusiness} // optional: keep simple when prefilled via businessSlug
                />
                <label className="crf-toggle">
                  <input
                    type="checkbox"
                    checked={onlyBusinesses}
                    onChange={(e) => setOnlyBusinesses(e.target.checked)}
                    disabled={!!resolvedBusiness}
                  />
                  Only show businesses
                </label>

                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAddContactTarget("business");
                    setAddContactOpen(true);
                  }}
                  disabled={!!resolvedBusiness} // optional
                >
                  + Add contact
                </button>

              </div>

              {!resolvedBusiness && (
                <div className="crf-list" role="listbox" aria-label="Business list">
                  {filteredBusinesses.map((c) => (
                    <ContactRow
                      key={c.userId}
                      c={c}
                      selected={c.userId === businessUserId}
                      onSelect={setBusinessUserId}
                    />
                  ))}
                  {!filteredBusinesses.length && <div className="crf-empty">No matches.</div>}
                </div>
              )}

              <div className="th-row th-between" style={{ marginTop: 8 }}>
                {referralMode === "DIRECT" && (
                  <button type="button" className="btn" onClick={goBack}>
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={goNext}
                  disabled={!canNextFromBusiness || resolvingBusiness}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ATTACH & SUBMIT / PUBLISH:
              - DIRECT mode: step === 3
              - OPEN mode: step === 2
          */}
          {((referralMode === "DIRECT" && step === 3) || (referralMode === "OPEN" && step === 2)) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div
                className="th-header"
                style={{ margin: "4px 0 6px", alignItems: "center", gap: 8 }}
              >
                <h3 className="page-title" style={{ fontSize: 18, marginRight: 8 }}>
                  {referralMode === "DIRECT" ? "Attach & submit" : "Attach & publish"}
                </h3>
                <span className="badge-optional" aria-label="Optional">
                  Optional
                </span>
              </div>

              <p className="th-help" id="attach-help">
                Attaching a product or bundle is <strong>optional</strong>.{" "}
                {referralMode === "DIRECT" ? (
                  <>You can submit this referral only on the business.</>
                ) : (
                  <>
                    You&apos;re creating an <strong>open referral link</strong> that anyone can claim.
                  </>
                )}
              </p>

              {targetType === "none" ? (
                <div className="optional-hint" role="note" aria-live="polite">
                  If you want to highlight a particular product or bundle from the business please select accordingly.
                </div>
              ) : (
                <div className="th-row" style={{ marginBottom: 8, gap: 8 }}>
                  <span className="th-chip">
                    Attached: {targetType === "product" ? "Product" : "Bundle"}
                  </span>
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
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openDrawer("products")}
                    aria-describedby="attach-help"
                    disabled={!businessSlug}
                  >
                    Attach product…
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openDrawer("bundles")}
                    aria-describedby="attach-help"
                    disabled={!businessSlug}
                  >
                    Attach bundle…
                  </button>
                </div>
              )}

              {/* OPEN MODE: max uses */}
              {referralMode === "OPEN" && (
                <div className="crf-note">
                  <label htmlFor="open-max-uses">Max uses</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      id="open-max-uses"
                      type="number"
                      min={1}
                      className="input"
                      style={{ flex: "0 0 160px" }}
                      value={openMaxUses}
                      onChange={(e) => setOpenMaxUses(e.target.value)}
                      disabled={!openMaxUsesEnabled}
                      placeholder="10"
                    />
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={!openMaxUsesEnabled}
                        onChange={(e) => {
                          const noLimit = e.target.checked;
                          setOpenMaxUsesEnabled(!noLimit);
                          if (noLimit) setOpenMaxUses("");
                        }}
                      />
                      <span>No limit</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="crf-note">
                <label htmlFor="note">
                  {referralMode === "DIRECT" ? "Note" : "Public note (shown on open referral page)"}
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  required={referralMode === "DIRECT"}
                  placeholder={
                    referralMode === "DIRECT"
                      ? "Add context that helps the business act on this referral…"
                      : "Briefly explain who this offer is for and how people should use this open referral link…"
                  }
                />
              </div>

              <div className="th-row th-between">
                <button type="button" className="btn" onClick={goBack}>
                  ← Back
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitDisabled}>
                  {submitLabel}
                </button>
              </div>

              {message && <p className="crf-msg ok">{message}</p>}
              {error && <p className="crf-msg err">{error}</p>}

              {referralMode === "OPEN" && openSlug && (
                <div className="card" style={{ marginTop: 12, padding: 10, background: "#f7fbff" }}>
                  <div className="th-row th-between">
                    <div>
                      <strong>Open referral link</strong>
                      <div className="th-muted" style={{ fontSize: 13 }}>
                        Share this link on WhatsApp, email, or social. Anyone who clicks can claim the referral.
                      </div>
                      {publicOpenUrl && (
                        <div style={{ marginTop: 6, fontSize: 13, wordBreak: "break-all" }}>
                          {publicOpenUrl}
                        </div>
                      )}
                    </div>
                    <div className="th-column" style={{ gap: 6, marginLeft: 12 }}>
                      <button type="button" className="btn btn--ghost" onClick={handleCopyOpenLink}>
                        Copy link
                      </button>
                      <button type="button" className="btn" onClick={handlePreviewOpenPage}>
                        Preview public page
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                <button
                  className={`th-tab ${drawerTab === "products" ? "is-active" : ""}`}
                  onClick={() => setDrawerTab("products")}
                >
                  Products
                </button>
                <button
                  className={`th-tab ${drawerTab === "bundles" ? "is-active" : ""}`}
                  onClick={() => setDrawerTab("bundles")}
                >
                  Bundles
                </button>
              </div>
              <button className="th-drawer__close" onClick={closeDrawer} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="th-drawer__search">
              <input
                className="input"
                placeholder={`Search ${drawerTab}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                          <div className="drawer-col-left">
                            <div className="drawer-thumb">
                              {p.primaryImageUrl ? (
                                <img src={p.primaryImageUrl} alt={p.name} className="img-cover" />
                              ) : (
                                <div className="drawer-thumb--blank" />
                              )}
                            </div>
                            <div className="drawer-title" title={p.name}>
                              {p.name}
                            </div>
                          </div>
                          <div className="drawer-col-right">
                            <div className="drawer-desc">{truncate(p.description)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

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
                          <div className="drawer-col-left">
                            <div className="drawer-thumb">
                              <div className="drawer-thumb--blank" />
                            </div>
                            <div className="drawer-title" title={b.title}>
                              {b.title}
                            </div>
                          </div>
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

      <AddContactModal
        open={addContactOpen}
        title={addContactTarget === "prospect" ? "Add prospect" : "Add business"}
        onClose={() => setAddContactOpen(false)}
        onAdded={upsertLocalContactAndSelect}
      />

    </div>
  );
};

export default CreateReferralForm;
