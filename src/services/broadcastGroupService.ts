import axios from "axios";
import type { ParticipantIdentity, UUID } from "../types/threads";
import type {
  AddBroadcastGroupMembersRequest,
  BroadcastGroup,
  BroadcastGroupCsvImportQueuedDTO,
  BroadcastGroupMember,
  CreateBroadcastGroupRequest,
  UpdateBroadcastGroupRequest,
} from "../types/broadcastGroups";

const API_BASE = __API_BASE__;

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function createBroadcastGroup(
  token: string,
  payload: CreateBroadcastGroupRequest
): Promise<BroadcastGroup> {
  const res = await axios.post(`${API_BASE}/broadcast-groups`, payload, {
    headers: authHeaders(token),
  });

  return res.data as BroadcastGroup;
}

export async function updateBroadcastGroup(
  token: string,
  groupId: UUID,
  payload: UpdateBroadcastGroupRequest
): Promise<BroadcastGroup> {
  const res = await axios.put(
    `${API_BASE}/broadcast-groups/${encodeURIComponent(String(groupId))}`,
    payload,
    {
      headers: authHeaders(token),
    }
  );

  return res.data as BroadcastGroup;
}

export async function listBroadcastGroupsForOwner(
  token: string,
  ownerIdentity: ParticipantIdentity
): Promise<BroadcastGroup[]> {
  const res = await axios.get(`${API_BASE}/broadcast-groups`, {
    headers: authHeaders(token),
    params: {
      ownerType: ownerIdentity.participantType,
      ownerId: ownerIdentity.participantId,
    },
  });

  return asArray<BroadcastGroup>(res.data);
}

export async function listBroadcastGroupMembers(
  token: string,
  groupId: UUID
): Promise<BroadcastGroupMember[]> {
  const res = await axios.get(
    `${API_BASE}/broadcast-groups/${encodeURIComponent(String(groupId))}/members`,
    {
      headers: authHeaders(token),
    }
  );

  return asArray<BroadcastGroupMember>(res.data);
}

export async function addBroadcastGroupMembers(
  token: string,
  groupId: UUID,
  payload: AddBroadcastGroupMembersRequest
): Promise<BroadcastGroupMember[]> {
  const res = await axios.post(
    `${API_BASE}/broadcast-groups/${encodeURIComponent(String(groupId))}/members`,
    payload,
    {
      headers: authHeaders(token),
    }
  );

  return asArray<BroadcastGroupMember>(res.data);
}

export async function removeBroadcastGroupMember(
  token: string,
  groupId: UUID,
  participantIdentity: ParticipantIdentity
): Promise<{ success: boolean }> {
  const res = await axios.delete(
    `${API_BASE}/broadcast-groups/${encodeURIComponent(
      String(groupId)
    )}/members/${encodeURIComponent(
      String(participantIdentity.participantType)
    )}/${encodeURIComponent(String(participantIdentity.participantId))}`,
    {
      headers: authHeaders(token),
    }
  );

  return res.data as { success: boolean };
}

export async function importBroadcastGroupsCsv(
  token: string,
  ownerIdentity: ParticipantIdentity,
  file: File
): Promise<BroadcastGroupCsvImportQueuedDTO> {
  const formData = new FormData();

  formData.append("ownerType", ownerIdentity.participantType);
  formData.append("ownerId", String(ownerIdentity.participantId));
  formData.append("file", file);

  const res = await axios.post(
    `${API_BASE}/broadcast-groups/import/csv`,
    formData,
    {
      headers: {
        ...authHeaders(token),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data as BroadcastGroupCsvImportQueuedDTO;
}