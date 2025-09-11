import React, { useEffect, useState } from "react";
import { fetchUserSettings, saveUserSettings } from "../services/settingsService";
import { supabase } from "../supabaseClient";
import { UserSettingsDTO } from "../types/userSettings";
import "../css/ui-forms.css"; // ← use common styles

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
      if (!session?.access_token) { setLoading(false); return; }
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
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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

  if (loading) return <p className="th-muted">Loading settings...</p>;

  return (
    <div className="th-page">
      <div className="card ecom-card--narrow">
        <h3 className="card-title">User Settings</h3>

        <form onSubmit={handleSubmit} className="th-form" noValidate>
          {/* Auto-approve toggle */}
          <div className="th-field">
            <label className="th-label" htmlFor="autoApproveIncomingReferrals">Auto Approve Referrals</label>
            <div className="switch">
              <input
                id="autoApproveIncomingReferrals"
                type="checkbox"
                name="autoApproveIncomingReferrals"
                checked={formData.autoApproveIncomingReferrals}
                onChange={handleChange}
              />
              <span>Enable automatic approval of incoming referrals</span>
            </div>
          </div>

          {/* Visibility */}
          <div className="th-field">
            <label className="th-label" htmlFor="profileVisibility">Profile Visibility</label>
            <select
              id="profileVisibility"
              name="profileVisibility"
              className="select"
              value={formData.profileVisibility}
              onChange={handleChange}
            >
              <option value="public">Public</option>
              <option value="referralOnly">Referral Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Preferred contact */}
          <div className="th-field">
            <label className="th-label" htmlFor="preferredContactChannel">Preferred Contact Channel</label>
            <select
              id="preferredContactChannel"
              name="preferredContactChannel"
              className="select"
              value={formData.preferredContactChannel}
              onChange={handleChange}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Max referrals */}
          <div className="th-field">
            <label className="th-label" htmlFor="maxReferralsPerMonth">Max Referrals per Month</label>
            <input
              id="maxReferralsPerMonth"
              type="number"
              name="maxReferralsPerMonth"
              className="th-input"
              value={formData.maxReferralsPerMonth}
              onChange={handleChange}
              min={0}
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn--primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettingsForm;
