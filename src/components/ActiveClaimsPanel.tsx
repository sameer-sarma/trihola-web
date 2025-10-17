// =============================
// src/components/ActiveClaimsPanel.tsx (patched)
// Single source of truth for Active Claim display + creation/regeneration
// - USER view: create/regenerate MANUAL (QR) or ONLINE code
// - GRANT offers: opens ClaimModal to collect picks before creating
// - BUSINESS view: embeds BusinessApproveClaim
// =============================
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as offerService from "../services/offerService";
import ExpiryCountdown from "./ExpiryCountdown";
import OfferQRCode from "./OfferQRCode";
import claimUrlFrom from "../utils/claimUrl";
import BusinessApproveClaim from "./BusinessApproveClaim";
import ClaimModal from "./ClaimModal";
import type { PickerItem } from "../types/offerTemplateTypes";
import { supabase } from "../supabaseClient";

// ---------- Types ----------

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
    claimSource: (c?.claimSource || c?.source || "MANUAL") as ClaimSource,
    status: (c?.status || "PENDING") as ClaimView["status"],
    discountCode: c?.discountCode ?? c?.code ?? null,
    expiresAt: c?.expiresAt ?? null,
    grants: c?.grants ?? c?.grantItems ?? [],
    redemptionType: c?.redemptionType ?? c?.type,
    grantPickLimit: c?.grantPickLimit,
  } as ClaimView;
}

// Picker fetchers built upstream (OfferDetails) if scopeKind === LIST or GRANT picks needed
export type PickerFns = {
  fetchScopeProducts?: (q: string) => Promise<PickerItem[]>;
  fetchScopeBundles?: (q: string) => Promise<PickerItem[]>;
  fetchGrantProducts?: (q: string) => Promise<PickerItem[]>;
  fetchGrantBundles?: (q: string) => Promise<PickerItem[]>;
};

interface Props {
  assignedOfferId: string;
  token: string; // required
  viewer: "USER" | "BUSINESS";
  onUpdated?: () => void;

  // NEW: gates to enable/disable creation buttons
  canClaim?: boolean;
  claimPolicy?: "ONLINE" | "MANUAL" | "BOTH";
  offerType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
  discountAmount?: number | null; // guard for FIXED when needed
  grantPickLimit?: number; // number of items a user may pick for GRANT
  redemptionsLeft?: number; // to guard when 0 left
  // Already existed
  scopeKind?: "ANY" | "LIST";
  pickers?: PickerFns; // pass to BusinessApproveClaim (preview) & ClaimModal (grant picker)
}

