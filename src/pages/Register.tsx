import { useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();

  const rawNext = searchParams.get("next");
  const nextPath = rawNext ? decodeURIComponent(rawNext) : null;

  const safeNext =
    nextPath &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//") &&
    !nextPath.startsWith("/register")
      ? nextPath
      : "/start";

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${__API_BASE__}/register`, { email, password, phone });
      switch (res.data.status) {
        case "await_email_verification":
          await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/email-login?next=${encodeURIComponent(safeNext)}`
            }
          });
          setMessage("Check your email for a verification link.");
          navigate(`/email-login?next=${encodeURIComponent(safeNext)}`, { replace: true });
          break;
        case "redirect_login":
          setMessage("You already have an account. Please login.");
          navigate(`/email-login?next=${encodeURIComponent(safeNext)}`, { replace: true });
          break;
        case "update_credentials":
          setMessage("Phone exists. Please set your email/password.");
          break;
        default:
          setMessage(res.data.message || "Unexpected response.");
      }
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="th-page auth-page">
      <div className="auth-layout">
        {/* Left: form */}
        <div className="card card--narrow">
          <h2 className="card-title">Create your account</h2>

          <form className="th-form" onSubmit={handleRegister}>
            <div className="th-field">
              <label htmlFor="reg-email" className="th-label">Email</label>
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
              <label htmlFor="reg-password" className="th-label">Password</label>
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
              <label htmlFor="reg-phone" className="th-label">Phone (with country code)</label>
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
                {loading ? "Creating…" : "Register"}
              </button>
            </div>

            <div className="form-help">
              Already have an account? 
              <Link
                to={`/email-login?next=${encodeURIComponent(safeNext)}`}
                className="th-link"
              >
                Login
              </Link>
            </div>
          </form>

          {message && <div className="alert alert--success" style={{ marginTop: 8 }}>{message}</div>}
        </div>

        {/* Right: mini “Why TriHola” pitch */}
        <aside className="auth-aside">
          <div className="auth-eyebrow">Why TriHola</div>
          <h3 className="auth-title">Built for users, referrers, and businesses</h3>
          <p className="auth-sub">
            Turn word-of-mouth into measurable growth with reward management and secure,
            trackable threads.
          </p>
          <ul className="auth-bullets">
            <li><span className="tick">✔</span><strong>Users</strong> — every referral counts; organize offers & claims.</li>
            <li><span className="tick">✔</span><strong>Referrers</strong> — earn transparent rewards with simple tracking.</li>
            <li><span className="tick">✔</span><strong>Businesses</strong> — convert happy customers into a sales channel.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
