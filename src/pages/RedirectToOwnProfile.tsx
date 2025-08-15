import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getOwnProfile } from "../services/profileService";

type LocationState = { slug?: string } | null;

const RedirectToOwnProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || null;

  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const slugFromState = state?.slug;
    const slugFromStorage = sessionStorage.getItem("profileSlug");

    // 1) Fast path: state slug
    if (slugFromState) {
      if (slugFromStorage !== slugFromState) {
        sessionStorage.setItem("profileSlug", slugFromState);
      }
      navigate(`/profile/${slugFromState}`, { replace: true });
      return;
    }

    // 2) Fast path: cached slug
    if (slugFromStorage) {
      navigate(`/profile/${slugFromStorage}`, { replace: true });
      return;
    }

    // 3) Fallback: fetch once
    const ctrl = new AbortController();
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          navigate("/email-login", { replace: true });
          return;
        }
        const me = await getOwnProfile(token); // should return { slug: string }
        const mySlug = me?.slug;
        if (mySlug) {
          sessionStorage.setItem("profileSlug", mySlug);
          navigate(`/profile/${mySlug}`, { replace: true });
        } else {
          navigate("/email-login", { replace: true });
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("RedirectToOwnProfile error:", e);
        }
        navigate("/email-login", { replace: true });
      }
    })();

    return () => ctrl.abort();
  }, [navigate, state]);

  // Optional tiny placeholder; won't be visible long
  return <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)" }}>
    Redirecting to your profile…
  </p>;
};

export default RedirectToOwnProfile;
