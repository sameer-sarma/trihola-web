import axios from "axios";
import {PublicProfile} from "../hooks/useBootstrap";

export type UserProfileDTO = {
  /** Backend user UUID (Supabase user id) */
  userId: string;

  /** Public slug used in URLs: /profile/:slug */
  slug: string;

  /** Basic identity */
  firstName: string | null;
  lastName: string | null;

  /** Contact (do NOT show publicly by default) */
  email: string | null;
  phone: string | null;

  /** Verification flags */
  phoneVerified: boolean;

  /** Profile details */
  address: string | null;
  bio: string | null;
  location: string | null;
  profession: string | null;
  birthday: string | null;      // ISO date string: "YYYY-MM-DD"
  linkedinUrl: string | null;

  /**
   * Either:
   * - Full public URL
   * - OR Supabase storage path like "avatars/<userId>.jpg"
   */
  profileImageUrl: string | null;
  isTriholaAdmin?: boolean;
  /**
   * Extra flags your backend can send.
   * Your backend for /profile/full/{slug} includes isContact. (optional)
   */
  isContact?: boolean;
};

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ✅ Fetch your own profile (used for /profile redirect)
export const getOwnProfile = async (token: string): Promise<UserProfileDTO> => {
  const response = await axios.get<UserProfileDTO>(
    `${__API_BASE__}/profile`,
    authHeader(token)
  );
  return response.data;
};

// ✅ Fetch another user's public profile by slug
export const getProfileBySlug = async (slug: string, token: string) => {
  const response = await axios.get(`${__API_BASE__}/profile/full/${slug}`, authHeader(token));
  return response.data;
};

/** ✅ Fetch the logged-in user’s business profile (if registered as business)
 *  Expected to return at least: { id, slug, name, ... }
 */
export const getMyBusiness = async (token: string) => {
  const response = await axios.get(`${__API_BASE__}/business/profile`, authHeader(token));
  return response.data as {
    userId: string;
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
    businessSlug?: string;
    registeredAt?: string;
  };
};

// ✅ Fetch your own profile (used for /profile redirect)
export const getFullProfileByBusinessSlug = async (
  businessSlug: string,
  token: string
): Promise<PublicProfile> => {
  const res = await axios.get(
    `${__API_BASE__}/business/by-slug/${encodeURIComponent(businessSlug)}`,
    authHeader(token)
  );
  return res.data as PublicProfile;
};