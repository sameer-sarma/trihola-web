import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // <-- add this
import {
  getBusinessProfile,
  updateBusinessProfile,
  unregisterBusiness,
  checkBusinessSlugAvailability,
  setBusinessSlug,   
} from "../services/businessService";
import { useDebouncedCallback } from "use-debounce"; // optional tiny helper

interface BusinessProfileFormProps {
  onSuccess?: () => void;
  onUnregistered?: () => void;
}

const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  onSuccess,
  onUnregistered,
}) => {
  const navigate = useNavigate(); // <-- get navigate
  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    businessWebsite: "",
    businessSlug: "",   
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  useEffect(() => {
  const fetchProfile = async () => {
        try {
          const data = await getBusinessProfile();
        if (data) setFormData(prev => ({ ...prev, ...data }));
        } finally { setLoading(false); }
      };
      fetchProfile();
    }, []);

      // slug availability (debounced)
    const checkSlug = useDebouncedCallback(async (slug: string) => {
      if (!slug) { setSlugAvailable(null); return; }
      setSlugChecking(true);
      try {
        const { available } = await checkBusinessSlugAvailability(slug);
        setSlugAvailable(available);
      } catch { setSlugAvailable(null); }
      finally { setSlugChecking(false); }
    }, 350);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => {
        const next = { ...prev, [name]: value };
        if (name === "businessSlug") checkSlug(value.trim().toLowerCase());
        return next;
      });
    };

    // on submit: update profile, then slug (if changed)
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await updateBusinessProfile({
          businessName: formData.businessName,
          businessDescription: formData.businessDescription,
          businessWebsite: formData.businessWebsite,
        });

        // Only call if present & different from server
        if (formData.businessSlug?.trim()) {
          await setBusinessSlug(formData.businessSlug.trim().toLowerCase());
        }

        alert("Business profile updated.");
        if (onSuccess) onSuccess(); else navigate("/profile", { replace: true });
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
      if (onUnregistered) {
        onUnregistered(); // parent can decide what to do
      } else {
        navigate("/profile", { replace: true }); // <-- go to profile
      }
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

      <div className="form-group">
        <label>Public Business Slug</label>
        <input
          name="businessSlug"
          value={formData.businessSlug}
          onChange={handleChange}
          placeholder="e.g. glow-skin-clinic"
        />
        <small className="hint">
          {slugChecking ? "Checking…" : slugAvailable == null ? " " : slugAvailable ? "✅ Available" : "❌ Taken"}
        </small>
        {formData.businessSlug && (
          <div className="hint">
            Public catalog: <a href={`/${formData.businessSlug}/products`} target="_blank" rel="noopener noreferrer">
              /{formData.businessSlug}/products
            </a>
          </div>
        )}
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
