import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/forms.css";
import "../css/cards.css";
import { EcomIntegrationResponse, EcomPlatform } from "../types/ecomTypes";
import { listEcomIntegrations, updateEcomIntegration, deleteEcomIntegration } from "../services/ecomIntegrationService";

interface Props {
  profile: { registeredAsBusiness?: boolean };
  token: string;
  userId: string; // not directly used here but handy for future
}

const EcomIntegrations: React.FC<Props> = ({ profile, token }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<EcomIntegrationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | EcomPlatform>("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.registeredAsBusiness || !token) {
      setLoading(false);
      return;
    };
    listEcomIntegrations(token)
      .then(setItems)
      .catch(() => setError("Failed to load integrations"))
      .finally(() => setLoading(false));
  }, [profile, token]);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter((x) =>
        [x.domain, x.platform, x.publicKey].join(" ").toLowerCase().includes(needle)
      );
    }
    if (typeFilter) arr = arr.filter((x) => x.platform === typeFilter);
    if (activeOnly) arr = arr.filter((x) => x.isActive);
    arr.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return arr;
  }, [items, q, typeFilter, activeOnly]);

  async function toggleActive(it: EcomIntegrationResponse) {
    try {
      const upd = await updateEcomIntegration(it.id, {
        integrationId: it.id,
        businessId: it.businessId,
        platform: it.platform,
        domain: it.domain,
        publicKey: it.publicKey,
        // IMPORTANT: do not set secret here; leave it undefined
        isActive: !it.isActive,
      }, token);
      setItems((prev) => prev.map((p) => (p.id === it.id ? upd : p)));
    } catch {
      alert("Failed to toggle status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this integration? This cannot be undone.")) return;
    try {
      await deleteEcomIntegration(id, token);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert("Failed to delete integration");
    }
  }

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Access denied. Only business users can manage e-commerce integrations.</p></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Loading integrations…</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help" style={{ color: "#b91c1c" }}>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="meta-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="page-title" style={{ margin: 0 }}>E-commerce Integrations</h2>
        <button className="btn btn--primary" onClick={() => navigate("/ecom/add")}>+ Add Integration</button>
      </div>

      {/* Filter bar */}
      <div className="form-card" style={{ marginBottom: 16 }}>
        <div className="section-grid">
          <div className="form-group">
            <label className="label">Search</label>
            <input className="input" placeholder="Search by domain or key" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Platform</label>
            <select className="select" value={typeFilter} onChange={(e) => setTypeFilter((e.target.value || "") as any)}>
              <option value="">All</option>
              <option value="SHOPIFY">Shopify</option>
              <option value="WOOCOMMERCE">WooCommerce</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div className="form-group form-group--inline">
            <label className="switch">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Active only
            </label>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="form-card"><p className="help">No integrations found.</p></div>
      ) : (
        <div className="grid">
          {filtered.map((it) => (
            <div className="card" key={it.id}>
              <h3 className="card__title">{it.domain}</h3>
              <p className="card__desc">Platform: {it.platform}</p>

              <div className="card__meta">
                <span className={`pill ${it.isActive ? "pill--ok" : "pill--muted"}`}>
                  {it.isActive ? "Active" : "Inactive"}
                </span>
                <span className="pill pill--info">{it.hasSecret ? "Secret: Set" : "Secret: —"}</span>
              </div>

              <div className="help" style={{ marginTop: 8 }}>
                Public Key: <code>{it.publicKey}</code>
              </div>

              <div className="card__footer">
                <a className="card__link" onClick={() => navigate(`/ecom/${it.id}/edit`)}>Edit</a>
                <a className="card__link" onClick={() => toggleActive(it)}>{it.isActive ? "Deactivate" : "Activate"}</a>
                <a className="card__link" onClick={() => handleDelete(it.id)}>Delete</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EcomIntegrations;
