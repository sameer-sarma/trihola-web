import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendLoginOtp, verifyLoginOtp } from "../utils/otp";

function isSafeInternalPath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function PhoneOtpLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const next = params.get("next");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeNext(p?: string | null) {
    if (!p || p === "/" || p === "/app") return null;
    if (p.startsWith("/email-login")) return null;
    if (p.startsWith("/phone-login")) return null;
    if (p.startsWith("/register")) return null;
    return p;
  }

  const normalizedNext = normalizeNext(next);
  const redirectTo = isSafeInternalPath(normalizedNext) ? normalizedNext! : "/threads";

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await sendLoginOtp(phone.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Could not send OTP.");
      return;
    }

    setOtpSent(true);
    setMessage("OTP sent. Please check your phone.");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await verifyLoginOtp(phone.trim(), otp.trim());
    setLoading(false);

    if (!result.success || !result.token) {
      setError(result.message || "Invalid OTP.");
      return;
    }

    window.dispatchEvent(new Event("trihola-auth-changed"));
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="th-page auth-page">
      <div className="auth-layout">
        <div className="card card--narrow">
          <h2 className="card-title">Login with phone</h2>

          <form
            className="th-form"
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
          >
            <div className="th-field">
              <label htmlFor="phone-login-phone" className="th-label">
                Phone number
              </label>
              <input
                id="phone-login-phone"
                className="th-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                disabled={otpSent || loading}
                required
              />
            </div>

            {otpSent && (
              <div className="th-field">
                <label htmlFor="phone-login-otp" className="th-label">
                  OTP
                </label>
                <input
                  id="phone-login-otp"
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
                disabled={loading}
              >
                {loading ? "Please wait…" : otpSent ? "Verify OTP" : "Send OTP"}
              </button>
            </div>

            {otpSent && (
              <button
                type="button"
                className="btn btn--block"
                disabled={loading}
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setMessage(null);
                  setError(null);
                }}
              >
                Change phone number
              </button>
            )}
          </form>

          <div className="form-help">
            <Link
              to={`/email-login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="th-link"
            >
              Login with email instead
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
            Not registered yet? No problem. Enter your phone number to receive an OTP and securely view all linked conversations. When you're ready, you can create an account to take actions and manage your relationships more effectively.
          </p>

          <ul className="auth-bullets">
            <li>
              <span className="tick">✔</span>
              <strong>No registration required</strong> — access threads linked to
              you instantly.
            </li>

            <li>
              <span className="tick">✔</span>
              <strong>Stay informed</strong> — view referrals, offers, orders,
              recommendations, and business updates.
            </li>

            <li>
              <span className="tick">✔</span>
              <strong>Read-only access</strong> — OTP access allow you to browse and
              monitor activity, while actions continue through full email login.
            </li>
          </ul>
        </aside>
      
      </div>
    </div>
  );
}