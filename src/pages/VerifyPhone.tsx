// VerifyPhone.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getOwnProfile } from "../services/profileService"; // ✅ use this to fetch slug once

export default function VerifyPhone({
  onComplete,
  skipInitialCheck = false,
}: {
  onComplete?: () => void;
  skipInitialCheck?: boolean;
}) {
  const [otp, setOtp] = useState("");
  const [status, setStatus] =
    useState<"checking" | "otpSent" | "verifying" | "verified" | "error">("checking");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const ranOnce = useRef(false);

  // Helper: route directly to /profile/:slug and cache it
  const goToMyProfile = async (token: string) => {
    try {
      const me = await getOwnProfile(token);   // single /profile call
      const mySlug = me?.slug;
      if (mySlug) {
        sessionStorage.setItem("profileSlug", mySlug);
        navigate(`/profile/${mySlug}`, { replace: true }); // ✅ avoid /profile redirect loop
      } else {
        navigate("/email-login", { replace: true });
      }
    } catch {
      navigate("/email-login", { replace: true });
    }
  };

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const ctrl = new AbortController();
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setMessage("You are not logged in.");
          setStatus("error");
          return;
        }

        if (!skipInitialCheck) {
          // Only check when needed. If already verified, go straight to slug.
          const profileRes = await axios.get(`${__API_BASE__}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
          });
          if (profileRes.data.phoneVerified) {
            setStatus("verified");
            setMessage("Phone already verified.");
            await goToMyProfile(token);        // ✅ direct to /profile/:slug
            return;
          }
        }

        // Send OTP immediately
        await axios.post(`${__API_BASE__}/auth/send-otp`, null, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        setStatus("otpSent");
        setMessage("OTP sent to your registered phone number.");
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.code === "ERR_CANCELED") return;
        console.error("❌ Error during OTP send/check:", err);
        setMessage("Failed to send OTP. Please try again.");
        setStatus("error");
      }
    })();

    return () => ctrl.abort();
  }, [navigate, skipInitialCheck]);

  const handleVerify = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setMessage("Session expired. Please log in again."); return; }

    try {
      setStatus("verifying");
      const res = await axios.post(`${__API_BASE__}/auth/verify-otp`, { otp }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        // Optional re-check (keeps it to a single /profile call total)
        const profileRes = await axios.get(`${__API_BASE__}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (profileRes.data.phoneVerified) {
          setMessage("Phone verified successfully!");
          setStatus("verified");
          if (onComplete) {
            onComplete();
          } else {
            await goToMyProfile(token);         // ✅ direct to /profile/:slug
          }
        } else {
          setMessage("Phone verification succeeded, but profile not updated.");
          setStatus("error");
        }
      } else {
        setMessage("OTP verification failed.");
        setStatus("error");
      }
    } catch (err) {
      console.error("❌ Error verifying OTP:", err);
      setMessage("Error verifying OTP.");
      setStatus("error");
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
