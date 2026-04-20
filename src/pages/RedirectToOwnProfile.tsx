// src/pages/RedirectToOwnProfile.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getOwnProfile } from "../services/profileService";

const RedirectToOwnProfile: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          navigate("/email-login", { replace: true });
          return;
        }

        const me = await getOwnProfile(token);
        const slug = me?.slug?.trim();

        if (!slug) {
          // If user profile not ready yet, send them to edit to complete it
          navigate("/profile/edit", { replace: true });
          return;
        }

        if (!cancelled) {
          navigate(`/profile/${slug}`, { replace: true });
        }
      } catch (e) {
        console.error("RedirectToOwnProfile error:", e);
        if (!cancelled) navigate("/email-login", { replace: true });
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)" }}>
      Redirecting to your profile…
    </p>
  );
};

export default RedirectToOwnProfile;
