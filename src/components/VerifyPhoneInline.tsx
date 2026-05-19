// src/components/VerifyPhoneInline.tsx
import React, { useState } from "react";
import { sendOtp, verifyOtp } from "../utils/otp";

type Phase = "idle" | "sending" | "otpSent" | "verifying" | "done" | "error";

interface Props {
  onVerified?: () => void; // optional: parent can refetch profile after success
}

const VerifyPhoneInline: React.FC<Props> = ({ onVerified }) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");

  const handleSendOtp = async () => {
    try {
      setPhase("sending");
      setMsg("");

      const result = await sendOtp();

      if (!result.success) {
        setPhase("error");
        setMsg(result.message);
        return;
      }

      setPhase("otpSent");
      setMsg("OTP sent to your registered phone number.");
    } catch (e: any) {
      console.error(e);
      setPhase("error");
      setMsg(e?.message || "Failed to send OTP. Please try again.");
    }
  };

const handleVerifyOtp = async () => {
  try {
    setPhase("verifying");

    const result = await verifyOtp(otp);

    if (!result.success) {
      setPhase("error");
      setMsg(result.message);
      return;
    }

    setPhase("done");
    setMsg("Phone verified successfully!");
    setOtp("");
    await onVerified?.();
  } catch (e: any) {
    console.error(e);
    setPhase("error");
    setMsg(e?.message || "OTP verification failed. Please try again.");
  }
};

  return (
    <div>
      {/* Start / Resend / Sending */}
      {(phase === "idle" || phase === "error" || phase === "done" || phase === "sending") && (
        <button
          className="secondary-btn"
          onClick={handleSendOtp}
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
              onClick={handleVerifyOtp}
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
