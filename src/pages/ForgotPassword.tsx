import React, { useState } from "react";
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

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password reset email sent. Please check your inbox.");
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Forgot Password</h3>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Your email"
          className="w-full p-2 border rounded mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Send Reset Email
        </button>
      </form>
      {message && <p className="text-green-600 mt-3">{message}</p>}
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
};

export default ForgotPassword;
