import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getProfileBySlug } from "../services/profileService";
import ProfileView from "../components/ProfileView";

interface PublicProfile {
  userId: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  location?: string;
  profession?: string;
  birthday?: string;
  linkedinUrl?: string;
  phone: string | null;
  email: string | null;
  registeredAsBusiness?: boolean;
  businessProfile?: {
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
  } | null;
  isContact?: boolean;
}

const PublicProfilePage: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [userIdFromToken, setUserIdFromToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id;

      if (!token || !slug) {
        setLoading(false);
        return;
      }

      try {
        const fetchedProfile = await getProfileBySlug(slug, token); // calls `/profile/full/{slug}`
        console.log("Fetched profile:", fetchedProfile);
        setProfile(fetchedProfile);
        setUserIdFromToken(userId ?? null);
      } catch (error) {
        console.error("❌ Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [slug]);

  const handleEditClick = () => {
    if (slug) navigate(`/profile/edit`);
  };

  if (loading) return <p className="text-center mt-6 text-gray-500">Loading profile...</p>;
  if (!profile) return <p className="text-center mt-6 text-red-500">Profile not found.</p>;

  const isOwnProfile = profile.userId === userIdFromToken;

return (
  <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md">
<ProfileView
  profile={profile}
  businessProfile={profile.businessProfile || undefined}
  isOwnProfile={isOwnProfile}
  onAddContactClick={!isOwnProfile && !profile.isContact ? async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      if (!profile.slug) {
        console.warn("❗ Cannot add contact — slug is missing");
        return;
      }
      await fetch(`${__API_BASE__}/contacts/add/byUserSlug`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contactSlug: profile.slug }),
      });

      setProfile({ ...profile, isContact: true });
    } catch (err) {
      console.error("Failed to add contact", err);
    }
  } : undefined}
/>

    {isOwnProfile && (
      <div className="flex justify-end mt-6">
        <button onClick={handleEditClick} className="primary-btn">
          Edit Profile
        </button>
      </div>
    )}
  </div>
);
};

export default PublicProfilePage;
