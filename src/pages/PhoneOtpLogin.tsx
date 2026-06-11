import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  sendLoginOtp,
  verifyLoginOtp,
  sendEmailLoginOtp,
  verifyEmailLoginOtp,
} from "../utils/otp";

type GuestAccessMode = "phone" | "email";

function isSafeInternalPath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function PhoneOtpLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const next = params.get("next");

  const [mode, setMode] = useState<GuestAccessMode>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeNext(p?: string | null) {
    if (!p || p === "/" || p === "/app") return null;
    if (p.startsWith("/login")) return null;
    if (p.startsWith("/guest-access")) return null;
    if (p.startsWith("/register")) return null;
    return p;
  }

  function resetOtpState(nextMode?: GuestAccessMode) {
    if (nextMode) setMode(nextMode);
    setOtp("");
    setOtpSent(false);
    setMessage(null);
    setError(null);
  }

  const normalizedNext = normalizeNext(next);
  const redirectTo = isSafeInternalPath(normalizedNext)
    ? normalizedNext!
    : "/threads";

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "phone"
        ? await sendLoginOtp(phone.trim())
        : await sendEmailLoginOtp(email.trim());

    setLoading(false);

    if (!result.success) {
      setError(result.message || "Could not send OTP.");
      return;
    }

    setOtpSent(true);
    setMessage(
      mode === "phone"
        ? "OTP sent. Please check your phone."
        : "OTP sent. Please check your email."
    );
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "phone"
        ? await verifyLoginOtp(phone.trim(), otp.trim())
        : await verifyEmailLoginOtp(email.trim(), otp.trim());

    setLoading(false);

    if (!result.success || !result.token) {
      setError(result.message || "Invalid OTP.");
      return;
    }

    window.dispatchEvent(new Event("trihola-auth-changed"));
    navigate(redirectTo, { replace: true });
  }

  const identifierLabel = mode === "phone" ? "Phone number" : "Email";
  const identifierValue = mode === "phone" ? phone : email;

  return (
    <div className="th-page auth-page">
      <div className="auth-layout">
        <div className="card card--narrow">
          <h2 className="card-title">Guest Access</h2>

          <div className="auth-switch auth-switch--guest" role="tablist" aria-label="Guest access method">
            <button
              type="button"
              className={`auth-switch__button ${
                mode === "phone" ? "auth-switch__button--active" : ""
              }`}
              onClick={() => resetOtpState("phone")}
              disabled={loading}
            >
              Phone
            </button>

            <button
              type="button"
              className={`auth-switch__button ${
                mode === "email" ? "auth-switch__button--active" : ""
              }`}
              onClick={() => resetOtpState("email")}
              disabled={loading}
            >
              Email
            </button>
          </div>

          <div className="auth-context">
            <div className="auth-context__title">
              Received a Trihola SMS or email before?
            </div>

            <div className="auth-context__text">
              There's a good chance your phone number or email address is already
              included in one or more Trihola conversations. Enter the same details
              to access them securely.
            </div>
          </div>

          <form
            className="th-form"
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
          >
            <div className="th-field">
              <label htmlFor="guest-login-identifier" className="th-label">
                {identifierLabel}
              </label>

              {mode === "phone" ? (
                <input
                  id="guest-login-identifier"
                  className="th-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  disabled={otpSent || loading}
                  required
                />
              ) : (
                <input
                  id="guest-login-identifier"
                  className="th-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={otpSent || loading}
                  required
                />
              )}
            </div>

            {otpSent && (
              <div className="th-field">
                <label htmlFor="guest-login-otp" className="th-label">
                  OTP
                </label>
                <input
                  id="guest-login-otp"
                  className="th-input"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  disabled={loading}
                  required
                />
              </div>
            )}

            <div className="th-field">
              <button
                type="submit"
                className="btn btn--primary btn--block"
                disabled={loading || (!identifierValue.trim() && !otpSent)}
              >
                {loading ? "Please wait…" : otpSent ? "Verify OTP" : "Send OTP"}
              </button>
            </div>

            {otpSent && (
              <button
                type="button"
                className="btn btn--block"
                disabled={loading}
                onClick={() => resetOtpState()}
              >
                Change {mode === "phone" ? "phone number" : "email"}
              </button>
            )}
          </form>

          <div className="form-help">
            <Link
              to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="th-link"
            >
              Login with full account instead
            </Link>
          </div>

          {message && <div className="alert alert--success">{message}</div>}
          {error && <div className="alert alert--danger">{error}</div>}
        </div>

        <aside className="auth-aside">
          <div className="auth-eyebrow">
            OTP • Guest access • Relationship threads
          </div>

          <h3 className="auth-title">
            Access conversations before joining Trihola.
          </h3>

          <p className="auth-sub">
            Trihola allows businesses, customers, referrers and prospects to
            collaborate in shared conversations. You may have been added to a
            conversation before creating a Trihola account.
          </p>

          <ul className="auth-bullets">
            <li>
              <span className="tick">✔</span>
              <strong>No registration required</strong> — access threads linked
              to you instantly.
            </li>

            <li>
              <span className="tick">✔</span>
              <strong>Stay informed</strong> — view referrals, offers, orders,
              recommendations, and business updates.
            </li>

            <li>
              <span className="tick">✔</span>
              <strong>Read-only access</strong> — guest access lets you browse
              and monitor activity, while actions continue through full account
              login.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}