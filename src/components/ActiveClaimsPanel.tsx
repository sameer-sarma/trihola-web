// src/components/ActiveClaimsPanel.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as offerService from "../services/offerService";
import ExpiryCountdown from "./ExpiryCountdown";
import OfferQRCode from "./OfferQRCode";
import claimUrlFrom from "../utils/claimUrl";
import BusinessApproveClaim from "./BusinessApproveClaim";
import ClaimModal from "./ClaimModal";
import type { PickerItem } from "../types/offerTemplateTypes";
import { supabase } from "../supabaseClient";

type ClaimSource = "MANUAL" | "ONLINE";
type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

type ClaimView = {
  id: string;
  assignedOfferId?: string;
  claimSource: ClaimSource;
  status: ClaimStatus;
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
    status: (c?.status || "PENDING") as ClaimStatus,
    discountCode: c?.discountCode ?? c?.code ?? null,
    expiresAt: c?.expiresAt ?? null,
    grants: c?.grants ?? c?.grantItems ?? [],
    redemptionType: c?.redemptionType ?? c?.type,
    grantPickLimit: c?.grantPickLimit,
  };
}

export type PickerFns = {
  fetchScopeProducts?: (q: string) => Promise<PickerItem[]>;
  fetchScopeBundles?: (q: string) => Promise<PickerItem[]>;
  fetchGrantProducts?: (q: string) => Promise<PickerItem[]>;
  fetchGrantBundles?: (q: string) => Promise<PickerItem[]>;
};

interface Props {
  assignedOfferId: string;
  token: string;
  viewer: "USER" | "BUSINESS";
  onUpdated?: () => void;

  canClaim?: boolean;
  claimPolicy?: "ONLINE" | "MANUAL" | "BOTH";
  offerType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
  discountAmount?: number | null;
  grantPickLimit?: number;
  redemptionsLeft?: number;

  scopeKind?: "ANY" | "LIST";
  pickers?: PickerFns;
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
  const [busy, setBusy] = useState<"MANUAL" | "ONLINE" | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // ===== Auth helpers
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

  // ===== One-shot load of active claim(s) — guarded, no polling
  const inFlightRef = React.useRef(false);
  const lastFetchMsRef = React.useRef(0);

  const loadClaimsOnce = useCallback(async () => {
    if (!assignedOfferId || !token) return;
    if (inFlightRef.current) return;

    // Cooldown to prevent rapid repeats (e.g., cascade re-renders)
    const now = Date.now();
    if (now - lastFetchMsRef.current < 1000) return; // 1s cooldown
    lastFetchMsRef.current = now;

    inFlightRef.current = true;
    setLoading(true);
    try {
      if (viewer === "USER") {
        const allowManual = claimPolicy === "MANUAL" || claimPolicy === "BOTH";
        const allowOnline = claimPolicy === "ONLINE" || claimPolicy === "BOTH";

        if (allowManual) {
          const m = await offerService
            .fetchActiveClaimForMe(token, assignedOfferId, "MANUAL")
            .catch((e: any) => (e?.response?.status === 404 ? null : Promise.reject(e)));
          setManual(m ? normalizeClaim(m) : null);
        } else {
          setManual(null);
        }

        if (allowOnline) {
          const o = await offerService
            .fetchActiveClaimForMe(token, assignedOfferId, "ONLINE")
            .catch((e: any) => (e?.response?.status === 404 ? null : Promise.reject(e)));
          setOnline(o ? normalizeClaim(o) : null);
        } else {
          setOnline(null);
        }
      } else {
        const approvable = await offerService
          .fetchApprovableManualClaim(assignedOfferId, token)
          .catch((e: any) => (e?.response?.status === 404 ? null : Promise.reject(e)));
        setManual(approvable ? normalizeClaim(approvable) : null);
        setOnline(null);
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [assignedOfferId, token, viewer, claimPolicy]);

  useEffect(() => {
    loadClaimsOnce();
  }, [loadClaimsOnce]);

  // ===== Countdown ticker ONLY when a claim exists (avoid render churn otherwise)
  const hasAny =
    (!!manual && manual.status !== "EXPIRED") || (!!online && online.status !== "EXPIRED");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!hasAny) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasAny]);

  // ===== Helpers
  const manualQrUrl = useMemo(
    () =>
      manual?.id
        ? claimUrlFrom({ id: manual.id, discountCode: manual.discountCode ?? undefined })
        : "",
    [manual]
  );

  const fmtAbs = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
  const fmtRel = (iso?: string | null) => {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - nowMs;
    if (diff <= 0) return "expired";
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m > 0 ? `${m}m ${ss}s` : `${ss}s`;
  };

