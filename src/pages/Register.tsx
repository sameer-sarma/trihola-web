import { useState } from "react"
import axios from "axios"
import { supabase } from '../supabaseClient'
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const navigate = useNavigate();


  const handleRegister = async () => {
    try {
      const res = await axios.post(`${__API_BASE__}/register`, { email, password, phone })

      switch (res.data.status) {
        case "await_email_verification":
          await supabase.auth.signInWithOtp({ email }); // ✅ triggers email
          setMessage("Check your email for verification link.")
          break
        case "redirect_login":
          setMessage("You already have an account. Please login using your email and password")
          navigate("/email-login");
            break
        case "update_credentials":
          setMessage("Phone exists. Please set your email/password.")
          break
        default:
          setMessage(res.data.message || "Unexpected response")
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Registration failed")
    }
  }

  return (
    <div className="form">
      <h2>Register</h2>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone with countryCode +91XXXXXXXXXX" />
      <button onClick={handleRegister}>Register</button>
      <p>{message}</p>
    </div>
  )
}

