import React, { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchOfferTemplateById } from "../services/offerTemplateService";
import type { OfferLink } from "../types/campaign";
import type { OfferTemplateResponse } from "../types/offerTemplateTypes";

type AffiliatePolicySummary = {
  pointsPerCampaignReferral?: number;
  pointsPerCampaignReferralAcceptance?: number;
  percentOfCampaignReferralProspectPurchase?: number;
  maxPointsPerProspectPurchase?: number;
  isActive?: boolean;
};

type Props = {
  offers?: OfferLink[];
  affiliatePolicy?: AffiliatePolicySummary;
  token?: string;
  appearance?: "flat" | "gradient";
  className?: string;
  showDetailsInCard?: boolean;
};

export default function CampaignOfferCard({
  offers,
  affiliatePolicy,
  token,
  //appearance = "flat",
  className,
  showDetailsInCard = false,
}: Props) {
  const hasOffers = !!offers && offers.length > 0;

  // 1) collect any embedded snapshots (from invite.snapshot.rewards.offer)
  const snapshotsById = useMemo(() => {
    const map = new Map<string, any>();
    (offers ?? []).forEach((o) => {
      // backend sends OfferTemplateSnapshot in invite detail
      const snap = (o as any).OfferTemplateSnapshot;
      if (snap) {
        map.set(o.offerTemplateId, snap);
      }
    });
    return map;
  }, [offers]);

  // 2) only fetch templates that *don’t* already have snapshots
  const uniqueIds = useMemo(
    () => Array.from(new Set((offers ?? []).map((o) => o.offerTemplateId))),
    [offers]
  );

  const idsToFetch = uniqueIds.filter((id) => !snapshotsById.has(id));

  const templateQueries = useQueries({
    queries: idsToFetch.map((id) => ({
      queryKey: ["offerTemplate", id],
      queryFn: () =>
        fetchOfferTemplateById(id, token) as Promise<OfferTemplateResponse>,
      staleTime: 60_000,
    })),
  });

  // 3) merge snapshots + fetched templates into a single map
  const templatesById = useMemo(() => {
    const map = new Map<string, OfferTemplateResponse | any>();

    // snapshots first
    snapshotsById.forEach((snap, id) => {
      map.set(id, snap);
    });

    // overlay fetched data (for ids without snapshots)
    idsToFetch.forEach((id, index) => {
      const q = templateQueries[index];
      if (q?.data) {
        map.set(id, q.data as OfferTemplateResponse);
      }
    });

    return map;
  }, [snapshotsById, idsToFetch, templateQueries]);

  // ---- base “no rewards” guard (only if nothing at all) ----
  if (!hasOffers && !affiliatePolicy) {
    return (
      <div className={`card ${className ?? ""}`}>
        <div className="th-muted">No offers linked.</div>
      </div>
    );
  }

  // If we do have offers and we *had* to fetch, handle loading/error
  if (hasOffers && idsToFetch.length > 0) {
    const anyLoading = templateQueries.some((q) => q.isLoading);
    const err = templateQueries.find((q) => q.error)?.error as
      | Error
      | undefined;

    if (anyLoading) {
      return (
        <div className={`card ${className ?? ""}`}>
          <div className="th-muted">Loading offers…</div>
        </div>
      );
    }
    if (err) {
      return (
        <div className={`card ${className ?? ""}`}>
          <div className="alert alert--error">
            {err.message || "Failed to load offer templates"}
          </div>
        </div>
      );
    }
  }

  const blocks: React.ReactNode[] = [];

  // --- Block 1: prospect/referrer offer(s) ---
  if (hasOffers) {
    offers!.forEach((link) => {
      const tpl = templatesById.get(
        link.offerTemplateId
      ) as OfferTemplateResponse | undefined;

      if (!tpl) {
        // Neither snapshot nor fetched template – silently skip or show a tiny badge if you prefer
        return;
      }

      blocks.push(
        <div
          key={`offer-${link.offerTemplateId}-${link.recipientRole}`}
          className="reward-block"
        >
          <div className="reward-block__tag">
            {link.recipientRole === "PROSPECT"
              ? "Prospect reward"
              : "Referrer reward"}
          </div>
          <div className="reward-block__title">
            {tpl.templateTitle ?? (tpl as any).offerTitle ?? "Campaign offer"}
          </div>
          {tpl.description && (
            <div className="reward-block__body">{tpl.description}</div>
          )}

          {showDetailsInCard && (
            <div className="reward-block__meta">
              <span className="pill pill--soft">
                Type: {tpl.offerType ?? "—"}
              </span>
              {tpl.discountPercentage && (
                <span className="pill pill--soft">
                  {tpl.discountPercentage}% off up to{" "}
                  {tpl.maxDiscountAmount ?? "—"}
                </span>
              )}
              {tpl.minPurchaseAmount && (
                <span className="pill pill--soft">
                  Min spend ₹{tpl.minPurchaseAmount}
                </span>
              )}
            </div>
          )}
        </div>
      );
    });
  }

  // --- Block 2: affiliate wallet policy ---
  if (affiliatePolicy) {
    const a = affiliatePolicy;

    blocks.push(
      <div key="affiliate-policy" className="reward-block reward-block--wallet">
        <div className="reward-block__tag">Affiliate wallet</div>
        <div className="reward-block__title">
          Points for referrals & purchases
        </div>

        <div className="reward-block__body">
          <div className="affiliate-rewards__chips">
            {a.pointsPerCampaignReferral ? (
              <span className="pill pill--soft">
                {a.pointsPerCampaignReferral} pts per referral
              </span>
            ) : null}
            {a.pointsPerCampaignReferralAcceptance ? (
              <span className="pill pill--soft">
                {a.pointsPerCampaignReferralAcceptance} pts per accepted referral
              </span>
            ) : null}
            {a.percentOfCampaignReferralProspectPurchase ? (
              <span className="pill pill--soft">
                {a.percentOfCampaignReferralProspectPurchase}% of prospect
                purchase
                {a.maxPointsPerProspectPurchase
                  ? ` (up to ${a.maxPointsPerProspectPurchase} pts per purchase)`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className ?? ""}`} style={{ marginBottom: 16 }}>
      <h3 className="page-title" style={{ fontSize: 16, marginBottom: 8 }}>
        Prospect & affiliate rewards
      </h3>

      <div className="rewards-strip">{blocks}</div>
    </div>
  );
}
