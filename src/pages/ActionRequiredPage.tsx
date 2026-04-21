// src/pages/ActionRequiredPage.tsx
import { useNavigate } from "react-router-dom";
import type { BootstrapDTO, GateItemDTO } from "../hooks/useBootstrap";

export default function ActionRequiredPage({ bootstrap }: { bootstrap: BootstrapDTO }) {
  const navigate = useNavigate();
  const items = bootstrap.gates?.items ?? [];

  const go = (g: GateItemDTO) => {
    // ✅ client-side mapping (works for Android later too)
    switch (g.action) {
      case "EDIT_PROFILE":
        navigate(`/profile/edit${g.focus ? `?focus=${encodeURIComponent(g.focus)}` : ""}`);
        return;
      case "EDIT_BUSINESS_PROFILE":
        // If EditProfile supports tabs:
        navigate(
          `/profile/edit?tab=business${g.focus ? `&focus=${encodeURIComponent(g.focus)}` : ""}`
        );
        return;
      default:
        // safe fallback
        navigate("/profile/edit");
    }
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Action required</h2>
      <p className="th-muted">
        Before you can send referrals, please complete the items below.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((g) => (
          <div key={g.key} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{g.title}</div>
                <div className="th-muted" style={{ marginTop: 6 }}>
                  {g.subtitle}
                </div>
              </div>
              <button className="btn btn--primary" onClick={() => go(g)}>
                Fix
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
