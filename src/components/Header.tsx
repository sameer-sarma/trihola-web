import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";
import "../css/Header.css";
import type { Session } from "@supabase/supabase-js";
import logo from "../assets/logo.png";
import AppLauncher from "./AppLauncher";
import { NotificationBell } from "./NotificationBell";

const API_BASE = import.meta.env.VITE_API_BASE as string;

const Header = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Build "next" (current URL) for login redirects
  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const forwardedNext = params.get("next");

    const isAuthRoute =
      location.pathname.startsWith("/email-login") ||
      location.pathname.startsWith("/register");

    // ✅ If we are already on login/register and a next exists, preserve it
    if (
      isAuthRoute &&
      forwardedNext &&
      forwardedNext.startsWith("/") &&
      !forwardedNext.startsWith("//")
    ) {
      return decodeURIComponent(forwardedNext);
    }

    // Otherwise, derive next from current location
    const current = location.pathname + location.search + location.hash;

    // Avoid redirect loops
    if (current.startsWith("/email-login") || current.startsWith("/register")) {
      return "/start";
    }

    return current;
  }, [location.pathname, location.search, location.hash]);

  const emailLoginHref = useMemo(() => {
    return `/email-login?next=${encodeURIComponent(next)}`;
  }, [next]);

  // Keep session in sync and clear cached slug when signed out
  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

    // After logout, go to login and keep user on the same page after re-login
    navigate(`/email-login?next=${encodeURIComponent(next)}`, { replace: true });
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <img src={logo} alt="TriHola logo" className="logo-img" />
          <span className="logo-text">TriHola</span>
        </Link>

        {/* Primary nav */}
        <nav className="nav-links" aria-label="Primary">
          {session ? (
            <>
              <NavLink to="/referrals" className={({ isActive }) => (isActive ? "active" : "")}>
                Referrals
              </NavLink>

              <NavLink to="/invites" className={({ isActive }) => (isActive ? "active" : "")}>
                Invites
              </NavLink>

              <NavLink to="/my-offers" className={({ isActive }) => (isActive ? "active" : "")}>
                My Offers
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to={`/register?next=${encodeURIComponent(next)}`}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Register
              </NavLink>

              {/* ✅ Login preserves current location */}
              <NavLink
                to={emailLoginHref}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Login with Email
              </NavLink>
            </>
          )}
        </nav>

        {/* Right-side tools: App Launcher (always visible; adapts to auth) */}
        <div className="header-tools">
          <AppLauncher
            isLoggedIn={!!session}
            isBusiness={isBusiness}
            onLogout={handleLogout}
            userLabel={session?.user?.email ?? null}
            avatarUrl={null /* plug your profile avatar URL if you have it */}
          />
          {session && <NotificationBell />}
        </div>
      </div>
    </header>
  );
};

export default Header;
