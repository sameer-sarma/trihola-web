// src/services/broadcastService.ts

import axios from "axios";
import type { UUID } from "../types/threads";
import type {
  BroadcastCreationResultDTO,
  BroadcastDetailsDTO,
  BroadcastDTO,
  CreateBroadcastEnvelopeDTO,
} from "../types/broadcasts";

//const API_BASE = import.meta.env.VITE_API_BASE as string;
const API_BASE = __API_BASE__

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Creates a broadcast request.
 *
 * Important:
 * - success here means the backend accepted / queued the broadcast
 * - it does NOT mean all deliveries have completed
 */
export async function createBroadcast(
  token: string,
  payload: CreateBroadcastEnvelopeDTO
): Promise<BroadcastCreationResultDTO> {
  const res = await axios.post(
    `${API_BASE}/broadcasts`,
    payload,
    {
      headers: authHeaders(token),
    }
  );

  return res.data as BroadcastCreationResultDTO;
}

export async function getBroadcastDetails(
  token: string,
  broadcastId: UUID
): Promise<BroadcastDetailsDTO> {
  const res = await axios.get(
    `${API_BASE}/broadcasts/${encodeURIComponent(String(broadcastId))}`,
    {
      headers: authHeaders(token),
    }
  );

  return res.data as BroadcastDetailsDTO;
}

export async function listMyBroadcasts(
  token: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<BroadcastDTO[]> {
  const res = await axios.get(
    `${API_BASE}/broadcasts`,
    {
      headers: authHeaders(token),
      params: {
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
    }
  );

  return asArray<BroadcastDTO>(res.data);
}