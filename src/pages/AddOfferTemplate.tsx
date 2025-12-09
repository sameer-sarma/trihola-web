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
  UiOfferKind,
  OfferTemplateForm,
  OfferTemplateResponse,
  PickerItem,
  ScopeItem,
  OfferGrantLine,
} from "../types/offerTemplateTypes";
import GrantEditor from "../components/GrantEditor";
import ProductPicker from "../components/ProductPicker";
import BundlePicker from "../components/BundlePicker";
import "../css/ui-forms.css";
import "../css/cards.css";

type BandRow = UiBand;

interface Props {
  token: string;
  userId: string;
  profile: { registeredAsBusiness?: boolean };
  businessSlug?: string; // optional, can also come from query
}

const AddOfferTemplate: React.FC<Props> = ({
  token,
  userId,
  profile,
  businessSlug: propBusinessSlug,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer the prop (from parent) and fall back to URL: ?business=slug or ?slug=...
  const businessSlug = useMemo(() => {
    if (propBusinessSlug) return propBusinessSlug;
    const qs = new URLSearchParams(location.search);
    return qs.get("business") ?? qs.get("slug") ?? undefined;
  }, [propBusinessSlug, location.search]);

  // Loaders only when we have a business slug
  const productPickerLoader = useMemo(
    () =>
      businessSlug
        ? makeBusinessProductPickerLoader({
            businessSlug,
            active: true,
            limit: 100,
          })
        : undefined,
    [businessSlug]
  );

  const bundlePickerLoader = useMemo(
    () =>
      businessSlug
        ? makeBusinessBundlePickerLoader({
            businessSlug,
            active: true,
            limit: 100,
          })
        : undefined,
    [businessSlug]
  );

  // List pickers always get a function (fallback = empty list)
  const productPickerForList = useMemo<(q: string) => Promise<PickerItem[]>>(
    () => productPickerLoader ?? (async () => [] as PickerItem[]),
    [productPickerLoader]
  );

  const bundlePickerForList = useMemo<(q: string) => Promise<PickerItem[]>>(
    () => bundlePickerLoader ?? (async () => [] as PickerItem[]),
    [bundlePickerLoader]
  );

  // Adapt loaders for GrantEditor (expects PickerItem[])
  type RawItem = {
    id: string;
    title?: string;
    name?: string;
    label?: string;
    subtitle?: string;
    imageUrl?: string;
    slug?: string;
    businessSlug?: string;
    sku?: string | null;
  };

  const productPickerForGrant = useMemo<
    ((q: string) => Promise<PickerItem[]>) | undefined
  >(() => {
    if (!productPickerLoader) return undefined;
    return async (q: string) => {
      const items = (await productPickerLoader(q)) as unknown as RawItem[];
      return items.map((it) => ({
        id: it.id,
        title: it.title ?? it.name ?? it.label ?? "",
        subtitle: it.subtitle,
        imageUrl: it.imageUrl,
      })) as PickerItem[];
    };
  }, [productPickerLoader]);

  const bundlePickerForGrant = useMemo<
    ((q: string) => Promise<PickerItem[]>) | undefined
  >(() => {
    if (!bundlePickerLoader) return undefined;
    return async (q: string) => {
      const items = (await bundlePickerLoader(q)) as unknown as RawItem[];
      return items.map((it) => ({
        id: it.id,
        title: it.title ?? it.name ?? it.label ?? "",
        subtitle: it.subtitle,
        imageUrl: it.imageUrl,
      })) as PickerItem[];
    };
  }, [bundlePickerLoader]);

  // Kind selection
  const [uiOfferKind, setUiOfferKind] = useState<UiOfferKind>("PERCENTAGE");

  // Base form state (new schema)
  const [form, setForm] = useState<OfferTemplateForm>({
    businessId: userId,
    offerTemplateId: undefined,

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
    minPurchaseQty: undefined,

    offerType: "PERCENTAGE_DISCOUNT",

    scopeKind: "ANY",
    scopeItems: [],

    // discount (non-tiered)
    discountPercentage: undefined,
    maxDiscountAmount: undefined,
    discountAmount: undefined,

    // tiers
    tiers: [],

    // grants (for GRANTS mode)
    grants: [] as OfferGrantLine[],
    grantPickLimit: 1,
    grantDiscountType: "FREE",
    grantDiscountValue: undefined,

    // wallet purchase
    purchasableWithPoints: false,
    pointsPrice: undefined,
    maxPurchasesPerUser: undefined,
  });

  // Tiers UI state
  const [useTiers, setUseTiers] = useState(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [bands, setBands] = useState<BandRow[]>([
    { discountType: "PERCENTAGE", discountValue: 0, maxDiscountAmount: null },
  ]);

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
        <div className="form-card">
          <p className="error-text" style={{ textAlign: "center" }}>
            Access denied. You must be registered as a business to create offer
            templates.
          </p>
        </div>
      </div>
    );
  }

  // Helpers to map inputs → typed state
  function setField<K extends keyof OfferTemplateForm>(
    key: K,
    raw: string,
    checked: boolean
  ) {
    setForm((prev) => {
      const next: OfferTemplateForm = { ...prev };

      const numeric: (keyof OfferTemplateForm)[] = [
        "discountPercentage",
        "maxDiscountAmount",
        "discountAmount",
        "minPurchaseAmount",
        "minPurchaseQty",
        "durationDays",
        "maxRedemptions",
        "grantDiscountValue",
        "grantPickLimit",
        "pointsPrice",
        "maxPurchasesPerUser",
      ];
      const boolean: (keyof OfferTemplateForm)[] = [
        "isActive",
        "purchasableWithPoints",
      ];

      if (numeric.includes(key)) {
        (next[key] as unknown as number | undefined) =
          raw === "" ? undefined : Number(raw);
      } else if (boolean.includes(key)) {
        (next[key] as unknown as boolean) = checked;
      } else {
        (next[key] as unknown as string | undefined) =
          raw === "" ? undefined : raw;
      }
      return next;
    });
  }

  const mapUiKindToOfferType = (
    v: UiOfferKind
  ): OfferTemplateForm["offerType"] =>
    v === "GRANTS"
      ? "GRANT"
      : v === "ABSOLUTE"
      ? "FIXED_DISCOUNT"
      : "PERCENTAGE_DISCOUNT";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, checked, type } = target;

    if (name === "uiOfferKind") {
      const v = value as UiOfferKind;
      setUiOfferKind(v);
      if (v === "GRANTS") setUseTiers(false);

      // keep offerType in sync + clear incompatible base fields
      setForm((prev) => ({
        ...prev,
        offerType: mapUiKindToOfferType(v),
        discountPercentage: undefined,
        maxDiscountAmount: undefined,
        discountAmount: undefined,
      }));
      return;
    }

    setField(
      name as keyof OfferTemplateForm,
      type === "checkbox" ? (checked ? "1" : "") : value,
      checked
    );
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Grants validation
    if (uiOfferKind === "GRANTS") {
      if ((form.grants?.length ?? 0) < 1) {
        alert("Please add at least one grant (free product or bundle).");
        return;
      }
    } else if (!useTiers) {
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

    // Scope validation
    if (form.scopeKind === "LIST") {
      const count = form.scopeItems?.length ?? 0;
      if (count === 0) {
        alert("Select at least one product or bundle in the scope list.");
        return;
      }
    }

    // Validity validation
    if (form.validityType === "RELATIVE" && !form.trigger) {
      alert("Please pick an activation trigger for relative validity.");
      return;
    }

    // Purchase policy sanity check
    if (
      form.purchasableWithPoints &&
      (form.pointsPrice == null || form.pointsPrice <= 0)
    ) {
      alert("Please set a positive points price for wallet purchases.");
      return;
    }

    // Build tiers if enabled
    let payloadForm: OfferTemplateForm = { ...form };

    if (uiOfferKind !== "GRANTS") {
      if (useTiers) {
        const sortedBps = [...breakpoints].sort((a, b) => a - b);
        const serverTiers = uiToServerTiers(sortedBps, bands);

        payloadForm = {
          ...payloadForm,
          tiers: serverTiers,
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
      const payload = buildOfferTemplatePayload(payloadForm);
      const saved = (await upsertOfferTemplate(
        payload,
        token
      )) as Partial<OfferTemplateResponse> | undefined;

      const id =
        saved?.offerTemplateId ??
        payload.offerTemplateId ??
        payloadForm.offerTemplateId ??
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
                        <label className="th-label">
                          Max cap (₹, optional)
                        </label>
                        <input
                          className="th-input"
                          type="number"
                          name="maxDiscountAmount"
                          placeholder="e.g., 1000"
                          value={form.maxDiscountAmount ?? ""}
                          onChange={(e) =>
                            setField(
                              "maxDiscountAmount",
                              e.target.value,
                              false
                            )
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
                          <div
                            key={idx}
                            className="th-pill"
                            style={{ gap: 8 }}
                          >
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
                          <div
                            key={i}
                            className="th-pill"
                            style={{ gap: 8 }}
                          >
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
                                const val =
                                  e.target.value as BandRow["discountType"];
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
                  value={form.scopeKind ?? "ANY"}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      scopeKind: e.target.value as any,
                    }))
                  }
                >
                  <option value="ANY">Any purchase (global)</option>
                  <option value="LIST">
                    Specific list (products and/or bundles)
                  </option>
                </select>
              </div>

              {form.scopeKind === "LIST" && (
                <>
                  {/* Add product */}
                  <div className="th-field">
                    <label className="th-label">Add product</label>
                    <div className="th-pill">
                      <ProductPicker
                        value={null}
                        onChange={(id, item) => {
                          if (!id) return;
                          setForm((prev) => {
                            const next = [...(prev.scopeItems ?? [])];

                            const key = (it: ScopeItem) =>
                              it.itemType === "PRODUCT"
                                ? `P:${it.product.id}`
                                : `B:${it.bundle.id}`;
                            const exists = new Set(next.map(key));

                            const prod = item
                              ? {
                                  id: item.id,
                                  slug: (item as any).slug,
                                  businessSlug: (item as any).businessSlug,
                                  name: item.title,
                                  primaryImageUrl: item.imageUrl ?? null,
                                  sku: (item as any).sku ?? null,
                                }
                              : { id };

                            const candidate: ScopeItem = {
                              itemType: "PRODUCT",
                              product: prod,
                            };
                            if (!exists.has(key(candidate))) next.push(candidate);

                            return { ...prev, scopeItems: next };
                          });
                        }}
                        fetchItems={productPickerForList}
                        placeholder="Search and add product…"
                      />
                    </div>
                  </div>

                  {/* Add bundle */}
                  <div className="th-field">
                    <label className="th-label">Add bundle</label>
                    <div className="th-pill">
                      <BundlePicker
                        value={null}
                        onChange={(id, item) => {
                          if (!id) return;
                          setForm((prev) => {
                            const next = [...(prev.scopeItems ?? [])];

                            const key = (it: ScopeItem) =>
                              it.itemType === "PRODUCT"
                                ? `P:${it.product.id}`
                                : `B:${it.bundle.id}`;
                            const exists = new Set(next.map(key));

                            const bund = item
                              ? {
                                  id: item.id,
                                  slug: (item as any).slug,
                                  businessSlug: (item as any).businessSlug,
                                  name: item.title,
                                  primaryImageUrl: item.imageUrl ?? null,
                                }
                              : { id };

                            const candidate: ScopeItem = {
                              itemType: "BUNDLE",
                              bundle: bund,
                            };
                            if (!exists.has(key(candidate))) next.push(candidate);

                            return { ...prev, scopeItems: next };
                          });
                        }}
                        fetchItems={bundlePickerForList}
                        placeholder="Search and add bundle…"
                      />
                    </div>
                  </div>

                  {/* Selected items */}
                  <div className="th-field th-col-span-2">
                    <label className="th-label">Selected items</label>
                    <div className="th-vlist">
                      {(form.scopeItems ?? []).length === 0 && (
                        <div className="help">No items selected yet.</div>
                      )}

                      {(form.scopeItems ?? []).map((it, i) => {
                        const isProduct = it.itemType === "PRODUCT";
                        const data = isProduct ? it.product : it.bundle;
                        const id = data.id;
                        const title = (data as any).name ?? id;
                        const subtitle =
                          (data as any).slug ??
                          (data as any).businessSlug ??
                          "";
                        const img =
                          (data as any).primaryImageUrl ??
                          (data as any).imageUrl ??
                          null;

                        return (
                          <div
                            key={`${isProduct ? "p" : "b"}-${id}-${i}`}
                            className="th-list-row"
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                overflow: "hidden",
                              }}
                            >
                              <img
                                src={img || ""}
                                alt=""
                                className="img-cover"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  objectFit: "cover",
                                  background: "#eee",
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.visibility =
                                    "hidden";
                                }}
                              />
                              <div style={{ overflow: "hidden" }}>
                                <div className="th-list-title" title={title}>
                                  {isProduct ? "Product" : "Bundle"}: {title}
                                </div>
                                {subtitle && (
                                  <div className="subtitle">{subtitle}</div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  scopeItems: (prev.scopeItems ?? []).filter(
                                    (x) => {
                                      const xData =
                                        x.itemType === "PRODUCT"
                                          ? x.product
                                          : x.bundle;
                                      return !(
                                        x.itemType === it.itemType &&
                                        xData.id === id
                                      );
                                    }
                                  ),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* VALIDITY + RULES + PURCHASE POLICY */}
          <div className="section-block">
            <div className="section-header">⏳ Validity</div>

            {/* Validity type + Claim policy */}
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

              <div className="th-field">
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
            </div>

            {/* Dates / relative config */}
            <div className="section-grid">
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

            {/* Rules & optional limits */}
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

            {/* Purchase policy – ONLY wallet-related fields */}
            <details className="section-details">
              <summary>🛒 Purchase policy</summary>
              <div className="section-grid">
                <div className="th-field th-col-span-2">
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="purchasableWithPoints"
                      checked={!!form.purchasableWithPoints}
                      onChange={handleChange}
                    />
                    Allow purchase with wallet points
                  </label>
                  <div className="help">
                    When enabled, customers can spend their points to buy this offer
                    template.
                  </div>
                </div>

                {form.purchasableWithPoints && (
                  <>
                    <div className="th-field">
                      <label className="th-label">Points price</label>
                      <input
                        className="th-input"
                        type="number"
                        name="pointsPrice"
                        value={form.pointsPrice ?? ""}
                        onChange={(e) => setField("pointsPrice", e.target.value, false)}
                      />
                      <div className="help">
                        Total points required for one purchase.
                      </div>
                    </div>

                    <div className="th-field">
                      <label className="th-label">
                        Max purchases per user (optional)
                      </label>
                      <input
                        className="th-input"
                        type="number"
                        name="maxPurchasesPerUser"
                        value={form.maxPurchasesPerUser ?? ""}
                        onChange={(e) =>
                          setField("maxPurchasesPerUser", e.target.value, false)
                        }
                      />
                      <div className="help">Leave blank for no per-user limit.</div>
                    </div>
                  </>
                )}
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
