// src/components/Header.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import axios from "axios";
import "../css/Header.css";
import { Session } from '@supabase/supabase-js';

const Header = () => {
  const [session, setSession] = useState<Session| null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile info to check if user is a business
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.access_token) return;
      try {
        const response = await axios.get(`${__API_BASE__}/profile`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (response.data?.registeredAsBusiness) {
          setIsBusiness(true);
        }
      } catch (err) {
        console.error("Failed to fetch profile in header", err);
      }
    };

    fetchProfile();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/email-login");
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">TriHola</Link>
        <nav className="nav-links">
          {session ? (
            <>
              <Link to="/profile">Profile</Link>
              <Link to="/referrals">Referrals</Link>
              <Link to="/contacts">Contacts</Link>
              <Link to="/settings">Settings</Link>
              {isBusiness && (
                <Link to="/offer-templates">Offer Templates</Link>
              )}
              <button onClick={handleLogout} className="underline text-red-300">Logout</button>
            </>
          ) : (
            <>
              <Link to="/register">Register</Link>
              <Link to="/email-login">Login with Email</Link>
              <Link to="/phone-login">Login with Phone</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
