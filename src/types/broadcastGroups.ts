import type { ParticipantIdentity, UUID } from "./threads";

export type BroadcastGroup = {
  id: UUID;
  ownerIdentity: ParticipantIdentity;
  name: string;
  description?: string | null;
  status: string;
  memberCount: number;
  createdByUserId: UUID;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastGroupMember = {
  id: UUID;
  groupId: UUID;
  participantIdentity: ParticipantIdentity;

  profileSlug?: string | null;
  businessSlug?: string | null;
  currentDisplayName?: string | null;
  currentImageUrl?: string | null;

  displayNameSnapshot?: string | null;
  phoneSnapshot?: string | null;
  emailSnapshot?: string | null;
  imageUrlSnapshot?: string | null;

  source: string;
  status: string;
  addedByUserId: UUID;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
};

export type ContactRequest = {
  phone?: string | null;
  email?: string | null;
  aliasName?: string | null;
  firstName: string;
  lastName?: string | null;
  businessName?: string | null;
};

export type BroadcastGroupMemberInput = {
  participantIdentity?: ParticipantIdentity | null;
  contactRequest?: ContactRequest | null;
  source?: string;
};

export type AddBroadcastGroupMembersRequest = {
  members: BroadcastGroupMemberInput[];
};

export type CreateBroadcastGroupRequest = {
  ownerIdentity: ParticipantIdentity;
  name: string;
  description?: string | null;
};

export type UpdateBroadcastGroupRequest = {
  name?: string | null;
  description?: string | null;
};

export type BroadcastGroupCsvImportErrorDTO = {
  row: number;
  message: string;
};

export type BroadcastGroupCsvImportQueuedDTO = {
  queued: boolean;
  message: string;
  totalRows: number;
  groupsQueued: number;
  skippedRows: number;
  errors: BroadcastGroupCsvImportErrorDTO[];
};