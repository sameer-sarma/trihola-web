import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/forms.css";
import "../css/cards.css";
import {
  EcomIntegrationDTO,
  listEcomIntegrations,
  deleteEcomIntegration,
  revealIntegrationSecret,
  rotateIntegrationSecret,
  buildWebhookUrl,
} from "../services/ecomIntegrationService";

interface Props {
  profile: { registeredAsBusiness?: boolean };
  token: string;
  userId: string;
}

type EcomPlatform = "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";

const EcomIntegrations: React.FC<Props> = ({ profile }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<EcomIntegrationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | EcomPlatform>("");
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Record<string, string>>({}); // id -> secret (revealed)

  useEffect(() => {
    if (!profile.registeredAsBusiness) { setLoading(false); return; }
    listEcomIntegrations()
      .then(setItems)
      .catch(() => setError("Failed to load integrations"))
      .finally(() => setLoading(false));
  }, [profile]);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter((x) =>
        [x.domain, x.platform, x.publicKey].join(" ").toLowerCase().includes(needle)
      );
    }
    if (typeFilter) arr = arr.filter((x) => x.platform === typeFilter);
    arr.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return arr;
  }, [items, q, typeFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this integration? Webhooks from this store will stop working.")) return;
    try {
      await deleteEcomIntegration(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert("Failed to delete");
    }
  }

  async function handleReveal(id: string) {
    const s = await revealIntegrationSecret(id);
    if (s) {
      setReveal((m) => ({ ...m, [id]: s }));
      await navigator.clipboard.writeText(s).catch(() => {});
      alert("Secret revealed and copied to clipboard. Update your store if needed.");
    } else {
      alert("Secret not available to reveal. Use Rotate to get a new one.");
    }
  }

  async function handleRotate(id: string) {
    try {
      await rotateIntegrationSecret(id);
      setReveal((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
      alert("Secret rotated. Please update your store/webhook configuration.");
    } catch (e: any) {
      alert(e?.message ?? "Rotate failed");
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="form-card"><p className="help">No integrations found.</p></div>
      ) : (
        <div className="grid">
          {filtered.map((it) => {
            const webhookUrl = buildWebhookUrl(it);
            const secretShown = reveal[it.id];
            return (
              <div className="card" key={it.id}>
                <h3 className="card__title">{it.domain}</h3>
                <p className="card__desc">Platform: {it.platform}</p>

                <div className="card__meta">
                  <span className="pill pill--info">Public Key: <code>{it.publicKey}</code></span>
                </div>

                <div className="help" style={{ marginTop: 8 }}>
                  <div><strong>Webhook URL</strong></div>
                  <div className="mono" style={{ wordBreak: "break-all" }}>{webhookUrl}</div>
                  <div style={{ marginTop: 6 }}>
                    <button className="btn btn--ghost" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copy URL</button>
                  </div>
                </div>

                <div className="help" style={{ marginTop: 8 }}>
                  <div><strong>Signing Secret</strong></div>
                  <div className="mono">{secretShown ? secretShown : "••••••••••••••••••••"}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                    <button className="btn btn--ghost" onClick={() => handleReveal(it.id)}>Reveal</button>
                    <button className="btn btn--ghost" onClick={() => handleRotate(it.id)}>Rotate</button>
                  </div>
                </div>

                <div className="card__footer">
                  <a className="card__link" onClick={() => navigate(`/ecom/${it.id}/edit`)}>Manage</a>
                  <a className="card__link" onClick={() => handleDelete(it.id)}>Delete</a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EcomIntegrations;
