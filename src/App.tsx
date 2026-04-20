import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationsWSProvider } from "./context/NotificationsWSProvider";

import Register from "./pages/Register";
import EmailLogin from "./pages/EmailLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";

import type { ContactLite } from "./components/contacts/ContactMultiSelect";
import {
  fetchMyContactsBundle,
  type ContactsBundleResponse,
} from "./services/contactService";
import { AppDataProvider } from "./context/AppDataContext";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage";

import RedirectToOwnProfile from "./pages/RedirectToOwnProfile";
import PublicProfilePage from "./pages/PublicProfilePage";
import EditProfile from "./pages/EditProfile";

import RegisterBusinessPage from "./pages/RegisterBusinessPage";
import BusinessPage from "./pages/BusinessPage";
import EditBusinessPage from "./pages/EditBusinessPage";

import ContactsPage from "./pages/ContactsPage";
import AddContactForm from "./pages/AddContactForm";

import LandingPage from "./pages/LandingPage";
import Header from "./components/Header";
import Footer from "./components/Footer";

import ProductUpsertPage from "./pages/catalog/ProductUpsertPage";
import BundleUpsertPage from "./pages/catalog/BundleUpsertPage";
import ProductViewPage from "./pages/catalog/ProductViewPage";
import BundleViewPage from "./pages/catalog/BundleViewPage";

import OfferTemplateEditor from "./pages/OfferTemplateEditor";
import OfferTemplateDetailsPage from "./pages/OfferTemplateDetails";
import OfferDetailsPage from "./pages/OfferDetailsPage";

import type { BusinessContextDTO } from "./types/business";
import { supabase } from "./supabaseClient";
import axios from "axios";

// ✅ business services
import { listMyBusinesses, getPrimaryBusiness } from "./services/businessService";
import type { BusinessContactResponse } from "./services/contactService";

// ✅ threads pages
import ThreadsInboxPage from "./pages/threads/ThreadsInboxPage";
import ThreadPage from "./pages/threads/ThreadPage";

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
  phoneVerified?: boolean;
}

