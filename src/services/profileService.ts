import axios from "axios";

const BASE_URL = "http://127.0.0.1:8080";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ✅ Fetch your own profile (used for /profile redirect)
export const getOwnProfile = async (token: string) => {
  const response = await axios.get(`${BASE_URL}/profile`, authHeader(token));
  return response.data;
};

// ✅ Fetch another user's public profile by slug
export const getProfileBySlug = async (slug: string, token: string) => {
  const response = await axios.get(`${BASE_URL}/profile/full/${slug}`, authHeader(token));
  return response.data;
};
