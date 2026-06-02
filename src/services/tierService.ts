import axios from "axios";
import type { MyTierContextDTO } from "../types/tiers";

const API_BASE = __API_BASE__;

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getMyTierContext(
  token: string
): Promise<MyTierContextDTO> {
  const res = await axios.get(`${API_BASE}/tiers/me`, {
    headers: authHeaders(token),
  });

  return res.data as MyTierContextDTO;
}