// src/components/VerifyBusinessEmailInline.tsx
import { useState } from "react";
import { sendBusinessEmailVerification } from "../services/businessService";

type Phase = "idle" | "sending" | "sent" | "error";

export default function VerifyBusinessEmailInline(props: {
  businessId: string;
  email: string | null;
  emailVerified: boolean;
}) {
  const { businessId, email, emailVerified } = props;
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");

  const send = async () => {
    if (!email || !email.trim()) {
      setPhase("error");
      setMsg("Please enter a business email first.");
      return;
    }
    try {
      setPhase("sending");
      setMsg("");
      await sendBusinessEmailVerification(businessId, email);
      setPhase("sent");
      setMsg("Verification email sent. Please click the link to verify.");
    } catch (e) {
      console.error(e);
      setPhase("error");
      setMsg("Failed to send verification email. Please try again.");
    }
  };

  if (emailVerified) {
    return <div className="rb-hint rb-hint--ok">✅ Email verified</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button className="secondary-btn" onClick={send} disabled={phase === "sending"}>
        {phase === "sending" ? "Sending..." : "Verify business email"}
      </button>
      {msg && <div className="rb-hint rb-hint--muted">{msg}</div>}
    </div>
  );
}
