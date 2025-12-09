// =============================================
// FILE: src/services/contactService.tsx
// =============================================

import axios from "axios";
import { Contact} from "../types/invites";

const authHeader = (token?: string) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

// ✅ Fetch all contacts
export const fetchMyContacts = async (token?: string): Promise<Contact[]> => {
  const response = await axios.get(`${__API_BASE__}/contacts`, authHeader(token));
  return response.data as Contact[];
};
