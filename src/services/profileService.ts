import axios from "axios";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ✅ Fetch your own profile (used for /profile redirect)
export const getOwnProfile = async (token: string) => {
  const response = await axios.get(`${__API_BASE__}/profile`, authHeader(token));
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