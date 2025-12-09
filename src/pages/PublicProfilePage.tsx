import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getProfileBySlug } from "../services/profileService";
import ProfileView from "../components/ProfileView";

const API_BASE = import.meta.env.VITE_API_BASE as string;
const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET as string;

interface PublicProfile {
  userId: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  profileImageUrl: string | null; // may be a full URL or a storage path
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
    businessSlug?: string;
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

  // Derive a displayable image URL:
  // - If DB stored a full URL (http/https), use it.
  // - If DB stored a storage path, derive a public URL from the bucket.
  const displayProfile = useMemo(() => {
    if (!profile) return null;

    let displayUrl: string | null = null;
    const raw = profile.profileImageUrl;

    if (raw) {
      if (/^https?:\/\//i.test(raw)) {
        // already a full URL (public/signed)
        displayUrl = raw;
      } else {
        // treat as storage path and resolve a public URL
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw);
        displayUrl = data?.publicUrl ?? null;
      }
    }

    return { ...profile, profileImageUrl: displayUrl };
  }, [profile]);

  if (loading) return <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)" }}>Loading profile...</p>;
  if (!displayProfile) return <p style={{ textAlign: "center", marginTop: 24, color: "var(--danger)" }}>Profile not found.</p>;

  const isOwnProfile = displayProfile.userId === userIdFromToken;
    
  const handleAddContact = !isOwnProfile && !displayProfile.isContact
    ? async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) return;
          if (!displayProfile.slug) {
            console.warn("❗ Cannot add contact — slug is missing");
            return;
          }
          await fetch(`${API_BASE}/contacts/add/byUserSlug`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ contactSlug: displayProfile.slug }),
          });

          setProfile(prev => (prev ? { ...prev, isContact: true } : prev));
        } catch (err) {
          console.error("Failed to add contact", err);
        }
      }
    : undefined;

return (
  <div className="th-page">
    <div className="card">
      <ProfileView
        profile={displayProfile}
        businessProfile={displayProfile.businessProfile || undefined}
        isOwnProfile={isOwnProfile}
        onAddContactClick={handleAddContact}
      />

      {isOwnProfile && (
        <div className="actions">
          <button onClick={handleEditClick} className="btn btn--primary">
            Edit Profile
          </button>
        </div>
      )}
    </div>
  </div>
);
};

export default PublicProfilePage;
