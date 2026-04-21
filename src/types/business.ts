// src/types/business.ts

export type BusinessProfileDTO = {
  businessName?: string | null;
  businessDescription?: string | null;
  businessWebsite?: string | null;
  businessSlug?: string | null;
  businessLogoUrl?: string | null;
  phone: string | null;
  email: string | null;
};

export type BusinessProfileDTOOwner = BusinessProfileDTO & {
  businessResistrationProofUrl?: string | null; // keep spelling to match backend
  ownerKYCProofUrl?: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  };

  export type BusinessContextDTO = {
  businessId: string;
  businessSlug: string;
  businessName: string;
  businessDescription?: string | null;
  businessWebsite?: string | null;
  phone?: string | null;
  phoneVerified: boolean;
  email?: string | null;
  emailVerified: boolean;
  businessStatus: string;
  businessLogoUrl?: string | null;
  role: string;
  designation: string;
  membershipStatus: string;
};

export type BusinessPublicViewDTO = {
  businessId: string;
  slug: string;
  name: string;
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  phoneVerified: boolean;
  email?: string | null;
  emailVerified: boolean;
  status: string;
  businessLogoUrl?: string | null;
  viewerRelation: string;
  isContact: boolean;
}

export type SlugAvailabilityResponse = { available: boolean };
export type SetSlugResponse = { slug: string };

export type BusinessMemberDTO = {
  userId: string;
  profileSlug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: string;     // OWNER | ADMIN | STAFF
  designation: string;
  status: string;   // ACTIVE | LEFT (etc)
  joinedAt: string; // ISO-ish string
};

export type BusinessOwnerProfileResponse = {
  businessId: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
  profile: BusinessProfileDTOOwner};

export type Contact = {
userId: string; // TriHola user id
profileSlug: string;
firstName?: string | null;
lastName?: string | null;
phone?: string | null;
email?: string | null;
profileImageUrl?: string | null;
};