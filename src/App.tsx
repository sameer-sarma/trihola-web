import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationsWSProvider } from "./context/NotificationsWSProvider";
import { useBootstrap } from "./hooks/useBootstrap";
import AppGate from "./components/AppGate";
import Register from "./pages/Register";
import EmailLogin from "./pages/EmailLogin";
import PhoneOtpLogin from "./pages/PhoneOtpLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import StartWelcome from "./pages/StartWelcome";
import RedirectToOwnProfile from "./pages/RedirectToOwnProfile";
import PublicProfilePage from "./pages/PublicProfilePage";
import VerifyPhone from "./pages/VerifyPhone";            // optional page (not forced)
import EditProfile from "./pages/EditProfile";
import ContactsPage from "./pages/ContactsPage";
import ReferralFeed from "./pages/ReferralFeed";
import CreateReferralForm from "./components/CreateReferralForm";
import ReferralThread from "./components/ReferralThread";
import UserSettingsForm from "./pages/UserSettingsForm";
import OfferTemplates from "./pages/OfferTemplates";
import AddOfferTemplate from "./pages/AddOfferTemplate";
import EditOfferTemplate from "./pages/EditOfferTemplate";
import OfferTemplateDetails from "./pages/OfferTemplateDetails";
import OfferDetailsPage from "./pages/OfferDetails";
import AddContactForm from "./pages/AddContactForm";
import QRCodePage from "./pages/QRCodePage";
import LandingPage from "./pages/LandingPage";
import EcomIntegrations from "./pages/EcomIntegrations";
import AddEcomIntegration from "./pages/AddEcomIntegration";
import EditEcomIntegration from "./pages/EditEcomIntegration";
import ProductsList from "./pages/ProductsList";
import AddProduct from "./pages/AddProduct";
import ProductDetails from "./pages/ProductDetails";
import EditProduct from "./pages/EditProduct";
import BundleDetails from "./pages/BundleDetails";
import CampaignsList from "./pages/CampaignsList";
import CampaignCreatePage from "./pages/CampaignCreatePage";
import CampaignDetailsPage from "./pages/CampaignDetailsPage";
import EditCampaign from "./pages/EditCampaign";
import SendCampaignInvite from "./pages/SendCampaignInvite";
import CampaignHubPage from "./pages/CampaignHubPage";
import InviteFeed from "./pages/InviteFeed";
import InviteLandingPage from "./pages/InviteLandingPage";
import InviteThreadPage from "./pages/InviteThreadPage";
import PublicCampaignInvitePage from "./pages/PublicCampaignInvitePage";
import WalletPolicyEditor from "./pages/WalletPolicyEditor";
import MyInvitesPage from './pages/MyInvitesPage';
import WalletStorePage from "./pages/WalletStorePage";
import MyOffers from "./pages/MyOffers";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { supabase } from "./supabaseClient";
import axios from "axios";
import "./css/base.css";
import { getMyBusiness } from "./services/profileService";
import {fetchMyContacts} from "./services/contactService";
import type { Contact } from "./types/invites";
import PublicReferralPage from './pages/PublicReferralPage';
import OpenReferralLandingPage from "./pages/OpenReferralLandingPage";
import { OpenCampaignInviteLandingPage } from "./pages/OpenCampaignInviteLandingPage";

const API_BASE = import.meta.env.VITE_API_BASE as string;

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

interface BusinessProfile {
  userId: string;
  businessName?: string;
  businessDescription?: string;
  businessWebsite?: string;
  businessSlug?: string;
  registeredAt?: string;
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