function isActiveBusinessContext(b: BusinessContextDTO) {
  return (
    (b.businessStatus || "").toUpperCase() === "ACTIVE" &&
    (b.membershipStatus || "").toUpperCase() === "ACTIVE"
  );
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

  // ✅ business capability flags + contexts
  const [hasBusinessAccess, setHasBusinessAccess] = useState(false);
  const [primaryBusiness, setPrimaryBusiness] =
    useState<BusinessContextDTO | null>(null);
  const [myBusinesses, setMyBusinesses] = useState<BusinessContextDTO[]>([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  // ✅ contacts cached at app level
  const [userContacts, setUserContacts] = useState<ContactLite[]>([]);
  const [businessContacts, setBusinessContacts] = useState<BusinessContactResponse[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const location = useLocation();

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

      if (
        error ||
        !session ||
        (session.expires_at && session.expires_at * 1000 < Date.now())
      ) {
        if (mounted) setSession(null);
      } else {
        if (mounted) setSession(session);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) setSession(nextSession);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile once when logged in
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
        if (!cancelled) console.warn("Profile fetch failed in App:", e);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  /**
   * ✅ Pseudo-indicator:
   * user is considered "business-capable" if they are an ACTIVE member of any ACTIVE business.
   * Also stores active businesses list for child pages.
   */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!session?.access_token) {
        if (!cancelled) {
          setHasBusinessAccess(false);
          setPrimaryBusiness(null);
          setMyBusinesses([]);
          setBusinessLoading(false);
        }
        return;
      }

      setBusinessLoading(true);

      try {
        const all = await listMyBusinesses(); // BusinessContextDTO[]
        if (cancelled) return;

        const active = (all ?? []).filter(isActiveBusinessContext);
        const canUseBusiness = active.length > 0;

        setHasBusinessAccess(canUseBusiness);
        setMyBusinesses(active);

        if (!canUseBusiness) {
          setPrimaryBusiness(null);
          return;
        }

        // Prefer user's primary business (if active), else fallback to first active membership.
        try {
          const primary = await getPrimaryBusiness();
          if (cancelled) return;

          if (primary && isActiveBusinessContext(primary)) {
            setPrimaryBusiness(primary);
          } else {
            setPrimaryBusiness(active[0]);
          }
        } catch {
          setPrimaryBusiness(active[0]);
        }
      } catch (e) {
        console.warn("Business capability detection failed:", e);
        if (!cancelled) {
          setHasBusinessAccess(false);
          setPrimaryBusiness(null);
          setMyBusinesses([]);
        }
      } finally {
        if (!cancelled) setBusinessLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  // ✅ Load contacts when logged in
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!session?.access_token) {
        if (!cancelled) {
          setUserContacts([]);
          setBusinessContacts([]);
          setContactsLoading(false);
        }
        return;
      }

      setContactsLoading(true);
      try {
        const bundle = await fetchMyContactsBundle(session.access_token);
        if (cancelled) return;
        setUserContacts((bundle?.users ?? []) as ContactLite[]);
        setBusinessContacts(bundle?.businesses ?? []);
      } catch (e) {
        console.warn("Contacts fetch failed in App:", e);
        if (!cancelled) {
          setUserContacts([]);
          setBusinessContacts([]);
        }
      } finally {
        if (!cancelled) setContactsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const userId = session?.user?.id ?? "";

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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

  const replaceContactsBundle = useCallback((bundle: ContactsBundleResponse) => {
    setUserContacts((bundle?.users ?? []) as ContactLite[]);
    setBusinessContacts(bundle?.businesses ?? []);
  }, []);

  const upsertUserContact = useCallback((incoming: ContactLite) => {
    const incomingId = String((incoming as any)?.userId ?? "").trim();
    if (!incomingId) return;

    setUserContacts((prev) => {
      const existingIndex = prev.findIndex(
        (c: any) => String(c?.userId ?? "").trim() === incomingId
      );

      if (existingIndex === -1) {
        return [incoming, ...prev];
      }

      const existing = prev[existingIndex] as any;
      const merged = { ...existing, ...incoming };

      const next = [...prev];
      next[existingIndex] = merged;
      return next;
    });
  }, []);

  const upsertBusinessContact = useCallback((incoming: BusinessContactResponse) => {
    const incomingId = String((incoming as any)?.businessId ?? "").trim();
    if (!incomingId) return;

    setBusinessContacts((prev) => {
      const existingIndex = prev.findIndex(
        (c: any) => String(c?.businessId ?? "").trim() === incomingId
      );

      if (existingIndex === -1) {
        return [incoming, ...prev];
      }

      const existing = prev[existingIndex] as any;
      const merged = { ...existing, ...incoming };

      const next = [...prev];
      next[existingIndex] = merged;
      return next;
    });
  }, []);

  const refreshContacts = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const bundle = await fetchMyContactsBundle(session.access_token);
      replaceContactsBundle(bundle);
    } catch (e) {
      console.warn("Contacts refresh failed:", e);
    }
  }, [session?.access_token, replaceContactsBundle]);

  const refreshAll = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    const { slug: _omitSlug, ...payload } = profile;

    await axios.post(`${API_BASE}/profile`, payload, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  };

  const handleImageUpload = (url: string) => {
    setProfile((prev) => ({ ...prev, profileImageUrl: url }));
  };

  // Simple /app landing target
  const AppHome = () => <Navigate to="/profile" replace />;

  return (
    <>
      <Header />
      <div className="p-4">
        {!session || isRecoveryFlow ? (
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/email-login" element={<EmailLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <AppDataProvider
            value={{
              userContacts,
              businessContacts,
              contactsLoading,
              refreshContacts,
              upsertUserContact,
              upsertBusinessContact,
              replaceContactsBundle,
              myBusinesses,
              primaryBusiness,
              businessLoading,
              myUserProfile: profile,
              myUserId: userId,
            }}
          >
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route path="/email-login" element={<EmailLogin />} />

              <Route path="/app" element={<AppHome />} />

              <Route
                path="/threads"
                element={
                  <ThreadsInboxPage
                    myProfile={profile}
                    myBusinesses={myBusinesses}
                    primaryBusiness={primaryBusiness}
                  />
                }
              />
              <Route
                path="/threads/:threadId"
                element={
                  <ThreadPage
                    myProfile={profile}
                    myUserId={userId}
                  />
                }
              />

              <Route path="/offer/:assignedOfferId" element={<OfferDetailsPage />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/businesses" replace />} />
                <Route path="businesses" element={<AdminBusinessesPage />} />
              </Route>

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
                    onProfileRefresh={refreshAll}
                    onImageUpload={handleImageUpload}
                  />
                }
              />

              <Route path="/business/register" element={<RegisterBusinessPage />} />
              <Route
                path="/business/pending"
                element={<div style={{ padding: 24 }}>Business submitted. Pending approval.</div>}
              />
              <Route path="/businesses/:businessSlug" element={<BusinessPage />} />
              <Route
                path="/businesses/:businessSlug/edit"
                element={
                  hasBusinessAccess ? <EditBusinessPage /> : <Navigate to="/business/register" replace />
                }
              />

              {/* -------- Public catalog views -------- */}
              <Route path="/businesses/:businessSlug/p/:productSlug" element={<ProductViewPage />} />
              <Route path="/businesses/:businessSlug/b/:bundleSlug" element={<BundleViewPage />} />

              {/* -------- Catalog management (business members) -------- */}
              <Route path="/businesses/:businessSlug/products/new" element={<ProductUpsertPage />} />
              <Route path="/businesses/:businessSlug/products/:productSlug/edit" element={<ProductUpsertPage />} />
              <Route path="/businesses/:businessSlug/bundles/new" element={<BundleUpsertPage />} />
              <Route path="/businesses/:businessSlug/bundles/:bundleSlug/edit" element={<BundleUpsertPage />} />

              {/* -------- Offer template management (business members) -------- */}
              <Route path="/businesses/:businessSlug/offers/new" element={<OfferTemplateEditor />} />
              <Route path="/businesses/:businessSlug/offers/:offerTemplateId/edit" element={<OfferTemplateEditor />} />
              <Route path="/businesses/:businessSlug/offers/:offerTemplateId" element={<OfferTemplateDetailsPage />} />

              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contacts/add" element={<AddContactForm />} />

              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </AppDataProvider>
        )}
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