import React, { useEffect, useState } from "react";
import {
  getBusinessProfile,
  updateBusinessProfile,
  unregisterBusiness,
} from "../services/businessService";
import "../css/EditProfile.css";

interface BusinessProfileFormProps {
  onSuccess?: () => void;
  onUnregistered?: () => void;
}

const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  onSuccess,
  onUnregistered,
}) => {
  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    businessWebsite: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getBusinessProfile();
        if (data) {
          setFormData(data);
        }
      } catch (err) {
        console.error("Failed to fetch business profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBusinessProfile(formData);
      alert("Business profile updated successfully.");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to update business profile", err);
      alert("Failed to update business profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnregister = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to unregister as a business? This action will remove your business listing."
    );
    if (!confirmed) return;

    setUnregistering(true);
    try {
      await unregisterBusiness();
      alert("You are no longer registered as a business.");
      onUnregistered?.();
    } catch (err) {
      console.error("Failed to unregister", err);
      alert("Failed to unregister as a business.");
    } finally {
      setUnregistering(false);
    }
  };

  if (loading) return <p className="info-text">Loading business profile...</p>;

  return (
    <form onSubmit={handleSubmit} className="business-form">
      <div className="form-group">
        <label>Business Name</label>
        <input
          name="businessName"
          value={formData.businessName}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Business Description</label>
        <textarea
          name="businessDescription"
          value={formData.businessDescription}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Business Website</label>
        <input
          type="url"
          name="businessWebsite"
          value={formData.businessWebsite}
          onChange={handleChange}
        />
      </div>

      <div className="button-row">
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? "Saving..." : "Update Business Profile"}
        </button>

        <button
          type="button"
          className="danger-btn"
          onClick={handleUnregister}
          disabled={unregistering}
        >
          {unregistering ? "Removing..." : "Unregister as Business"}
        </button>
      </div>
    </form>
  );
};

export default BusinessProfileForm;
