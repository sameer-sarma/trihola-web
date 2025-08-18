// src/components/VerifyPhoneInline.tsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";

type Phase = "idle" | "sending" | "otpSent" | "verifying" | "done" | "error";

interface Props {
  onVerified?: () => void; // optional: parent can refetch profile after success
}

const VerifyPhoneInline: React.FC<Props> = ({ onVerified }) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const sendOtp = async () => {
    const token = await getToken();
    if (!token) {
      setPhase("error");
      setMsg("You’re not logged in.");
      return;
    }
    try {
      setPhase("sending");
      setMsg("");
      await axios.post(`${__API_BASE__}/auth/send-otp`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPhase("otpSent");
      setMsg("OTP sent to your registered phone number.");
    } catch (e) {
      console.error(e);
      setPhase("error");
      setMsg("Failed to send OTP. Please try again.");
    }
  };

const verifyOtp = async () => {
  const token = await getToken();
  if (!token) {
    setPhase("error");
    setMsg("Session expired. Please log in again.");
    return;
  }
  try {
    setPhase("verifying");
    await axios.post(
      `${__API_BASE__}/auth/verify-otp`,
      { otp },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setPhase("done");
    setMsg("Phone verified successfully!");
    setOtp("");
    await onVerified?.(); 
  } catch (e) {
    console.error(e);
    setPhase("error");
    setMsg("OTP verification failed. Please try again.");
  }
};

  return (
    <div>
      {/* Start / Resend / Sending */}
      {(phase === "idle" || phase === "error" || phase === "done" || phase === "sending") && (
        <button
          className="secondary-btn"
          onClick={sendOtp}
          disabled={phase === "sending"}
        >
          {phase === "done"
            ? "Resend OTP"
            : phase === "sending"
            ? "Sending..."
            : "Verify phone number"}
        </button>
      )}

      {/* OTP input + verify */}
      {(phase === "otpSent" || phase === "verifying") && (
        <div style={{ marginTop: 10 }}>
          <input
            className="w-full p-2 border rounded mb-3"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={phase === "verifying"}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="primary-btn"
              onClick={verifyOtp}
              disabled={!otp || phase === "verifying"}
            >
              {phase === "verifying" ? "Verifying..." : "Verify OTP"}
            </button>
            {/* ✅ Only disable when verifying (not sending) */}
            <button
              className="secondary-btn"
              onClick={sendOtp}
              disabled={phase === "verifying"}
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}

      {/* Status message */}
      {msg && <p className="info-text" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
};

export default VerifyPhoneInline;
