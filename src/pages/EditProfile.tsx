import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ProfilePictureUploader from "../components/ProfilePictureUploader";
import VerifyPhoneInline from "../components/VerifyPhoneInline";
import ImageLightbox from "../components/ImageLightbox";

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
  };
  userId: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  onImageUpload: (url: string) => void;
  loading?: boolean;
  onProfileRefresh?: () => Promise<void> | void;
}

const EditProfile: React.FC<Props> = ({
  profile,
  userId,
  onChange,
  onSubmit,
  onImageUpload,
  loading,
  onProfileRefresh,
}) => {
  const navigate = useNavigate();
  const MAX_BIO = 1000;
  
  const [imgOpen, setImgOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgAlt, setImgAlt] = useState<string>("");

  const [phoneVerifiedLocal, setPhoneVerifiedLocal] = useState<boolean | null>(null);
  const phoneVerifiedEffective = phoneVerifiedLocal ?? (profile.phoneVerified ?? false);

  const [isDirty, setIsDirty] = useState(false);

  const initialSnapshot = useMemo(() => {
    return JSON.stringify({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      address: profile.address ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      profession: profile.profession ?? "",
      birthday: profile.birthday ?? "",
      linkedinUrl: profile.linkedinUrl ?? "",
      profileImageUrl: profile.profileImageUrl ?? "",
      phone: profile.phone ?? "",
      phoneVerified: profile.phoneVerified ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.slug]);

  useEffect(() => {
    const currentSnapshot = JSON.stringify({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      address: profile.address ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      profession: profile.profession ?? "",
      birthday: profile.birthday ?? "",
      linkedinUrl: profile.linkedinUrl ?? "",
      profileImageUrl: profile.profileImageUrl ?? "",
      phone: profile.phone ?? "",
      phoneVerified: profile.phoneVerified ?? false,
    });

    setIsDirty(currentSnapshot !== initialSnapshot);
  }, [profile, initialSnapshot]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleCancel = () => {
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Discard them and leave?");
      if (!ok) return;
    }
    navigate(`/profile/${profile.slug}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
    await onProfileRefresh?.();
    navigate(`/profile/${profile.slug}`);
  };

  const handleChangeWrapped = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e);
    setIsDirty(true);
  };

  const openProfileImage = () => {
    if (!profile.profileImageUrl) return;
    setImgSrc(profile.profileImageUrl);
    setImgAlt("Profile photo");
    setImgOpen(true);
  };

  return (
    <div className="th-form-page">
      <div className="form-card">
        <div className="th-form-header">
          <div className="th-form-header__main">
            <h1 className="th-form-title">Personal Profile</h1>
            <p className="th-form-subtitle">
              Keep your details updated so referrals and offers work smoothly.
            </p>
          </div>
        </div>

        <div className="th-section" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "84px minmax(0, 1fr)",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profile.profileImageUrl ? (
                <button
                  type="button"
                  onClick={openProfileImage}
                  aria-label="View profile photo"
                  title="View profile photo"
                  style={{
                    width: "100%",
                    height: "100%",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "zoom-in",
                  }}
                >
                  <img
                    src={profile.profileImageUrl}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
                  No Photo
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="th-section-title" style={{ marginBottom: 4 }}>
                Profile picture
              </div>
              <div className="th-section-subtitle" style={{ marginBottom: 10 }}>
                Upload a clear photo — it builds trust across referrals.
              </div>
              <ProfilePictureUploader userId={userId} onUploadComplete={onImageUpload} />
            </div>
          </div>
        </div>

        {profile.phone && !phoneVerifiedEffective && (
          <div className="th-section th-section--accent" style={{ marginBottom: 16 }}>
            <div className="th-section-header" style={{ marginBottom: 10 }}>
              <div>
                <h2 className="th-section-title">Phone verification required</h2>
                <p className="th-section-subtitle">
                  Your phone <strong>{profile.phone}</strong> isn’t verified yet.
                </p>
              </div>
            </div>

            <VerifyPhoneInline
              onVerified={async () => {
                setPhoneVerifiedLocal(true);
                await onProfileRefresh?.();
              }}
            />

            <div className="th-help" style={{ marginTop: 10 }}>
              SMS delivery enforcement is not enabled yet — you may enter any OTP for now.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="th-form">
          <div className="th-form-row th-form-row--2">
            <div className="th-field">
              <label className="th-label" htmlFor="firstName">
                First Name
              </label>
              <input
                id="firstName"
                className="th-input"
                name="firstName"
                value={profile.firstName || ""}
                onChange={handleChangeWrapped}
                required
              />
            </div>

            <div className="th-field">
              <label className="th-label" htmlFor="lastName">
                Last Name
              </label>
              <input
                id="lastName"
                className="th-input"
                name="lastName"
                value={profile.lastName || ""}
                onChange={handleChangeWrapped}
                required
              />
            </div>
          </div>

          <div className="th-field">
            <label className="th-label" htmlFor="address">
              Address
            </label>
            <input
              id="address"
              className="th-input"
              name="address"
              value={profile.address || ""}
              onChange={handleChangeWrapped}
            />
          </div>

          <div className="th-field">
            <label className="th-label" htmlFor="bio">
              Bio
              <span style={{ float: "right", fontSize: 12, color: "#888" }}>
                {(profile.bio?.length ?? 0)}/{MAX_BIO}
              </span>
            </label>

            <textarea
              id="bio"
              className="th-textarea"
              name="bio"
              value={profile.bio || ""}
              onChange={(e) => {
                if (e.target.value.length <= MAX_BIO) {
                  handleChangeWrapped(e);
                }
              }}
              rows={4}
              maxLength={MAX_BIO}
            />
          </div>

          <div className="th-form-row th-form-row--2">
            <div className="th-field">
              <label className="th-label" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                className="th-input"
                name="location"
                value={profile.location || ""}
                onChange={handleChangeWrapped}
              />
            </div>

            <div className="th-field">
              <label className="th-label" htmlFor="profession">
                Profession
              </label>
              <input
                id="profession"
                className="th-input"
                name="profession"
                value={profile.profession || ""}
                onChange={handleChangeWrapped}
              />
            </div>
          </div>

          <div className="th-form-row th-form-row--2">
            <div className="th-field">
              <label className="th-label" htmlFor="birthday">
                Birthday
              </label>
              <input
                id="birthday"
                className="th-input"
                type="date"
                name="birthday"
                value={profile.birthday || ""}
                onChange={handleChangeWrapped}
              />
            </div>

            <div className="th-field">
              <label className="th-label" htmlFor="linkedinUrl">
                LinkedIn URL
              </label>
              <input
                id="linkedinUrl"
                className="th-input"
                type="url"
                name="linkedinUrl"
                value={profile.linkedinUrl || ""}
                onChange={handleChangeWrapped}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>

          <div className="th-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      <ImageLightbox
        open={imgOpen}
        items={imgSrc ? [{ src: imgSrc, alt: imgAlt, title: imgAlt }] : []}
        startIndex={0}
        onClose={() => setImgOpen(false)}
      />
    </div>
  );
};

export default EditProfile;