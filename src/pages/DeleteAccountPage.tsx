import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { deleteAccount } from "../services/profileService";
import { getBusinessMembers } from "../services/businessService";
import type { BusinessContextDTO, BusinessMemberDTO } from "../types/business";
import { getTriholaAccessToken, logoutTrihola } from "../utils/auth";
import { useAppData } from "../context/AppDataContext";

type OwnedBusinessDeletionImpact = {
  business: BusinessContextDTO;
  owners: BusinessMemberDTO[];
  activeMembers: BusinessMemberDTO[];
  isSoleOwner: boolean;
};

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const { myUserProfile, myBusinesses } = useAppData();

  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessImpacts, setBusinessImpacts] = useState<
    OwnedBusinessDeletionImpact[]
  >([]);
  const [businessImpactLoading, setBusinessImpactLoading] = useState(false);

  const ownedBusinesses = useMemo(() => {
    return (myBusinesses ?? []).filter(
      (b) =>
        String(b.role ?? "").toUpperCase() === "OWNER" &&
        String(b.membershipStatus ?? "").toUpperCase() === "ACTIVE" &&
        String(b.businessStatus ?? "").toUpperCase() === "ACTIVE"
    );
  }, [myBusinesses]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (ownedBusinesses.length === 0) {
        setBusinessImpacts([]);
        return;
      }

      setBusinessImpactLoading(true);

      try {
        const results = await Promise.all(
          ownedBusinesses.map(async (business) => {
            const members = await getBusinessMembers(business.businessId);

            const activeMembers = (members ?? []).filter(
              (m) => String(m.status ?? "").toUpperCase() === "ACTIVE"
            );

            const owners = activeMembers.filter(
              (m) => String(m.role ?? "").toUpperCase() === "OWNER"
            );

            return {
              business,
              owners,
              activeMembers,
              isSoleOwner: owners.length <= 1,
            };
          })
        );

        if (!cancelled) setBusinessImpacts(results);
      } catch (e) {
        console.warn("Failed to load business ownership impact", e);
        if (!cancelled) setBusinessImpacts([]);
      } finally {
        if (!cancelled) setBusinessImpactLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [ownedBusinesses]);

  const canDelete = confirmation.trim() === "DELETE" && accepted && !deleting;
  const soleOwnerBusinesses = businessImpacts.filter((x) => x.isSoleOwner);
  const coOwnedBusinesses = businessImpacts.filter((x) => !x.isSoleOwner);

  const displayName =
    [myUserProfile?.firstName, myUserProfile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "your account";

  const handleDelete = async () => {
    if (!canDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const token = await getTriholaAccessToken();
      if (!token) throw new Error("You are not logged in.");

      await deleteAccount(token);

      sessionStorage.removeItem("profileSlug");

      await logoutTrihola();

      navigate("/", {
        replace: true,
        state: {
          accountDeleted: true,
        },
      });
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Unable to delete account. Please try again."
      );
      setDeleting(false);
    }
  };

  return (
    <main className="app-page app-page--narrow">
      <div className="app-stack">
        <header className="app-header">
          <div className="app-header__main">
            <h1 className="app-title">Delete Account</h1>
            <p className="app-subtitle">
              This will permanently remove your TriHola login access and
              anonymize your account.
            </p>
          </div>
        </header>

        <section className="form-card">
          <div className="th-form-header">
            <div className="th-form-header__main">
              <h2 className="th-form-title">
                Are you sure you want to delete {displayName}?
              </h2>
              <p className="th-form-subtitle">
                This action cannot be undone. You will be logged out after the
                deletion process completes.
              </p>
            </div>
          </div>

          <div className="th-section th-section--accent">
            <div className="th-section-header">
              <div>
                <h3 className="th-section-title">
                  What happens next
                </h3>
                <p className="th-section-subtitle">
                  As part of the account deletion process:
                </p>
              </div>
            </div>

            <div className="th-vlist">
              <div className="th-list-row">
                <div>
                  <div className="th-list-title">
                    Your profile is anonymized
                  </div>
                  <div className="th-list-meta">
                    Your name, profile image, bio and personal profile details
                    will no longer be visible.
                  </div>
                </div>
              </div>

              <div className="th-list-row">
                <div>
                  <div className="th-list-title">
                    Your email and phone are removed
                  </div>
                  <div className="th-list-meta">
                    Future contacts using the same email or phone will create a
                    new unregistered TriHola identity.
                  </div>
                </div>
              </div>

              <div className="th-list-row">
                <div>
                  <div className="th-list-title">
                    You are removed from contact lists
                  </div>
                  <div className="th-list-meta">
                    Other users will no longer see this account in their saved
                    contacts.
                  </div>
                </div>
              </div>

              <div className="th-list-row">
                <div>
                  <div className="th-list-title">
                    Historical records may remain anonymized
                  </div>
                  <div className="th-list-meta">
                    Threads, referrals, offers, orders and audit records may
                    remain as anonymized history where needed.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {ownedBusinesses.length > 0 && (
            <div className="th-section" style={{ marginTop: 16 }}>
              <div className="th-section-header">
                <div>
                  <h3 className="th-section-title">
                    Business ownership impact
                  </h3>
                  <p className="th-section-subtitle">
                    We checked the businesses where you are an owner. If you are the only
                    active owner, deleting your account will anonymize that business.
                  </p>
                </div>
              </div>

              {businessImpactLoading ? (
                <div className="app-empty">
                  Checking business ownership impact...
                </div>
              ) : (
                <div className="th-vlist">
                  {soleOwnerBusinesses.length > 0 && (
                    <div className="th-section th-section--accent">
                      <h4 className="th-section-title">
                        These businesses may be anonymized
                      </h4>
                      <p className="th-section-subtitle">
                        You are currently the only active owner. To keep the business
                        active, promote another member to owner before deleting your
                        account.
                      </p>

                      <div className="th-vlist" style={{ marginTop: 12 }}>
                        {soleOwnerBusinesses.map(({ business, activeMembers }) => (
                          <div
                            key={business.businessId}
                            className="th-list-row"
                          >
                            <div>
                              <div className="th-list-title">
                                {business.businessName || "Business"}
                              </div>
                              <div className="th-list-meta">
                                {activeMembers.length} active member
                                {activeMembers.length === 1 ? "" : "s"} · sole owner
                              </div>
                            </div>

                            <Link
                              to={`/businesses/${business.businessSlug}`}
                              className="btn btn--ghost btn--sm"
                            >
                              Manage members
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {coOwnedBusinesses.length > 0 && (
                    <div className="th-section">
                      <h4 className="th-section-title">
                        These businesses will remain active
                      </h4>
                      <p className="th-section-subtitle">
                        These businesses have another active owner. Your membership will
                        be removed, but the business will not be anonymized.
                      </p>

                      <div className="th-vlist" style={{ marginTop: 12 }}>
                        {coOwnedBusinesses.map(({ business, owners }) => (
                          <div
                            key={business.businessId}
                            className="th-list-row"
                          >
                            <div>
                              <div className="th-list-title">
                                {business.businessName || "Business"}
                              </div>
                              <div className="th-list-meta">
                                {owners.length} active owner
                                {owners.length === 1 ? "" : "s"} · business remains active
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="th-form" style={{ marginTop: 18 }}>
            <label className="th-field">
              <span className="th-label">
                Type DELETE to confirm
              </span>
              <input
                className="th-input"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
                disabled={deleting}
              />
            </label>

            <label className="th-checkRow">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={deleting}
              />
              <span>
                I understand that this action cannot be undone, and sole-owned businesses may be anonymized.
              </span>
            </label>

            {error && <div className="error-text">{error}</div>}

            <div className="th-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate(-1)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={!canDelete}
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}