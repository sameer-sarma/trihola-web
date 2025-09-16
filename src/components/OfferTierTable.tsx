import { useMemo } from "react";
import type { OfferTierRow } from "../types/offer";

function inr(n: number | undefined) {
  if (n === undefined) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function pct(n: number | undefined) {
  if (n === undefined) return "—";
  return `${n}%`;
}

function bandLabel(sorted: OfferTierRow[], idx: number) {
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : undefined;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;

  if (!prev && next) return `Below ${inr(next.minAmount)}`;
  if (prev && next)  return `${inr(cur.minAmount)} – ${inr(next.minAmount)}`;
  return `Above ${inr(cur.minAmount)}`; // last row
}

export default function OfferTierTable({ tiers }: { tiers: OfferTierRow[] }) {
  const sorted = useMemo(() => [...tiers].sort((a, b) => a.minAmount - b.minAmount), [tiers]);

  return (
    <section className="ot-tiers">
      <div className="ot-tiers__panel">
        <div className="ot-tiers__list">
          {sorted.map((t, i) => {
            const isPct = typeof t.discountPercentage === "number";
            const label = bandLabel(sorted, i);
            return (
              <div key={i} className="ot-tier-row">
                <div className="ot-band-label">{label}</div>
                <div className="ot-unit">{isPct ? "%" : "₹"}</div>
                <div>
                  <div className="ot-value">
                    {isPct ? pct(t.discountPercentage) : inr(t.discountAmount ?? 0)}
                  </div>
                  {isPct && (
                    <div className="ot-cap">
                      Cap: {t.maxDiscountAmount && t.maxDiscountAmount > 0 ? inr(t.maxDiscountAmount) : "—"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
