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

export type ContactImportErrorDTO = {
  row: number;
  message: string;
  raw?: Record<string, string> | null;
};

export type ContactImportResultDTO = {
  totalRows: number;
  processed: number;
  importedOrUpdated: number;
  skipped: number;
  errors: ContactImportErrorDTO[];
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

export async function importContactsCsv(
  token: string,
  file: File
): Promise<ContactImportResultDTO> {
  const form = new FormData();
  form.append("file", file); // backend expects "file"

  const res = await fetch(`${__API_BASE__}/import/csv`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // ❌ do NOT set Content-Type manually
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Import failed (${res.status})`);
  }

  return res.json();
}