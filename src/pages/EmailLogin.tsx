// src/pages/EmailLogin.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

const EmailLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        navigate("/verify-phone");
      }
    };
    checkSession();
  }, [navigate]);

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

        if (error.message.includes("Email not confirmed")) {
          setShowResend(true);
        }
} else if (data.session) {
  try {
    const token = data.session.access_token;
    const res = await fetch(`${__API_BASE__}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch profile");

    const profile = await res.json();

    if (!profile.phoneVerified) {
      navigate("/verify-phone");
    } else {
      navigate("/profile"); // this will redirect to /profile/:slug internally
    }
  } catch (err) {
    console.error("Error checking phone verification:", err);
    navigate("/verify-phone"); // fallback
  }
}
    } catch (err) {
      setError("Unexpected error occurred.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      setError("Failed to resend verification email.");
    } else {
      setMessage("Verification email sent. Please check your inbox.");
      setShowResend(false);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Login with Email</h3>

      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label className="block mb-1">Email:</label>
          <input
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-3">
          <label className="block mb-1">Password:</label>
          <input
            className="w-full p-2 border rounded"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="text-sm mt-3">
        <Link to="/forgot-password" className="text-blue-600 underline">
          Forgot Password?
        </Link>
      </div>

      {showResend && (
        <div className="mt-3">
          <button
            onClick={handleResend}
            className="text-sm text-orange-600 underline"
            disabled={loading}
          >
            Resend Verification Email
          </button>
        </div>
      )}

      {message && <p className="text-green-600 mt-3">{message}</p>}
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
};

export default EmailLogin;
