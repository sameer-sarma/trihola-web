import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import EmailLogin from "./pages/EmailLogin";
import PhoneOtpLogin from "./pages/PhoneOtpLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RedirectToOwnProfile from "./pages/RedirectToOwnProfile";
import PublicProfilePage from "./pages/PublicProfilePage";
import VerifyPhone from "./pages/VerifyPhone";
import EditProfile from "./pages/EditProfile";
import ContactsPage from "./pages/ContactsPage";
import ReferralFeed from "./pages/ReferralFeed";
import CreateReferralForm from "./components/CreateReferralForm";
import ReferralThread from "./components/ReferralThread";
//import ReferralDetails from "./pages/ReferralDetails";
import UserSettingsForm from "./pages/UserSettingsForm";
import OfferTemplates from "./pages/OfferTemplates";
import AddOfferTemplate from "./pages/AddOfferTemplate";
import EditOfferTemplate from "./pages/EditOfferTemplate";
import OfferTemplateDetails from "./pages/OfferTemplateDetails";
import OfferDetailsPage from "./pages/OfferDetails";
import AddContactForm from "./pages/AddContactForm";
import QRCodePage from "./pages/QRCodePage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { supabase } from "./supabaseClient";
import axios from "axios";

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
  phoneVerified: boolean;
}

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>({
    phone: "",
    slug: "",
    firstName: "",
    lastName: "",
    address: "",
    profileImageUrl: "",
    bio: "",
    phoneVerified: false,
  });

  // 🔁 Tri-state so we don't mount VerifyPhone until profile is known
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      // Avoid duplicate fetches in React StrictMode/dev or when session object changes shape
      if (lastFetchedUserId.current === userId && phoneVerified !== null) return;
      lastFetchedUserId.current = userId;

      const ctrl = new AbortController();
      setLoadingProfile(true);
      try {
        const { data } = await axios.get(`${__API_BASE__}/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: ctrl.signal,
        });
        setProfile(data);
        setPhoneVerified(data.phoneVerified);
      } catch {
        setPhoneVerified(false);
      } finally {
        setLoadingProfile(false);
      }

      return () => ctrl.abort();
    };

    fetchProfile();
    // Only depend on the stable identifier to prevent noisy re-runs
  }, [session?.user?.id, session?.access_token, phoneVerified]);

  const userId = session?.user?.id ?? "";

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const { registeredAsBusiness: _, slug: __, ...payload } = profile;

    await axios.post(`${__API_BASE__}/profile`, payload, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  };

  const handleImageUpload = (url: string) => {
    setProfile(prev => ({ ...prev, profileImageUrl: url }));
  };

  return (
    <Router>
      <Header />
      <div className="p-4">
        <Routes>
          {!session ? (
            <>
              <Route path="/register" element={<Register />} />
              <Route path="/email-login" element={<EmailLogin />} />
              <Route path="/phone-login" element={<PhoneOtpLogin />} />
              <Route path="/verify-phone" element={<VerifyPhone />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/register" />} />
            </>
          ) : phoneVerified === null ? (
            <>
              {/* While profile is loading, render a simple loading route so VerifyPhone doesn't mount yet */}
              <Route path="*" element={<div>Loading your profile…{loadingProfile ? " (contacting server)" : ""}</div>} />
            </>
          ) : !phoneVerified ? (
            <>
              <Route path="/verify-phone" element={<VerifyPhone onComplete={() => setPhoneVerified(true)} />} />
              <Route path="*" element={<Navigate to="/verify-phone" />} />
            </>
          ) : (
            <>
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
                    onImageUpload={handleImageUpload}
                  />
                }
              />
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
            </>
          )}
        </Routes>
      </div>
      <Footer />
    </Router>
  );
};

export default App;
