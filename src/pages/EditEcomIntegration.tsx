import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/forms.css";
import {
  EcomIntegrationDTO,
  getEcomIntegrationById,
  revealIntegrationSecret,
  rotateIntegrationSecret,
  deleteEcomIntegration,
  buildWebhookUrl,
} from "../services/ecomIntegrationService";

interface Props {
  token: string;
  profile: { registeredAsBusiness?: boolean };
}

const EditEcomIntegration: React.FC<Props> = ({ profile }) => {
  const { integrationId } = useParams<{ integrationId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<EcomIntegrationDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!integrationId) return;
    getEcomIntegrationById(integrationId)
      .then(setItem)
      .catch(() => setError("Failed to load integration"));
  }, [integrationId]);

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Only business users can edit integrations.</p></div>
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
  if (!item) {
    return (
      <div className="page-wrap">
        <div className="form-card"><p className="help">Loading…</p></div>
      </div>
    );
  }

  const webhookUrl = buildWebhookUrl(item);

async function doReveal() {
  if (!item) {
    alert("Integration not loaded yet. Please wait.");
    return;
  }
  const s = await revealIntegrationSecret(item.id);
  if (s) {
    setSecret(s);
    await navigator.clipboard.writeText(s).catch(() => {});
    alert("Secret revealed and copied.");
  } else {
    alert("Secret not available to reveal. Use Rotate to generate a new one.");
  }
}

async function doRotate() {
  if (!item) {
    alert("Integration not loaded yet. Please wait.");
    return;
  }
  try {
    setBusy(true);
    await rotateIntegrationSecret(item.id);
    setSecret(null);
    alert("Secret rotated. Update your store configuration.");
  } catch (e: any) {
    alert(e?.message ?? "Rotate failed");
  } finally {
    setBusy(false);
  }
}

async function doDelete() {
  if (!item) {
    alert("Integration not loaded yet. Please wait.");
    return;
  }
  if (!confirm("Delete this integration? This cannot be undone.")) return;
  try {
    await deleteEcomIntegration(item.id);
    navigate("/ecom");
  } catch {
    alert("Failed to delete");
  }
}

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">Manage E-commerce Integration</h2>

        <div className="section-block" style={{ gridColumn: "1 / -1" }}>
          <div className="section-header">🔧 Connection</div>
          <div className="section-grid">
            <div className="form-group">
              <label className="label">Platform</label>
              <div className="input" style={{ background: "#f9fafb" }}>{item.platform}</div>
            </div>

            <div className="form-group">
              <label className="label">Domain</label>
              <div className="input" style={{ background: "#f9fafb" }}>{item.domain}</div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="label">Public Key</label>
              <div className="input mono" style={{ background: "#f9fafb", wordBreak: "break-all" }}>{item.publicKey}</div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="label">Webhook URL</label>
              <div className="input mono" style={{ background: "#f9fafb", wordBreak: "break-all" }}>{webhookUrl}</div>
              <div className="help" style={{ marginTop: 6 }}>
                <button className="btn btn--ghost" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copy URL</button>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="label">Signing Secret</label>
              <div className="input mono" style={{ background: "#f9fafb" }}>{secret ?? "••••••••••••••••••••"}</div>
              <div className="help" style={{ marginTop: 6, display: "flex", gap: 8 }}>
                <button className="btn btn--ghost" onClick={doReveal}>Reveal</button>
                <button className="btn btn--ghost" onClick={doRotate} disabled={busy}>{busy ? "Rotating…" : "Rotate"}</button>
              </div>
            </div>
          </div>
        </div>

        <div className="actions" style={{ gridColumn: "1 / -1" }}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/ecom")}>Back</button>
          <button type="button" className="btn btn--primary" onClick={doDelete}>Delete Integration</button>
        </div>
      </div>
    </div>
  );
};

export default EditEcomIntegration;
