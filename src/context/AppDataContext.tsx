import React, { createContext, useContext } from "react";
import type { BusinessContextDTO } from "../types/business";
import type { ContactLite } from "../components/contacts/ContactMultiSelect";
import type {
  BusinessContactResponse,
  ContactsBundleResponse,
} from "../services/contactService";

export type MyUserProfile = {
  phone?: string;
  slug?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  profession?: string;
  birthday?: string;
  linkedinUrl?: string;
  phoneVerified?: boolean;
};

export type AppData = {
  userContacts: ContactLite[];
  businessContacts: BusinessContactResponse[];
  contactsLoading: boolean;
  refreshContacts: () => Promise<void>;

  /** single-record updates for globally shared contacts state */
  upsertUserContact: (contact: ContactLite) => void;
  upsertBusinessContact: (contact: BusinessContactResponse) => void;

  /** bulk replacement, useful after import or full server sync */
  replaceContactsBundle: (bundle: ContactsBundleResponse) => void;

  myBusinesses: BusinessContextDTO[];
  primaryBusiness: BusinessContextDTO | null;
  businessLoading: boolean;

  myUserProfile: MyUserProfile | null;
  myUserId: string;
};

const Ctx = createContext<AppData | null>(null);

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppData must be used within <AppDataProvider />");
  return v;
}

export function AppDataProvider({
  value,
  children,
}: {
  value: AppData;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}