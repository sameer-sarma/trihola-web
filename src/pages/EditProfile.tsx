import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePictureUploader from "../components/ProfilePictureUploader";
import BusinessProfileForm from "../components/BusinessProfileForm";
import {unregisterBusiness } from "../services/businessService";
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
  onImageUpload: (url: string) => void;
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
  const [isBusiness, setIsBusiness] = useState(profile.registeredAsBusiness);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    setIsBusiness(profile.registeredAsBusiness);
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
    <div className="profile-container">
      <h3>Edit Your Profile</h3>

{profile.profileImageUrl && (
  <div className="profile-image-container">
    <img
      src={profile.profileImageUrl}
      alt="Profile"
      className="profile-image-preview"
    />
  </div>
)}

      <ProfilePictureUploader userId={userId} onUploadComplete={onImageUpload} />

      <form onSubmit={handleSubmit} style={{ marginTop: "1em" }}>
        <div className="form-group">
          <label>First Name:</label>
          <input name="firstName" value={profile.firstName} onChange={onChange} required />
        </div>
        <div className="form-group">
          <label>Last Name:</label>
          <input name="lastName" value={profile.lastName} onChange={onChange} required />
        </div>
        <div className="form-group">
          <label>Address:</label>
          <input name="address" value={profile.address} onChange={onChange} />
        </div>
        <div className="form-group">
          <label>Bio:</label>
          <textarea name="bio" value={profile.bio} onChange={onChange} rows={3} />
        </div>
        <div className="form-group">
          <label>Location:</label>
          <input name="location" value={profile.location || ""} onChange={onChange} />
        </div>
        <div className="form-group">
          <label>Profession:</label>
          <input name="profession" value={profile.profession || ""} onChange={onChange} />
        </div>
        <div className="form-group">
          <label>Birthday:</label>
          <input type="date" name="birthday" value={profile.birthday || ""} onChange={onChange} />
        </div>
        <div className="form-group">
          <label>LinkedIn URL:</label>
          <input type="url" name="linkedinUrl" value={profile.linkedinUrl || ""} onChange={onChange} />
        </div>

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="business-section">
        {!isBusiness ? (
          <button className="secondary-btn" onClick={() => setShowBusinessForm(true)}>
            Register as a Business
          </button>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>Business Profile</h4>
              <button className="danger-btn" onClick={handleUnregister}>
                Unregister as Business
              </button>
            </div>
            <BusinessProfileForm />
          </>
        )}

        {showBusinessForm && !isBusiness && (
          <div style={{ marginTop: "1em" }}>
            <BusinessProfileForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProfile;
