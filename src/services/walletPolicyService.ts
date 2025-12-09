// src/services/walletPolicyService.ts
import { PointsAccrualPolicyDTO, WalletUsagePolicyDTO } from "../types/wallet";

const API_BASE = import.meta.env.VITE_API_BASE as string;

async function getJson<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson<T>(url: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function fetchAccrualPolicy(token: string) {
  return getJson<PointsAccrualPolicyDTO>(`${API_BASE}/wallet/policies/accrual`, token);
}
export function saveAccrualPolicy(dto: PointsAccrualPolicyDTO, token: string) {
  return putJson<PointsAccrualPolicyDTO>(`${API_BASE}/wallet/policies/accrual`, token, dto);
}

export function fetchUsagePolicy(token: string) {
  return getJson<WalletUsagePolicyDTO>(`${API_BASE}/wallet/policies/usage`, token);
}

export function saveUsagePolicy(dto: WalletUsagePolicyDTO, token: string) {
  return putJson<WalletUsagePolicyDTO>(
    `${API_BASE}/wallet/policies/usage`,
    token,
    dto
  );
}