   // Business profile (new)
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  const location = useLocation();
  const boot = useBootstrap(session?.access_token);

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
        error,
      } = await supabase.auth.getSession();
    // If error OR if session exists but token is expired → treat as logged out
    if (error || !session || (session.expires_at && session.expires_at * 1000 < Date.now())) {
      setSession(null);
    } else {
      setSession(session);
    }
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
        const { data } = await axios.get(`${API_BASE}/profile`, {
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

  // 🔄 When the user is a business, fetch the business profile to get its slug
  useEffect(() => {
    let cancelled = false;
    const loadBusiness = async () => {
      if (!session?.access_token) return;
      if (!profile?.registeredAsBusiness) {
        if (!cancelled) setBusiness(null);
        return;
      }
      try {
        const data = await getMyBusiness(session.access_token);
        if (!cancelled) setBusiness(data);
      } catch (e) {
   if (!cancelled) { setBusiness(null); console.warn("getMyBusiness failed:", e); }      }
    };
    loadBusiness();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token, profile?.registeredAsBusiness]);

useEffect(() => {
  if (!boot.loading && boot.data) {
    console.log("BOOTSTRAP:", {
      completion: boot.data.profile.completionPercent,
      referrals: boot.data.referrals.count,
      rewards: boot.data.rewards.count,
      affiliate: boot.data.affiliateCampaigns.count,
      hasPriorActivity: boot.hasPriorActivity,
      nextRoute: boot.nextRoute,
    });
  }
}, [
  boot.loading,
  boot.data,
  boot.hasPriorActivity,
  boot.nextRoute,
]);

  const userId = session?.user?.id ?? "";

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/profile`, {
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

    await axios.post(`${API_BASE}/profile`, payload, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  };

  const handleImageUpload = (url: string) => {
    setProfile((prev) => ({ ...prev, profileImageUrl: url }));
  };

    // expose the business slug for children that need it
  const businessSlug = business?.businessSlug;
  const businessId = userId;
 
function SendCampaignInviteRoute({ token }: { token?: string }) {
  const { id } = useParams<{ id: string }>(); // hook 1 (always)
  const q = useQuery<Contact[]>({             // hook 2 (always)
    queryKey: ["contacts", token],
    queryFn: () => fetchMyContacts(token),
    enabled: !!id,                            // don’t fetch until we have an id
  });

  if (!id) return <Navigate to="/campaigns" replace />;
  if (q.status === "pending") return <div className="loading">Loading contacts…</div>;
  if (q.status === "error") return <div className="error-banner">{(q.error as Error).message}</div>;

  return (
    <SendCampaignInvite
      campaignId={id}
      token={token}
      contacts={q.data ?? []}
      businessName={undefined}
    />
  );
}

function InviteLandingRoute({ token }: { token?: string }) {
  const { inviteId } = useParams<{ inviteId: string }>();
  if (!inviteId) return <Navigate to="/campaigns" replace />;
  return <InviteLandingPage inviteId={inviteId} token={token} />;
}

  return (
    <>
      <Header />
      <div className="p-4">
      <Routes>
        {/* ✅ Always expose reset route so recovery can land here even with a session */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} /> 
        <Route path="/r/:slug" element={<PublicReferralPage />} />
        <Route path="/open/:slug" element={<OpenReferralLandingPage />} />
        <Route path="/campaign-invite/:inviteId" element={<PublicCampaignInvitePage />} />
        <Route path="/campaign-open/:campaignSlug/:openInviteSlug" element={<OpenCampaignInviteLandingPage />} />
        
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
            {/* Gate */}
            <Route path="/app" element={<AppGate boot={boot} />} />
            
            {/* Onboarding */}
            <Route
              path="/start"
              element={
                boot.loading ? (
                  <div className="loading">Loading…</div>
                ) : boot.error ? (
                  <div className="error-banner">{boot.error}</div>
                ) : boot.data ? (
                  <StartWelcome bootstrap={boot.data} />
                ) : (
                  <div className="loading">Loading…</div>
                )
              }
            />

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
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/new" element={<AddProduct />} />
            <Route path="/products/:slug" element={<ProductDetails />} />
            <Route path="/products/:slug/edit" element={<EditProduct />} />
            <Route path="/:businessSlug/products" element={<ProductsList />} />
            <Route path="/:businessSlug/:productSlug" element={<ProductDetails />} />
            <Route path="/:businessSlug/bundle/:bundleSlug" element={<BundleDetails />} />
            <Route path="/:businessSlug/wallet-store" element={<WalletStorePage />} />
            <Route path="/referrals" element={<ReferralFeed />} />
            <Route path="/referrals/new" element={<CreateReferralForm />} />
            <Route path="/referral/:slug/thread" element={<ReferralThread />} />
            <Route path="/my-offers" element={<MyOffers />} />
            <Route path="/settings" element={<UserSettingsForm />} />
            <Route
              path="/offer-templates"
              element={<OfferTemplates profile={profile} userId={userId} token={session.access_token} businessSlug={businessSlug} />}
            />
            <Route
              path="/add-offer-template"
              element={<AddOfferTemplate profile={profile} userId={userId} token={session.access_token} businessSlug={businessSlug}/>}
            />
            <Route path="/offer-template/:templateId" element={<OfferTemplateDetails token={session.access_token} />} />
            <Route path="/offer-template/:templateId/edit" element={<EditOfferTemplate token={session.access_token} businessSlug={businessSlug}/>} />
            <Route path="/offers/:assignedOfferId" element={<OfferDetailsPage />} />
            <Route path="/qrcode" element={<QRCodePage />} />
            <Route path="/campaigns" element={<CampaignHubPage />} />
            <Route path="/campaigns/my-invites" element={<MyInvitesPage token={session.access_token} />} />
            <Route path="/campaigns/owned" element={<CampaignsList />} />
            <Route path="/campaigns/new" element={<CampaignCreatePage token={session.access_token} businessSlug={businessSlug}/>} />
            <Route path="/campaigns/:id" element={<CampaignDetailsPage token={session.access_token}/>} />
            <Route path="/campaigns/:id/:section" element={<CampaignDetailsPage token={session.access_token} />} />
            <Route path="/campaigns/:id/edit" element={<EditCampaign token={session.access_token} />} />
            <Route path="/campaigns/:id/invites/send" element={<SendCampaignInviteRoute token={session.access_token} />} />
            <Route path="/campaigns/:campaignId/invites/:inviteId/thread" element={<InviteThreadPage />} />
            <Route path="/invites" element={<InviteFeed />} />
            <Route path="/invites/:inviteId" element={<InviteLandingRoute token={session.access_token} />} />
            <Route path="/wallet-policies" element={<WalletPolicyEditor businessId={businessId} token={session.access_token} />} />

            <Route path="/ecom" element={<EcomIntegrations token={session.access_token} profile={profile} userId={userId} />} />
            <Route path="/ecom/add" element={<AddEcomIntegration token={session.access_token} profile={profile} userId={userId} businessId={userId} />} />
            <Route path="/ecom/:integrationId/edit" element={<EditEcomIntegration token={session.access_token} profile={profile} />} />
            {/* For authed users: / → /profile */}
            <Route path="/" element={<Navigate to="/app" replace />} />

            {/* Default for authed users */}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </>
        )}
      </Routes>

      </div>
      <Footer />
    </>
  );
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsWSProvider>
        <Router>
          <AppInner />
        </Router>
      </NotificationsWSProvider>
    </QueryClientProvider>
  );
};

export default App;
