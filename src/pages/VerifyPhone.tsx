import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function VerifyPhone({ onComplete }: { onComplete?: () => void }) {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<"checking" | "otpSent" | "verifying" | "verified" | "error">("checking");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const ranOnce = useRef(false);
  
  useEffect(() => {
      if (ranOnce.current) return; // skip if already run
      ranOnce.current = true;
    
      const checkAndSendOtp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          setMessage("You are not logged in.");
          setStatus("error");
          return;
        }

        // Check profile to see if phone is already verified
        const profileRes = await axios.get("http://127.0.0.1:8080/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (profileRes.data.phoneVerified) {
          setMessage("Phone already verified.");
          setStatus("verified");

          // Optional redirect
          setTimeout(() => navigate("/profile"), 1500);
          return;
        }

        // Send OTP
        await axios.post("http://127.0.0.1:8080/auth/send-otp", null, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStatus("otpSent");
        setMessage("OTP sent to your registered phone number.");
      } catch (err) {
        console.error("❌ Error during OTP send/check:", err);
        setMessage("Failed to send OTP. Please try again.");
        setStatus("error");
      }
    };

    checkAndSendOtp();
  }, [navigate]);

const handleVerify = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    setMessage("Session expired. Please log in again.");
    return;
  }

  try {
    const res = await axios.post(
      "http://127.0.0.1:8080/auth/verify-otp",
      { otp },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.status === 200) {
      // ✅ Re-check profile to ensure phoneVerified is now true
      const profileRes = await axios.get("http://127.0.0.1:8080/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (profileRes.data.phoneVerified) {
        setMessage("Phone verified successfully!");
        setStatus("verified");

        if (onComplete) {
          onComplete(); // ✅ this should call `setPhoneVerified(true)` in App.tsx
        } else {
          // fallback redirect
          navigate("/profile");
        }
      } else {
        setMessage("Phone verification succeeded, but profile not updated.");
      }
    } else {
      setMessage("OTP verification failed.");
    }
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    setMessage("Error verifying OTP.");
  }
};

  if (status === "verified") return null;

return (
  <div className="max-w-sm mx-auto p-4 border rounded-lg shadow">
    <h2 className="text-xl font-bold mb-2">Verify your phone</h2>
    <p className="text-gray-600 mb-4">{message}</p>

    {(status === "otpSent" || status === "verifying") && (
      <>
        <input
          className="w-full p-2 border rounded mb-3"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        <button
          className="w-full bg-green-600 text-white p-2 rounded"
          onClick={handleVerify}
          disabled={!otp || status === "verifying"}
        >
          {status === "verifying" ? "Verifying..." : "Verify OTP"}
        </button>
      </>
    )}

    {status === "checking" && (
      <p className="text-gray-500 text-sm">Checking phone verification status...</p>
    )}

    {status === "error" && (
      <p className="text-red-600 text-sm mt-2">There was a problem. Please try again later.</p>
    )}
  </div>
);
}
