import React, { useEffect, useState } from "react";
import { fetchUserSettings, saveUserSettings } from "../services/settingsService";
import { supabase } from "../supabaseClient";
import { UserSettingsDTO } from "../types/userSettings";
import "../css/EditProfile.css";

const UserSettingsForm: React.FC = () => {
  const [formData, setFormData] = useState<UserSettingsDTO>({
    autoApproveIncomingReferrals: false,
    profileVisibility: "referralOnly",
    preferredContactChannel: "email",
    maxReferralsPerMonth: 10,
  });

  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      setAccessToken(session.access_token);
      try {
        const fetched = await fetchUserSettings(session.access_token);
        if (fetched) {
          const {
            autoApproveIncomingReferrals,
            profileVisibility,
            preferredContactChannel,
            maxReferralsPerMonth,
          } = fetched;

          setFormData({
            autoApproveIncomingReferrals,
            profileVisibility,
            preferredContactChannel,
            maxReferralsPerMonth,
          });
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

try {
  await saveUserSettings(accessToken, formData);
  alert("Settings updated successfully!");
} catch (err) {
  console.error("Failed to update settings", err);
  alert(`Failed to update settings: ${err instanceof Error ? err.message : "Unknown error"}`);
}
  };

  if (loading) return <p className="info-text">Loading settings...</p>;

  return (
    <form onSubmit={handleSubmit} className="profile-container">
      <h3>User Settings</h3>

<div className="form-group checkbox-group">
  <label className="checkbox-label">Auto Approve Referrals</label>
  <input
    id="autoApproveIncomingReferrals"
    type="checkbox"
    name="autoApproveIncomingReferrals"
    checked={formData.autoApproveIncomingReferrals}
    onChange={handleChange}
  />
</div>
      <div className="form-group">
        <label>Profile Visibility</label>
        <select
          name="profileVisibility"
          value={formData.profileVisibility}
          onChange={handleChange}
        >
          <option value="public">Public</option>
          <option value="referralOnly">Referral Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div className="form-group">
        <label>Preferred Contact Channel</label>
        <select
          name="preferredContactChannel"
          value={formData.preferredContactChannel}
          onChange={handleChange}
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="none">None</option>
        </select>
      </div>

      <div className="form-group">
        <label>Max Referrals per Month</label>
        <input
          type="number"
          name="maxReferralsPerMonth"
          value={formData.maxReferralsPerMonth}
          onChange={handleChange}
        />
      </div>

      <button type="submit" className="primary-btn">
        Save Settings
      </button>
    </form>
  );
};

export default UserSettingsForm;
