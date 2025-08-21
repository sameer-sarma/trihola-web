import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/forms.css";
import { createEcomIntegration } from "../services/ecomIntegrationService";

interface Props {
  token: string;
  userId: string;
  profile: { registeredAsBusiness?: boolean };
  businessId: string;
}

type EcomPlatform = "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";
const domainRe = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const AddEcomIntegration: React.FC<Props> = ({ profile }) => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<EcomPlatform>("WOOCOMMERCE");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Only business users can add integrations.</p></div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!domainRe.test(domain)) {
      setError("Please enter a valid domain (e.g., store.example.com)");
      return;
    }
    try {
      setBusy(true);
      await createEcomIntegration({ platform, domain: domain.trim().toLowerCase() });
      navigate("/ecom");
    } catch (err: any) {
      setError(err?.message ?? "Failed to create integration");
    } finally {
      setBusy(false);
    }
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
                <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value as EcomPlatform)}>
                  <option value="WOOCOMMERCE">WooCommerce</option>
                  <option value="SHOPIFY">Shopify</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Store Domain</label>
                <input className="input" placeholder="store.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
                <div className="help">Do not include http/https.</div>
              </div>
            </div>
          </div>

          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="btn btn--ghost" onClick={() => navigate("/ecom")}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Saving…" : "Save Integration"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEcomIntegration;
