import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import type { BusinessProfileDTOOwner } from "../types/business";
import { checkBusinessSlugAvailability, registerBusiness } from "../services/businessService";
import FileUploader from "../components/FileUploader";

import "../css/register-business.css";

function normalizeSlugClient(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function RegisterBusinessPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<BusinessProfileDTOOwner>({
    businessName: "",
    businessDescription: "",
    businessWebsite: "",
    businessSlug: "",
    businessLogoUrl: "",
    businessResistrationProofUrl: "",
    ownerKYCProofUrl: "",
    phone: "",
    email: "",
    phoneVerified: false,
    emailVerified: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slugStatus, setSlugStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok" }
    | { state: "taken" }
    | { state: "invalid"; reason: string }
  >({ state: "idle" });

  const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET as string;
  const MAX_DESC = 1000;
  
  const [userId, setUserId] = useState<string | null>(null);

  // Need userId for storage path, same as ProfilePictureUploader :contentReference[oaicite:1]{index=1}
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    void load();
  }, []);

  const suggestedSlug = useMemo(() => {
    const name = (form.businessName ?? "").trim();
    if (!name) return "";
    return normalizeSlugClient(name);
  }, [form.businessName]);

  useEffect(() => {
    const current = (form.businessSlug ?? "").trim();
    if (!current && suggestedSlug) {
      setForm((p) => ({ ...p, businessSlug: suggestedSlug }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedSlug]);

  useEffect(() => {
    const slugRaw = (form.businessSlug ?? "").trim();
    if (!slugRaw) {
      setSlugStatus({ state: "idle" });
      return;
    }

    const slug = normalizeSlugClient(slugRaw);
    if (!slug) {
      setSlugStatus({ state: "invalid", reason: "Slug can’t be empty." });
      return;
    }
    if (slug.length < 3) {
      setSlugStatus({ state: "invalid", reason: "Slug must be at least 3 characters." });
      return;
    }

    let alive = true;
    setSlugStatus({ state: "checking" });

    const t = window.setTimeout(async () => {
      try {
        const res = await checkBusinessSlugAvailability(slug);
        if (!alive) return;
        setSlugStatus(res.available ? { state: "ok" } : { state: "taken" });
      } catch {
        if (!alive) return;
        setSlugStatus({ state: "idle" });
      }
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [form.businessSlug]);

  function setField<K extends keyof BusinessProfileDTOOwner>(key: K, value: BusinessProfileDTOOwner[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goBackToPublicProfile() {
    const mySlug = sessionStorage.getItem("profileSlug");
    if (mySlug) navigate(`/profile/${encodeURIComponent(mySlug)}`, { replace: true });
    else navigate("/profile", { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const businessName = (form.businessName ?? "").trim();
    if (!businessName) {
      setError("Business name is required.");
      return;
    }

    const slug = normalizeSlugClient((form.businessSlug ?? "").trim());
    if (!slug) {
      setError("Business slug is required.");
      return;
    }

    if (slugStatus.state === "taken") {
      setError("That slug is already taken. Try a different one.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: BusinessProfileDTOOwner = {
        ...form,
        businessName,
        businessSlug: slug,
        businessWebsite: (form.businessWebsite ?? "").trim() || null,
        businessDescription: (form.businessDescription ?? "").trim() || null,
        businessLogoUrl: (form.businessLogoUrl ?? "").trim() || null,
        businessResistrationProofUrl: (form.businessResistrationProofUrl ?? "").trim() || null,
        ownerKYCProofUrl: (form.ownerKYCProofUrl ?? "").trim() || null,
        phone: (form.phone ?? "").trim() || null,
        email: (form.email ?? "").trim() || null,
      };

      const ctx = await registerBusiness(payload);

      sessionStorage.setItem("primaryBusinessId", ctx.businessId);
      sessionStorage.setItem("primaryBusinessSlug", ctx.businessSlug);

      navigate(`/businesses/${encodeURIComponent(ctx.businessSlug)}/edit`, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Failed to register business.");
    } finally {
      setSubmitting(false);
    }
  }

  const slugHintText = (() => {
    switch (slugStatus.state) {
      case "checking":
        return "Checking availability…";
      case "ok":
        return "Slug is available.";
      case "taken":
        return "Slug is taken.";
      case "invalid":
        return slugStatus.reason;
      default:
        return null;
    }
  })();

  return (
    <div className="th-page rb-page">
      <div className="card rb-card">
        <h1 className="card-title">Register your Business</h1>
        <p className="card-subtle">
          Create your business profile. Your business will be submitted for review and become active after approval.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form className="th-form" onSubmit={onSubmit}>
          <div className="rb-grid">
            <div className="th-field">
              <div className="th-label">Business Name *</div>
              <input
                className="th-input"
                value={form.businessName ?? ""}
                onChange={(e) => setField("businessName", e.target.value)}
                placeholder="Zestchest"
                autoComplete="organization"
              />
            </div>

            <div className="th-field">
              <div className="th-label">Business Website</div>
              <input
                className="th-input"
                value={form.businessWebsite ?? ""}
                onChange={(e) => setField("businessWebsite", e.target.value)}
                placeholder="https://example.com"
                autoComplete="url"
              />
            </div>

            <div className="th-field rb-span2">
              <div className="th-label">
                Description
                <span style={{ float: "right", fontSize: 12, color: "#888" }}>
                  {(form.businessDescription?.length ?? 0)}/{MAX_DESC}
                </span>
              </div>

              <textarea
                className="th-input rb-textarea"
                value={form.businessDescription ?? ""}
                onChange={(e) => {
                  const value = e.target.value;

                  // Hard limit (prevents paste overflow)
                  if (value.length <= MAX_DESC) {
                    setField("businessDescription", value);
                  }
                }}
                placeholder="What do you do? Who is it for?"
                rows={4}
                maxLength={MAX_DESC} // browser-level restriction
              />

              {(form.businessDescription?.length ?? 0) > MAX_DESC && (
                <div style={{ color: "red", fontSize: 12 }}>
                  Description cannot exceed {MAX_DESC} characters
                </div>
              )}
            </div>

            <div className="th-field">
              <div className="th-label">Business Phone</div>
              <input
                className="th-input"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+91…"
                autoComplete="tel"
              />
            </div>

            <div className="th-field">
              <div className="th-label">Business Email</div>
              <input
                className="th-input"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="hello@…"
                autoComplete="email"
              />
            </div>

            <div className="th-field">
              <div className="th-label">Business Slug *</div>
              <input
                className="th-input"
                value={form.businessSlug ?? ""}
                onChange={(e) => setField("businessSlug", e.target.value)}
                placeholder="zestchest"
              />
              {slugHintText && (
                <div
                  className={`rb-hint ${
                    slugStatus.state === "ok"
                      ? "rb-hint--ok"
                      : slugStatus.state === "taken" || slugStatus.state === "invalid"
                      ? "rb-hint--bad"
                      : "rb-hint--muted"
                  }`}
                >
                  {slugHintText} <span className="rb-hint-url">/b/{normalizeSlugClient(form.businessSlug ?? "")}</span>
                </div>
              )}
            </div>

            {/* ✅ Business Logo: upload OR paste URL */}
            <div className="th-field">
              <div className="th-label">Business Logo</div>

              {userId ? (
                <div className="rb-uploadBox">
                <FileUploader
                  userId={userId}
                  bucket={BUCKET}
                  folder="business-media"
                  filenameBase={`business_logo_${normalizeSlugClient(form.businessSlug || "draft")}`}
                  strategy="overwrite"
                  accept="image/*"
                  label="Upload business logo"
                  help="PNG/JPG recommended. This will be used across referrals & offers."
                  onUploadComplete={(url) => setField("businessLogoUrl", url)}
                />
                </div>
              ) : (
                <div className="th-help">Loading user…</div>
              )}

              <div className="th-help" style={{ marginTop: 8 }}>
                Or paste a logo URL:
              </div>
              <input
                className="th-input"
                value={form.businessLogoUrl ?? ""}
                onChange={(e) => setField("businessLogoUrl", e.target.value)}
                placeholder="https://…/logo.png"
              />
            </div>

            <div className="rb-divider rb-span2">Verification Documents (optional for now)</div>

            {/* ✅ Business Registration Proof */}
            <div className="th-field">
              <div className="th-label">Business Registration Proof</div>

              {userId ? (
                <div className="rb-uploadBox">
                <FileUploader
                  userId={userId}
                  bucket={BUCKET}
                  folder="business-media"
                  filenameBase={`business_registration_${normalizeSlugClient(form.businessSlug || "draft")}`}
                  strategy="overwrite"
                  accept="application/pdf,image/*"
                  label="Upload registration proof"
                  help="PDF preferred (GST / registration)."
                  onUploadComplete={(url) => setField("businessResistrationProofUrl", url)}
                />
                </div>
              ) : (
                <div className="th-help">Loading user…</div>
              )}

              <div className="th-help" style={{ marginTop: 8 }}>
                Or paste a URL:
              </div>
              <input
                className="th-input"
                value={form.businessResistrationProofUrl ?? ""}
                onChange={(e) => setField("businessResistrationProofUrl", e.target.value)}
                placeholder="https://…/gst-or-registration.pdf"
              />
            </div>

            {/* ✅ Owner KYC Proof */}
            <div className="th-field">
              <div className="th-label">Owner KYC Proof</div>

              {userId ? (
                <div className="rb-uploadBox">
                <FileUploader
                  userId={userId}
                  bucket={BUCKET}
                  folder="business-media"
                  filenameBase={`owner_kyc_${normalizeSlugClient(form.businessSlug || "draft")}`}
                  strategy="overwrite"
                  accept="application/pdf,image/*"
                  label="Upload KYC proof"
                  help="PDF or image. Keep it clear and legible."
                  onUploadComplete={(url) => setField("ownerKYCProofUrl", url)}
                /></div>
              ) : (
                <div className="th-help">Loading user…</div>
              )}

              <div className="th-help" style={{ marginTop: 8 }}>
                Or paste a URL:
              </div>
              <input
                className="th-input"
                value={form.ownerKYCProofUrl ?? ""}
                onChange={(e) => setField("ownerKYCProofUrl", e.target.value)}
                placeholder="https://…/kyc.pdf"
              />
            </div>
          </div>

          <div className="rb-actions">
            <button type="button" className="btn" onClick={goBackToPublicProfile} disabled={submitting}>
              Cancel
            </button>

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </form>

        <div className="form-help">
          After submitting, status will be <b>PENDING</b> until a Trihola admin approves the business.
        </div>
      </div>
    </div>
  );
}