const ActiveClaimsPanel: React.FC<Props> = ({
  assignedOfferId,
  token,
  viewer,
  onUpdated,
  canClaim = false,
  claimPolicy = "BOTH",
  offerType,
  discountAmount = null,
  grantPickLimit,
  redemptionsLeft,
  scopeKind = "ANY",
  pickers,
}) => {
  const [manual, setManual] = useState<ClaimView | null>(null);
  const [online, setOnline] = useState<ClaimView | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now());
  const [busy, setBusy] = useState<"MANUAL" | "ONLINE" | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantFlowSource, setGrantFlowSource] = useState<"MANUAL" | "ONLINE">("MANUAL");

  const withAuth = useCallback(
    async <T,>(fn: (t: string) => Promise<T>): Promise<T | null> => {
      if (token) return fn(token);
      const { data } = await supabase.auth.getSession();
      const tkn = data.session?.access_token ?? null;
      if (!tkn) return null as any;
      return fn(tkn);
    },
    [token]
  );

  const withAuthOrThrow = useCallback(
      async <T,>(fn: (t: string) => Promise<T>): Promise<T> => {
        const out = await withAuth(fn);
        if (out == null) throw new Error("Not authenticated");
        return out;
      },
      [withAuth]
    );
  
  // 1s ticker for relative countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load currently active claim(s)
  const loadClaims = React.useCallback(async () => {
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
  }, [assignedOfferId, token, viewer]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Formatting helpers
  const fmtAbs = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
  const fmtRel = (iso?: string | null) => {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return "expired";
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
  };

  // Non-expired available to display?
  const hasAny =
    (!!manual && manual.status !== "EXPIRED") || (!!online && online.status !== "EXPIRED");

  // QR URL (manual only)
  const manualQrUrl = useMemo(
    () =>
      manual?.id
        ? claimUrlFrom({ id: manual.id, discountCode: manual.discountCode ?? undefined })
        : "",
    [manual]
  );

  // ------ Creation / Regeneration handlers ------
  // Only MANUAL (QR) needs grant picks. ONLINE codes bypass picks (cart reconciliation).
  const manualNeedsGrantFlow = offerType === "GRANT" && (grantPickLimit ?? 0) > 0;

  async function createManual() {
    if (manualNeedsGrantFlow) {
      setShowGrantModal(true);
      setGrantFlowSource("MANUAL");     
      return;
    }
    setBusy("MANUAL");
    try {
      // NOTE: rely on offerService helpers present in your codebase
      const body: any = { claimSource: "MANUAL", expiresInMinutes: 15 };
      if (String(offerType).toUpperCase() === "FIXED_DISCOUNT") body.redemptionValue = discountAmount;
      const res = await withAuthOrThrow((t) => offerService.requestClaim(t, assignedOfferId, body));
      setManual(normalizeClaim(res));
      setOnline(null);
      onUpdated?.();
    } finally {
      setBusy(null);
    }
  }

  async function createOnline() {
    // For fixed discounts where business must decide amount, prefer manual (approval) flow
    if (offerType === "FIXED_DISCOUNT" && (discountAmount === null || Number(discountAmount) <= 0)) {
      // Fallback to manual creation so the business can approve with value
      return createManual();
    }
// ONLINE codes for GRANT must **not** ask for picks; reconciliation happens against cart.
    setBusy("ONLINE");
    try {
      const body: any = { claimSource: "ONLINE", expiresInMinutes: 15 };
      if (String(offerType).toUpperCase() === "FIXED_DISCOUNT") body.redemptionValue = discountAmount;
      const res = await withAuthOrThrow((t) => offerService.requestClaim(t, assignedOfferId, body));
      setOnline(normalizeClaim(res));
      setManual(null);
      onUpdated?.();
    } finally {
      setBusy(null);
    }
  }

  // Regenerate = same as create, replaces active
  const regenerateManual = createManual;
  const regenerateOnline = createOnline;

  // Hide the entire card if nothing active *and* user cannot create

  // --- Hardened CTA gate ---
  const claimPolicyAllows =
    claimPolicy === "ONLINE" || claimPolicy === "MANUAL" || claimPolicy === "BOTH";
  const canShowCtas =
    viewer === "USER" &&
    (canClaim ?? true) &&
    claimPolicyAllows &&
    (redemptionsLeft == null || redemptionsLeft > 0);

// Empty-state reason (when CTAs hidden)
  const emptyStateReason =
    viewer !== "USER" ? null
    : !claimPolicyAllows ? "Claiming is disabled for this offer."
    : redemptionsLeft === 0 ? "No redemptions left on this offer."
    : canClaim === false ? "You are not eligible to claim this offer."
    : null;

  if (loading) return null;
//  if (!hasAny && !canShowCtas) return null;

  const topStatus = manual?.status ?? online?.status ?? "—";
  const topExpiryIso = manual?.expiresAt ?? online?.expiresAt;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Active claim</h3>

      {/* Top row: Status + Expires (when an active claim exists) */}
      {hasAny && (
        <div className="kv-grid-4" style={{ rowGap: 8 }}>
          <div className="kv-item span-2">
            <div className="kv-label">Status</div>
            <div className="kv-value">{topStatus}</div>
          </div>
          <div className="kv-item span-2">
            <div className="kv-label">Expires</div>
            <div className="kv-value">
              {fmtAbs(topExpiryIso)} <span style={{ color: "#6b7280" }}>({fmtRel(topExpiryIso)})</span>
            </div>
          </div>
        </div>
      )}

      {/* USER view: MANUAL (QR) */}
      {viewer === "USER" && manual?.claimSource === "MANUAL" && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          {manualQrUrl && (
            <div style={{ display: "inline-block" }}>
              <OfferQRCode url={manualQrUrl} />
            </div>
          )}

          {manual.expiresAt && (
            <div style={{ marginTop: 6 }}>
              <ExpiryCountdown expiresAt={manual.expiresAt} onExpire={() => { loadClaims(); onUpdated?.(); }} />
            </div>
          )}

          <div style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.3 }}>
            <div>Show this QR to the business</div>
            <div>Scan to claim this offer</div>
          </div>

          {/* Regenerate button */}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn--sm" onClick={regenerateManual} disabled={busy === "MANUAL"}>
              {busy === "MANUAL" ? "Generating…" : "Regenerate QR"}
            </button>
          </div>
        </div>
      )}

      {/* USER view: ONLINE code */}
      {viewer === "USER" && !manual && online?.claimSource === "ONLINE" && (
        <div className="kv-grid-4" style={{ marginTop: 12 }}>
          <div className="kv-item span-4">
            <div className="kv-label">Online code</div>
            <div className="kv-value">
              <code>{online.discountCode ?? "—"}</code>{" "}
              {!!online.discountCode && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => online.discountCode && navigator.clipboard?.writeText(online.discountCode)}
                  title="Copy code"
                  style={{ marginLeft: 8 }}
                >
                  Copy
                </button>
              )}
            </div>
            {online.expiresAt && (
              <div style={{ marginTop: 6 }}>
                <ExpiryCountdown expiresAt={online.expiresAt} onExpire={() => { loadClaims(); onUpdated?.(); }} />
              </div>
            )}

            {/* Regenerate */}
            <div style={{ marginTop: 12 }}>
              <button className="btn btn--sm" onClick={regenerateOnline} disabled={busy === "ONLINE"}>
                {busy === "ONLINE" ? "Generating…" : "Regenerate code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER view: Empty state when neither active claim nor CTAs */}
      {viewer === "USER" && !hasAny && !canShowCtas && (
        <div className="kv-item span-4" style={{
          marginTop: 12,
          padding: "12px 14px",
          border: "1px dashed rgba(0,0,0,.12)",
          borderRadius: 10,
          background: "rgba(0,0,0,.02)",
          color: "rgba(0,0,0,.7)"
        }}>
          <strong>No active claim.</strong>{" "}
          {emptyStateReason ? <span>{emptyStateReason}</span> : null}
        </div>
      )}
      {/* USER view: No active claim (show CTAs if allowed by policy) */}
      {viewer === "USER" && !hasAny && canShowCtas && (
        <div className="kv-grid-4" style={{ marginTop: 12 }}>
          {(claimPolicy === "MANUAL" || claimPolicy === "BOTH") && (
            <div className="kv-item span-2">
              <button className="btn btn--primary w-full" onClick={createManual} disabled={busy !== null}>
                {busy === "MANUAL" ? "Generating…" : manualNeedsGrantFlow ? "Choose grant & get QR" : "Generate QR"}
              </button>
            </div>
          )}
          {(claimPolicy === "ONLINE" || claimPolicy === "BOTH") && (
            <div className="kv-item span-2">
              <button className="btn w-full" onClick={createOnline} disabled={busy !== null}>
                {busy === "ONLINE" ? "Generating…" : "Generate online code"}
              </button>
            </div>
          )}
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
            // Picker fetchers for LIST scope + GRANT selection
            pickers={pickers}
            onApproved={() => onUpdated?.()}
          />
        </div>
      )}

      {/* GRANT pick modal for USER (MANUAL only) */}
      {viewer === "USER" && manualNeedsGrantFlow && (
        <ClaimModal
          assignedOfferId={assignedOfferId}
          isOpen={showGrantModal}
          onClose={() => setShowGrantModal(false)}
          onCreated={(c: any) => {
            const v = normalizeClaim(c);
            if (v.claimSource === "MANUAL") {
              setManual(v);
              setOnline(null);
            } else {
              setOnline(v);
              setManual(null);
            }
            setShowGrantModal(false);
            onUpdated?.();
          }}
          grantMode={true}
          claimSource={"MANUAL"}
          primaryCtaLabel={grantFlowSource === "MANUAL" ? "Generate QR" : "Generate code"}

          fetchGrantOptions={(assignedOfferId) => withAuthOrThrow((t) => offerService.fetchGrantOptions(assignedOfferId, t))}
          createClaim={(body) => withAuthOrThrow((t) => offerService.requestClaim(t, assignedOfferId, body))}        
        />
      )}
    </div>
  );
};

export default ActiveClaimsPanel;