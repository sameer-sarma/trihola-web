// src/services/settingsService.ts

import axios from "axios";
import { UserSettingsDTO } from "../types/userSettings";

const authHeader = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// ✅ Fetch user settings
export const fetchUserSettings = async (token: string): Promise<UserSettingsDTO> => {
  const response = await axios.get(`${__API_BASE__}/settings`, authHeader(token));
  return response.data;
};

// ✅ Save/update user settings
export const saveUserSettings = async (token: string, settings: UserSettingsDTO): Promise<void> => {
  await axios.post(`${__API_BASE__}/settings`, settings, authHeader(token));
};
