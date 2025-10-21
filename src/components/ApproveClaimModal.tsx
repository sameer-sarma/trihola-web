import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "../css/ApproveClaimModal.css";
import { previewClaim } from "../services/offerService";
import type {
  ClaimPreviewRequest,
  ClaimPreviewResponse,
  RedemptionType,
} from "../types/offer";
import type { PickerItem } from "../types/offerTemplateTypes";
import ItemPicker, { type ItemPickerValue } from "./ItemPicker";

// UI-only scope flag
export type OfferScopeKind = "ANY" | "LIST";

type PickerFns = {
  fetchScopeProducts?: (q: string) => Promise<PickerItem[]>;
  fetchScopeBundles?: (q: string) => Promise<PickerItem[]>;
  fetchGrantProducts?: (q: string) => Promise<PickerItem[]>;
  fetchGrantBundles?: (q: string) => Promise<PickerItem[]>;
};

interface ApproveClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (
    redemptionValue: string,
    note?: string,
    grants?: Array<
      | { itemType?: "PRODUCT"; productId: string; qty: number }
      | { itemType?: "BUNDLE"; bundleId: string; qty: number }
    >
  ) => void;

  // preview
  assignedOfferId: string;
  claimId: string;
  redemptionType: RedemptionType;
  scopeKind: OfferScopeKind;
  approvalPickLimit?: number | null;

  // defaults
  defaultBillTotal?: number;

  // pickers
  pickers?: PickerFns;
   // This come from the claim 
    initialGrants?: Array<
    | { itemType?: "PRODUCT"; product?: { id: string }; quantity: number }
    | { itemType?: "BUNDLE";  bundle?:  { id: string }; quantity: number }
  >;
   // ✅ NEW: full eligible list from the snapshot (template)
  eligibleGrantItems?: Array<
    | { itemType?: "PRODUCT"; product?: { id: string }; quantity?: number }
    | { itemType?: "BUNDLE";  bundle?:  { id: string }; quantity?: number }
  >;
}

type UiCartRow = {
  id: string;
  item: ItemPickerValue; // PRODUCT or BUNDLE; no per-row picker anymore
  qty: number;
  unitPrice?: number;
};

type UiGrant =
  | { itemType: "PRODUCT"; productId: string; qty: number; autoDefault?: number }
  | { itemType: "BUNDLE"; bundleId: string; qty: number; autoDefault?: number };

