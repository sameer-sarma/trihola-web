// src/pages/AddOfferTemplate.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  upsertOfferTemplate,
  buildOfferTemplatePayload,
} from "../services/offerTemplateService";
import {
  makeBusinessProductPickerLoader,
  makeBusinessBundlePickerLoader,
} from "../services/productBundleService";
import { uiToServerTiers, type UiBand } from "../utils/tiersMapping";
import {
  OfferTemplateRequest,
  UiOfferKind,
} from "../types/offerTemplateTypes";
import type { PickerItem } from "../types/offerTemplateTypes";
import GrantEditor from "../components/GrantEditor";
import ProductPicker from "../components/ProductPicker";
import BundlePicker from "../components/BundlePicker";
import type { OfferGrantLine } from "../types/offerTemplateTypes";

type BandRow = {
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscountAmount?: number | null;
};

interface Props {
  token: string;
  userId: string;
  profile: { registeredAsBusiness?: boolean };
  businessSlug?: string; // ← optional, non-breaking
}

const AddOfferTemplate: React.FC<Props> = ({ token, userId, profile, businessSlug: propBusinessSlug }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer the prop (from App) and fall back to URL: ?business=slug or ?slug=...
  const businessSlug = useMemo(() => {
    if (propBusinessSlug) return propBusinessSlug;
     const qs = new URLSearchParams(location.search);
     return qs.get("business") ?? qs.get("slug") ?? undefined;

  }, [propBusinessSlug, location.search]);

// keep your existing loader creation (with the non-null assertion on businessSlug if you gate the page)
const productPickerLoader = useMemo(
  () => makeBusinessProductPickerLoader({ businessSlug: businessSlug!, active: true, limit: 100 }),
  [businessSlug]
);
const bundlePickerLoader = useMemo(
  () => makeBusinessBundlePickerLoader({ businessSlug: businessSlug!, active: true, limit: 100 }),
  [businessSlug]
);

// 3) Adapt Loader → the precise function type GrantEditor wants
const productPickerForGrant = useMemo<
  ((q: string) => Promise<PickerItem[]>) | undefined
>(() => {
  if (!productPickerLoader) return undefined;
  // explicit cast to the imported PickerItem[] to align identities
  return (q: string) => productPickerLoader(q) as Promise<PickerItem[]>;
}, [productPickerLoader]);

const bundlePickerForGrant = useMemo<
  ((q: string) => Promise<PickerItem[]>) | undefined
>(() => {
  if (!bundlePickerLoader) return undefined;
  return (q: string) => bundlePickerLoader(q) as Promise<PickerItem[]>;
}, [bundlePickerLoader]);

  // Kind selection
  const [uiOfferKind, setUiOfferKind] = useState<UiOfferKind>("PERCENTAGE");

  // Base form state (new schema only)
  const [form, setForm] = useState<OfferTemplateRequest>({
    businessId: userId,

    templateTitle: "",
    description: "",
    imageUrls: [],

    isActive: true,
    specialTerms: "",
    eligibility: "",
    claimPolicy: "BOTH",
    maxRedemptions: undefined,

    validityType: "ABSOLUTE",
    validFrom: "",
    validTo: "",
    durationDays: undefined,
    trigger: undefined,

    minPurchaseAmount: undefined,

    scopeKind: "ANY",
    grants: [] as OfferGrantLine[],
    appliesProductIds: [],
    appliesBundleIds: [],

    // discount fields (base when non-tiered)
    offerType: "PERCENTAGE_DISCOUNT",
    discountPercentage: undefined,
    maxDiscountAmount: undefined,
    discountAmount: undefined,

    // tiers
    tiers: [],

    // grants (used only if uiOfferKind === "GRANTS")
    grantPickLimit: 1,
    grantDiscountType: "FREE",
    grantDiscountValue: undefined,
  });

  // Tiers UI state (Option A — breakpoints + bands)
  const [useTiers, setUseTiers] = useState(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [bands, setBands] = useState<BandRow[]>([
    { discountType: "PERCENTAGE", discountValue: 0, maxDiscountAmount: null },
  ]);

  // Kind → normalize form + first band
  useEffect(() => {
    if (uiOfferKind === "GRANTS") {
      setForm((p) => ({
        ...p,
        offerType: undefined,
        discountPercentage: undefined,
        maxDiscountAmount: undefined,
        discountAmount: undefined,
        tiers: [],
      }));
      setUseTiers(false);
      return;
    }
    if (uiOfferKind === "PERCENTAGE") {
      setForm((p) => ({
        ...p,
        offerType: "PERCENTAGE_DISCOUNT",
        discountAmount: undefined,
      }));
      setBands((rows) => {
        const copy = [...rows];
        copy[0] = { ...copy[0], discountType: "PERCENTAGE" };
        return copy;
      });
    } else {
      setForm((p) => ({
        ...p,
        offerType: "FIXED_DISCOUNT",
        discountPercentage: undefined,
        maxDiscountAmount: undefined,
      }));
      setBands((rows) => {
        const copy = [...rows];
        copy[0] = { ...copy[0], discountType: "FIXED", maxDiscountAmount: null };
        return copy;
      });
    }
  }, [uiOfferKind]);

  // Keep bands length = breakpoints.length + 1
  useEffect(() => {
    setBands((rows) => {
      const target = breakpoints.length + 1;
      if (rows.length === target) return rows;
      const base: BandRow = rows[0] ?? {
        discountType: uiOfferKind === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        discountValue: 0,
        maxDiscountAmount: uiOfferKind === "PERCENTAGE" ? null : undefined,
      };
      if (rows.length < target) {
        const add = Array.from({ length: target - rows.length }, () => ({
          ...base,
        }));
        return [...rows, ...add];
      }
      return rows.slice(0, target);
    });
  }, [breakpoints.length, uiOfferKind]);

  const breakpointLabels = useMemo(() => {
    const bps = [...breakpoints].sort((a, b) => a - b);
    return Array.from({ length: bps.length + 1 }).map((_, i) => {
      if (i === 0) return `Below ₹${bps[0] || "—"}`;
      if (i === bps.length) return `Above ₹${bps[bps.length - 1] || "—"}`;
      return `₹${bps[i - 1]} – ₹${bps[i]}`;
    });
  }, [breakpoints]);

  if (!profile.registeredAsBusiness) {
    return (
      <div className="page-wrap">
        <div className="form-card p-6 text-red-600 text-center">
          Access denied. You must be registered as a business to create offer
          templates.
        </div>
      </div>
    );
  }

  // helpers to map inputs → typed state
  type NumericKeys =
    | "discountPercentage"
    | "maxDiscountAmount"
    | "discountAmount"
    | "minPurchaseAmount"
    | "durationDays"
    | "maxRedemptions";
  type BooleanKeys = "isActive";
  const NUMERIC_KEYS: ReadonlyArray<NumericKeys> = [
    "discountPercentage",
    "maxDiscountAmount",
    "discountAmount",
    "minPurchaseAmount",
    "durationDays",
    "maxRedemptions",
  ];
  const BOOLEAN_KEYS: ReadonlyArray<BooleanKeys> = ["isActive"];

  function setField<K extends keyof OfferTemplateRequest>(
    key: K,
    raw: string,
    checked: boolean
  ) {
    setForm((prev) => {
      const next: OfferTemplateRequest = { ...prev };
      if ((NUMERIC_KEYS as ReadonlyArray<string>).includes(key as string)) {
        (next[key] as unknown as number | undefined) =
          raw === "" ? undefined : Number(raw);
      } else if ((BOOLEAN_KEYS as ReadonlyArray<string>).includes(key as string)) {
        (next[key] as unknown as boolean) = checked;
      } else {
        (next[key] as unknown as string | undefined) =
          raw === "" ? undefined : raw;
      }
      return next;
    });
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, checked } = e.target as HTMLInputElement;
    if (name === "uiOfferKind") {
      setUiOfferKind(value as UiOfferKind);
      return;
    }
    setField(name as keyof OfferTemplateRequest, value, checked);
  };

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validations by mode
    if (uiOfferKind === "GRANTS") {
      if ((form.grants?.length ?? 0) < 1) {
        alert("Please add at least one grant (free product or bundle).");
        return;
      }
    } else {
      if (!useTiers) {
        if (uiOfferKind === "PERCENTAGE" && form.discountPercentage == null) {
          alert("Please enter a discount percentage.");
          return;
        }
        if (uiOfferKind === "ABSOLUTE" && form.discountAmount == null) {
          alert("Please enter a flat discount amount.");
          return;
        }
      } else {
        if (
          bands.some(
            (b) =>
              b.discountType === "PERCENTAGE" &&
              (b.discountValue < 0 || b.discountValue > 100)
          )
        ) {
          alert("Percentage discount must be between 0–100.");
          return;
        }
      }
    }

    if (form.scopeKind === "LIST") {
      const count =
        (form.appliesProductIds?.length ?? 0) +
        (form.appliesBundleIds?.length ?? 0);
      if (count === 0) {
        alert("Select at least one product or bundle in the scope list.");
        return;
      }
    }

    if (form.validityType === "RELATIVE" && !form.trigger) {
      alert("Please pick an activation trigger for relative validity.");
      return;
    }

    // shape tiers if enabled
    let payloadForm: OfferTemplateRequest = { ...form };
    if (uiOfferKind !== "GRANTS") {
      if (useTiers) {
        const sortedBps = [...breakpoints].sort((a, b) => a - b);
        const serverTiers = uiToServerTiers(sortedBps, bands as UiBand[]);

        payloadForm = {
          ...payloadForm,
          tiers: serverTiers,           // correct server shape
          discountPercentage: undefined,
          maxDiscountAmount: undefined,
          discountAmount: undefined,
        };
      } else {
        payloadForm = { ...payloadForm, tiers: [] };
      }
    } else {
      payloadForm = { ...payloadForm, tiers: [] };
    }

    try {
      const payload = buildOfferTemplatePayload(payloadForm, uiOfferKind);
      const saved = await upsertOfferTemplate(payload, token);
      const id =
        saved?.offerTemplateId ??
        (payload as any)?.offerTemplateId ??
        null;

      if (id) {
        navigate(`/offer-template/${id}`);
      } else {
        navigate("/offer-templates");
      }
    } catch (err) {
      console.error("Failed to save template", err);
      alert("Error saving template");
    }
  };

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">Create Offer Template</h2>

        <form onSubmit={handleSubmit} className="th-form" noValidate>
          {/* BASICS */}
          <div className="card-section">
            <h4 className="section-title">🎯 Basics</h4>
            <div className="th-grid-2">
              <div className="th-field">
                <label className="th-label">Template title</label>
                <input
                  className="th-input"
                  type="text"
                  name="templateTitle"
                  placeholder="e.g., 15% off on first order"
                  value={form.templateTitle}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="th-field">
                <label className="th-label">Offer kind</label>
                <select
                  className="select"
                  name="uiOfferKind"
                  value={uiOfferKind}
                  onChange={handleChange}
                >
                  <option value="PERCENTAGE">Discount — Percentage</option>
                  <option value="ABSOLUTE">Discount — Absolute</option>
                  <option value="GRANTS">Grants — Free items</option>
                </select>
              </div>

              <div className="th-field th-col-span-2">
                <label className="th-label">Description</label>
                <textarea
                  className="th-textarea"
                  name="description"
                  placeholder="Short description customers will see"
                  value={form.description ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* TYPE-SPECIFIC */}
          <div className="section-block section-block--accent">
            <div className="section-header">🧩 Type-specific fields</div>
            <div className="section-grid">
              {(uiOfferKind === "PERCENTAGE" || uiOfferKind === "ABSOLUTE") && (
                <>
                  {/* Base (non-tiered) */}
                  {uiOfferKind === "PERCENTAGE" ? (
                    <>
                      <div className="th-field">
                        <label className="th-label">Base discount (%)</label>
                        <input
                          className="th-input"
                          type="number"
                          name="discountPercentage"
                          placeholder="e.g., 15"
                          value={form.discountPercentage ?? ""}
                          onChange={(e) =>
                            setField(
                              "discountPercentage",
                              e.target.value,
                              false
                            )
                          }
                        />
                      </div>
                      <div className="th-field">
                        <label className="th-label">Max cap (₹, optional)</label>
                        <input
                          className="th-input"
                          type="number"
                          name="maxDiscountAmount"
                          placeholder="e.g., 1000"
                          value={form.maxDiscountAmount ?? ""}
                          onChange={(e) =>
                            setField("maxDiscountAmount", e.target.value, false)
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="th-field th-col-span-2">
                      <label className="th-label">Base flat discount (₹)</label>
                      <input
                        className="th-input"
                        type="number"
                        name="discountAmount"
                        placeholder="e.g., 200"
                        value={form.discountAmount ?? ""}
                        onChange={(e) =>
                          setField("discountAmount", e.target.value, false)
                        }
                      />
                    </div>
                  )}

                  {/* Toggle tiers */}
                  <div className="th-field th-col-span-2">
                    <label className="th-check">
                      <input
                        type="checkbox"
                        checked={useTiers}
                        onChange={(e) => setUseTiers(e.target.checked)}
                      />
                      Use tiered discounts
                    </label>
                    <div className="help">
                      When enabled, tiers override the base discount.
                    </div>
                  </div>

                  {/* Tier editor */}
                  {useTiers && (
                    <div className="th-field th-col-span-2">
                      <label className="th-label">Breakpoints & bands</label>

                      {/* Breakpoints */}
                      <div className="th-vlist" style={{ marginBottom: 6 }}>
                        {breakpoints.map((bp, idx) => (
                          <div key={idx} className="th-pill" style={{ gap: 8 }}>
                            <span>Breakpoint ₹</span>
                            <input
                              className="amount-input"
                              type="number"
                              value={bp}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setBreakpoints((bps) => {
                                  const copy = [...bps];
                                  copy[idx] = v;
                                  return copy.sort((a, b) => a - b);
                                });
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setBreakpoints((bps) =>
                                  bps.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            setBreakpoints((bps) =>
                              [...bps, 0].sort((a, b) => a - b)
                            )
                          }
                        >
                          + Add breakpoint
                        </button>
                        <div className="help">
                          Bands are “Below first”, “Between”, and “Above last”.
                        </div>
                      </div>

                      {/* Bands */}
                      <div className="th-vlist">
                        {bands.map((b, i) => (
                          <div key={i} className="th-pill" style={{ gap: 8 }}>
                            <div
                              className="th-list-title"
                              style={{ minWidth: 180 }}
                            >
                              {breakpointLabels[i]}
                            </div>

                            <select
                              className="select discount-type"
                              value={b.discountType}
                              onChange={(e) => {
                                const val = e.target
                                  .value as BandRow["discountType"];
                                setBands((rows) => {
                                  const copy = [...rows];
                                  copy[i] = {
                                    ...copy[i],
                                    discountType: val,
                                    maxDiscountAmount:
                                      val === "PERCENTAGE"
                                        ? copy[i].maxDiscountAmount ?? null
                                        : null,
                                  };
                                  return copy;
                                });
                              }}
                            >
                              <option value="PERCENTAGE">%</option>
                              <option value="FIXED">₹</option>
                            </select>

                            <input
                              className="amount-input"
                              type="number"
                              value={b.discountValue}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setBands((rows) => {
                                  const copy = [...rows];
                                  copy[i] = { ...copy[i], discountValue: v };
                                  return copy;
                                });
                              }}
                            />

                            {b.discountType === "PERCENTAGE" && (
                              <>
                                <span>Max ₹</span>
                                <input
                                  className="amount-input"
                                  type="number"
                                  value={b.maxDiscountAmount ?? ""}
                                  onChange={(e) => {
                                    const v =
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value);
                                    setBands((rows) => {
                                      const copy = [...rows];
                                      copy[i] = {
                                        ...copy[i],
                                        maxDiscountAmount: v,
                                      };
                                      return copy;
                                    });
                                  }}
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* GRANTS */}
              {uiOfferKind === "GRANTS" && (
                <>
                  <div className="th-field">
                    <label className="th-label">Grant pick limit</label>
                    <input
                      className="th-input"
                      type="number"
                      min={1}
                      value={form.grantPickLimit ?? 1}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          grantPickLimit: e.target.value
                            ? Number(e.target.value)
                            : 1,
                        }))
                      }
                    />
                  </div>

                  <div className="th-field">
                    <label className="th-label">Grant discount</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <select
                        className="select"
                        value={form.grantDiscountType ?? "FREE"}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            grantDiscountType: e.target.value as any,
                            grantDiscountValue:
                              e.target.value === "FREE"
                                ? undefined
                                : p.grantDiscountValue,
                          }))
                        }
                      >
                        <option value="FREE">Free</option>
                        <option value="PERCENTAGE">Percentage off</option>
                        <option value="FIXED_AMOUNT">Fixed amount off</option>
                        <option value="FIXED_PRICE">Fixed final price</option>
                      </select>
                      <input
                        className="th-input"
                        type="number"
                        placeholder={
                          form.grantDiscountType === "PERCENTAGE"
                            ? "e.g., 100 (%)"
                            : "e.g., 499 (₹)"
                        }
                        disabled={
                          !form.grantDiscountType ||
                          form.grantDiscountType === "FREE"
                        }
                        value={form.grantDiscountValue ?? ""}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            grantDiscountValue:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="th-field th-col-span-2">
                    <label className="th-label">Free items</label>
                    <GrantEditor
                      value={form.grants ?? []}
                      onChange={(gr) => setForm((p) => ({ ...p, grants: gr }))}
                      fetchProducts={productPickerForGrant}
                      fetchBundles={bundlePickerForGrant}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* APPLICABILITY */}
          <div className="card-section">
            <h4 className="section-title">📦 Applicability</h4>
            <div className="th-grid-2">
              <div className="th-field">
                <label className="th-label">Scope</label>
                <select
                  className="select"
                  name="scopeKind"
                  value={form.scopeKind ?? "ANY_PURCHASE"}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, scopeKind: e.target.value as any }))
                  }
                >
                  <option value="ANY_PURCHASE">Any purchase (global)</option>
                  <option value="LIST">
                    Specific list (products and/or bundles)
                  </option>
                </select>
              </div>

              {form.scopeKind === "LIST" && (
                <>
                  <div className="th-field">
                    <label className="th-label">Add product</label>
                    <div className="th-pill">
                      <ProductPicker
                        value={null}
                        onChange={(id) => {
                          if (!id) return;
                          setForm((p) => ({
                            ...p,
                            appliesProductIds: Array.from(
                              new Set([...(p.appliesProductIds ?? []), id])
                            ),
                          }));
                        }}
                        fetchItems={productPickerLoader}
                        placeholder="Search and add product…"
                      />
                    </div>
                  </div>

                  <div className="th-field">
                    <label className="th-label">Add bundle</label>
                    <div className="th-pill">
                      <BundlePicker
                        value={null}
                        onChange={(id) => {
                          if (!id) return;
                          setForm((p) => ({
                            ...p,
                            appliesBundleIds: Array.from(
                              new Set([...(p.appliesBundleIds ?? []), id])
                            ),
                          }));
                        }}
                        fetchItems={bundlePickerLoader}
                        placeholder="Search and add bundle…"
                      />
                    </div>
                  </div>

                  <div className="th-field th-col-span-2">
                    <label className="th-label">Selected items</label>
                    <div className="th-vlist">
                      {(form.appliesProductIds ?? []).map((id) => (
                        <div key={`p-${id}`} className="th-list-row">
                          <div className="th-list-title">Product: {id}</div>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                appliesProductIds: (p.appliesProductIds ?? []).filter(
                                  (x) => x !== id
                                ),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {(form.appliesBundleIds ?? []).map((id) => (
                        <div key={`b-${id}`} className="th-list-row">
                          <div className="th-list-title">Bundle: {id}</div>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                appliesBundleIds: (p.appliesBundleIds ?? []).filter(
                                  (x) => x !== id
                                ),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {((form.appliesProductIds ?? []).length +
                        (form.appliesBundleIds ?? []).length === 0) && (
                        <div className="help">No items selected yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* VALIDITY & RULES */}
          <div className="section-block">
            <div className="section-header">⏳ Validity</div>
            <div className="section-grid">
              <div className="th-field">
                <label className="th-label">Validity type</label>
                <select
                  className="select"
                  name="validityType"
                  value={form.validityType}
                  onChange={handleChange}
                >
                  <option value="ABSOLUTE">Absolute</option>
                  <option value="RELATIVE">Relative</option>
                </select>
              </div>

              {form.validityType === "ABSOLUTE" ? (
                <>
                  <div className="th-field">
                    <label className="th-label">Valid from</label>
                    <input
                      className="th-input"
                      type="date"
                      name="validFrom"
                      value={form.validFrom ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="th-field">
                    <label className="th-label">Valid to</label>
                    <input
                      className="th-input"
                      type="date"
                      name="validTo"
                      value={form.validTo ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="th-field">
                    <label className="th-label">Duration (days)</label>
                    <input
                      className="th-input"
                      type="number"
                      name="durationDays"
                      value={form.durationDays ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="th-field">
                    <label className="th-label">Activation trigger</label>
                    <select
                      className="select"
                      name="trigger"
                      value={form.trigger ?? ""}
                      onChange={handleChange}
                    >
                      <option value="">Select trigger</option>
                      <option value="ON_ASSIGNMENT">On assignment</option>
                      <option value="ON_ACCEPTANCE">On acceptance</option>
                      <option value="ON_CLAIM_OF_LINKED_OFFER">
                        On claim of linked offer
                      </option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <details className="section-details">
              <summary>⚙️ Rules & optional limits</summary>
              <div className="section-grid">
                <div className="th-field">
                  <label className="th-label">Minimum purchase amount</label>
                  <input
                    className="th-input"
                    type="number"
                    name="minPurchaseAmount"
                    value={form.minPurchaseAmount ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="th-field">
                  <label className="th-label">Max redemptions</label>
                  <input
                    className="th-input"
                    type="number"
                    name="maxRedemptions"
                    value={form.maxRedemptions ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="th-field th-col-span-2">
                  <label className="th-label">Claim policy</label>
                  <select
                    className="select"
                    name="claimPolicy"
                    value={form.claimPolicy || "BOTH"}
                    onChange={handleChange}
                  >
                    <option value="BOTH">Online & Offline</option>
                    <option value="ONLINE">E-commerce only</option>
                    <option value="MANUAL">Direct purchases</option>
                  </select>
                </div>
                <div className="th-field th-col-span-2">
                  <label className="th-label">Eligibility</label>
                  <textarea
                    className="th-textarea"
                    name="eligibility"
                    value={form.eligibility ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="th-field th-col-span-2">
                  <label className="th-label">Special terms</label>
                  <textarea
                    className="th-textarea"
                    name="specialTerms"
                    value={form.specialTerms ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="th-field th-col-span-2">
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!form.isActive}
                      onChange={handleChange}
                    />
                    Active
                  </label>
                </div>
              </div>
            </details>
          </div>

          {/* ACTIONS */}
          <div className="actions">
            <button type="submit" className="btn btn--primary">
              Save Template
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/offer-templates")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOfferTemplate;
