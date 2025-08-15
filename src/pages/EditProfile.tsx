import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePictureUploader from "../components/ProfilePictureUploader";
import BusinessProfileForm from "../components/BusinessProfileForm";
import { unregisterBusiness } from "../services/businessService";
import "../css/EditProfile.css";

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
    registeredAsBusiness?: boolean;
  };
  userId: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (url: string) => void; // currently URL; later we can switch to path
  loading?: boolean;
}

const EditProfile: React.FC<Props> = ({
  profile,
  userId,
  onChange,
  onSubmit,
  onImageUpload,
  loading
}) => {
  const [isBusiness, setIsBusiness] = useState<boolean>(!!profile.registeredAsBusiness);
  const [showBusinessForm, setShowBusinessForm] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsBusiness(!!profile.registeredAsBusiness);
  }, [profile.registeredAsBusiness]);

  const handleUnregister = async () => {
    if (confirm("Are you sure you want to unregister as a business?")) {
      await unregisterBusiness();
      setIsBusiness(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
    navigate(`/profile/${profile.slug}`);
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
                <img
                  src={profile.profileImageUrl}
                  alt="Profile"
                  className="avatar-img"
                />
              ) : (
                <div className="avatar-placeholder">No Image</div>
              )}
            </div>
            <ProfilePictureUploader userId={userId} onUploadComplete={onImageUpload} />
          </div>

          <form onSubmit={handleSubmit} className="form-grid">
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
                <button
                  className="secondary-btn"
                  onClick={() => setShowBusinessForm(true)}
                >
                  Register as a Business
                </button>
              ) : (
                <div className="form-wrap">
                  <BusinessProfileForm />
                </div>
              )}
            </>
          ) : (
            <div className="form-wrap">
              <BusinessProfileForm />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default EditProfile;
