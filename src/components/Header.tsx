import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";
import "../css/Header.css";
import type { Session } from "@supabase/supabase-js";
import logo from "../assets/logo.png";

const API_BASE = import.meta.env.VITE_API_BASE as string;

const Header = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep session in sync and clear cached slug when signed out
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setSession(session);
      if (!session) {
        sessionStorage.removeItem("profileSlug");
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
      if (!nextSession) {
        sessionStorage.removeItem("profileSlug");
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile to know if user is a business
  useEffect(() => {
    if (!session?.access_token) {
      setIsBusiness(false);
      return;
    }

    // ✅ Skip fetching on routes that immediately redirect/fetch profile anyway
    const onRedirectingRoute =
      location.pathname === "/profile" || location.pathname.startsWith("/verify");
    if (onRedirectingRoute) return;

    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: ctrl.signal,
        });
        setIsBusiness(Boolean(res.data?.registeredAsBusiness));
      } catch (e: any) {
        if (e?.code !== "ERR_CANCELED") {
          console.error("Failed to fetch profile in header", e);
        }
      }
    })();

    return () => ctrl.abort();
  }, [session?.access_token, location.pathname]);

  const handleLogout = async () => {
    sessionStorage.removeItem("profileSlug");
    await supabase.auth.signOut();
    navigate("/email-login", { replace: true });
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <img src={logo} alt="TriHola logo" className="logo-img" />
          <span className="logo-text">TriHola</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {session ? (
            <>
              <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
                Profile
              </NavLink>
              <NavLink to="/referrals" className={({ isActive }) => (isActive ? "active" : "")}>
                Referrals
              </NavLink>
              <NavLink to="/contacts" className={({ isActive }) => (isActive ? "active" : "")}>
                Contacts
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
                Settings
              </NavLink>
              {isBusiness && (
                <>
                <NavLink to="/offer-templates" className={({ isActive }) => (isActive ? "active" : "")}>
                  Offer Templates
                </NavLink>
                <NavLink to="/ecom" className={({ isActive }) => (isActive ? "active" : "")}>
                   E-commerce
                </NavLink>
                </>
              )}
              <button onClick={handleLogout} className="logout-btn" aria-label="Logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>
                Register
              </NavLink>
              <NavLink to="/email-login" className={({ isActive }) => (isActive ? "active" : "")}>
                Login with Email
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
