// src/components/OfferActions.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as offerService from "../services/offerService";
import ClaimModal from "./ClaimModal";
import ExpiryCountdown from "./ExpiryCountdown";
import claimUrlFrom from "../utils/claimUrl";
import OfferQRCode from "./OfferQRCode";
import { supabase } from "../supabaseClient";
import BusinessApproveClaim, { type PickerFns as ApproverPickerFns } from "./BusinessApproveClaim";
import type { PickerItem } from "../types/offerTemplateTypes";
import "../css/cards.css";
import "../css/ui-forms.css";

type OfferLike = {
  assignedOfferId?: string;
  assignedId?: string;
  claimPolicy?: "ONLINE" | "MANUAL" | "BOTH";
  canClaim?: boolean;
  canApproveClaim?: boolean; // business flag hint from server (optional)
  offerType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";

  // used to build pickers
  scopeKind?: "ANY" | "LIST";
  scopeItems?: Array<any>;
  grants?: Array<any>;
  grantPickLimit?: number;

  // fixed discount
  discountAmount?: number | null;
};

type ClaimSource = "MANUAL" | "ONLINE";

type ClaimView = {
  id?: string;
  claimId?: string;
  claimSource?: ClaimSource;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  discountCode?: string | null;
  code?: string | null;
  expiresAt?: string | null;
  grants?: Array<any>;
  redemptionType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
};

// normalize server DTO → local ClaimView shape
const normalizeClaim = (c: any): ClaimView => ({
  id: c?.id ?? c?.claimId,
  claimId: c?.claimId ?? c?.id,
  claimSource: c?.claimSource,
  status: c?.status,
  discountCode: c?.discountCode ?? c?.code ?? null,
  code: c?.code ?? c?.discountCode ?? null,
  expiresAt: c?.expiresAt ?? null,
  grants: c?.grants ?? [],
  redemptionType: c?.redemptionType ?? c?.type,
});

// tiny local search helper over a static array
const makeLocalFetcher = (items: PickerItem[]) => {
  return async (q: string) => {
    const s = (q || "").toLowerCase().trim();
    if (!s) return items;
    return items.filter(
      (it) =>
        (it.title ?? "").toLowerCase().includes(s) ||
        (it.subtitle ?? "").toLowerCase().includes(s)
    );
  };
};

