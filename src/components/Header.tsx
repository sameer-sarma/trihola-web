import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "../css/Header.css";
import logo from "../assets/logo.png";
import AppLauncher from "./AppLauncher";
import { getOwnProfile } from "../services/profileService";
import {
  getTriholaAuthSession,
  logoutTrihola,
  type TriholaAuthMode,
} from "../utils/auth";
import { supabase } from "../supabaseClient";

function isSafeInternalPath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function makeAuthHref(base: string, next?: string | null) {
  if (!next || next === "/" || next === "/app") return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

const Header = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<TriholaAuthMode | null>(null);

  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [isTriholaAdmin, setIsTriholaAdmin] = useState(false);

  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const forwardedNext = params.get("next");

    const isAuthRoute =
      location.pathname.startsWith("/email-login") ||
      location.pathname.startsWith("/phone-login") ||
      location.pathname.startsWith("/register");

    if (isAuthRoute) {
      if (forwardedNext && isSafeInternalPath(forwardedNext)) {
        return decodeURIComponent(forwardedNext);
      }
      return null;
    }

    const current =
      location.pathname + location.search + location.hash;

    if (current === "/") return null;

    return current;
  }, [location.pathname, location.search, location.hash]);

  const emailLoginHref = useMemo(
    () => makeAuthHref("/email-login", next),
    [next]
  );

  const phoneLoginHref = useMemo(
    () => makeAuthHref("/phone-login", next),
    [next]
  );

  const registerHref = useMemo(
    () => makeAuthHref("/register", next),
    [next]
  );

  useEffect(() => {
    let mounted = true;

    async function syncAuth() {
      const triSession = await getTriholaAuthSession();

      if (!mounted) return;

      setAuthToken(triSession.accessToken);
      setAuthMode(triSession.authMode);

      if (!triSession.accessToken) {
        setUserLabel(null);
        setIsTriholaAdmin(false);

        setProfileSlug(null);
        setAvatarUrl(null);

        sessionStorage.removeItem("profileSlug");
        return;
      }

      setUserLabel(
        triSession.authMode === "PHONE_OTP"
          ? "Phone OTP login"
          : "Signed in"
      );
    }

    syncAuth();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(() => {
        syncAuth();
      });

    window.addEventListener(
      "trihola-auth-changed",
      syncAuth
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();

      window.removeEventListener(
        "trihola-auth-changed",
        syncAuth
      );
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setIsTriholaAdmin(false);
      return;
    }

    const onRedirectingRoute =
      location.pathname === "/profile" ||
      location.pathname.startsWith("/verify");

    if (onRedirectingRoute) return;

    (async () => {
      try {
        const profile = await getOwnProfile(authToken);

        setIsTriholaAdmin(
          authMode === "PHONE_OTP"
            ? false
            : Boolean(profile?.isTriholaAdmin)
        );

        const fullName = [
          profile?.firstName,
          profile?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        setUserLabel(
          fullName ||
            profile?.slug ||
            (authMode === "PHONE_OTP"
              ? "Phone OTP login"
              : "Signed in")
        );

        setProfileSlug(profile?.slug ?? null);
        setAvatarUrl(profile?.profileImageUrl ?? null);

        if (profile?.slug) {
          sessionStorage.setItem(
            "profileSlug",
            profile.slug
          );
        }
      } catch (e) {
        console.error(
          "Failed to fetch profile in header",
          e
        );

        setIsTriholaAdmin(false);
      }
    })();
  }, [authToken, authMode, location.pathname]);

  const handleLogout = async () => {
    sessionStorage.removeItem("profileSlug");

    await logoutTrihola();

    navigate("/", { replace: true });
  };

  const isLoggedIn = Boolean(authToken);

  const profileHref = profileSlug
    ? `/profile/${profileSlug}`
    : "/profile";

  const logoHref = isLoggedIn
    ? profileHref
    : "/";

  return (
    <header className="header">
      <div className="header-container">
        <Link to={logoHref} className="logo">
          <img
            src={logo}
            alt="TriHola logo"
            className="logo-img"
          />
          <span className="logo-text">
            TriHola
          </span>
        </Link>

        <nav
          className="nav-links"
          aria-label="Primary"
        >
          {isLoggedIn ? (
            <>
              <NavLink
                to="/threads"
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Threads
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to={registerHref}
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Register
              </NavLink>

              <NavLink
                to={emailLoginHref}
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Login with Email
              </NavLink>

              <NavLink
                to={phoneLoginHref}
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Login with Phone
              </NavLink>
            </>
          )}
        </nav>

        <div className="header-tools">
          <AppLauncher
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            userLabel={userLabel}
            avatarUrl={avatarUrl}
            isTriholaAdmin={isTriholaAdmin}
            profileHref={profileHref}
            isOtpReadOnly={
              authMode === "PHONE_OTP"
            }
          />
        </div>
      </div>
    </header>
  );
};

export default Header;