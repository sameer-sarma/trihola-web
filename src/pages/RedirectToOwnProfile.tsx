import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getOwnProfile } from "../services/profileService"; // You’ll need to implement this

const RedirectToOwnProfile: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToSlug = async () => {
      console.log("directing to own profile");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      console.log("token: ", session.access_token);
      const profile = await getOwnProfile(session.access_token);
      console.log("slug: ", profile.slug);
      if (profile?.slug) {
        navigate(`/profile/${profile.slug}`, { replace: true });
      }
    };

    redirectToSlug();
  }, [navigate]);

  return <p className="text-center mt-6 text-gray-600">Redirecting to your profile...</p>;
};

export default RedirectToOwnProfile;