  // ===== Creation / Regeneration
  const manualNeedsGrantFlow = offerType === "GRANT" && (grantPickLimit ?? 0) > 0;

  async function createManual() {
    if (manualNeedsGrantFlow) {
      setShowGrantModal(true);
      return;
    }
    setBusy("MANUAL");
    try {
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
    if (offerType === "FIXED_DISCOUNT" && (discountAmount === null || Number(discountAmount) <= 0)) {
      return createManual();
    }
    setBusy("ONLINE");
    try {
      // ONLINE: never send grant picks; cart reconciliation will handle grants
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

  const regenerateManual = createManual;
  const regenerateOnline = createOnline;

  // ===== CTA guards + empty state
  const claimPolicyAllows =
    claimPolicy === "ONLINE" || claimPolicy === "MANUAL" || claimPolicy === "BOTH";

  const canShowCtas =
    viewer === "USER" &&
    (canClaim ?? true) &&
    claimPolicyAllows &&
    (redemptionsLeft == null || redemptionsLeft > 0);

  const emptyStateReason =
    viewer !== "USER" ? null
    : !claimPolicyAllows ? "Claiming is disabled for this offer."
    : redemptionsLeft === 0 ? "No redemptions left on this offer."
    : canClaim === false ? "You are not eligible to claim this offer."
    : null;

  if (loading && !showGrantModal) return null;

  const topStatus = manual?.status ?? online?.status ?? "—";
  const topExpiryIso = manual?.expiresAt ?? online?.expiresAt;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="section-header">Claims</div>

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
              <ExpiryCountdown
                expiresAt={manual.expiresAt}
                onExpire={() => {
                  loadClaimsOnce();
                  onUpdated?.();
                }}
              />
            </div>
          )}
          <div style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.3 }}>
            <div>Show this QR to the business</div>
            <div>Scan to claim this offer</div>
          </div>
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
                <ExpiryCountdown
                  expiresAt={online.expiresAt}
                  onExpire={() => {
                    loadClaimsOnce();
                    onUpdated?.();
                  }}
                />
              </div>
            )}
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
        <div
          className="kv-item span-4"
          style={{
            marginTop: 12,
            padding: "12px 14px",
            border: "1px dashed rgba(0,0,0,.12)",
            borderRadius: 10,
            background: "rgba(0,0,0,.02)",
            color: "rgba(0,0,0,.7)",
          }}
        >
          <strong>No active claim.</strong>{" "}
          {emptyStateReason ? <span>{emptyStateReason}</span> : null}
        </div>
      )}

      {/* USER view: show CTAs when allowed by policy */}
      {viewer === "USER" && !hasAny && canShowCtas && (
        <div className="kv-grid-4" style={{ marginTop: 12 }}>
          {(claimPolicy === "MANUAL" || claimPolicy === "BOTH") && (
            <div className="kv-item span-2">
              <button type="button" className="btn btn--primary w-full" onClick={createManual} disabled={busy !== null}>
                {busy === "MANUAL" ? "Generating…" : manualNeedsGrantFlow ? "Choose grant & get QR" : "Generate QR"}
              </button>
            </div>
          )}
          {(claimPolicy === "ONLINE" || claimPolicy === "BOTH") && (
            <div className="kv-item span-2">
              <button type="button" className="btn btn--primary w-full" onClick={createOnline} disabled={busy !== null}>
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
            redemptionType={manual.redemptionType ?? "FIXED_DISCOUNT"}
            scopeKind={scopeKind}
            approvalPickLimit={manual.grantPickLimit ?? 0}
            defaultBillTotal={0}
            pickers={pickers}
            onApproved={() => onUpdated?.()}
          />
        </div>
      )}

      {/* GRANT pick modal for USER (MANUAL only) */}
      {viewer === "USER" && (
        <ClaimModal
          assignedOfferId={assignedOfferId}
          isOpen={ manualNeedsGrantFlow && showGrantModal}
          onClose={() => setShowGrantModal(false)}
          onCreated={(c: any) => {
            const v = normalizeClaim(c);
            if (v.claimSource === "MANUAL") { setManual(v); setOnline(null); }
            else { setOnline(v); setManual(null); }
            setShowGrantModal(false);
            onUpdated?.();
          }}
          grantMode={true}
          claimSource={"MANUAL"}
          primaryCtaLabel={"Generate QR"}
          fetchGrantOptions={(id) => withAuthOrThrow((t) => offerService.fetchGrantOptions(id, t))}
          createClaim={(body) => withAuthOrThrow((t) => offerService.requestClaim(t, assignedOfferId, body))}
        />
      )}
    </div>
  );
};

export default ActiveClaimsPanel;
