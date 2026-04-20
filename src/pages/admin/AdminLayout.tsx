import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../../css/admin.css";

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("profileSlug");
      await supabase.auth.signOut();
    } finally {
      navigate("/email-login", { replace: true });
    }
  };

  return (
    <div className="adminLayout">
      <aside className="adminSide">
        <div className="adminBrand">
          <div className="adminBrand__title">Trihola Admin</div>
          <div className="adminBrand__sub">Approvals & moderation</div>
          <div className="app-meta" style={{ marginTop: 10 }}>
            <span className="app-chip">Console</span>
          </div>
        </div>

        <nav className="adminNav">
          <NavLink
            to="/admin/businesses"
            className={({ isActive }) => cx("adminNav__link", isActive && "is-on")}
          >
            Businesses
          </NavLink>

          <span className="adminNav__link is-disabled" title="Coming soon">
            Users (soon)
          </span>
          <span className="adminNav__link is-disabled" title="Coming soon">
            Referrals (soon)
          </span>
          <span className="adminNav__link is-disabled" title="Coming soon">
            Audit (soon)
          </span>
          <span className="adminNav__link is-disabled" title="Coming soon">
            Settings (soon)
          </span>
        </nav>

        <div className="adminSide__footer">
          <button className="btn btn--ghost" type="button" onClick={() => navigate("/profile")}>
            Back to app
          </button>
          <button className="btn btn--danger" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="adminMain">
        <Outlet />
      </main>
    </div>
  );
}
