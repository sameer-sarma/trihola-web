// src/utils/tiersMapping.ts
import type { DiscountTierSpec } from "../types/offerTemplateTypes";

export type UiBand = {
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;            // % when PERCENTAGE, ₹ when FIXED
  maxDiscountAmount: number | null; // only for PERCENTAGE
};

// UI -> Server: returns EXACTLY DiscountTierSpec[] (minAmount is number)
export function uiToServerTiers(
  breakpoints: number[],
  bands: UiBand[]
): DiscountTierSpec[] {
  const bps = [...breakpoints].sort((a, b) => a - b);

  console.log("[uiToServerTiers] breakpoints:", bps);
  console.log("[uiToServerTiers] bands:", JSON.stringify(bands, null, 2));

  const tiers = bands.map((b, i) => {
    const minAmount: number = i === 0 ? 0 : (bps[i - 1] ?? 0);
    const isPct = b.discountType === "PERCENTAGE";

    const tier: DiscountTierSpec = {
      minAmount,                  // number (never null)
      minQty: null,
      discountAmount:     !isPct ? (b.discountValue ?? 0) : null,
      discountPercentage:  isPct ? (b.discountValue ?? 0) : null,
      maxDiscountAmount:   isPct ? (b.maxDiscountAmount ?? 0) : null,
    };

    console.log(`[uiToServerTiers] built tier ${i}:`, tier);
    return tier;
  });

  console.log("[uiToServerTiers] final tiers:", JSON.stringify(tiers, null, 2));
  return tiers;
}

// Server -> UI: hydrate editor from DiscountTierSpec[]
export function tiersToUiBands(
  tiers: DiscountTierSpec[]
): { breakpoints: number[]; bands: UiBand[] } {
  console.log("[tiersToUiBands] input tiers:", JSON.stringify(tiers, null, 2));

  if (!tiers || tiers.length === 0) {
    return {
      breakpoints: [],
      bands: [{ discountType: "PERCENTAGE", discountValue: 0, maxDiscountAmount: null }],
    };
  }

  const sorted = [...tiers].sort((a, b) => (a.minAmount ?? 0) - (b.minAmount ?? 0));

  const breakpoints = sorted
    .map((t) => t.minAmount ?? 0)
    .filter((m) => m !== 0); // any min>0 becomes a breakpoint

  const bands: UiBand[] = sorted.map((t, i) => {
    const isPct = t.discountPercentage != null;
    const band: UiBand = {
      discountType: isPct ? "PERCENTAGE" : "FIXED",
      discountValue: isPct ? (t.discountPercentage ?? 0) : (t.discountAmount ?? 0),
      maxDiscountAmount: isPct ? (t.maxDiscountAmount ?? 0) : null,
    };
    console.log(`[tiersToUiBands] rebuilt band ${i}:`, band);
    return band;
  });

  console.log("[tiersToUiBands] breakpoints:", breakpoints);
  console.log("[tiersToUiBands] bands:", JSON.stringify(bands, null, 2));

  return { breakpoints, bands };
}
