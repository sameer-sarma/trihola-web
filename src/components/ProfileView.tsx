import React from "react";
import "../css/ProfileView.css";

interface Props {
  profile: {
    slug: string; 
    firstName?: string | null;
    lastName?: string | null;
    address?: string | null;
    profileImageUrl?: string | null;
    bio?: string | null;
    location?: string | null;
    profession?: string | null;
    birthday?: string | null;
    linkedinUrl?: string | null;
    registeredAsBusiness?: boolean | null;
    isContact?: boolean | false;
  };
  businessProfile?: {
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
  };
  onReferClick?: () => void;
  isOwnProfile: boolean;
  onAddContactClick?: () => void;
}

const ProfileView: React.FC<Props> = ({ profile, businessProfile, onReferClick, isOwnProfile, onAddContactClick }) => {
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

  return (
    <div className="profile-view-card">
      <div className="profile-image-wrapper">
        {profile.profileImageUrl ? (
          <img
            src={profile.profileImageUrl}
            alt={fullName || "Profile"}
            className="profile-image"
          />
        ) : (
          <div className="profile-placeholder">No Image</div>
        )}
      </div>

      <h2 className="profile-name">{fullName || "Anonymous"}
          {!isOwnProfile && (
    <>
      {profile.isContact ? (
        <span className="contact-indicator">✅ Contact</span>
      ) : (
        onAddContactClick && (
          <button className="add-contact-btn" onClick={onAddContactClick}>
            ➕ Add as Contact
          </button>
        )
      )}
    </>
  )}
      </h2>

      {profile.profession && <p className="profile-meta">{profile.profession}</p>}
      {profile.location && <p className="profile-meta">{profile.location}</p>}
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      {profile.registeredAsBusiness && businessProfile && (
        <div className="business-section">
          {businessProfile.businessName && (
            <p><strong>Company:</strong> {businessProfile.businessName}</p>
          )}
          {businessProfile.businessWebsite && (
            <p>
              <strong>Website:</strong>{" "}
              <a
                href={businessProfile.businessWebsite}
                className="profile-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {businessProfile.businessWebsite}
              </a>
            </p>
          )}
          {businessProfile.businessDescription && (
            <p>{businessProfile.businessDescription}</p>
          )}
        </div>
      )}

      {onReferClick && (
        <button className="primary-btn refer-btn" onClick={onReferClick}>
          Refer
        </button>
      )}
    </div>
  );
};

export default ProfileView;
