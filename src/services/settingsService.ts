// src/services/settingsService.ts

import axios from "axios";
import { UserSettingsDTO } from "../types/userSettings";

const BASE_URL = "http://127.0.0.1:8080";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ✅ Fetch user settings
export const fetchUserSettings = async (token: string): Promise<UserSettingsDTO> => {
  const response = await axios.get(`${BASE_URL}/settings`, authHeader(token));
  return response.data;
};

// ✅ Save/update user settings
export const saveUserSettings = async (token: string, settings: UserSettingsDTO): Promise<void> => {
  await axios.post(`${BASE_URL}/settings`, settings, authHeader(token));
};
