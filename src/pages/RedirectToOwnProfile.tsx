// RedirectToOwnProfile.tsx
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

  // ✅ Prefer slug from state or sessionStorage (set by App after initial /profile)
  const slugFromState = state?.slug;
  const slugFromStorage = sessionStorage.getItem("profileSlug");

  useEffect(() => {
    if (slugFromState) {
      navigate(`/profile/${slugFromState}`, { replace: true });
      return;
    }
    if (slugFromStorage) {
      navigate(`/profile/${slugFromStorage}`, { replace: true });
      return;
    }
    if (ranOnce.current) return;
    ranOnce.current = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const profile = await getOwnProfile(session.access_token); // falls back only when needed
      if (profile?.slug) {
        sessionStorage.setItem("profileSlug", profile.slug);
        navigate(`/profile/${profile.slug}`, { replace: true });
      }
    })();
  }, [navigate, slugFromState, slugFromStorage]);

  return <p className="text-center mt-6 text-gray-600">Redirecting to your profile...</p>;
};

export default RedirectToOwnProfile;
