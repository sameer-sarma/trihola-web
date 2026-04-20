// src/components/VerifyBusinessPhoneInline.tsx
import { useState } from "react";
import { sendBusinessPhoneOtp, verifyBusinessPhoneOtp } from "../services/businessService";

type Phase = "idle" | "sending" | "otpSent" | "verifying" | "done" | "error";

export default function VerifyBusinessPhoneInline(props: {
  businessId: string;
  phone: string | null;
  phoneVerified: boolean;
  onVerified?: () => void;
}) {
  const { businessId, phone, phoneVerified, onVerified } = props;

  const [phase, setPhase] = useState<Phase>("idle");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");

  const sendOtp = async () => {
    if (!phone || !phone.trim()) {
      setPhase("error");
      setMsg("Please enter a business phone number first.");
      return;
    }
    try {
      setPhase("sending");
      setMsg("");
      await sendBusinessPhoneOtp(businessId, phone);
      setPhase("otpSent");
      setMsg("OTP sent to the business phone number.");
    } catch (e) {
      console.error(e);
      setPhase("error");
      setMsg("Failed to send OTP. Please try again.");
    }
  };

  const verifyOtp = async () => {
    if (!phone) return;
    try {
      setPhase("verifying");
      await verifyBusinessPhoneOtp(businessId, phone, otp);
      setPhase("done");
      setOtp("");
      setMsg("Business phone verified successfully!");
      await onVerified?.();
    } catch (e) {
      console.error(e);
      setPhase("error");
      setMsg("OTP verification failed. Please try again.");
    }
  };

  if (phoneVerified) {
    return <div className="rb-hint rb-hint--ok">✅ Phone verified</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {(phase === "idle" || phase === "error" || phase === "done" || phase === "sending") && (
        <button className="secondary-btn" onClick={sendOtp} disabled={phase === "sending"}>
          {phase === "sending" ? "Sending..." : "Verify business phone"}
        </button>
      )}

      {(phase === "otpSent" || phase === "verifying") && (
        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="th-input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={phase === "verifying"}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary-btn" onClick={verifyOtp} disabled={!otp || phase === "verifying"}>
              {phase === "verifying" ? "Verifying..." : "Verify OTP"}
            </button>
            <button className="secondary-btn" onClick={sendOtp} disabled={phase === "verifying"}>
              Resend OTP
            </button>
          </div>
        </div>
      )}

      {msg && <div className="rb-hint rb-hint--muted">{msg}</div>}
    </div>
  );
}
