import axios from "axios";

export const refreshAccessToken = async (
  setAccessToken: (token: string | null) => void
): Promise<string | null> => {
  const storedRefreshToken = localStorage.getItem("refreshToken");
  if (!storedRefreshToken) return null;

  try {
    const response = await axios.post("http://127.0.0.1:8080/refresh", {
      refreshToken: storedRefreshToken,
    });
    const newAccessToken = response.data.accessToken;
    localStorage.setItem("accessToken", newAccessToken);
    setAccessToken(newAccessToken);
    return newAccessToken;
  } catch (err) {
    console.error("Failed to refresh access token", err);
    return null;
  }
};
