// src/components/AppLauncher.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../css/appLauncher.css";

type Props = {
  isLoggedIn: boolean;
  isBusiness: boolean;
  onLogout?: () => void;
  avatarUrl?: string | null;
  userLabel?: string | null; // e.g., email or name (optional)
};

export default function AppLauncher({
  isLoggedIn = false,
  isBusiness = false,
  onLogout,
  avatarUrl,
  userLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click / escape
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="app-launcher" ref={ref}>
      <button
        type="button"
        aria-label="Open app menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="al-trigger"
        title="Apps"
        onClick={() => setOpen((v) => !v)}
      >
        {/* High-contrast grid icon (inline SVG) */}
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <g fill="currentColor">
            <circle cx="4" cy="4" r="2" />
            <circle cx="10" cy="4" r="2" />
            <circle cx="16" cy="4" r="2" />
            <circle cx="4" cy="10" r="2" />
            <circle cx="10" cy="10" r="2" />
            <circle cx="16" cy="10" r="2" />
            <circle cx="4" cy="16" r="2" />
            <circle cx="10" cy="16" r="2" />
            <circle cx="16" cy="16" r="2" />
          </g>
        </svg>
      </button>

      {open && (
        <div role="menu" className="al-panel">
          {isLoggedIn ? (
            <>
              {/* optional user header */}
              <div className="al-user">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="al-avatar" />
                ) : (
                  <div className="al-avatar al-avatar-fallback">👤</div>
                )}
                <div className="al-user-info">
                  <div className="al-user-label">{userLabel ?? "Signed in"}</div>
                  <div className="al-user-sub">Manage your workspace</div>
                </div>
              </div>
              <div className="al-sep" />

              {/* Apps */}
              <Link to="/products" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="al-icon">📦</span>
                <div>
                  <div className="al-title">Products</div>
                  <div className="al-sub">Manage catalog</div>
                </div>
              </Link>

              <Link to="/referrals" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="al-icon">🔗</span>
                <div>
                  <div className="al-title">Referrals</div>
                  <div className="al-sub">Share & track</div>
                </div>
              </Link>

              <Link to="/contacts" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="al-icon">👥</span>
                <div>
                  <div className="al-title">Contacts</div>
                  <div className="al-sub">Clients & leads</div>
                </div>
              </Link>

              {isBusiness && (
                <>
                  <Link to="/offer-templates" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="al-icon">🏷️</span>
                    <div>
                      <div className="al-title">Offer Templates</div>
                      <div className="al-sub">Promos & bundles</div>
                    </div>
                  </Link>

                  <Link to="/ecom" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="al-icon">🛍️</span>
                    <div>
                      <div className="al-title">E-commerce</div>
                      <div className="al-sub">Store integrations</div>
                    </div>
                  </Link>
                </>
              )}

              <Link to="/settings" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="al-icon">⚙️</span>
                <div>
                  <div className="al-title">Settings</div>
                  <div className="al-sub">Preferences</div>
                </div>
              </Link>

              <div className="al-sep" />
              <button
                type="button"
                className="al-item al-logout"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
              >
                <span className="al-icon">🚪</span>
                <div>
                  <div className="al-title">Logout</div>
                </div>
              </button>
            </>
          ) : (
            <>
              <div className="al-user">
                <div className="al-avatar al-avatar-fallback">🙂</div>
                <div className="al-user-info">
                  <div className="al-user-label">Welcome to TriHola</div>
                  <div className="al-user-sub">Sign in to access all apps</div>
                </div>
              </div>
              <div className="al-sep" />

              <Link to="/register" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="al-icon">🆕</span>
                <div>
                  <div className="al-title">Register</div>
                  <div className="al-sub">Create your account</div>
                </div>
              </Link>

              <Link to="/email-login" className="al-item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="al-icon">🔐</span>
                <div>
                  <div className="al-title">Login</div>
                  <div className="al-sub">Access TriHola</div>
                </div>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
