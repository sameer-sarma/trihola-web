import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/forms.css";
import { EcomIntegrationRequest, EcomIntegrationResponse, EcomPlatform } from "../types/ecomTypes";
import { getEcomIntegration, updateEcomIntegration } from "../services/ecomIntegrationService";

interface Props {
  token: string;
  profile: { registeredAsBusiness?: boolean };
}

const domainRe = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const EditEcomIntegration: React.FC<Props> = ({ token, profile }) => {
  const { integrationId } = useParams<{ integrationId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<EcomIntegrationResponse | null>(null);
  const [form, setForm] = useState<EcomIntegrationRequest | null>(null);
  const [newSecret, setNewSecret] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!integrationId || !token) return;
    getEcomIntegration(integrationId, token)
      .then((x) => {
        setItem(x);
        setForm({
          integrationId: x.id,
          businessId: x.businessId,
          platform: x.platform,
          domain: x.domain,
          publicKey: x.publicKey,
          isActive: x.isActive,
        });
      })
      .catch(() => setError("Failed to load integration"));
  }, [integrationId, token]);

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Only business users can edit integrations.</p></div>
      </div>
    );
  }

  function setField<K extends keyof EcomIntegrationRequest>(k: K, v: EcomIntegrationRequest[K]) {
    setForm((p) => (p ? { ...p, [k]: v } : p));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    if (!domainRe.test(form.domain)) {
      setError("Please enter a valid domain (e.g., store.example.com)");
      return;
    }

    const payload: EcomIntegrationRequest = {
      ...form,
      secret: newSecret.trim() ? newSecret : undefined, // rotate if provided
    };

    try {
      await updateEcomIntegration(form.integrationId!, payload, token);
      navigate("/ecom");
    } catch {
      setError("Failed to update integration");
    }
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help" style={{ color: "#b91c1c" }}>{error}</p></div>
      </div>
    );
  }
  if (!form || !item) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Loading…</p></div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">Edit E-commerce Integration</h2>

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
                  value={form.domain}
                  onChange={(e) => setField("domain", e.target.value.trim())}
                />
              </div>

              <div className="form-group">
                <label className="label">Public Key / API Key</label>
                <input
                  className="input"
                  value={form.publicKey}
                  onChange={(e) => setField("publicKey", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Rotate Secret (optional)</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter a new secret to rotate"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                />
                <div className="help">{item.hasSecret ? "A secret is set." : "No secret currently stored."} Leave blank to keep unchanged.</div>
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
            <button type="submit" className="btn btn--primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEcomIntegration;
