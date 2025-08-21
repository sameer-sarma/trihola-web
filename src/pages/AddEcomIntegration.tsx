import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/forms.css";
import { EcomIntegrationRequest, EcomPlatform } from "../types/ecomTypes";
import { createEcomIntegration } from "../services/ecomIntegrationService";

interface Props {
  token: string;
  userId: string;
  profile: { registeredAsBusiness?: boolean };
  businessId: string; // if you keep userId == businessId, pass userId here
}

const domainRe = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const AddEcomIntegration: React.FC<Props> = ({ token, profile, businessId }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<EcomIntegrationRequest>({
    businessId,
    platform: "SHOPIFY",
    domain: "",
    publicKey: "",
    secret: "",
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Only business users can add integrations.</p></div>
      </div>
    );
  }

  function setField<K extends keyof EcomIntegrationRequest>(k: K, v: EcomIntegrationRequest[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!domainRe.test(form.domain)) {
      setError("Please enter a valid domain (e.g., store.example.com)");
      return;
    }
    createEcomIntegration(form, token)
      .then(() => navigate("/ecom"))
      .catch(() => setError("Failed to create integration"));
  }

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">Add E-commerce Integration</h2>
        {error && <p className="help" style={{ color: "#b91c1c" }}>{error}</p>}

        <form onSubmit={onSubmit} className="form form--two-col">
          <div className="section-block" style={{ gridColumn: "1 / -1" }}>
            <div className="section-header">🔧 Connection</div>
            <div className="section-grid">
              <div className="form-group">
                <label className="label">Platform</label>
                <select
                  className="select"
                  value={form.platform}
                  onChange={(e) => setField("platform", e.target.value as EcomPlatform)}
                >
                  <option value="SHOPIFY">Shopify</option>
                  <option value="WOOCOMMERCE">WooCommerce</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Domain</label>
                <input
                  className="input"
                  placeholder="store.example.com"
                  value={form.domain}
                  onChange={(e) => setField("domain", e.target.value.trim())}
                />
                <div className="help">Do not include protocol (no http/https).</div>
              </div>

              <div className="form-group">
                <label className="label">Public Key / API Key</label>
                <input
                  className="input"
                  placeholder="public key"
                  value={form.publicKey}
                  onChange={(e) => setField("publicKey", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Secret (write-only)</label>
                <input
                  className="input"
                  type="password"
                  placeholder="secret / signing key"
                  value={form.secret ?? ""}
                  onChange={(e) => setField("secret", e.target.value || "")}
                />
                <div className="help">Stored securely. You won’t see this again after saving.</div>
              </div>

              <div className="form-group form-group--inline" style={{ gridColumn: "1 / -1" }}>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                  />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="btn btn--ghost" onClick={() => navigate("/ecom")}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save Integration</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEcomIntegration;
