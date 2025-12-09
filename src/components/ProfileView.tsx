// src/components/ProfileView.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useBusinessProducts } from "../queries/productQueries";

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
    businessSlug?: string; // <- backend now returns this
  };
  onReferClick?: () => void;
  isOwnProfile: boolean;
  onAddContactClick?: () => void;
}

const ProfileView: React.FC<Props> = ({
  profile,
  businessProfile,
  onReferClick,
  isOwnProfile,
  onAddContactClick
}) => {
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const businessSlug = businessProfile?.businessSlug?.trim() ?? "";

  // Auth-required catalog (no conditional hooks — use enabled)
  const { data: products, isLoading: loadingProducts } = useBusinessProducts(
    businessSlug,
    { active: true, limit: 8, offset: 0 },
    { enabled: !!businessSlug }
  );

  return (
    <div className="th-two-col th-two-col--left">
      {/* LEFT column: Avatar + quick details/actions + About */}
      <div className="th-stack">
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12 }}>
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={fullName || "Profile"}
                className="th-avatar"
              />
            ) : (
              <div className="th-avatar th-avatar--placeholder">No Image</div>
            )}
          </div>

          <h2 className="page-title" style={{ fontSize: 20, marginBottom: 8 }}>
            {fullName || "Anonymous"}
          </h2>

          {!isOwnProfile && (
            <>
              {profile.isContact ? (
                <span className="th-badge" style={{ background: "#eef7ee" }}>
                  Contact
                </span>
              ) : (
                onAddContactClick && (
                  <button className="btn btn--primary" onClick={onAddContactClick}>
                    ➕ Add as Contact
                  </button>
                )
              )}
            </>
          )}

          {profile.profession && <div className="kv">{profile.profession}</div>}
          {profile.location && <div className="kv">{profile.location}</div>}

          {onReferClick && (
            <div className="actions" style={{ justifyContent: "center" }}>
              <button className="btn btn--primary" onClick={onReferClick}>
                Refer
              </button>
            </div>
          )}
        </div>

        {profile.bio && (
          <div className="card">
            <h3 className="page-title" style={{ fontSize: 18 }}>About</h3>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--ink-mid)" }}>
              {profile.bio}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT column: Business + Product catalog + Wallet store */}
      <div className="th-stack">
        {profile.registeredAsBusiness && businessProfile && (
          <div className="card">
            <h3 className="page-title" style={{ fontSize: 18, marginBottom: 8 }}>
              Business
            </h3>

            {businessProfile.businessName && (
              <div className="kv">
                <strong>Company:</strong> {businessProfile.businessName}
              </div>
            )}
            {businessProfile.businessWebsite && (
              <div className="kv">
                <strong>Website:</strong>{" "}
                <a
                  href={businessProfile.businessWebsite}
                  className="profile-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {businessProfile.businessWebsite}
                </a>
              </div>
            )}
            {businessProfile.businessDescription && (
              <div className="kv" style={{ marginTop: 8 }}>
                {businessProfile.businessDescription}
              </div>
            )}

            {/* Catalog */}
            {businessSlug && (
              <>
                <div className="th-header" style={{ marginTop: 12 }}>
                  <h4
                    className="page-title"
                    style={{ fontSize: 16, margin: 0 }}
                  >
                    Products
                  </h4>
                  <Link
                    className="btn btn--ghost"
                    to={`/${businessSlug}/products`}
                  >
                    View all
                  </Link>
                </div>

                {loadingProducts && (
                  <div className="th-muted">Loading products…</div>
                )}
                {!loadingProducts &&
                  (!products || products.length === 0) && (
                    <div className="th-muted">No products yet.</div>
                  )}

                {!!products?.length && (
                  <div className="th-grid">
                    {products.map((p: any) => (
                      <Link
                        key={p.id}
                        to={`/${businessSlug}/${p.slug}`}
                        className="th-card"
                      >
                        {p.primaryImageUrl ? (
                          <img
                            className="th-card-thumb"
                            src={p.primaryImageUrl}
                            alt={p.name ?? "Product"}
                          />
                        ) : (
                          <div className="th-card-thumb th-placeholder">
                            No image
                          </div>
                        )}
                        <div className="th-card-body">
                          <div className="th-card-title">
                            {p.name ?? "Untitled"}
                          </div>
                          <div className="th-card-sub">
                            {p.kind ?? "—"} •{" "}
                            {p.isActive ? "Active" : "Inactive"}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* 🔹 Rewards store entry, under Products */}
                <div className="th-header" style={{ marginTop: 16 }}>
                  <h4
                    className="page-title"
                    style={{ fontSize: 16, margin: 0 }}
                  >
                    Rewards store
                  </h4>
                  <Link
                    className="btn btn--ghost"
                    to={`/${businessSlug}/wallet-store`}
                  >
                    Use your points
                  </Link>
                </div>
                <div className="th-muted" style={{ marginTop: 4 }}>
                  Redeem your TriHola points for offers from this business.
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
