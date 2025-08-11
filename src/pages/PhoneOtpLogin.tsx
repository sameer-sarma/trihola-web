// src/pages/PhoneOtpLogin.tsx

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
//import { supabase } from "../supabaseClient";

const PhoneOtpLogin: React.FC = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"send" | "verify">("send");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
const navigate = useNavigate();

const handleSendOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setMessage(null);

  try {
    const response = await axios.post(`${__API_BASE__}/login/send-otp`, { phone });

    if (response.status === 200) {
      setStep("verify");
      setMessage("OTP sent successfully.");
    } else {
      setError("Unexpected response. Please try again.");
    }
  } catch (err: any) {
    console.error("OTP send error:", err);

    const status = err.response?.status;

    if (status === 401) {
      setMessage("Phone not registered, please register!");
      console.log("Phone not registered");

      setTimeout(() => {
        console.log("Navigating to /register");
        navigate("/register");
      }, 2000);
    } else {
      setError(err.response?.data || "Error sending OTP");
    }
  }
};

const handleVerifyOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setMessage(null);

  try {
    const response = await axios.post(`${__API_BASE__}/login/verify-otp`, {
      phone,
      otp,
    });

    if (
      response.status === 200 &&
      response.data.userId
    ) {
      setMessage("✅ Logged in with phone ###PLACEHOLDER.");

      // Store the session in Supabase Auth
      console.log(response.data)

    } else {
      setError("OTP verification failed.");
    }
  } catch (err: any) {
    console.error(err);
    setError(err.response?.data || "Error verifying OTP");
  }
};

  return (
    <div>
      <h3>Login with Phone</h3>
      {step === "send" ? (
        <form onSubmit={handleSendOtp}>
          <label>Phone Number (+CountryCode...):</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            required
          />
          <button type="submit">Send OTP</button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <label>Enter OTP:</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <button type="submit">Verify OTP</button>
        </form>
      )}
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default PhoneOtpLogin;
