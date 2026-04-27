// =============================================
// FILE: src/services/contactService.ts
// =============================================

import axios from "axios";

export type ContactRequestForm = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
};

export type UpdateContactRequestForm = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
};

export type ContactResponse = {
  userId: string;
  profileSlug: string;
  profileImageUrl: string | null;
  firstName: string;
  lastName?: string | null;
  profession?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type BusinessContactResponse = {
  businessId: string;
  slug: string;
  name: string;
  businessLogoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ContactsBundleResponse = {
  users: ContactResponse[];
  businesses: BusinessContactResponse[];
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

export type CommonContactPreviewDTO = {
  userId: string;
  slug: string | null;
  profileImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type UserRelationshipProfileDTO = {
  userId: string;
  slug: string;
  profileImageUrl?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  profession?: string | null;
  role?: string | null;
  address?: string | null;
  bio?: string | null;
  location?: string | null;
  birthday?: string | null;
  linkedinUrl?: string | null;

  phone?: string | null;
  email?: string | null;

  isInMyContacts: boolean;
  hasMeInTheirContacts: boolean;
  isMutualContact: boolean;

  followingCount: number;
  followersCount: number;
  commonContactsCount: number;
  commonContactsPreview: CommonContactPreviewDTO[];
};

//const __API_BASE__ = (import.meta.env.VITE_API_BASE as string) || "";
const API_BASE = __API_BASE__;
const authHeader = (token?: string) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

// ✅ Fetch all contacts (users + businesses)
export const fetchMyContactsBundle = async (token?: string): Promise<ContactsBundleResponse> => {
  const response = await axios.get(`${API_BASE}/contacts`, authHeader(token));
  return response.data as ContactsBundleResponse;
};

// ✅ Fetch relationship with user
export const getRelationshipProfileBySlug = async (
  slug: string,
  token: string
): Promise<UserRelationshipProfileDTO> => {
  const response = await axios.get(
    `${API_BASE}/contacts/relationship/${encodeURIComponent(slug)}`,
    authHeader(token)
  );
  return response.data as UserRelationshipProfileDTO;
};


// ✅ Add contact by Profile Slug (endpoint returns {success:true}; keep void)
export const addContactByUserSlug = async (profileSlug: string, token: string): Promise<void> => {
  await axios.post(
    `${API_BASE}/contacts/add/byUserSlug`,
    { contactSlug: profileSlug },
    authHeader(token)
  );
};

export const addContactByBusinessSlug = async (businessSlug: string, token: string): Promise<void> => {
  await axios.post(
    `${API_BASE}/contacts/add/byBusinessSlug`,
    { businessSlug },
    authHeader(token)
  );
};

// ✅ Add contact by Request Form (endpoint returns ContactsBundleResponse)
export async function addContactByContactRequestForm(
  form: ContactRequestForm,
  token: string
): Promise<ContactsBundleResponse> {
  const res = await axios.post(
    `${API_BASE}/contacts/add/byContactRequestForm`,
    form,
    authHeader(token)
  );
  return res.data as ContactsBundleResponse;
}

// ✅ Import contacts CSV
export async function importContactsCsv(token: string, file: File): Promise<ContactImportResultDTO> {
  const form = new FormData();
  form.append("file", file); // backend expects "file"

  const res = await fetch(`${API_BASE}/contacts/import/csv`, {
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

// ✅ New edit and delete support for contacts

export async function updateUserContact(
  contactUserId: string,
  form: UpdateContactRequestForm,
  token: string
): Promise<ContactsBundleResponse> {
  const res = await axios.put(
    `${API_BASE}/contacts/users/${encodeURIComponent(contactUserId)}`,
    form,
    authHeader(token)
  );

  return res.data as ContactsBundleResponse;
}

export async function deleteUserContact(
  contactUserId: string,
  token: string
): Promise<{ success: boolean }> {
  const res = await axios.delete(
    `${API_BASE}/contacts/users/${encodeURIComponent(contactUserId)}`,
    authHeader(token)
  );

  return res.data as { success: boolean };
}