import { useMemo, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

type MessageTone = "success" | "error" | "info";

function isSafeInternalPath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function normalizeNext(p?: string | null) {
  if (!p || p === "/" || p === "/app") return null;
  return p;
}

// Ktor message codes (keep in sync with your AuthRoutes)
const RegisterMsg = {
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_INPUT: "INVALID_INPUT",
  USER_ALREADY_REGISTERED: "USER_ALREADY_REGISTERED",
  ACCOUNT_CREATED_VERIFY_EMAIL: "ACCOUNT_CREATED_VERIFY_EMAIL",
  PHONE_LINKED_TO_OTHER_EMAIL: "PHONE_LINKED_TO_OTHER_EMAIL",
  DUPLICATE_USER_ANONYMIZE_FAILED: "DUPLICATE_USER_ANONYMIZE_FAILED",
  UNHANDLED_SCENARIO: "UNHANDLED_SCENARIO",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

function friendlyMessageFromCode(code?: string, fallback?: string) {
  switch (code) {
    case RegisterMsg.INVALID_PHONE:
      return "Please enter a valid phone number (preferably with country code, e.g. +91XXXXXXXXXX).";
    case RegisterMsg.INVALID_INPUT:
      return "Please check your email, password (min 6 chars) and phone number.";
    case RegisterMsg.USER_ALREADY_REGISTERED:
      return "You already have an account. Please log in.";
    case RegisterMsg.ACCOUNT_CREATED_VERIFY_EMAIL:
      return "Account created. Please verify your email to continue.";
    case RegisterMsg.PHONE_LINKED_TO_OTHER_EMAIL:
      return "This phone number is already linked to another account/email.";
    case RegisterMsg.DUPLICATE_USER_ANONYMIZE_FAILED:
      return "We couldn’t complete registration due to an internal conflict. Please contact support.";
    case RegisterMsg.UNHANDLED_SCENARIO:
      return "Unexpected registration scenario. Please try again.";
    case RegisterMsg.SERVER_ERROR:
      return "Something went wrong on the server. Please try again.";
    default:
      return fallback || "Registration failed.";
  }
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const decodedNext = rawNext ? decodeURIComponent(rawNext) : null;

  const safeNext = useMemo(() => {
    const n = normalizeNext(decodedNext);
    if (!isSafeInternalPath(n)) return "/start";
    if (n!.startsWith("/register")) return "/start";
    return n!;
  }, [decodedNext]);

  const loginHref = useMemo(() => {
    const n = normalizeNext(safeNext);
    if (!n) return "/email-login";
    return `/email-login?next=${encodeURIComponent(n)}`;
  }, [safeNext]);

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");
    setTone("info");

    try {
      const res = await axios.post(`${__API_BASE__}/register`, {
        email,
        password,
        phone,
      });

      const status: string = res?.data?.status ?? "";
      const msgCode: string = res?.data?.message ?? "";

      /**
       * Prefer `status` (your current contract), but allow `message` codes to drive redirects too.
       */
      const effective = status || msgCode;

      // ✅ 1) Await email verification flow
      if (
        effective === "await_email_verification" ||
        msgCode === RegisterMsg.ACCOUNT_CREATED_VERIFY_EMAIL
      ) {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}${loginHref}`,
          },
        });

        setTone("success");
        setMessage(`Account created. Please check ${email} for your verification link.`);
        return;
      }

      // ✅ 2) Existing user → login
      if (
        effective === "redirect_login" ||
        msgCode === RegisterMsg.USER_ALREADY_REGISTERED
      ) {
        setTone("info");
        setMessage("You already have an account. Please log in.");
        navigate(loginHref, { replace: true });
        return;
      }

      // ✅ 3) Phone exists but needs completing credentials (if you use this state)
      if (effective === "update_credentials") {
        // If you later add a "complete profile" page, redirect here.
        // For now we keep the user on the page with guidance.
        setTone("info");
        setMessage("Phone exists. Please set your email/password.");
        return;
      }

      // ✅ 4) Any remaining responses: treat `message` as code first
      if (status === "error") {
        setTone("error");
        setMessage(friendlyMessageFromCode(msgCode, msgCode || "Registration failed."));
        return;
      }

      // Default: show whatever backend says
      setTone("info");
      setMessage(
        friendlyMessageFromCode(
          msgCode,
          res?.data?.message || "Unexpected response."
        )
      );
    } catch (err: any) {
      const codeOrMessage = err?.response?.data?.message; // could be code string
      const status = err?.response?.data?.status;

      setTone("error");
      setMessage(
        friendlyMessageFromCode(
          codeOrMessage,
          status === "error" ? "Registration failed." : "Registration failed."
        )
      );

      // Optional: if backend explicitly tells redirect_login even on error
      if (status === "redirect_login" || codeOrMessage === RegisterMsg.USER_ALREADY_REGISTERED) {
        navigate(loginHref, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const alertClass =
    tone === "success"
      ? "alert alert--success"
      : tone === "error"
      ? "alert alert--danger"
      : "alert alert--info";

  return (
    <div className="th-page auth-page">
      <div className="auth-layout">
        <div className="card card--narrow">
          <h2 className="card-title">Create your account</h2>

          <form className="th-form" onSubmit={handleRegister}>
            <div className="th-field">
              <label htmlFor="reg-email" className="th-label">
                Email
              </label>
              <input
                id="reg-email"
                className="th-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                disabled={loading}
              />
            </div>

            <div className="th-field">
              <label htmlFor="reg-password" className="th-label">
                Password
              </label>
              <input
                id="reg-password"
                className="th-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                required
                disabled={loading}
              />
            </div>

            <div className="th-field">
              <label htmlFor="reg-phone" className="th-label">
                Phone (with country code)
              </label>
              <input
                id="reg-phone"
                className="th-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                required
                disabled={loading}
              />
            </div>

            <div className="th-field">
              <button className="btn btn--primary btn--block" disabled={loading}>
                {loading ? "Creating…" : "Register"}
              </button>
            </div>

            <div className="form-help">
              Already have an account?{" "}
              <Link to={loginHref} className="th-link">
                Login
              </Link>
            </div>
          </form>

          {message && (
            <div className={alertClass} style={{ marginTop: 8 }}>
              {message}
            </div>
          )}
        </div>

        <aside className="auth-aside">
          <div className="auth-eyebrow">Why TriHola</div>
          <h3 className="auth-title">Built for users, referrers, and businesses</h3>
          <p className="auth-sub">
            Turn word-of-mouth into measurable growth with reward management and secure, trackable
            threads.
          </p>
          <ul className="auth-bullets">
            <li>
              <span className="tick">✔</span>
              <strong>Users</strong> — every referral counts; organize offers & claims.
            </li>
            <li>
              <span className="tick">✔</span>
              <strong>Referrers</strong> — earn transparent rewards with simple tracking.
            </li>
            <li>
              <span className="tick">✔</span>
              <strong>Businesses</strong> — convert happy customers into a sales channel.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
