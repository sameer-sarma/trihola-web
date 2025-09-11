import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link, useLocation } from "react-router-dom";

const EmailLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const isRecoveryFlow =
        location.pathname === "/reset-password" ||
        location.search.includes("type=recovery") ||
        location.hash.includes("type=recovery");

      if (isRecoveryFlow) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) navigate("/profile", { replace: true });
    };
    checkSession();
  }, [navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setShowResend(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        if (error.message?.toLowerCase().includes("not confirmed")) setShowResend(true);
        return;
      }
      if (data.session) navigate("/profile", { replace: true });
    } catch {
      setError("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setError("Failed to resend verification email.");
    else {
      setMessage("Verification email sent. Please check your inbox.");
      setShowResend(false);
    }
    setLoading(false);
  };

  return (
    <div className="th-page auth-page">
      <div className="auth-layout">
        {/* Left: form */}
        <div className="card card--narrow">
          <h2 className="card-title">Login to TriHola</h2>

          <form className="th-form" onSubmit={handleLogin}>
            <div className="th-field">
              <label htmlFor="login-email" className="th-label">Email</label>
              <input
                id="login-email"
                className="th-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                disabled={loading}
                placeholder="you@example.com"
              />
            </div>

            <div className="th-field">
              <label htmlFor="login-password" className="th-label">Password</label>
              <input
                id="login-password"
                className="th-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <div className="th-field">
              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? "Logging in…" : "Login"}
              </button>
            </div>
          </form>

          <div className="form-help">
            <Link to="/forgot-password" className="th-link">Forgot password?</Link>
          </div>

          {showResend && (
            <div className="form-help">
              <button onClick={handleResend} className="th-link-button" disabled={loading}>
                Resend verification email
              </button>
            </div>
          )}

          {message && <div className="alert alert--success">{message}</div>}
          {error && <div className="alert alert--error">{error}</div>}
        </div>

        {/* Right: pitch pulled from landing page */}
        <aside className="auth-aside">
          <div className="auth-eyebrow">Referrals • Offers • Rewards</div>
          <h3 className="auth-title">Referrals made simple. Rewards made real.</h3>
          <p className="auth-sub">
            Turn every recommendation into a win-win. Connect people with businesses,
            track in real time, and unlock exclusive rewards.
          </p>
          <ul className="auth-bullets">
            <li><span className="tick">✔</span><strong>Refer</strong> — connect a friend with a trusted business.</li>
            <li><span className="tick">✔</span><strong>Track</strong> — follow the journey in a thread.</li>
            <li><span className="tick">✔</span><strong>Reward</strong> — both sides earn when it closes.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default EmailLogin;
