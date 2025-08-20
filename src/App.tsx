import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Register from "./pages/Register";
import EmailLogin from "./pages/EmailLogin";
import PhoneOtpLogin from "./pages/PhoneOtpLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import RedirectToOwnProfile from "./pages/RedirectToOwnProfile";
import PublicProfilePage from "./pages/PublicProfilePage";
import VerifyPhone from "./pages/VerifyPhone";            // optional page (not forced)
import EditProfile from "./pages/EditProfile";
import ContactsPage from "./pages/ContactsPage";
import ReferralFeed from "./pages/ReferralFeed";
import CreateReferralForm from "./components/CreateReferralForm";
import ReferralThread from "./components/ReferralThread";
// import ReferralDetails from "./pages/ReferralDetails";
import UserSettingsForm from "./pages/UserSettingsForm";
import OfferTemplates from "./pages/OfferTemplates";
import AddOfferTemplate from "./pages/AddOfferTemplate";
import EditOfferTemplate from "./pages/EditOfferTemplate";
import OfferTemplateDetails from "./pages/OfferTemplateDetails";
import OfferDetailsPage from "./pages/OfferDetails";
import AddContactForm from "./pages/AddContactForm";
import QRCodePage from "./pages/QRCodePage";
import LandingPage from "./pages/LandingPage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { supabase } from "./supabaseClient";
import axios from "axios";
import "./css/base.css";

interface UserProfile {
  phone: string;
  slug: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  profession?: string;
  birthday?: string;
  linkedinUrl?: string;
  registeredAsBusiness?: boolean;
  phoneVerified?: boolean;
}

const AppInner: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    phone: "",
    slug: "",
    firstName: "",
    lastName: "",
    address: "",
    profileImageUrl: "",
    bio: "",
  });

  const location = useLocation();

  // 🔎 Detect recovery flow (Supabase verify -> redirect with type=recovery)
  const isRecoveryFlow =
    location.pathname === "/reset-password" ||
    location.search.includes("type=recovery") ||
    location.hash.includes("type=recovery");

  // Keep session in sync
  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) setSession(session);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile once when logged in (used by EditProfile / OfferTemplates props)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!session?.access_token) return;
      try {
        const { data } = await axios.get(`${__API_BASE__}/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!cancelled) setProfile(data);
      } catch (e) {
        // Non-fatal: pages can still fetch what they need
        if (!cancelled) console.warn("Profile fetch failed in App:", e);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const userId = session?.user?.id ?? "";

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const { data } = await axios.get(`${__API_BASE__}/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setProfile(data);
    } catch (e) {
      console.warn("Profile refresh failed:", e);
    }
  }, [session?.access_token]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    const { registeredAsBusiness: _omit, slug: _omit2, ...payload } = profile;

    await axios.post(`${__API_BASE__}/profile`, payload, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  };

  const handleImageUpload = (url: string) => {
    setProfile((prev) => ({ ...prev, profileImageUrl: url }));
  };

  return (
    <>
      <Header />
      <div className="p-4">
      <Routes>
        {/* ✅ Always expose reset route so recovery can land here even with a session */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} /> 

        {/* Public routes if NOT logged in OR if we're in a recovery flow */}
        {!session || isRecoveryFlow ? (
          <>
            {/* Landing page (public) */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth-related public routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/email-login" element={<EmailLogin />} />
            <Route path="/phone-login" element={<PhoneOtpLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* optional public access to verify page (can remove if you want) */}
            <Route path="/verify-phone" element={<VerifyPhone />} />

            {/* Default for public: go to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            {/* Profile routes */}
            <Route path="/profile" element={<RedirectToOwnProfile />} />
            <Route path="/profile/:slug" element={<PublicProfilePage />} />
            <Route
              path="/profile/edit"
              element={
                <EditProfile
                  profile={profile}
                  userId={userId}
                  onChange={handleProfileChange}
                  onSubmit={handleProfileSubmit}
                  onProfileRefresh={refreshProfile}
                  onImageUpload={handleImageUpload}
                />
              }
            />

            {/* App routes */}
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/add" element={<AddContactForm />} />
            <Route path="/referrals" element={<ReferralFeed />} />
            <Route path="/referrals/new" element={<CreateReferralForm />} />
            <Route path="/referral/:slug/thread" element={<ReferralThread />} />
            <Route path="/settings" element={<UserSettingsForm />} />
            <Route
              path="/offer-templates"
              element={<OfferTemplates profile={profile} userId={userId} token={session.access_token} />}
            />
            <Route
              path="/add-offer-template"
              element={<AddOfferTemplate profile={profile} userId={userId} token={session.access_token} />}
            />
            <Route path="/offer-template/:templateId" element={<OfferTemplateDetails token={session.access_token} />} />
            <Route path="/offer-template/:templateId/edit" element={<EditOfferTemplate token={session.access_token} />} />
            <Route path="/offers/:assignedOfferId" element={<OfferDetailsPage />} />
            <Route path="/qrcode" element={<QRCodePage />} />

            {/* For authed users: / → /profile */}
            <Route path="/" element={<Navigate to="/profile" replace />} />

            {/* Default for authed users */}
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </>
        )}
      </Routes>

      </div>
      <Footer />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppInner />
    </Router>
  );
};

export default App;
