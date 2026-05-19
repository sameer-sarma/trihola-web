import { authFetch } from "../utils/auth";

export const sendOtp = async () => {
  try {
    const response = await authFetch(`${__API_BASE__}/auth/send-otp`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const text = await response.text();

    return {
      success: response.ok,
      message: text || (response.ok ? "OTP sent successfully." : "Failed to send OTP."),
    };
  } catch (err: any) {
    console.error("❌ Error sending OTP:", err);
    return {
      success: false,
      message: err?.message || "Failed to send OTP.",
    };
  }
};

export const verifyOtp = async (otp: string) => {
  try {
    const response = await authFetch(`${__API_BASE__}/auth/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ otp }),
    });

    const text = await response.text();

    return {
      success: response.ok,
      message: text || (response.ok ? "OTP verified successfully." : "Failed to verify OTP."),
    };
  } catch (err: any) {
    console.error("❌ Error verifying OTP:", err);
    return {
      success: false,
      message: err?.message || "Failed to verify OTP.",
    };
  }
};