const ApproveClaimModal: React.FC<ApproveClaimModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  assignedOfferId,
  claimId,
  redemptionType,
  scopeKind,
  approvalPickLimit,
  defaultBillTotal = 0,
  pickers,
  initialGrants,
  eligibleGrantItems,
}) => {

  // -------------- state (unconditional hooks) --------------
  const [billTotal, setBillTotal] = useState<number>(defaultBillTotal);

  const [rows, setRows] = useState<UiCartRow[]>([]);
  const [topItemPicker, setTopItemPicker] = useState<ItemPickerValue>(null);


  const [selectedGrants, setSelectedGrants] = useState<UiGrant[]>([]);
 // Seed selected grants from the existing claim (if any) when the modal opens
    useEffect(() => {
      if (!isOpen) return;
      if (!initialGrants?.length) return;

      const toUiGrant = (
        g:
          | { itemType?: "PRODUCT"; product?: { id: string }; quantity: number }
          | { itemType?: "BUNDLE";  bundle?:  { id: string }; quantity: number }
      ): UiGrant => {
        const qty = Math.max(1, g.quantity ?? 1);

        // Treat as BUNDLE if explicitly marked or if a bundle object is present
        const isBundle = g.itemType === "BUNDLE" || ("bundle" in g && !!g.bundle);

        if (isBundle) {
          // safely read bundle id (fall back to product id if your payload sometimes uses that)
          const id =
            (("bundle" in g && g.bundle?.id) as string | undefined) ??
            (("product" in g && (g as any).product?.id) as string | undefined);

          return { itemType: "BUNDLE", bundleId: String(id ?? ""), qty };
        }

        // PRODUCT path
        const id =
          (("product" in g && g.product?.id) as string | undefined) ??
          (("bundle" in g && (g as any).bundle?.id) as string | undefined);

        return { itemType: "PRODUCT", productId: String(id ?? ""), qty };
      };

      setSelectedGrants(initialGrants.map(toUiGrant));
      // We just synced with server state; allow Preview immediately
      setDirty(false);
    }, [isOpen, initialGrants]);


  const [grantAdd, setGrantAdd] = useState<ItemPickerValue>(null);

  const [note, setNote] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaimPreviewResponse | null>(null);
  const [dirty, setDirty] = useState(true);

  const isGrant = redemptionType === "GRANT";
  const requiredGrantCount = Math.max(0, approvalPickLimit ?? 0);
  const needsGrantPicker = isGrant && requiredGrantCount > 0;
  // Show the grants block if: this is a GRANT claim and either we need to pick OR we already have grants.
  const showGrantSection = isGrant && (needsGrantPicker || selectedGrants.length > 0);
  // If no picks are required, show the existing grants read-only.
  const grantsReadOnly = isGrant && requiredGrantCount === 0;

  // -------------- helpers --------------
  const markDirty = () => setDirty(true);

  const toNum = (v: number | string | null | undefined): number | undefined =>
    v == null ? undefined : typeof v === "number" ? v : Number(v);

  const money = (v: number | string | null | undefined): string => {
    const n = toNum(v);
    if (n === undefined || !Number.isFinite(n)) return "—";
    return `₹${n.toFixed(2)}`;
  };

  const cartSum = rows.reduce(
    (sum, r) => sum + (r.qty || 0) * (r.unitPrice || 0),
    0
  );

  // The “Total purchase” shown in UI & Summary:
  // - If user typed a billTotal (> 0), use that.
  // - Otherwise, for LIST show cartSum; for ANY it’s the (required) billTotal.
  const inputTotalPurchase = (): number =>
    billTotal && billTotal > 0
      ? billTotal
      : scopeKind === "LIST"
      ? cartSum
      : billTotal || 0;

  // Add or bump item via the single top picker
  const addPickedItem = (picked: ItemPickerValue | null) => {
    if (!picked) return;
    setRows((prev) => {
      const idx = prev.findIndex(
        (r) => r.item?.kind === picked.kind && r.item?.id === picked.id
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 0) + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id:
            (crypto as any)?.randomUUID?.() ??
            String(Date.now() + Math.random()),
          item: picked,
          qty: 1,
        },
      ];
    });
    setTopItemPicker(null);
    markDirty();
  };

  // Row helpers
  const setRow = (id: string, patch: Partial<UiCartRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markDirty();
  };
  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    markDirty();
  };

  // Grants
  const removeGrant = (g: UiGrant) => {
    setSelectedGrants((prev) =>
      prev.filter((x) =>
        x.itemType === "PRODUCT"
          ? !(g.itemType === "PRODUCT" && x.productId === g.productId)
          : !(g.itemType === "BUNDLE" && x.bundleId === g.bundleId)
      )
    );
    markDirty();
  };
  const changeGrantQty = (g: UiGrant, qty: number) => {
    setSelectedGrants((prev) =>
      prev.map((x) =>
        x.itemType === "PRODUCT"
          ? g.itemType === "PRODUCT" && x.productId === g.productId
            ? { ...x, qty }
            : x
          : g.itemType === "BUNDLE" && x.bundleId === g.bundleId
          ? { ...x, qty }
          : x
      )
    );
    markDirty();
  };

  // Type guards for eligibleGrantItems union
function isEligibleProduct(
  g:
    | { itemType?: "PRODUCT"; product?: { id: string }; quantity?: number }
    | { itemType?: "BUNDLE";  bundle?:  { id: string }; quantity?: number }
): g is { itemType?: "PRODUCT"; product?: { id: string }; quantity?: number } {
  return g.itemType === "PRODUCT" || ("product" in g && !!g.product);
}

function isEligibleBundle(
  g:
    | { itemType?: "PRODUCT"; product?: { id: string }; quantity?: number }
    | { itemType?: "BUNDLE";  bundle?:  { id: string }; quantity?: number }
): g is { itemType?: "BUNDLE"; bundle?: { id: string }; quantity?: number } {
  return g.itemType === "BUNDLE" || ("bundle" in g && !!g.bundle);
}

  // ---- Eligible grant sets (ids) ----
const eligibleProductIds = React.useMemo(() => {
  return new Set(
    (eligibleGrantItems ?? [])
      .filter(isEligibleProduct)
      .map((g) => String(g.product?.id))
      .filter(Boolean)
  );
}, [eligibleGrantItems]);

const eligibleBundleIds = React.useMemo(() => {
  return new Set(
    (eligibleGrantItems ?? [])
      .filter(isEligibleBundle)
      .map((g) => String(g.bundle?.id))
      .filter(Boolean)
  );
}, [eligibleGrantItems]);

  const fetchEligibleGrantProducts = async (q: string) => {
  const list = (await (pickers?.fetchGrantProducts?.(q) ?? Promise.resolve([])));
  return list.filter((p) => eligibleProductIds.size === 0 || eligibleProductIds.has(String(p.id)));
};

