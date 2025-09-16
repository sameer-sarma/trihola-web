// src/utils/claimUrl.ts
const claimUrlFrom = (claim: { id: string; discountCode?: string | null }) =>
  `${window.location.origin}/claim/${encodeURIComponent(claim.id)}?code=${encodeURIComponent(claim.discountCode ?? "")}`;

export default claimUrlFrom
