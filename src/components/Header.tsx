import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../css/Header.css";
import type { Session } from "@supabase/supabase-js";
import logo from "../assets/logo.png";
import AppLauncher from "./AppLauncher";
import { NotificationBell } from "./NotificationBell";
import { getOwnProfile } from "../services/profileService";

function isSafeInternalPath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function makeAuthHref(base: string, next?: string | null) {
  // Avoid noisy URLs like ?next=%2F and meaningless roots
  if (!next || next === "/" || next === "/app") return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

const Header = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isTriholaAdmin, setIsTriholaAdmin] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const forwardedNext = params.get("next");

    const isAuthRoute =
      location.pathname.startsWith("/email-login") ||
      location.pathname.startsWith("/register");

    // ✅ On auth routes: ONLY use forwardedNext (if present & safe). Otherwise: no next.
    if (isAuthRoute) {
      if (isSafeInternalPath(forwardedNext)) return decodeURIComponent(forwardedNext!);
      return null;
    }

    // ✅ On all other routes: use current location
    const current = location.pathname + location.search + location.hash;

    // Root isn't a meaningful target—treat as "no next"
    if (current === "/") return null;

    return current;
  }, [location.pathname, location.search, location.hash]);

  const emailLoginHref = useMemo(() => makeAuthHref("/email-login", next), [next]);
  const registerHref = useMemo(() => makeAuthHref("/register", next), [next]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) setSession(session);
      if (!session) sessionStorage.removeItem("profileSlug");
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
      if (!nextSession) sessionStorage.removeItem("profileSlug");
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setIsTriholaAdmin(false);
      return;
    }

    const onRedirectingRoute =
      location.pathname === "/profile" || location.pathname.startsWith("/verify");
    if (onRedirectingRoute) return;

    const ctrl = new AbortController();

    (async () => {
      try {
        const profile = await getOwnProfile(session.access_token);
        setIsTriholaAdmin(Boolean(profile?.isTriholaAdmin));
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
    // After logout, go to login; keep next only if we have something meaningful
    navigate(makeAuthHref("/email-login", next), { replace: true });
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
                <NavLink to="/threads" className={({ isActive }) => (isActive ? "active" : "")}>
                  Threads
                </NavLink>
              </>
            ) : (
            <>
              <NavLink to={registerHref} className={({ isActive }) => (isActive ? "active" : "")}>
                Register
              </NavLink>

              <NavLink to={emailLoginHref} className={({ isActive }) => (isActive ? "active" : "")}>
                Login with Email
              </NavLink>
            </>
          )}
        </nav>

        <div className="header-tools">
          <AppLauncher
            isLoggedIn={!!session}
            onLogout={handleLogout}
            userLabel={session?.user?.email ?? null}
            avatarUrl={null}
            isTriholaAdmin={isTriholaAdmin}
          />
          {session && <NotificationBell />}
        </div>
      </div>
    </header>
  );
};

export default Header;