const fetchEligibleGrantBundles = async (q: string) => {
  const list = (await (pickers?.fetchGrantBundles?.(q) ?? Promise.resolve([])));
  return list.filter((b) => eligibleBundleIds.size === 0 || eligibleBundleIds.has(String(b.id)));
};

  // -------------- validation --------------
  const hasValidAny = scopeKind === "ANY" ? billTotal > 0 : true;
  const hasValidList =
    scopeKind === "LIST" ? rows.some((r) => !!r.item && r.qty > 0) : true;
  const grantCountOk = needsGrantPicker
    ? selectedGrants.length === requiredGrantCount
    : true;

  const allSelectedAreEligible = React.useMemo(() => {
    if (!selectedGrants.length) return true;
    // If an eligible list is provided, enforce it; if none supplied, allow all.
    if ((eligibleGrantItems ?? []).length === 0) return true;
    return selectedGrants.every((g) =>
      g.itemType === "PRODUCT"
        ? eligibleProductIds.has(String(g.productId))
        : eligibleBundleIds.has(String(g.bundleId))
    );
  }, [selectedGrants, eligibleGrantItems, eligibleProductIds, eligibleBundleIds]);

  const inputsValid = hasValidAny && hasValidList && grantCountOk && allSelectedAreEligible;
  // -------------- preview --------------
  const buildPreviewBody = (): ClaimPreviewRequest => {
    // Preview API supports PRODUCT grants right now
    const previewGrants = isGrant
      ? selectedGrants
          .filter((g) => g.itemType === "PRODUCT")
          .map((g) => ({ productId: (g as any).productId as string, qty: g.qty }))
      : undefined;

    return {
      redemptionType,
      billTotal: billTotal && billTotal > 0 ? billTotal : undefined,
      cart:
        scopeKind === "LIST"
          ? rows.map((r) => ({
              productId:
                r.item?.kind === "PRODUCT" ? (r.item.id as string) : undefined,
              bundleId:
                r.item?.kind === "BUNDLE" ? (r.item.id as string) : undefined,
              qty: r.qty,
              unitPrice: r.unitPrice,
            }))
          : undefined,
      selectedGrants: previewGrants as any,
    };
  };

  const handlePreview = async () => {
    setErr(null);
    setPreview(null);
    if (!inputsValid) {
      setErr("Please complete required fields before preview.");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const body = buildPreviewBody();
      const p = await previewClaim(assignedOfferId, claimId, body, token);
      setPreview(p);
      setDirty(false);
    } catch (e: any) {
      setErr(e.message ?? "Preview failed");
    } finally {
      setBusy(false);
    }
  };

const computeRedemptionValue = () => {
  if (isGrant) return "";
  const v = preview?.applied?.value;
  if (v == null) return "0";
  // v can be number or string ("5100.00")
  return typeof v === "number" ? v.toFixed(2) : String(v);
};

  const approveDisabled = busy || dirty || !preview || !preview.canApprove;

  // -------------- gate UI --------------
  if (!isOpen) return null;

