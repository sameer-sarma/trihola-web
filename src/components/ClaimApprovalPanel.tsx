import React, { useEffect, useMemo, useState } from "react";
import ExpiryCountdown from "./ExpiryCountdown";
import "../css/ui-forms.css";
import "../css/cards.css";

/** Options the approver can pick from (comes from /offers/{id}/grant-options) */
export type GrantOption = {
  itemType: "PRODUCT" | "BUNDLE";
  id: string;
  title: string;
  imageUrl?: string | null;
};

/** Lightweight line used for local selection and when no snapshots are required */
export type GrantLine = {
  itemType: "PRODUCT" | "BUNDLE";
  productId?: string;
  bundleId?: string;
  quantity?: number;
};

/** Minimal snapshot shape that the backend ApproveClaimDTO.selectedGrants expects */
type GrantItemSnapshot = {
  itemType: "PRODUCT" | "BUNDLE";
  quantity?: number;
  product?: { id: string; slug?: string; name?: string; primaryImageUrl?: string | null };
  bundle?:  { id: string; slug?: string; title?: string; primaryImageUrl?: string | null };
};

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | string;

interface ClaimApprovalPanelProps {
  claim: {
    id: string;
    assignedOfferId: string;
    status: ClaimStatus;
    expiresAt?: string | null;
    redemptionType?: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT";
    /** May contain id-based lines or server snapshots (we normalize either way). */
    grants?: any[];
    /** > 0 means approver must pick up to that many items. */
    grantPickLimit?: number;
  };

  /** Only needed when `grantPickLimit > 0`. Returns allowed options (already auth’d). */
  fetchGrantOptions?: (assignedOfferId: string) => Promise<GrantOption[]>;

  /** Parent calls offerService.approveClaim; we'll pass selectedGrants via the args object. */
  onApprove: (args: {
    claimId: string;
    grants?: GrantLine[];
    note?: string;
    redemptionValue?: string;
    /** New: snapshots for backend (optional here so parent can ignore if not needed) */
    selectedGrants?: GrantItemSnapshot[];
  }) => Promise<any>;

  onReject: (args: { claimId: string; reason?: string }) => Promise<any>;
  onUpdated?: (updated?: any) => void;
}

/** Small image thumb */
const Thumb: React.FC<{ src?: string | null; alt?: string }> = ({ src, alt }) => (
  <img
    className="crf-avatar"
    src={src || ""}
    alt={alt ?? ""}
    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
  />
);

