// VerifyPhone.tsx – simplified, manual start (no auto /profile calls)
import { useState } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";

export default function VerifyPhoneInline() {
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"idle"|"sending"|"otpSent"|"verifying"|"done"|"error">("idle");
  const [msg, setMsg] = useState("");

  const sendOtp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    try {
      setPhase("sending");
      await axios.post(`${__API_BASE__}/auth/send-otp`, null, { headers: { Authorization: `Bearer ${token}` } });
      setPhase("otpSent");
      setMsg("OTP sent to your phone.");
    } catch {
      setPhase("error"); setMsg("Failed to send OTP.");
    }
  };

  const verifyOtp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    try {
      setPhase("verifying");
      await axios.post(`${__API_BASE__}/auth/verify-otp`, { otp }, { headers: { Authorization: `Bearer ${token}` } });
      setPhase("done");
      setMsg("Phone verified!");
    } catch {
      setPhase("error"); setMsg("OTP verification failed.");
    }
  };

  return (
    <div>
      {phase === "idle" && (
        <button className="secondary-btn" onClick={sendOtp}>Verify phone number</button>
      )}
      {(phase === "sending" || phase === "otpSent" || phase === "verifying") && (
        <div style={{ marginTop: 8 }}>
          <input
            className="w-full p-2 border rounded mb-3"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <div style={{ display:"flex", gap:8 }}>
            <button className="primary-btn" onClick={verifyOtp} disabled={!otp || phase==="verifying"}>
              {phase === "verifying" ? "Verifying..." : "Verify OTP"}
            </button>
            <button className="secondary-btn" onClick={sendOtp} disabled={phase==="sending"}>
              Resend OTP
            </button>
          </div>
        </div>
      )}
      {msg && <p className="info-text" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