// map offer.scopeItems → PickerItem[]
const mapScopeToPickerItems = (scopeItems: any[] | undefined): { products: PickerItem[]; bundles: PickerItem[] } => {
  const products: PickerItem[] = [];
  const bundles: PickerItem[] = [];
  for (const si of scopeItems ?? []) {
    if (si?.itemType === "PRODUCT" && si.product?.id) {
      products.push({
        id: si.product.id,
        title: si.product.name ?? "Product",
        subtitle: si.product.slug ?? undefined,
        imageUrl: si.product.primaryImageUrl ?? undefined,
      });
    } else if (si?.itemType === "BUNDLE" && si.bundle?.id) {
      bundles.push({
        id: si.bundle.id,
        title: si.bundle.title ?? "Bundle",
        subtitle: si.bundle.slug ?? undefined,
        imageUrl: si.bundle.primaryImageUrl ?? undefined,
      });
    }
  }
  // dedupe by id
  const dedupe = (arr: PickerItem[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  };
  return { products: dedupe(products), bundles: dedupe(bundles) };
};

// map offer.grants → PickerItem[] (carry defaultQty in payload)
const mapGrantsToPickerItems = (grants: any[] | undefined): { products: PickerItem[]; bundles: PickerItem[] } => {
  const products: PickerItem[] = [];
  const bundles: PickerItem[] = [];
  for (const g of grants ?? []) {
    const defaultQty = g.quantity ?? g.defaultQuantity ?? 1;
    if (g.itemType === "PRODUCT" && g.product?.id) {
      products.push({
        id: g.product.id,
        title: g.product.name ?? "Product",
        subtitle: g.product.slug ?? undefined,
        imageUrl: g.product.primaryImageUrl ?? undefined,
        payload: { defaultQty, kind: "PRODUCT" },
      });
    } else if (g.itemType === "BUNDLE" && g.bundle?.id) {
      bundles.push({
        id: g.bundle.id,
        title: g.bundle.title ?? "Bundle",
        subtitle: g.bundle.slug ?? undefined,
        imageUrl: g.bundle.primaryImageUrl ?? undefined,
        payload: { defaultQty, kind: "BUNDLE" },
      });
    }
  }
  const dedupe = (arr: PickerItem[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  };
  return { products: dedupe(products), bundles: dedupe(bundles) };
};

interface Props {
  offer: OfferLike;
  token?: string | null;
  initialManual?: ClaimView | null;
  initialOnline?: ClaimView | null;
  onUpdated?: (updated?: any) => void;
}

const OfferActions: React.FC<Props> = ({
  offer,
  token,
  initialManual = null,
  initialOnline = null,
  onUpdated,
}) => {
  const assignedId = useMemo(
    () => offer.assignedOfferId ?? offer.assignedId ?? "",
    [offer.assignedOfferId, offer.assignedId]
  );

  // infer business viewer; if approvable fetch succeeds, we elevate this to true
  const [viewerIsBusiness, setViewerIsBusiness] = useState(!!offer.canApproveClaim);
  const showConsumer = !viewerIsBusiness;

  // policy gates
  const manualAllowed = offer.claimPolicy === "MANUAL" || offer.claimPolicy === "BOTH";
  const onlineAllowed = offer.claimPolicy === "ONLINE" || offer.claimPolicy === "BOTH";
  const canClaimBase = !!offer.canClaim && !!assignedId;
  const canManual = canClaimBase && manualAllowed;
  const canOnline = canClaimBase && onlineAllowed;

  // state: active claims
  const [manual, setManual] = useState<ClaimView | null>(initialManual);
  const [online, setOnline] = useState<ClaimView | null>(initialOnline);

  // state: UI
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [expiredManual, setExpiredManual] = useState(false);
  const [expiredOnline, setExpiredOnline] = useState(false);

  const isGrantType = offer.offerType === "GRANT";
  const hasGrantList = Array.isArray(offer.grants) && offer.grants.length > 0;
  const expectsGrants = isGrantType || hasGrantList;

  const isFixedDiscount = (offerType: string | unknown) =>
    String(offerType).toUpperCase() === "FIXED_DISCOUNT";

  const getFixedAmountOrThrow = (o: { discountAmount?: number | null }): string => {
    const val = o.discountAmount;
    if (val == null) throw new Error("Fixed discount amount is missing on this offer/template.");
    return String(val);
  };

  // unified token helper
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

  // Prefetch consumer claims
  useEffect(() => {
    let closed = false;
    if (!assignedId || !showConsumer) return;
    (async () => {
      try {
        const { manual: m, online: o } = await withAuthOrThrow(async (t) => {
          const [mRes, oRes] = await Promise.allSettled([
            offerService.fetchActiveClaimForMe(t, assignedId, "MANUAL"),
            offerService.fetchActiveClaimForMe(t, assignedId, "ONLINE"),
          ]);
          return {
            manual: mRes.status === "fulfilled" ? mRes.value : null,
            online: oRes.status === "fulfilled" ? oRes.value : null,
          };
        });
        if (closed) return;
        if (m) setManual(normalizeClaim(m));
        if (o) setOnline(normalizeClaim(o));
      } catch {
        /* no-op */
      }
    })();
    return () => {
      closed = true;
    };
  }, [assignedId, showConsumer, withAuthOrThrow]);

  // Prefetch approvable claim (business)
  useEffect(() => {
    let closed = false;
    if (!assignedId) return;
    (async () => {
      try {
        const claim = await withAuthOrThrow((t) =>
          offerService.fetchApprovableManualClaim(assignedId, t)
        );
        if (closed || !claim) return;
        setManual(normalizeClaim(claim));
        setViewerIsBusiness(true);
      } catch {
        // ignore 403 / 404
      }
    })();
    return () => {
      closed = true;
    };
  }, [assignedId, withAuthOrThrow]);

  // Create claims
  const createManual = useCallback(async () => {
    const body: any = { claimSource: "MANUAL", expiresInMinutes: 15 };
    if (isFixedDiscount(offer.offerType)) body.redemptionValue = getFixedAmountOrThrow(offer);
    const c = await withAuthOrThrow((t) => offerService.requestClaim(t, assignedId, body));
    if (c) {
      setManual(c as any);
      setExpiredManual(false);
    }
    return c;
  }, [assignedId, withAuthOrThrow, offer]);

  const createOnline = useCallback(async () => {
    const body: any = { claimSource: "ONLINE", expiresInMinutes: 15 };
    if (isFixedDiscount(offer.offerType)) body.redemptionValue = getFixedAmountOrThrow(offer);
    const c = await withAuthOrThrow((t) => offerService.requestClaim(t, assignedId, body));
    if (c) {
      setOnline(c as any);
      setExpiredOnline(false);
    }
    return c;
  }, [assignedId, withAuthOrThrow, offer]);

  const shouldOpenGrantModal = offer.offerType === "GRANT" && (offer.grantPickLimit ?? 0) > 0;

  const handleManualClick = useCallback(async () => {
    if (!(offer.claimPolicy === "MANUAL" || offer.claimPolicy === "BOTH")) return;
    if (shouldOpenGrantModal) {
      setShowClaimModal(true);
    } else {
      try {
        await createManual();
      } catch (e) {
        console.warn("[OfferActions] manual create failed", e);
      }
    }
  }, [offer.claimPolicy, shouldOpenGrantModal, createManual]);

  const handleOnlineClick = useCallback(async () => {
    if (!(offer.claimPolicy === "ONLINE" || offer.claimPolicy === "BOTH")) return;
    try {
      await createOnline();
    } catch (e) {
      console.warn("[OfferActions] online create failed", e);
    }
  }, [offer.claimPolicy, createOnline]);

  // -------- Build pickers from offer.scopeItems + offer.grants --------
  const scopePickers = useMemo(() => mapScopeToPickerItems(offer.scopeItems), [offer.scopeItems]);
  const grantPickers = useMemo(() => mapGrantsToPickerItems(offer.grants), [offer.grants]);

  const approverPickers: ApproverPickerFns = useMemo(
    () => ({
      fetchScopeProducts: makeLocalFetcher(scopePickers.products),
      fetchScopeBundles: makeLocalFetcher(scopePickers.bundles),
      fetchGrantProducts: makeLocalFetcher(grantPickers.products),
      fetchGrantBundles: makeLocalFetcher(grantPickers.bundles),
    }),
    [scopePickers, grantPickers]
  );

  // -------- Derived for render --------
  const activeManual = manual;
  const manualClaimId = activeManual?.id ?? activeManual?.claimId;
  const manualCode = activeManual?.discountCode ?? activeManual?.code;
  const qrUrl = manualClaimId ? claimUrlFrom({ id: manualClaimId, discountCode: manualCode || "" }) : "";
  const onlineCode = online?.discountCode ?? online?.code;
  const isClaimable = (!!offer.canClaim && !!assignedId);
  const hasManualClaim = !!activeManual;
  const hasOnlineClaim = !!online;

  // ✅ only allow grants when the offer actually expects them
  const approvalPickLimit = useMemo(
    () => (expectsGrants ? (offer.grantPickLimit ?? 0) : 0),
    [expectsGrants, offer.grantPickLimit]
  );

  const canApprove = (activeManual?.status ?? "PENDING") === "PENDING";

  return (
    <div>
      {/* Consumer CTAs */}
      {showConsumer && isClaimable && (
        <div className="offer-cta">
          {(!hasManualClaim || !hasOnlineClaim) && (
            <div className="offer-cta__help">
              • <strong>Generate QR (in-store)</strong>: shows a QR for the business to scan and approve on the spot.
              <br />
              • <strong>Generate Code (online)</strong>: gives you a one-time code to apply at checkout.
            </div>
          )}
          <div className="offer-cta__buttons">
            {(offer.claimPolicy === "MANUAL" || offer.claimPolicy === "BOTH") && (
              <button className="btn btn--primary" onClick={handleManualClick}>
                Generate QR
              </button>
            )}
            {(offer.claimPolicy === "ONLINE" || offer.claimPolicy === "BOTH") && (
              <button className="btn btn--primary" onClick={handleOnlineClick}>
                Generate Code (online)
              </button>
            )}
          </div>
        </div>
      )}

      {/* MANUAL QR panel (consumer) */}
      {showConsumer && activeManual && (
        <div className="claim-qr-panel" style={{ marginTop: 12 }}>
          <div className="help">Show this QR to the business</div>
          {qrUrl && <OfferQRCode url={qrUrl} />}
          {activeManual.expiresAt && !expiredManual && (
            <div style={{ marginTop: 6 }}>
              <ExpiryCountdown expiresAt={activeManual.expiresAt} onExpire={() => setExpiredManual(true)} />
            </div>
          )}
          {expiredManual && (
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn btn--primary" onClick={handleManualClick}>
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}

      {/* ONLINE code panel (consumer) */}
      {showConsumer && online && (
        <div className="claim-code-panel" style={{ marginTop: 12 }}>
          <div className="help">Use this code at checkout</div>
          <div
            className="th-code"
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "8px 12px",
              border: "1px solid var(--th-border, #e5e7eb)",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {onlineCode || "—"}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => onlineCode && navigator.clipboard?.writeText(onlineCode)}
              title="Copy code"
              style={{ marginLeft: 8 }}
            >
              Copy
            </button>
          </div>

          {online.expiresAt && !expiredOnline && (
            <div style={{ marginTop: 6 }}>
              <ExpiryCountdown expiresAt={online.expiresAt} onExpire={() => setExpiredOnline(true)} />
            </div>
          )}
          {expiredOnline && (
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn btn--primary" onClick={handleOnlineClick}>
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Business approval panel (uses new flow) */}
      {viewerIsBusiness && activeManual && assignedId && (
        <div style={{ marginTop: 16 }}>
          <BusinessApproveClaim
            assignedOfferId={assignedId}
            claimId={manualClaimId!}
            canApprove={canApprove}
            claimPolicy={(offer.claimPolicy as any) ?? "MANUAL"}
            expiresAt={activeManual.expiresAt || undefined}
            // Preview props
            redemptionType={(activeManual.redemptionType as any) || (offer.offerType as any)}
            scopeKind={(offer.scopeKind as any) || "ANY"}
            approvalPickLimit={approvalPickLimit}
            defaultBillTotal={0}
            // Pickers derived from offer
            pickers={approverPickers}
            onApproved={() => onUpdated?.()}
          />
        </div>
      )}

      {/* Claim modal (manual path; grants/validation inside) */}
      {showConsumer && (offer.offerType === "GRANT") && (offer.grantPickLimit ?? 0) > 0 && assignedId && (
        <ClaimModal
          assignedOfferId={assignedId}
          isOpen={/* state */ false} // unchanged: your existing open/close logic above
          onClose={() => setShowClaimModal(false)}
          onCreated={(claim) => { setManual(claim); setExpiredManual(false); }}
          grantMode={true}
          fetchGrantOptions={(id) => withAuthOrThrow((t) => offerService.fetchGrantOptions(id, t))}
          createClaim={(body) => withAuthOrThrow((t) => offerService.requestClaim(t, assignedId, body))}
        />
      )}
    </div>
  );
};

export default OfferActions;
