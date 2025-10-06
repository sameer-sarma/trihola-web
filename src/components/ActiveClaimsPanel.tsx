// =============================
// src/components/ActiveClaimsPanel.tsx
// Updated to accept picker fetchers built from pickerHelpers and pass them
// through to BusinessApproveClaim → ApproveClaimModal.
// =============================
import React, { useEffect, useState } from "react";
import * as offerService from "../services/offerService";
import ExpiryCountdown from "./ExpiryCountdown";
import OfferQRCode from "./OfferQRCode";
import claimUrlFrom from "../utils/claimUrl";
import BusinessApproveClaim from "./BusinessApproveClaim";
import type { PickerItem } from "../types/offerTemplateTypes";

type ClaimSource = "MANUAL" | "ONLINE";

type ClaimView = {
  id: string;
  assignedOfferId?: string;
  claimSource: ClaimSource;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  discountCode?: string | null;
  expiresAt?: string | null;
  grants?: any[];
  redemptionType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
  grantPickLimit?: number;
};

function normalizeClaim(c: any): ClaimView {
  return {
    id: String(c?.id ?? c?.claimId ?? ""),
    assignedOfferId: c?.assignedOfferId,
    claimSource: c?.claimSource,
    status: c?.status ?? "PENDING",
    discountCode: c?.discountCode ?? c?.code ?? null,
    expiresAt: c?.expiresAt ?? null,
    grants: c?.grants ?? [],
    redemptionType: c?.redemptionType ?? c?.type,
    grantPickLimit: c?.grantPickLimit,
  } as ClaimView;
}

// Picker fetchers built upstream (ReferralThread/OfferDetails) from pickerHelpers
export type PickerFns = {
  fetchScopeProducts?: (q: string) => Promise<PickerItem[]>;
  fetchScopeBundles?: (q: string) => Promise<PickerItem[]>;
  fetchGrantProducts?: (q: string) => Promise<PickerItem[]>;
  fetchGrantBundles?: (q: string) => Promise<PickerItem[]>;
};

interface Props {
  assignedOfferId: string;
  token: string;                      // required
  viewer: "USER" | "BUSINESS";
  onUpdated?: () => void;
  scopeKind?: "ANY" | "LIST";
  pickers?: PickerFns;                // NEW: pass pickers down to modal
}

const ActiveClaimsPanel: React.FC<Props> = ({
  assignedOfferId,
  token,
  viewer,
  onUpdated,
  scopeKind = "ANY",
  pickers,
}) => {
  const [manual, setManual] = useState<ClaimView | null>(null);
  const [online, setOnline] = useState<ClaimView | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now()); // ticker for relative time

  // global 1s ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load claims
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (viewer === "USER") {
          const [m, o] = await Promise.all([
            offerService
              .fetchActiveClaimForMe(token, assignedOfferId, "MANUAL")
              .catch(() => null),
            offerService
              .fetchActiveClaimForMe(token, assignedOfferId, "ONLINE")
              .catch(() => null),
          ]);
          setManual(m ? normalizeClaim(m) : null);
          setOnline(o ? normalizeClaim(o) : null);
        } else {
          const approvable = await offerService
            .fetchApprovableManualClaim(assignedOfferId, token)
            .catch(() => null);
          setManual(approvable ? normalizeClaim(approvable) : null);
          setOnline(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [assignedOfferId, token, viewer]);

  const fmtAbs = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString() : "—";

  const fmtRel = (iso?: string | null) => {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return "expired";
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
  };

  // any non-expired to show?
  const hasAny =
    (!!manual && manual.status !== "EXPIRED") ||
    (!!online && online.status !== "EXPIRED");

  // compute QR URL (no hooks)
  const manualQrUrl =
    manual?.id
      ? claimUrlFrom({
          id: manual.id,
          discountCode: manual.discountCode ?? undefined,
        })
      : "";

  if (loading || !hasAny) return null;

  const topStatus = manual?.status ?? online?.status ?? "—";
  const topExpiryIso = manual?.expiresAt ?? online?.expiresAt;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Active claim</h3>

      {/* Top row: Status + Expires */}
      <div className="kv-grid-4" style={{ rowGap: 8 }}>
        <div className="kv-item span-2">
          <div className="kv-label">Status</div>
          <div className="kv-value">{topStatus}</div>
        </div>
        <div className="kv-item span-2">
          <div className="kv-label">Expires</div>
          <div className="kv-value">
            {fmtAbs(topExpiryIso)}{" "}
            <span style={{ color: "#6b7280" }}>({fmtRel(topExpiryIso)})</span>
          </div>
        </div>
      </div>

      {/* USER + MANUAL: QR */}
      {viewer === "USER" && manual?.claimSource === "MANUAL" && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          {manualQrUrl && (
            <div style={{ display: "inline-block" }}>
              <OfferQRCode url={manualQrUrl} />
            </div>
          )}

          {manual.expiresAt && (
            <div style={{ marginTop: 6 }}>
              <ExpiryCountdown
                expiresAt={manual.expiresAt}
                onExpire={() => onUpdated?.()}
              />
            </div>
          )}

          <div style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.3 }}>
            <div>Show this QR to the business</div>
            <div>Scan to claim this offer</div>
          </div>
        </div>
      )}

      {/* USER + ONLINE: code */}
      {viewer === "USER" && !manual && online?.claimSource === "ONLINE" && (
        <div className="kv-grid-4" style={{ marginTop: 12 }}>
          <div className="kv-item span-4">
            <div className="kv-label">Online code</div>
            <div className="kv-value">
              <code>{online.discountCode ?? "—"}</code>{" "}
              {!!online.discountCode && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() =>
                    online.discountCode &&
                    navigator.clipboard?.writeText(online.discountCode)
                  }
                  title="Copy code"
                  style={{ marginLeft: 8 }}
                >
                  Copy
                </button>
              )}
            </div>
            {online.expiresAt && (
              <div style={{ marginTop: 6 }}>
                <ExpiryCountdown
                  expiresAt={online.expiresAt}
                  onExpire={() => onUpdated?.()}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* BUSINESS: approval panel for manual claims */}
      {viewer === "BUSINESS" && manual?.claimSource === "MANUAL" && (
        <div style={{ marginTop: 12 }}>
          <BusinessApproveClaim
            assignedOfferId={assignedOfferId}
            claimId={manual.id}
            canApprove={manual.status === "PENDING"}
            claimPolicy={"MANUAL"}
            expiresAt={manual.expiresAt || undefined}

            // Preview props:
            redemptionType={manual.redemptionType ?? "FIXED_DISCOUNT"}
            scopeKind={scopeKind}
            approvalPickLimit={manual.grantPickLimit ?? 0}
            defaultBillTotal={0}

            // NEW: picker fetchers for LIST scope + GRANT selection
            pickers={pickers}

            onApproved={() => onUpdated?.()}
          />
        </div>
      )}
    </div>
  );
};

export default ActiveClaimsPanel;


