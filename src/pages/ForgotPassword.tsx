import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) setError(error.message);
    else setMessage("Password reset email sent. Please check your inbox.");
  };

  return (
    <div className="th-page auth-page">
      <div className="card card--narrow">
        <h2 className="card-title">Forgot your password?</h2>
        <p className="card-subtle">We’ll email you a link to reset it.</p>

        <form className="th-form" onSubmit={handleReset}>
          <div className="th-field">
            <label htmlFor="fp-email" className="th-label">Email address</label>
            <input
              id="fp-email"
              type="email"
              className="th-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="th-field">
            <button type="submit" className="btn btn--primary btn--block">
              Send reset email
            </button>
          </div>
        </form>

        {message && <div className="alert alert--success">{message}</div>}
        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-help">
          Remembered it?{" "}
          <Link to="/email-login" className="th-link">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
