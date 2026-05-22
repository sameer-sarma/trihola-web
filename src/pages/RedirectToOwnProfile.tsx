// src/pages/RedirectToOwnProfile.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getOwnProfile } from "../services/profileService";
import { getTriholaAuthSession } from "../utils/auth";

const RedirectToOwnProfile: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const auth = await getTriholaAuthSession();
        const token = auth.accessToken;

        if (!token) {
          navigate("/email-login", { replace: true });
          return;
        }

        const me = await getOwnProfile(token);
        const slug = me?.slug?.trim();

        if (!slug) {
          if (auth.authMode === "PHONE_OTP") {
            navigate("/threads", { replace: true });
            return;
          }

          navigate("/profile/edit", { replace: true });
          return;
        }

        if (!cancelled) {
          navigate(`/profile/${slug}`, { replace: true });
        }
      } catch (e) {
        console.error("RedirectToOwnProfile error:", e);

        if (!cancelled) {
          navigate("/threads", { replace: true });
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)" }}>
      Redirecting to your profile…
    </p>
  );
};

export default RedirectToOwnProfile;