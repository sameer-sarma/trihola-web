import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ReferralDTO } from "../types/referral";
import {
  fetchMyReferrals,
  acceptReferral,
  rejectReferral,
  cancelReferral
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
      const { data: { session } } = await supabase.auth.getSession();
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
      await cancelReferral(accessToken, id); // Make sure this exists in referralService
      await loadReferrals(accessToken);
    } catch (err) {
      console.error("Error cancelling referral:", err);
    }
  };

  if (loading) return <p className="text-center mt-6 text-gray-600">Loading referrals...</p>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Referrals</h2>
        <button
          onClick={() => navigate("/referrals/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + New Referral
        </button>
      </div>

      {referrals.length === 0 ? (
        <p className="text-gray-500">You have no referrals yet.</p>
      ) : (
        <div className="space-y-4">
          {referrals.map((ref) => (
            <ReferralCard
              key={ref.id}
              referral={ref}
              userId={userId ?? ""}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel} // <-- Pass cancel handler here
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralFeed;
