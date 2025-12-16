// =============================================
// FILE: src/services/contactService.tsx
// =============================================

import axios from "axios";
import { Contact} from "../types/invites";

export type ContactRequestForm = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
};

export type ContactResponse = {
  userId: string;
  profileSlug: string;
  businessSlug?: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string;
  businessName?: string;
};

const authHeader = (token?: string) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

// ✅ Fetch all contacts
export const fetchMyContacts = async (token?: string): Promise<Contact[]> => {
  const response = await axios.get(`${__API_BASE__}/contacts`, authHeader(token));
  return response.data as Contact[];
};

// ✅ Add contact by Profile Slug
export const addContactByUserSlug = async (
  profileSlug: string,
  token: string
): Promise<void> => {
  await axios.post(
    `${__API_BASE__}/contacts/add/byUserSlug`,
    { contactSlug: profileSlug },
    authHeader(token)
  );
};

// ✅ Add contact by Request Form
export async function addContactByContactRequestForm(
  form: ContactRequestForm,
  token: string
): Promise<ContactResponse> {
  const res = await axios.post(
    `${__API_BASE__}/contacts/add/byContactRequestForm`,
    form,
    authHeader(token)
  );
  return res.data as ContactResponse;
}
