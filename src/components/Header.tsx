import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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

  // Keep session in sync
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setSession(session);
      if (!session) {
        // session missing at bootstrap -> clear cached routing hints
        sessionStorage.removeItem("profileSlug");
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
      if (!nextSession) {
        // user signed out / session expired -> clear cached routing hints
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
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: ctrl.signal,
        });
        setIsBusiness(Boolean(res.data?.registeredAsBusiness));
      } catch (e) {
        if (!(e as any)?.message?.includes("canceled")) {
          console.error("Failed to fetch profile in header", e);
        }
      }
    })();
    return () => ctrl.abort();
  }, [session?.access_token]);

  const handleLogout = async () => {
    // Clear any cached navigation hints
    sessionStorage.removeItem("profileSlug");
    // (optional) clear any other app-specific caches here
    // sessionStorage.removeItem("lastVisitedReferralSlug");

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
                <NavLink to="/offer-templates" className={({ isActive }) => (isActive ? "active" : "")}>
                  Offer Templates
                </NavLink>
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
