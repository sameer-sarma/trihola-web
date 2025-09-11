import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

function parseHashTokens(hash: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const access_token = params.get("access_token") ?? undefined;
  const refresh_token = params.get("refresh_token") ?? undefined;
  return { access_token, refresh_token };
}

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async () => {
      setBusy(true);
      setError(null);

      const { access_token, refresh_token } = parseHashTokens(location.hash);

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (cancelled) return;
        if (error) setError(error.message || "Failed to initialize recovery session.");
        setBusy(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) setError("Recovery session not found. Please request a new reset link.");
      setBusy(false);
    };

    hydrateSession();
    return () => { cancelled = true; };
  }, [location.hash]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setError(error.message || "Failed to update password.");
      return;
    }

    setMessage("Password updated successfully. You can now sign in.");
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    setTimeout(() => navigate("/email-login", { replace: true }), 1200);
  };

  return (
    <div className="auth-page">
      <div className="card card--narrow">
        <h3 className="card-title">Set a New Password</h3>

        {busy && <p className="th-muted">Preparing your recovery session…</p>}

        {!busy && error && <div className="alert alert--error">{error}</div>}

        {!busy && !error && (
          <form onSubmit={handleUpdate} className="th-form" noValidate>
            <div className="th-field">
              <label className="th-label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                className="th-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="th-field">
              <label className="th-label" htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                className="th-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              Update Password
            </button>

            {message && <div className="alert alert--success" style={{ marginTop: 12 }}>{message}</div>}
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
