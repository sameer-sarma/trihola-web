// src/pages/EditBusinessPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import VerifyBusinessPhoneInline from "../components/VerifyBusinessPhoneInline";
import VerifyBusinessEmailInline from "../components/VerifyBusinessEmailInline";
import type { BusinessProfileDTOOwner, BusinessOwnerProfileResponse } from "../types/business";

import {
  getBusinessPublicViewBySlug,
  getBusinessOwnerProfile,
  updateBusiness,
  checkBusinessSlugAvailability,
} from "../services/businessService";

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

function safe(v: any) {
  return v ?? "";
}

export default function EditBusinessPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const navigate = useNavigate();
 
  const [businessId, setBusinessId] = useState<string>("");
  const [status, setStatus] = useState<BusinessOwnerProfileResponse["status"]>("PENDING");

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

  const originalSlugRef = useRef<string>("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hideKyc = useMemo(() => status === "ACTIVE", [status]);

  const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET as string;
  const MAX_DESC = 1000;
  
  const [userId, setUserId] = useState<string | null>(null);

  // Need userId for storage path (same approach as RegisterBusinessPage)
  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    void load();
  }, []);

  const [slugStatus, setSlugStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok" }
    | { state: "taken" }
    | { state: "unchanged" }
    | { state: "invalid"; reason: string }
  >({ state: "idle" });

  useEffect(() => {
    if (!businessSlug) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Resolve slug -> businessId (+ authz)
        const ctx = await getBusinessPublicViewBySlug(businessSlug);
        if (cancelled) return;

        setBusinessId(ctx.businessId);

        // Fetch owner profile for edit page
        const full = (await getBusinessOwnerProfile(ctx.businessId)) as BusinessOwnerProfileResponse;
        if (cancelled) return;

        setStatus(full.status);

        const loadedSlug = normalizeSlugClient(safe(full.profile.businessSlug) || businessSlug);
        originalSlugRef.current = loadedSlug;

        setForm({
          businessName: safe(full.profile.businessName),
          businessDescription: safe(full.profile.businessDescription),
          businessWebsite: safe(full.profile.businessWebsite),
          businessSlug: loadedSlug,
          businessLogoUrl: safe(full.profile.businessLogoUrl),
          businessResistrationProofUrl: safe(full.profile.businessResistrationProofUrl),
          ownerKYCProofUrl: safe(full.profile.ownerKYCProofUrl),
          phone: safe(full.profile.phone),
          phoneVerified: !!full.profile.phoneVerified,
          email: safe(full.profile.email),
          emailVerified: !!full.profile.emailVerified,
        });

        setSlugStatus({ state: "unchanged" });
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e?.response?.data?.error ?? e?.message ?? "Failed to load business");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);

  const hasPhone = !!(form.phone && form.phone.trim());
  const hasEmail = !!(form.email && form.email.trim());

  const needsPhoneVerify = hasPhone && !form.phoneVerified;
  const needsEmailVerify = hasEmail && !form.emailVerified;

  const missingBoth = !hasPhone && !hasEmail;

  const showNudge = needsPhoneVerify || needsEmailVerify || missingBoth;
  
  function setField<K extends keyof BusinessProfileDTOOwner>(key: K, value: BusinessProfileDTOOwner[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goBackToBusinessPage() {
    const slug = normalizeSlugClient((form.businessSlug ?? "").trim() || businessSlug || "");
    navigate(`/businesses/${encodeURIComponent(slug)}`, { replace: true });
  }

  // Slug availability check (skip if unchanged)
  useEffect(() => {
    const raw = (form.businessSlug ?? "").trim();
    if (!raw) {
      setSlugStatus({ state: "idle" });
      return;
    }

    const slug = normalizeSlugClient(raw);
    if (!slug) {
      setSlugStatus({ state: "invalid", reason: "Slug can’t be empty." });
      return;
    }
    if (slug.length < 3) {
      setSlugStatus({ state: "invalid", reason: "Slug must be at least 3 characters." });
      return;
    }

    const original = originalSlugRef.current;
    if (original && slug === original) {
      setSlugStatus({ state: "unchanged" });
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
      case "unchanged":
        return "Slug unchanged.";
      default:
        return null;
    }
  })();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!businessId) {
      setError("Missing businessId.");
      return;
    }

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

        // IMPORTANT: when ACTIVE, don’t allow editing KYC/proof from UI (avoid accidental overwrites)
        businessResistrationProofUrl: hideKyc ? null : ((form.businessResistrationProofUrl ?? "").trim() || null),
        ownerKYCProofUrl: hideKyc ? null : ((form.ownerKYCProofUrl ?? "").trim() || null),
        phone: (form.phone ?? "").trim() || null,
        email: (form.email ?? "").trim() || null,
      };

      await updateBusiness(businessId, payload);

      // If slug changed, go to the new slug business page
      navigate(`/businesses/${encodeURIComponent(slug)}`, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Failed to save business.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="th-page rb-page">
        <div className="card rb-card">
          <h1 className="card-title">Edit your Business</h1>
          <p className="card-subtle">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="th-page rb-page">
      <div className="card rb-card">
        <h1 className="card-title">Edit your Business</h1>
        <p className="card-subtle">
          Update your business profile.
          {" "}
          <b>Status:</b> {status}
          {status === "PENDING" ? " (under review)" : ""}
          {status === "SUSPENDED" ? " (suspended)" : ""}
        </p>

        {error && <div className="error-banner">{error}</div>}

        {showNudge && (
          <div className="verify-nudge">
            <div className="verify-nudge__title">Finish setup</div>

            <div className="verify-nudge__body">
              {missingBoth && (
                <div>• Add a business phone or email so users can contact you. Then verify it for trust.</div>
              )}
              {needsPhoneVerify && (
                <div>• Your business phone is not verified yet — verify it to enable OTP-based flows.</div>
              )}
              {needsEmailVerify && (
                <div>• Your business email is not verified yet — verify it so customers can trust your contact info.</div>
              )}
            </div>
          </div>
        )}

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
              <div className="th-label">Description</div>
              <textarea
                className="th-input rb-textarea"
                value={form.businessDescription ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Hard limit enforcement
                  if (value.length <= MAX_DESC) {
                    setField("businessDescription", value);
                  }
                }}
                placeholder="What do you do? Who is it for?"
                rows={4}
                maxLength={MAX_DESC}
              />
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
              <div style={{ marginTop: 8 }}>
                <VerifyBusinessPhoneInline
                  businessId={businessId}
                  phone={form.phone ?? null}
                  phoneVerified={!!form.phoneVerified}
                  onVerified={async () => {
                    // simplest: reload owner profile (same method you already use)
                    const full = await getBusinessOwnerProfile(businessId);
                    setForm((p) => ({
                      ...p,
                      phone: full.profile.phone ?? "",
                      phoneVerified: !!full.profile.phoneVerified,
                    }));
                  }}
                />
              </div>
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
              <div style={{ marginTop: 8 }}>
                <VerifyBusinessEmailInline
                  businessId={businessId}
                  email={form.email ?? null}
                  emailVerified={!!form.emailVerified}
                />
              </div>
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
                    slugStatus.state === "ok" || slugStatus.state === "unchanged"
                      ? "rb-hint--ok"
                      : slugStatus.state === "taken" || slugStatus.state === "invalid"
                      ? "rb-hint--bad"
                      : "rb-hint--muted"
                  }`}
                >
                  {slugHintText}{" "}
                  <span className="rb-hint-url">/b/{normalizeSlugClient(form.businessSlug ?? "")}</span>
                </div>
              )}
            </div>

            {/* ✅ Business Logo: upload OR paste URL (same UI as register) */}
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

            {/* ✅ Hide verification docs if ACTIVE */}
            {!hideKyc ? (
              <>
                <div className="rb-divider rb-span2">Verification Documents (optional for now)</div>

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
                    value={form.ownerKYCProofUrl ?? ""}
                    onChange={(e) => setField("ownerKYCProofUrl", e.target.value)}
                    placeholder="https://…/kyc.pdf"
                  />
                </div>
              </>
            ) : (
              <div className="rb-divider rb-span2">
                Verification documents are hidden once the business is ACTIVE.
              </div>
            )}
          </div>

          <div className="rb-actions">
            <button type="button" className="btn" onClick={goBackToBusinessPage} disabled={submitting}>
              Cancel
            </button>

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <div className="form-help">
          Tip: If your business is <b>ACTIVE</b>, verification documents are locked and not shown here.
        </div>
      </div>
    </div>
  );
}
