import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function getTokensFromUrl(locHash: string, locSearch: string) {
  const hash = new URLSearchParams(locHash.startsWith("#") ? locHash.slice(1) : locHash);
  const search = new URLSearchParams(locSearch);
  // Prefer hash (Supabase default), but support query just in case.
  const access_token = hash.get("access_token") ?? search.get("access_token") ?? undefined;
  const refresh_token = hash.get("refresh_token") ?? search.get("refresh_token") ?? undefined;
  const type = hash.get("type") ?? search.get("type") ?? undefined; // e.g. signup, magiclink
  return { access_token, refresh_token, type };
}

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      console.log("[AuthCallback] location.hash:", location.hash);
      console.log("[AuthCallback] location.search:", location.search);

      const { access_token, refresh_token, type } = getTokensFromUrl(location.hash, location.search);
      console.log("[AuthCallback] parsed tokens. type:", type, "access?", !!access_token, "refresh?", !!refresh_token);

      // 1) If tokens are present, set the session
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (cancelled) return;
        if (error) {
          console.error("[AuthCallback] setSession error:", error);
          setError(error.message || "Failed to initialize session.");
          return;
        }
      }

      // 2) Subscribe to auth changes; navigate once session is established
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("[AuthCallback] onAuthStateChange:", event, "session?", !!session);
        if (session && !cancelled) {
          // Clean the hash so refresh doesn't re-run
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          navigate("/profile", { replace: true });
        }
      });

      // 3) Fallback: if we already HAVE a session (e.g., tokens were already set), go now
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        console.log("[AuthCallback] getSession() returned a session; navigating to /profile");
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        navigate("/profile", { replace: true });
      } else {
        console.log("[AuthCallback] No session yet, waiting for onAuthStateChange…");
      }

      // Cleanup
      return () => { sub.subscription.unsubscribe(); };
    })();

    return () => { cancelled = true; };
  }, [location.hash, location.search, navigate]);

  return (
    <div className="max-w-sm mx-auto p-4 border rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-2">Signing you in…</h3>
      {!error ? <p>Just a moment.</p> : <p className="text-red-600">{error}</p>}
    </div>
  );
};

export default AuthCallback;
