import React, { useEffect, useMemo, useState } from "react";
import type { ClaimRequestDTO, GrantSelectionInput, GrantOption } from "../types/offer";

interface Props {
  assignedOfferId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (claim: any) => void;
  grantMode?: boolean;
  // Parent provides pre-auth’d functions (no token logic in the modal)
  fetchGrantOptions: (assignedOfferId: string) => Promise<{ options: GrantOption[]; pickLimit: number }>;
  createClaim: (body: ClaimRequestDTO) => Promise<any>;
  claimSource?: "MANUAL" | "ONLINE";            // NEW (default MANUAL)
  primaryCtaLabel?: string;                      // Optional: override button text
}

const ClaimModal: React.FC<Props> = ({
  assignedOfferId,
  isOpen,
  onClose,
  onCreated,
  grantMode = true,
  fetchGrantOptions,
  createClaim,
  claimSource = "MANUAL",
  primaryCtaLabel,
}) => {
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<GrantOption[]>([]);
  const [pickLimit, setPickLimit] = useState(1);
  const [sel, setSel] = useState<GrantSelectionInput[]>([]);
  const [error, setError] = useState("");

  // Load options/pickLimit when opened (grantMode only)
  useEffect(() => {
    if (!isOpen || !grantMode) return;
    let cancelled = false;
    (async () => {
      try {
        setError("");
        setLoading(true);
        const res = await fetchGrantOptions(assignedOfferId);
        if (!cancelled) {
          setOpts(res?.options ?? []);
          setPickLimit(res?.pickLimit ?? 1);
          setSel([]); // start fresh for each open
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load grants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, grantMode, assignedOfferId, fetchGrantOptions]);

  // Preselect based on each option's defaultQuantity, capped by pickLimit
  useEffect(() => {
    if (!isOpen || !grantMode) return;
    if (opts.length === 0 || pickLimit <= 0) return;
    if (sel.length > 0) return; // already have a selection (e.g., user interaction)
    let remaining = pickLimit;
    const pre: GrantSelectionInput[] = [];
    for (const o of opts) {
      if (remaining <= 0) break;
      const base = Math.max(1, o.defaultQuantity ?? 1);
      const q = Math.min(base, remaining);
      pre.push(
        o.itemType === "PRODUCT"
          ? { itemType: "PRODUCT", productId: o.id, quantity: q }
          : { itemType: "BUNDLE",  bundleId:  o.id, quantity: q }
      );
      remaining -= q;
    }
    setSel(pre);
  }, [isOpen, grantMode, opts, pickLimit, sel.length]);

  // Reset transient state on close
  useEffect(() => {
    if (isOpen) return;
    setError("");
    setSel([]);
  }, [isOpen]);

  if (!isOpen) return null;

  // Helpers
  const findIdxIn = (arr: GrantSelectionInput[], o: GrantOption) =>
    arr.findIndex(s =>
      s.itemType === "PRODUCT"
        ? (o.itemType === "PRODUCT" && s.productId === o.id)
        : (o.itemType === "BUNDLE"  && s.bundleId  === o.id)
    );

  const isSelected = (o: GrantOption) => findIdxIn(sel, o) >= 0;

  const qty = (o: GrantOption) => {
    const i = findIdxIn(sel, o);
    return i >= 0 ? (sel[i].quantity ?? 1) : 0;
  };

  const totalPicked = useMemo(
    () => sel.reduce((a, v) => a + (v.quantity ?? 1), 0),
    [sel]
  );

  const remainingFor = (o: GrantOption) => Math.max(0, pickLimit - (totalPicked - qty(o)));

  const toggleSelect = (o: GrantOption) => {
    setSel(prev => {
      const i = findIdxIn(prev, o);
      if (i >= 0) {
        // deselect → remove
        const copy = [...prev];
        copy.splice(i, 1);
        return copy;
      }
      // select → add with base qty = defaultQuantity (or 1), respecting remaining capacity
      const base = Math.max(1, o.defaultQuantity ?? 1);
      const remaining = Math.max(0, pickLimit - prev.reduce((a, v) => a + (v.quantity ?? 1), 0));
      if (remaining <= 0) return prev;
      const addQty = Math.min(base, remaining);
      const add: GrantSelectionInput =
        o.itemType === "PRODUCT"
          ? { itemType: "PRODUCT", productId: o.id, quantity: addQty }
          : { itemType: "BUNDLE",  bundleId:  o.id, quantity: addQty };
      return [...prev, add];
    });
  };

  // Quantity only changes when selected. 0 -> deselect.
  const setQtyStrict = (o: GrantOption, raw: number) => {
    setSel(prev => {
      const i = findIdxIn(prev, o);
      if (i < 0) return prev; // must be selected
      let next = Number.isFinite(raw) ? Math.floor(raw) : 0;
      if (next < 0) next = 0;
      if (next === 0) {
        const copy = [...prev];
        copy.splice(i, 1);
        return copy;
      }
      const limit = Math.max(0, pickLimit - prev.reduce((a, v, idx) => a + (idx === i ? 0 : (v.quantity ?? 1)), 0));
      if (next > limit) next = limit;
      const copy = [...prev];
      copy[i] = o.itemType === "PRODUCT"
        ? { itemType: "PRODUCT", productId: o.id, quantity: next }
        : { itemType: "BUNDLE",  bundleId:  o.id, quantity: next };
      return copy;
    });
  };

  const canGenerate = !loading && (!grantMode || totalPicked > 0) && totalPicked <= pickLimit;

  const generate = async () => {
    try {
      setError("");
      setLoading(true);
      const body: ClaimRequestDTO = {
        claimSource, 
        selectedGrants: grantMode ? sel : undefined,
      };
      const claim = await createClaim(body);
      onCreated(claim);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not create claim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal card card--form ecom-card--narrow" role="dialog" aria-modal="true">
        <h3 className="card__title">Choose your free items</h3>

        {/* NEW: explicit note at the head of the grid */}
        <div className="help" style={{ marginBottom: 4 }}>
          You can pick up to <strong>{pickLimit}</strong> item{pickLimit > 1 ? "s" : ""} only.
        </div>
        <div className="th-muted" style={{ marginBottom: 8 }}>
          Picked {totalPicked} / {pickLimit} item{pickLimit > 1 ? "s" : ""}.
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: 8 }}>{error}</div>}

        {loading ? (
          <div className="help">Loading…</div>
        ) : grantMode ? (
          <>
            <div className="crf-list">
              {opts.length === 0 && <div className="crf-empty">No items available.</div>}

              {opts.map((o) => {
                const selected = isSelected(o);
                const qtyVal = qty(o);
                const capForThis = remainingFor(o);
                return (
                  <div key={`${o.itemType}:${o.id}`} className={`crf-option ${selected ? "is-selected" : ""}`}>
                    <img
                      className="crf-avatar"
                      src={o.imageUrl || ""}
                      alt=""
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />

                    {/* Meta + explicit checkbox */}
                    <div className="crf-option-meta">
                      <label className="th-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(o)}
                          aria-label={selected ? "Deselect item" : "Select item"}
                        />
                        <span>
                          <div className="crf-option-primary">
                            {o.itemType === "PRODUCT" ? "Product" : "Bundle"} — {o.title}
                          </div>
                          <div className="crf-option-secondary">
                            {selected
                              ? `Selected · ${qtyVal}`
                              : `Default quantity: ${Math.max(1, o.defaultQuantity ?? 1)}`}
                          </div>
                        </span>
                      </label>
                    </div>

                    {/* Qty steppers – disabled until selected */}
                    <div className="select-actions">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setQtyStrict(o, qtyVal - 1)}
                        disabled={!selected || qtyVal <= 0}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <input
                        className="th-qty-input"
                        type="number"
                        min={0}
                        max={capForThis}
                        value={qtyVal}
                        onChange={(e) => setQtyStrict(o, Number(e.target.value || 0))}
                        disabled={!selected}
                      />

                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setQtyStrict(o, qtyVal + 1)}
                        disabled={!selected || capForThis <= 0}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn--primary btn--block" onClick={generate} disabled={!canGenerate}>
                {primaryCtaLabel ?? (claimSource === "MANUAL" ? "Generate QR" : "Generate code")}
              </button>
              <button className="btn btn--ghost btn--block" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="help">Nothing to pick for this claim.</div>
        )}
      </div>
    </div>
  );
};

export default ClaimModal;