const ClaimApprovalPanel: React.FC<ClaimApprovalPanelProps> = (props) => {
  const pickLimit = props.claim.grantPickLimit ?? 0;
  const hasGrantLimit = pickLimit > 0;

  // Allowed options (for limited-grant approvals)
  const [options, setOptions] = useState<GrantOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [optsErr, setOptsErr] = useState<string | null>(null);

  // Approver’s current picks (capped by pickLimit)
  const [picked, setPicked] = useState<GrantLine[]>([]);

  // Read-only claimant grants when limit is not enforced
  const readonlyGrants = useMemo(() => props.claim.grants ?? [], [props.claim.grants]);

  // Note / Reject flow
  const [note, setNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Percentage-only redemption value
  const isPercentage = (props.claim.redemptionType ?? "").toUpperCase() === "PERCENTAGE_DISCOUNT";
  const [percentValue, setPercentValue] = useState<string>("");

  // Reset on claim change
  useEffect(() => {
    setPicked([]);
    setPercentValue("");
    setNote("");
    setShowReject(false);
    setRejectReason("");
  }, [props.claim.id]);

  // Load options when needed
  useEffect(() => {
    let closed = false;
    if (!hasGrantLimit || !props.fetchGrantOptions) return;

    (async () => {
      try {
        setLoadingOpts(true);
        setOptsErr(null);
        const resp = await props.fetchGrantOptions!(props.claim.assignedOfferId);
        if (!closed) setOptions(Array.isArray(resp) ? resp : []);
      } catch (e: any) {
        if (!closed) setOptsErr(e?.message ?? String(e));
      } finally {
        if (!closed) setLoadingOpts(false);
      }
    })();

    return () => { closed = true; };
  }, [hasGrantLimit, props.fetchGrantOptions, props.claim.assignedOfferId]);

  // Quick lookup for snapshot metadata (nice-to-have)
  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    options.forEach(o => m.set(o.id, o.title));
    return m;
  }, [options]);

  const imageById = useMemo(() => {
    const m = new Map<string, string | null>();
    options.forEach(o => m.set(o.id, o.imageUrl ?? null));
    return m;
  }, [options]);

  // Auto-select from claimant's requested grants when panel opens (capped by pickLimit)
  useEffect(() => {
    if (!hasGrantLimit) return;
    if (picked.length > 0) return;            // don't clobber user picks
    const g = (props.claim.grants ?? []) as any[];
    if (!g.length) return;

    const pre: GrantLine[] = [];
    for (const item of g) {
      if (pre.length >= pickLimit) break;
      if ((item.itemType ?? "").toUpperCase() === "PRODUCT") {
        const id = item.productId ?? item.product?.id;
        if (id) pre.push({ itemType: "PRODUCT", productId: id, quantity: item.quantity ?? 1 });
      } else if ((item.itemType ?? "").toUpperCase() === "BUNDLE") {
        const id = item.bundleId ?? item.bundle?.id;
        if (id) pre.push({ itemType: "BUNDLE",  bundleId:  id, quantity: item.quantity ?? 1 });
      }
    }
    setPicked(pre.slice(0, pickLimit));
  }, [hasGrantLimit, pickLimit, props.claim.grants, picked.length]);

  // Helpers
  const isSelected = (opt: GrantOption) =>
    picked.some(p => (p.itemType === "PRODUCT" ? p.productId === opt.id : p.bundleId === opt.id));

  const toggleSelect = (opt: GrantOption) => {
    if (!hasGrantLimit) return;
    setPicked(prev => {
      const exists = prev.find(p => (p.itemType === "PRODUCT" ? p.productId === opt.id : p.bundleId === opt.id));
      if (exists) {
        return prev.filter(p => (p.itemType === "PRODUCT" ? p.productId !== opt.id : p.bundleId !== opt.id));
      }
      if (prev.length >= pickLimit) return prev; // cap
      return opt.itemType === "PRODUCT"
        ? [...prev, { itemType: "PRODUCT", productId: opt.id, quantity: 1 }]
        : [...prev, { itemType: "BUNDLE",  bundleId:  opt.id, quantity: 1 }];
    });
  };

  // Build snapshots for backend
  const toSnapshots = (lines: GrantLine[]): GrantItemSnapshot[] =>
    lines.map(l =>
      l.itemType === "PRODUCT"
        ? {
            itemType: "PRODUCT",
            quantity: l.quantity ?? 1,
            product: {
              id: l.productId!,
              slug: "",
              name: titleById.get(l.productId!) || "",
              primaryImageUrl: imageById.get(l.productId!) ?? null,
            },
          }
        : {
            itemType: "BUNDLE",
            quantity: l.quantity ?? 1,
            bundle: {
              id: l.bundleId!,
              slug: "",
              title: titleById.get(l.bundleId!) || "",
              primaryImageUrl: imageById.get(l.bundleId!) ?? null,
            },
          }
    );

  // Rules
  const canApprove =
    (hasGrantLimit ? picked.length > 0 : true) &&
    (!isPercentage || !!percentValue.trim());
  const limitReached = hasGrantLimit && picked.length >= pickLimit;

  return (
    <div className="card card--form ecom-card--narrow" style={{ marginTop: 12 }}>
      <h3 className="card__title" style={{ marginBottom: 4 }}>Approve claim</h3>

      <div className="th-muted" style={{ marginBottom: 8 }}>
        Status: {props.claim.status ?? "PENDING"}
        {props.claim.expiresAt ? (
          <> · Expires in <ExpiryCountdown expiresAt={props.claim.expiresAt} /></>
        ) : null}
      </div>

      {hasGrantLimit ? (
        <>
          <div className="help" style={{ marginBottom: 6 }}>
            You can pick up to <strong>{pickLimit}</strong> item{pickLimit > 1 ? "s" : ""} only.
          </div>
          <div className="th-muted" style={{ marginBottom: 8 }}>
            Picked {picked.length} / {pickLimit}.
          </div>

          {optsErr && (
            <div className="alert alert--error" style={{ marginBottom: 8 }}>
              Couldn't load allowed items.
            </div>
          )}

          {loadingOpts && <div className="help">Loading items…</div>}

          {!loadingOpts && !optsErr && (
            <>
              {options.length === 0 ? (
                <div className="help">No allowed items.</div>
              ) : (
                <div className="crf-list" style={{ maxWidth: 720, margin: "0 auto" }}>
                  {options.map((o) => {
                    const selected = isSelected(o);
                    return (
                    <div key={`${o.itemType}:${o.id}`} className="mx-auto max-w-3xl w-full">
                      <div className={`crf-option ${selected ? "is-selected" : ""}`}>
                        <Thumb src={o.imageUrl ?? undefined} />
                        <div className="crf-option-meta">
                          <label className="th-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(o)}
                              disabled={!selected && limitReached}
                              aria-label={selected ? "Deselect item" : "Select item"}
                            />
                            <span>
                              <div className="crf-option-primary">
                                {o.itemType === "PRODUCT" ? "Product" : "Bundle"} — {o.title}
                              </div>
                              <div className="crf-option-secondary">
                                {selected ? "Selected" : limitReached ? "Limit reached" : "Select to include"}
                              </div>
                            </span>
                          </label>
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        // No grant selection required — show any existing grants read-only, if present.
        readonlyGrants?.length ? (
          <div className="th-vlist" style={{ marginBottom: 8 }}>
            {readonlyGrants.map((g, idx) => (
              <div key={idx} className="th-item-row">
                <div className="th-thumb-64"><div className="th-placeholder" /></div>
                <div>
                  <div className="th-card-title">
                    {(g.itemType ?? "").toUpperCase() === "PRODUCT" ? "Product" : "Bundle"} — (preselected)
                  </div>
                  <div className="th-card-sub">Already included in this claim.</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="help" style={{ marginBottom: 8 }}>
            No item selection required for this claim.
          </div>
        )
      )}

      {/* Percentage-only redemption value */}
      {isPercentage && (
        <div className="th-field" style={{ marginTop: 8 }}>
          <label className="th-label">Redemption value (%)</label>
          <input
            className="th-input"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            max={100}
            placeholder="e.g. 12.5"
            value={percentValue}
            onChange={(e) => setPercentValue(e.target.value)}
            required
          />
          <div className="help">Required for percentage discounts. This will be recorded on approval.</div>
        </div>
      )}

      {/* Note */}
      <div className="th-field" style={{ marginTop: 8 }}>
        <label className="th-label">Add a note (optional)</label>
        <textarea
          className="th-textarea"
          placeholder="Visible to you; useful for audit."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          className="btn btn--primary"
          disabled={!canApprove}
          onClick={async () => {
            // If nothing picked (e.g., claimant preselected and approver is okay),
            // use claimant's attached grants (capped) as base.
          const claimantGrants: GrantLine[] = ((props.claim.grants ?? []) as any[])
            .filter(Boolean)
            .map((item: any) =>
              (item.itemType ?? "").toUpperCase() === "PRODUCT"
                ? { itemType: "PRODUCT", productId: item.product?.id ?? item.productId, quantity: item.quantity ?? 1 }
                : { itemType: "BUNDLE",  bundleId:  item.bundle?.id  ?? item.bundleId,  quantity: item.quantity ?? 1 }
            );

          const base: GrantLine[] =
            picked.length > 0
              ? picked
              : (hasGrantLimit ? claimantGrants.slice(0, pickLimit) : claimantGrants);
                      const snapshots: GrantItemSnapshot[] = hasGrantLimit ? toSnapshots(base) : [];

            const res = await props.onApprove({
              claimId: props.claim.id,
              grants: base,
              selectedGrants: snapshots, // parent service can forward this as ApproveClaimDTO.selectedGrants
              note,
              redemptionValue: isPercentage ? percentValue : undefined,
            } as any); // cast keeps parent typings happy if they haven't added 'selectedGrants' yet

            props.onUpdated?.(res);
          }}
        >
          Approve claim
        </button>

        <button className="btn btn--ghost" onClick={() => setShowReject(true)}>
          Reject…
        </button>
      </div>

      {showReject && (
        <div className="modal">
          <div className="modal__dialog">
            <h4 className="modal__title">Reject claim</h4>
            <div className="th-field">
              <label className="th-label">Reason (optional)</label>
              <textarea
                className="th-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="actions">
              <button
                className="btn btn--danger"
                onClick={async () => {
                  const res = await props.onReject({ claimId: props.claim.id, reason: rejectReason });
                  setShowReject(false);
                  props.onUpdated?.(res);
                }}
              >
                Reject
              </button>
              <button className="btn btn--ghost" onClick={() => setShowReject(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimApprovalPanel;
