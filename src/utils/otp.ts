import axios from "axios"

export const sendOtp = async (phone: string) => {
  try {
    const response = await axios.post("http://127.0.0.1:8080/send-otp", { phone })
    return {
      success: response.status === 200,
      message: "OTP sent successfully.",
    }
  } catch (err: any) {
    console.error("❌ Error sending OTP:", err)
    return {
      success: false,
      message: err.response?.data || "Failed to send OTP.",
    }
  }
}

export const verifyOtp = async (phone: string, otp: string) => {
  try {
    const response = await axios.post("http://127.0.0.1:8080/verify-otp", {
      phone,
      otp,
    })

    return {
      success: response.status === 200 && response.data === "OTP verified successfully",
      message: response.data || "OTP verified.",
    }
  } catch (err: any) {
    console.error("❌ Error verifying OTP:", err)
    return {
      success: false,
      message: err.response?.data || "Failed to verify OTP.",
    }
  }
}