/*   const grantsRemaining = Math.max(
    0,
    requiredGrantCount - selectedGrants.length
  );
  const grantHeaderText = needsGrantPicker
    ? `Grant selection (required ${requiredGrantCount}) — ${selectedGrants.length}/${requiredGrantCount} selected${
        grantsRemaining ? ` • ${grantsRemaining} remaining` : ""
      }`
    : "Grant selection";
*/

  // -------------- render --------------
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Approve claim</h3>

        {/* Total purchase (always visible). LIST is optional. */}
        <div className="card soft mb-3">
          <div className="row between items-center">
            <label className="text-sm font-medium">
              {scopeKind === "ANY"
                ? "Total purchase*"
                : "Total purchase (optional)"}
            </label>
            <input
              type="number"
              className="input"
              style={{ width: 140 }}
              placeholder="e.g. 9999"
              value={billTotal}
              onChange={(e) => {
                setBillTotal(Number(e.target.value || 0));
                markDirty();
              }}
            />
          </div>
          {scopeKind === "LIST" && (
            <div className="text-xs text-muted mt-2">
              If provided, this is the full bill total (used for % discounts /
              min spend). The table below lists only in-scope items used to
              compute eligibility.
            </div>
          )}
        </div>

        {/* LIST scope: single picker + compact grid */}
        {scopeKind === "LIST" && (
          <div className="card soft mb-3">
            <div className="text-sm font-semibold mb-2">
              In-scope items • Purchase details
            </div>

        {showGrantSection && (
          <div className="text-xs text-muted" style={{ marginBottom: 6 }}>
            <div><b>Eligible grant items</b> (from the offer snapshot):</div>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              {(eligibleGrantItems ?? []).map((g, i) => {
                if (isEligibleBundle(g)) {
                  const id = g.bundle?.id ?? "";
                  const qty = g.quantity ?? 1;
                  return <li key={`BUNDLE:${id}:${i}`}>Bundle {id} • default qty {qty}</li>;
                }
                if (isEligibleProduct(g)) {
                  const id = g.product?.id ?? "";
                  const qty = g.quantity ?? 1;
                  return <li key={`PRODUCT:${id}:${i}`}>Product {id} • default qty {qty}</li>;
                }
                return <li key={`UNK:${i}`}>Unknown item</li>;
              })}
              {(eligibleGrantItems ?? []).length === 0 && <li>None provided</li>}
            </ul>
          </div>
        )}

            {/* Single picker (adds to grid) */}
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <ItemPicker
                value={topItemPicker}
                onChange={(next) => addPickedItem(next)}
                fetchProducts={fetchEligibleGrantProducts}
                fetchBundles={fetchEligibleGrantBundles}
                placeholderProduct="Pick product…"
                placeholderBundle="Pick bundle…"
                variant="compact"
              />
            </div>

            {/* Grid header */}
            <div className="table w-full">
              <div className="thead grid grid-cols-[1fr_64px_110px_120px_36px] gap-2 text-xs uppercase text-muted">
                <div>Item</div>
                <div>Qty</div>
                <div>Unit price</div>
                <div>Total</div>
                <div></div>
              </div>

              {/* Rows */}
              <div className="tbody">
                {rows.length === 0 ? (
                  <div className="text-sm text-muted" style={{ padding: "10px 0" }}>
                    No items yet. Use the picker above to add items.
                  </div>
                ) : (
                  rows.map((r) => {
                    const lineTotal = (r.qty || 0) * (r.unitPrice || 0);
                    const title = r.item?.item?.title ?? r.item?.id ?? "Item";
                    const subtitle =
                      r.item?.item?.subtitle ?? r.item?.kind ?? undefined;

                    return (
                      <div
                        key={r.id}
                        className="grid grid-cols-[1fr_64px_110px_120px_36px] gap-2 items-center py-2"
                      >
                        {/* Item label only (no row picker) */}
                        <div>
                          <div style={{ fontWeight: 600 }}>{title}</div>
                          {subtitle && (
                            <div className="text-xs text-muted">{subtitle}</div>
                          )}
                        </div>

                        <input
                          type="number"
                          className="input"
                          min={1}
                          style={{ width: 64 }}
                          value={r.qty}
                          onChange={(e) =>
                            setRow(r.id, { qty: Number(e.target.value || 1) })
                          }
                        />

                        <input
                          type="number"
                          className="input"
                          placeholder="0.00"
                          style={{ width: 110 }}
                          value={r.unitPrice ?? ""}
                          onChange={(e) =>
                            setRow(r.id, {
                              unitPrice:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />

                        <div
                          className="text-right tabular-nums font-medium"
                          style={{ width: 120 }}
                        >
                          {Number.isFinite(lineTotal)
                            ? `₹${lineTotal.toFixed(2)}`
                            : "—"}
                        </div>

                        <button
                          className="btn ghost"
                          onClick={() => removeRow(r.id)}
                          title="Remove line"
                          style={{ width: 32 }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="row between mt-3 border-t pt-2">
              <div className="text-sm text-muted">In-scope subtotal</div>
              <div className="text-right font-semibold">{money(cartSum)}</div>
            </div>
          </div>
        )}
        {isGrant && !allSelectedAreEligible && (
          <div className="text-red-600 text-sm" style={{ marginTop: 6 }}>
            One or more selected grants are not eligible for this offer. Please adjust your selection.
          </div>
        )}
        {/* Grants */}
        {showGrantSection &&  (
          <div className="card soft mb-3">
            <div className="text-sm font-semibold mb-2">{`${
              selectedGrants.length
            }/${requiredGrantCount} grants selected${
              requiredGrantCount - selectedGrants.length > 0
                ? ` • ${requiredGrantCount - selectedGrants.length} remaining`
                : ""
            }`}</div>

        {/* Only show the picker when more selections are required */}
        {!grantsReadOnly && (
          <ItemPicker
            value={grantAdd}
            onChange={(next) => {
              if (!next) return;
              if (selectedGrants.length >= requiredGrantCount) return;
              const defaultQty = (next.item?.payload as any)?.defaultQty ?? 1;
              if (next.kind === "PRODUCT") {
                if (selectedGrants.some((g) => g.itemType === "PRODUCT" && g.productId === next.id)) return;
                setSelectedGrants((prev) => [
                  ...prev,
                  { itemType: "PRODUCT", productId: next.id, qty: defaultQty, autoDefault: defaultQty },
                ]);
              } else {
                if (selectedGrants.some((g) => g.itemType === "BUNDLE" && g.bundleId === next.id)) return;
                setSelectedGrants((prev) => [
                  ...prev,
                  { itemType: "BUNDLE", bundleId: next.id, qty: defaultQty, autoDefault: defaultQty },
                ]);
              }
              setGrantAdd(null);
              markDirty();
            }}
            fetchProducts={pickers?.fetchGrantProducts ?? (async () => [])}
            fetchBundles={pickers?.fetchGrantBundles ?? (async () => [])}
            placeholderProduct={
              selectedGrants.length >= requiredGrantCount ? "Picker full" : "Add grant product…"
            }
            placeholderBundle={
              selectedGrants.length >= requiredGrantCount ? "Picker full" : "Add grant bundle…"
            }
            variant="compact"
          />
        )}

            <div className="mt-2 space-y-2">
              {selectedGrants.map((g) => {
                const key = g.itemType === "PRODUCT" ? g.productId : g.bundleId;
                return (
                  <div key={`${g.itemType}:${key}`} className="row between">
                    <span>
                      {g.itemType === "PRODUCT" ? "Product" : "Bundle"} {key}
                      {g.autoDefault ? (
                        <em className="text-muted"> • Auto: {g.autoDefault}</em>
                      ) : null}
                    </span>
                    <div className="row items-center" style={{ gap: 8 }}>
                      <input
                        type="number"
                        className="input"
                        style={{ width: 64 }}
                        min={1}
                        value={g.qty}
                        onChange={(e) => changeGrantQty(g, Number(e.target.value || 1))}
                        disabled={grantsReadOnly}
                      />
                      <button
                        className="btn tiny ghost"
                        onClick={() => removeGrant(g)}
                        disabled={grantsReadOnly}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
        <label style={{ display: "block", marginBottom: 12 }}>
          <div>Note (optional)</div>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              markDirty();
            }}
            rows={2}
          />
        </label>

        {/* Preview summary */}
        <div className="card soft mb-3">
          <div className="text-sm font-semibold mb-2">Preview summary</div>
          {err && <div className="text-red-600 mb-2">{err}</div>}
          {!preview ? (
            <div className="text-muted text-sm">
              Select required grants and click <b>Preview</b> to calculate.
            </div>
          ) : (
            <ul className="space-y-1">
              <li className="row between">
                <span>Total purchase</span>
                <b>{money(inputTotalPurchase())}</b>
              </li>
              <li className="row between">
                <span>In-scope product purchase</span>
                <b>{money(preview.eligibleSubtotal as any)}</b>
              </li>
              <li className="row between">
                <span>Applicable discount</span>
                <b>
                  {preview.applied?.percent && preview.applied.percent > 0
                    ? `${preview.applied.percent}%`
                    : preview.applied?.value && preview.applied.value > 0
                    ? money(preview.applied.value as any)
                    : preview.nextTierHint && preview.nextTierHint.spendMore > 0
                    ? `Spend ${money(preview.nextTierHint.spendMore as any)} more to get ${
                        preview.nextTierHint.nextPercent
                      }%`
                    : "Not applicable (minimum not met)"}
                </b>
              </li>
              <li className="row between">
                <span>Discount applied</span>
                <b>{money(preview.applied?.value as any)}</b>
              </li>
              {Array.isArray(preview.applied?.grants) &&
                preview.applied!.grants!.length > 0 && (
                  <li className="row between">
                    <span>Grant applied</span>
                    <b>{`${preview.applied!.grants!.reduce(
                      (s, g) => s + (g.qty || 0),
                      0
                    )} item(s)`}</b>
                  </li>
                )}
              {preview.finalTotal != null && (
                <li className="row between border-t pt-1">
                  <span>Final total</span>
                  <b>{money(preview.finalTotal as any)}</b>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="row justify-end" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" onClick={handlePreview} disabled={busy || !inputsValid}>
            {busy ? "Previewing…" : "Preview"}
          </button>
          <button
            className="btn primary"
            onClick={() =>
              onApprove(
                computeRedemptionValue(),
                note || undefined,
                selectedGrants
              )
            }
            disabled={approveDisabled}
            title={dirty ? "Re-run preview after changes" : undefined}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveClaimModal;
