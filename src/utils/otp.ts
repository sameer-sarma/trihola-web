import { authFetch, saveOtpSession } from "../utils/auth";

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

export const sendLoginOtp = async (phone: string) => {
  try {
    const response = await fetch(`${__API_BASE__}/login/send-otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });

    const text = await response.text();

    return {
      success: response.ok,
      message: text || (response.ok ? "OTP sent successfully." : "Failed to send OTP."),
    };
  } catch (err: any) {
    console.error("❌ Error sending login OTP:", err);
    return {
      success: false,
      message: err?.message || "Failed to send OTP.",
    };
  }
};

export const verifyLoginOtp = async (phone: string, otp: string) => {
  try {
    const response = await fetch(`${__API_BASE__}/login/verify-otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, otp }),
    });

    const text = await response.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (response.ok && data?.token) {
      saveOtpSession({
        token: data.token,
        userId: data.userId ?? null,
        authMode: data.authMode ?? "PHONE_OTP",
      });
    }

    return {
      success: response.ok,
      message:
        data?.message ||
        text ||
        (response.ok ? "OTP verified successfully." : "Failed to verify OTP."),
      token: data?.token ?? null,
      userId: data?.userId ?? null,
      authMode: data?.authMode ?? null,
      requiresRegistration: Boolean(data?.requiresRegistration),
      profile: data?.profile ?? null,
    };
  } catch (err: any) {
    console.error("❌ Error verifying login OTP:", err);
    return {
      success: false,
      message: err?.message || "Failed to verify OTP.",
      token: null,
      userId: null,
      authMode: null,
      requiresRegistration: false,
      profile: null,
    };
  }
};

export const sendEmailLoginOtp = async (email: string) => {
  try {
    const response = await fetch(`${__API_BASE__}/login/email/send-otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const text = await response.text();

    return {
      success: response.ok,
      message:
        text ||
        (response.ok
          ? "OTP sent successfully."
          : "Failed to send OTP."),
    };
  } catch (err: any) {
    console.error("❌ Error sending email login OTP:", err);

    return {
      success: false,
      message: err?.message || "Failed to send OTP.",
    };
  }
};

export const verifyEmailLoginOtp = async (
  email: string,
  otp: string
) => {
  try {
    const response = await fetch(`${__API_BASE__}/login/email/verify-otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (response.ok && data?.token) {
      saveOtpSession({
        token: data.token,
        userId: data.userId ?? null,
        authMode: data.authMode ?? "EMAIL_OTP",
      });
    }

    return {
      success: response.ok,
      message:
        data?.message ||
        text ||
        (response.ok
          ? "OTP verified successfully."
          : "Failed to verify OTP."),
      token: data?.token ?? null,
      userId: data?.userId ?? null,
      authMode: data?.authMode ?? null,
      requiresRegistration: Boolean(data?.requiresRegistration),
      profile: data?.profile ?? null,
    };
  } catch (err: any) {
    console.error("❌ Error verifying email login OTP:", err);

    return {
      success: false,
      message: err?.message || "Failed to verify OTP.",
      token: null,
      userId: null,
      authMode: null,
      requiresRegistration: false,
      profile: null,
    };
  }
};