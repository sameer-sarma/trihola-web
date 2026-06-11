import { useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  completeRegistrationClaim,
  startRegistration,
  verifyRegistrationEmailOtp,
  verifyRegistrationPhoneOtp,
} from "../utils/auth";

type MessageTone = "success" | "error" | "info";
type RegisterStep = "details" | "verify";

function isSafeInternalPath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function normalizeNext(p?: string | null) {
  if (!p || p === "/" || p === "/app") return null;
  return p;
}

function friendlyMessageFromCode(code?: string, fallback?: string) {
  switch (code) {
    case "INVALID_INPUT":
      return "Please check your email, password and phone number.";
    case "USER_ALREADY_REGISTERED":
      return "You already have an account. Please log in.";
    case "PHONE_LINKED_TO_OTHER_EMAIL":
      return "This phone number is already linked to another account/email.";
    case "NON_INDIAN_CONFLICT_REQUIRES_MANUAL_REVIEW":
      return "This phone/email combination needs manual review.";
    case "EMAIL_NOT_VERIFIED":
      return "Please verify your email OTP first.";
    case "PHONE_NOT_VERIFIED":
      return "Please verify your phone OTP first.";
    case "CLAIM_EXPIRED":
      return "This verification session has expired. Please start again.";
    case "INVALID_EMAIL_OTP":
      return "Invalid email OTP.";
    case "INVALID_PHONE_OTP":
      return "Invalid phone OTP.";
    default:
      return fallback || "Registration failed.";
  }
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [step, setStep] = useState<RegisterStep>("details");
  const [claimId, setClaimId] = useState<string | null>(null);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpRequired, setPhoneOtpRequired] = useState(false);
  const [phoneOtpSupported, setPhoneOtpSupported] = useState(false);

  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawNext = searchParams.get("next");
  const decodedNext = rawNext ? decodeURIComponent(rawNext) : null;

  const safeNext = useMemo(() => {
    const n = normalizeNext(decodedNext);
    if (!isSafeInternalPath(n)) return "/start";
    if (n!.startsWith("/register")) return "/start";
    return n!;
  }, [decodedNext]);

  const loginHref = useMemo(() => {
    const n = normalizeNext(safeNext);
    if (!n) return "/login";
    return `/login?next=${encodeURIComponent(n)}`;
  }, [safeNext]);

  const resetVerification = () => {
    setClaimId(null);
    setEmailOtp("");
    setPhoneOtp("");
    setEmailVerified(false);
    setPhoneVerified(false);
    setPhoneOtpRequired(false);
    setPhoneOtpSupported(false);
    setStep("details");
  };

  const handleStartRegistration = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");
    setTone("info");

    try {
      const result = await startRegistration({
        email,
        phone,
      });

      setClaimId(result.claimId);
      setPhoneOtpRequired(result.phoneOtpRequired);
      setPhoneOtpSupported(result.phoneOtpSupported);
      setEmailVerified(false);
      setPhoneVerified(!result.phoneOtpRequired);
      setStep("verify");

      setTone("info");
      setMessage(result.message || "Please verify the OTPs sent to you.");
    } catch (err: any) {
      const codeOrMessage = err?.response?.data?.message;
      setTone("error");
      setMessage(
        friendlyMessageFromCode(
          codeOrMessage,
          "Registration could not be started."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!claimId || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const result = await verifyRegistrationEmailOtp({
        claimId,
        otp: emailOtp,
      });

      if (result.verified) {
        setEmailVerified(true);
        setTone("success");
        setMessage("Email verified.");
      }
    } catch (err: any) {
      const codeOrMessage = err?.response?.data?.message;
      setTone("error");
      setMessage(friendlyMessageFromCode(codeOrMessage, "Invalid email OTP."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!claimId || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const result = await verifyRegistrationPhoneOtp({
        claimId,
        otp: phoneOtp,
      });

      if (result.verified) {
        setPhoneVerified(true);
        setTone("success");
        setMessage("Phone verified.");
      }
    } catch (err: any) {
      const codeOrMessage = err?.response?.data?.message;
      setTone("error");
      setMessage(friendlyMessageFromCode(codeOrMessage, "Invalid phone OTP."));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!claimId || loading) return;

    setLoading(true);
    setMessage("");

    try {
      await completeRegistrationClaim({ claimId, password });

      setTone("success");
      setMessage("Registration complete. Please log in.");
      navigate(loginHref, { replace: true });
    } catch (err: any) {
      const codeOrMessage = err?.response?.data?.message;
      setTone("error");
      setMessage(
        friendlyMessageFromCode(
          codeOrMessage,
          "Registration could not be completed."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const alertClass =
    tone === "success"
      ? "alert alert--success"
      : tone === "error"
      ? "alert alert--danger"
      : "alert alert--info";

  const canComplete = emailVerified && phoneVerified;

  return (
    <div className="th-page auth-page">
      <div className="auth-layout">
        <div className="card card--narrow">
          <h2 className="card-title">Create your account</h2>

          {step === "details" && (
            <form className="th-form" onSubmit={handleStartRegistration}>
              <div className="th-field">
                <label htmlFor="reg-email" className="th-label">
                  Email
                </label>
                <input
                  id="reg-email"
                  className="th-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  disabled={loading}
                />
              </div>

              <div className="th-field">
                <label htmlFor="reg-password" className="th-label">
                  Password
                </label>
                <input
                  id="reg-password"
                  className="th-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  required
                  disabled={loading}
                />
              </div>

              <div className="th-field">
                <label htmlFor="reg-phone" className="th-label">
                  Phone (with country code)
                </label>
                <input
                  id="reg-phone"
                  className="th-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  required
                  disabled={loading}
                />
              </div>

              <div className="th-field">
                <button className="btn btn--primary btn--block" disabled={loading}>
                  {loading ? "Sending codes…" : "Continue"}
                </button>
              </div>

              <div className="form-help">
                Already have an account?{" "}
                <Link to={loginHref} className="th-link">
                  Login
                </Link>
              </div>
            </form>
          )}

          {step === "verify" && (
            <div className="th-form">
              <div className="th-section">
                <h3 className="th-section-title">Verify your details</h3>
                <p className="th-section-subtitle">
                  We sent a verification code to <strong>{email}</strong>
                  {phoneOtpRequired ? (
                    <>
                      {" "}
                      and an OTP to <strong>{phone}</strong>.
                    </>
                  ) : (
                    "."
                  )}
                </p>
              </div>

              <div className="th-field">
                <label htmlFor="email-otp" className="th-label">
                  Email OTP
                </label>
                <input
                  id="email-otp"
                  className="th-input"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  disabled={loading || emailVerified}
                />
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleVerifyEmail}
                  disabled={loading || emailVerified || !emailOtp.trim()}
                >
                  {emailVerified ? "Email verified" : "Verify email"}
                </button>
              </div>

              {phoneOtpRequired && (
                <div className="th-field">
                  <label htmlFor="phone-otp" className="th-label">
                    Phone OTP
                  </label>
                  <input
                    id="phone-otp"
                    className="th-input"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    disabled={loading || phoneVerified}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleVerifyPhone}
                    disabled={loading || phoneVerified || !phoneOtp.trim()}
                  >
                    {phoneVerified ? "Phone verified" : "Verify phone"}
                  </button>
                </div>
              )}

              {!phoneOtpRequired && !phoneOtpSupported && (
                <div className="form-help">
                  Phone OTP is currently supported only for Indian numbers. Your
                  email verification is enough if there is no phone/email conflict.
                </div>
              )}

              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={handleCompleteRegistration}
                disabled={loading || !canComplete}
              >
                {loading ? "Completing…" : "Complete registration"}
              </button>

              <button
                type="button"
                className="btn btn--subtle btn--block"
                onClick={resetVerification}
                disabled={loading}
              >
                Change email or phone
              </button>

              <div className="form-help">
                Already have an account?{" "}
                <Link to={loginHref} className="th-link">
                  Login
                </Link>
              </div>
            </div>
          )}

          {message && (
            <div className={alertClass} style={{ marginTop: 8 }}>
              {message}
            </div>
          )}
        </div>

        <aside className="auth-aside">
          <div className="auth-eyebrow">Why TriHola</div>
          <h3 className="auth-title">
            Built for relationship-driven businesses and communities
          </h3>
          <p className="auth-sub">
            Turn conversations into structured engagement — with threads that
            connect people, businesses, referrals, offers, and orders.
          </p>
          <ul className="auth-bullets">
            <li>
              <span className="tick">✔</span>
              <strong>For people</strong> — participate in trusted conversations
              and opportunities.
            </li>
            <li>
              <span className="tick">✔</span>
              <strong>For communities</strong> — keep referrals, recommendations,
              and updates connected.
            </li>
            <li>
              <span className="tick">✔</span>
              <strong>For businesses</strong> — manage engagement without losing
              the human context.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}