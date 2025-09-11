// src/pages/EditProfile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePictureUploader from "../components/ProfilePictureUploader";
import BusinessProfileForm from "../components/BusinessProfileForm";
import { unregisterBusiness } from "../services/businessService";
import VerifyPhoneInline from "../components/VerifyPhoneInline";

interface Props {
  profile: {
    slug: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    profileImageUrl?: string;
    bio?: string;
    location?: string;
    profession?: string;
    birthday?: string;
    linkedinUrl?: string;
    phone: string | null;
    phoneVerified?: boolean;
    registeredAsBusiness?: boolean;
  };
  userId: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (url: string) => void;
  loading?: boolean;
  onProfileRefresh?: () => Promise<void> | void;   // ✅ NEW
}

const EditProfile: React.FC<Props> = ({
  profile,
  userId,
  onChange,
  onSubmit,
  onImageUpload,
  loading,
  onProfileRefresh,                                   // ✅ NEW
}) => {
  const [isBusiness, setIsBusiness] = useState<boolean>(!!profile.registeredAsBusiness);
  const [showBusinessForm, setShowBusinessForm] = useState<boolean>(false);

  // Local mirror so the banner hides immediately
  const [phoneVerifiedLocal, setPhoneVerifiedLocal] = useState<boolean>(profile.phoneVerified ?? false);

  const navigate = useNavigate();

  useEffect(() => {
    setIsBusiness(!!profile.registeredAsBusiness);
  }, [profile.registeredAsBusiness]);

  useEffect(() => {
    setPhoneVerifiedLocal(profile.phoneVerified ?? false);
  }, [profile.phoneVerified]);

  const handleUnregister = async () => {
    if (confirm("Are you sure you want to unregister as a business?")) {
      await unregisterBusiness();
      setIsBusiness(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => { 
  e.preventDefault(); await onSubmit(e); 
  const slug = profile.slug?.trim();
  navigate(slug ? `/profile/${slug}` : "/profile", { replace: true });
};

  return (
    <div className="container">
      <div className="edit-grid">
        {/* Left: Personal profile */}
        <section className="card personal-card">
          <header className="card-header">
            <h3 className="card-title">Personal Profile</h3>
          </header>

          <div className="avatar-block">
            <div className="avatar-preview">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="Profile" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">No Image</div>
              )}
            </div>
            <ProfilePictureUploader userId={userId} onUploadComplete={onImageUpload} />
          </div>

          {/* Phone verification banner */}
          {profile.phone && !phoneVerifiedLocal && (
            <section className="card soft mt-3">
              <header className="card-header compact">
                <h4 className="card-title">Phone verification</h4>
              </header>
              <p className="info-text" style={{ marginTop: 4 }}>
                Your phone <strong>{profile.phone}</strong> isn’t verified. Verify to enable referrals & messaging.
              </p>
              <VerifyPhoneInline
                onVerified={async () => {
                  setPhoneVerifiedLocal(true);           // instant UI update
                  await onProfileRefresh?.();            // ✅ ask parent to refetch profile
                }}
              />
            </section>
          )}

          <form onSubmit={handleSubmit} className="form-grid">
            {/* ... (rest unchanged) ... */}
            <div className="form-group">
              <label>First Name</label>
              <input name="firstName" value={profile.firstName || ""} onChange={onChange} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="lastName" value={profile.lastName || ""} onChange={onChange} required />
            </div>
            <div className="form-group span-2">
              <label>Address</label>
              <input name="address" value={profile.address || ""} onChange={onChange} />
            </div>
            <div className="form-group span-2">
              <label>Bio</label>
              <textarea name="bio" value={profile.bio || ""} onChange={onChange} rows={4} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input name="location" value={profile.location || ""} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>Profession</label>
              <input name="profession" value={profile.profession || ""} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>Birthday</label>
              <input type="date" name="birthday" value={profile.birthday || ""} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={profile.linkedinUrl || ""} onChange={onChange} />
            </div>

            <div className="actions span-2">
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </section>

        {/* Right: Business profile */}
        <aside className="card business-card">
          <header className="card-header">
            <h3 className="card-title">Business Profile</h3>
            {isBusiness && (
              <button className="danger-btn tiny" onClick={handleUnregister}>
                Unregister
              </button>
            )}
          </header>

          {!isBusiness ? (
            <>
              {!showBusinessForm ? (
                <button className="secondary-btn" onClick={() => setShowBusinessForm(true)}>
                  Register as a Business
                </button>
              ) : (
                <div className="form-wrap">
                  <BusinessProfileForm
                      onSuccess={async () => {
                        await onProfileRefresh?.();                 // refresh App-level profile
                        navigate("/profile", { replace: true }); // go to templates
                      }}
                      onUnregistered={async () => {
                        await onProfileRefresh?.();
                        navigate("/profile", { replace: true });
                      }}
                    />
                  </div>
              )}
            </>
          ) : (
            <div className="form-wrap">
              <BusinessProfileForm
                onSuccess={async () => {
                  await onProfileRefresh?.();                 // refresh App-level profile
                  navigate("/profile", { replace: true }); // go to templates
                }}
                onUnregistered={async () => {
                  await onProfileRefresh?.();
                  navigate("/profile", { replace: true });
                }}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default EditProfile;
