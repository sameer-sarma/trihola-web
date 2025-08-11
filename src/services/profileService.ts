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
