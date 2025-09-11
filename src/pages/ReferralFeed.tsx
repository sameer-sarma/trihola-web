import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ReferralDTO } from "../types/referral";
import {
  fetchMyReferrals,
  acceptReferral,
  rejectReferral,
  cancelReferral,
} from "../services/referralService";
import ReferralCard from "../components/ReferralCard";

const ReferralFeed: React.FC = () => {
  const [referrals, setReferrals] = useState<ReferralDTO[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadReferrals = async (token: string) => {
    try {
      const data = await fetchMyReferrals(token);
      setReferrals(data);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token && session.user?.id) {
        setAccessToken(session.access_token);
        setUserId(session.user.id);
        await loadReferrals(session.access_token);
      } else {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const handleAccept = async (id: string) => {
    if (!accessToken) return;
    await acceptReferral(accessToken, id);
    await loadReferrals(accessToken);
  };

  const handleReject = async (id: string) => {
    if (!accessToken) return;
    await rejectReferral(accessToken, id);
    await loadReferrals(accessToken);
  };

  const handleCancel = async (id: string) => {
    if (!accessToken) return;
    try {
      await cancelReferral(accessToken, id);
      await loadReferrals(accessToken);
    } catch (err) {
      console.error("Error cancelling referral:", err);
    }
  };

  return (
    <div className="th-page">
      {/* Header */}
      <div className="th-header">
        <h2 className="page-title">Your Referrals</h2>
        <div className="th-header-actions">
          <button
            onClick={() => navigate("/referrals/new")}
            className="btn btn--primary"
          >
            + New Referral
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card">
          <p className="th-muted">Loading referrals…</p>
        </div>
      ) : referrals.length === 0 ? (
        <div className="card">
          <p className="th-muted" style={{ marginBottom: 10 }}>
            You have no referrals yet.
          </p>
          <div>
            <button
              onClick={() => navigate("/referrals/new")}
              className="btn btn--primary"
            >
              Create your first referral
            </button>
          </div>
        </div>
      ) : (
        <div className="th-stack">
          {referrals.map((ref) => (
            <ReferralCard
              key={ref.id}
              referral={ref}
              userId={userId ?? ""}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralFeed;
