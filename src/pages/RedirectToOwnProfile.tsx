// src/pages/RedirectToOwnProfile.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getOwnProfile } from "../services/profileService";

const PROFILE_SLUG_KEY = "profileSlug";

const RedirectToOwnProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const goto = (slug: string) => {
      if (!slug) {
        navigate("/email-login", { replace: true });
        return;
      }
      const target = `/profile/${slug}`;
      if (location.pathname !== target) {
        sessionStorage.setItem(PROFILE_SLUG_KEY, slug);
        navigate(target, { replace: true });
      }
    };

    const run = async () => {
      // If already at /profile/:slug, cache & stop
      const match = location.pathname.match(/^\/profile\/([^/]+)$/);
      if (match?.[1]) {
        const existing = sessionStorage.getItem(PROFILE_SLUG_KEY);
        if (existing !== match[1]) sessionStorage.setItem(PROFILE_SLUG_KEY, match[1]);
        return;
      }

      // 1) state.slug
      const slugFromState = (location.state as { slug?: string } | null)?.slug;
      if (slugFromState) { goto(slugFromState); return; }

      // 2) cached slug
      const cached = sessionStorage.getItem(PROFILE_SLUG_KEY);
      if (cached) { goto(cached); return; }

      // 3) fetch once
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { navigate("/email-login", { replace: true }); return; }
        const me = await getOwnProfile(token);
        if (!cancelled) goto(me?.slug ?? "");
      } catch (e: any) {
        if (!cancelled && e?.name !== "AbortError") {
          console.error("RedirectToOwnProfile error:", e);
          navigate("/email-login", { replace: true });
        }
      }
    };

    // fire & forget
    void run();

    return () => { cancelled = true; };
    // 👇 key changes on same-path navigations, so logic re-runs
  }, [location.key, location.pathname, location.state, navigate]);

  return (
    <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)" }}>
      Redirecting to your profile…
    </p>
  );
};

export default RedirectToOwnProfile;
