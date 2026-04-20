// src/pages/OfferTemplateEditor.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchOfferTemplateById,
  upsertOfferTemplate,
  buildOfferTemplatePayload,
  responseToForm,
} from "../services/offerTemplateService";
import {
  makeBusinessProductPickerLoader,
  makeBusinessBundlePickerLoader,
} from "../services/productBundlePickerService";
import type {
  UiOfferKind,
  OfferTemplateResponse,
  DiscountTierSpec,
  PickerItem,
  ScopeItem,
  OfferTemplateForm,
  OfferGrantLine,
} from "../types/offerTemplateTypes";
import type { UiAttachment } from "../types/threads";
import GrantEditor from "../components/GrantEditor";
import ProductPicker from "../components/ProductPicker";
import BundlePicker from "../components/BundlePicker";
import { tiersToUiBands, uiToServerTiers, type UiBand } from "../utils/tiersMapping";
import { useAppData } from "../context/AppDataContext";
import { supabase } from "../supabaseClient";
import "../css/offer-template-editor.css";

type BandRow = UiBand;

function makeEmptyOfferTemplateForm(businessId: string): OfferTemplateForm {
  return {
    businessId,
    offerTemplateId: undefined,

    templateTitle: "",
    description: "",
    images: [],

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

    discountPercentage: undefined,
    maxDiscountAmount: undefined,
    discountAmount: undefined,

    tiers: [],

    grants: [] as OfferGrantLine[],
    grantPickLimit: 1,
    grantDiscountType: "FREE",
    grantDiscountValue: undefined,

    purchasableWithPoints: false,
    pointsPrice: undefined,
    maxPurchasesPerUser: undefined,
  };
}

const mapUiKindToOfferType = (
  v: UiOfferKind
): OfferTemplateForm["offerType"] =>
  v === "GRANTS"
    ? "GRANT"
    : v === "ABSOLUTE"
      ? "FIXED_DISCOUNT"
      : "PERCENTAGE_DISCOUNT";

function attachmentKindFromMime(mime: string): UiAttachment["kind"] {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

function normalizePrimaryImages(items: UiAttachment[]): UiAttachment[] {
  const images = (items ?? []).filter(
    (x) => !!x?.url && String(x.mime || "").startsWith("image/")
  );

  if (!images.length) return [];

  let found = false;

  const next = images.map((img) => {
    if (img.isPrimary && !found) {
      found = true;
      return { ...img, isPrimary: true };
    }
    return { ...img, isPrimary: false };
  });

  if (!found) {
    next[0] = { ...next[0], isPrimary: true };
  }

  return next;
}

function formatBytes(n?: number | null) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  const dp = i === 0 ? 0 : i === 1 ? 0 : 1;
  return `${x.toFixed(dp)} ${units[i]}`;
}

function safeSegment(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);
}

function randomId() {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const OfferTemplateEditor: React.FC = () => {
  const { businessSlug, offerTemplateId } = useParams<{
    businessSlug?: string;
    offerTemplateId?: string;
  }>();
  const navigate = useNavigate();
  const { myBusinesses } = useAppData();
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const matchedBusiness = useMemo(() => {
    const slug = String(businessSlug ?? "").toLowerCase();
    return (
      myBusinesses.find(
        (b) =>
          String((b as any).slug ?? "").toLowerCase() === slug ||
          String((b as any).businessSlug ?? "").toLowerCase() === slug
      ) ?? null
    );
  }, [businessSlug, myBusinesses]);

  const actingBusinessId = matchedBusiness?.businessId ?? null;
  const isEdit = !!offerTemplateId;

  const [form, setForm] = useState<OfferTemplateForm | null>(null);
  const [uiOfferKind, setUiOfferKind] = useState<UiOfferKind>("PERCENTAGE");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [useTiers, setUseTiers] = useState(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [bands, setBands] = useState<BandRow[]>([
    { discountType: "PERCENTAGE", discountValue: 0, maxDiscountAmount: null },
  ]);

  async function getAccessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  const productPickerLoader = useMemo<(q: string) => Promise<PickerItem[]>>(() => {
    if (!actingBusinessId) return async () => [];
    return makeBusinessProductPickerLoader({
      actingBusinessId,
      active: true,
      limit: 100,
    });
  }, [actingBusinessId]);

  const bundlePickerLoader = useMemo<(q: string) => Promise<PickerItem[]>>(() => {
    if (!actingBusinessId) return async () => [];
    return makeBusinessBundlePickerLoader({
      actingBusinessId,
      active: true,
      limit: 100,
    });
  }, [actingBusinessId]);

  const productPickerForList = productPickerLoader;
  const bundlePickerForList = bundlePickerLoader;
  const productPickerForGrant = productPickerLoader;
  const bundlePickerForGrant = bundlePickerLoader;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!businessSlug) {
        setLoadError("Missing business context.");
        setForm(null);
        setLoading(false);
        return;
      }

      if (!actingBusinessId) {
        setLoadError("You do not have access to this business.");
        setForm(null);
        setLoading(false);
        return;
      }

      if (!isEdit || !offerTemplateId) {
        setForm(makeEmptyOfferTemplateForm(actingBusinessId));
        setUiOfferKind("PERCENTAGE");
        setUseTiers(false);
        setBreakpoints([]);
        setBands([
          { discountType: "PERCENTAGE", discountValue: 0, maxDiscountAmount: null },
        ]);
        setLoadError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const t: OfferTemplateResponse = await fetchOfferTemplateById(
          offerTemplateId,
          actingBusinessId,
          token
        );
        if (cancelled) return;

        const inferred: UiOfferKind =
          t.offerType === "GRANT"
            ? "GRANTS"
            : t.offerType === "FIXED_DISCOUNT"
              ? "ABSOLUTE"
              : "PERCENTAGE";

        setUiOfferKind(inferred);

        const f = responseToForm(t);
        setForm({
          ...f,
          businessId: actingBusinessId,
          images: normalizePrimaryImages(f.images ?? []),
        });

        const serverTiers = (f.tiers ?? []) as DiscountTierSpec[];
        const hasTiers = serverTiers.length > 0;
        setUseTiers(hasTiers);

        if (hasTiers) {
          const { breakpoints: bps, bands: uiBands } = tiersToUiBands(serverTiers);
          setBreakpoints(bps);
          setBands(uiBands);
        } else {
          if (inferred === "PERCENTAGE") {
            setBands([
              {
                discountType: "PERCENTAGE",
                discountValue: f.discountPercentage ?? 0,
                maxDiscountAmount: f.maxDiscountAmount ?? null,
              },
            ]);
          } else if (inferred === "ABSOLUTE") {
            setBands([
              {
                discountType: "FIXED",
                discountValue: f.discountAmount ?? 0,
                maxDiscountAmount: null,
              },
            ]);
          } else {
            setBands([
              {
                discountType: "PERCENTAGE",
                discountValue: 0,
                maxDiscountAmount: null,
              },
            ]);
          }
          setBreakpoints([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Failed to load offer template");
        setForm(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [businessSlug, actingBusinessId, isEdit, offerTemplateId]);

  useEffect(() => {
    setBands((prev) => {
      const next: BandRow[] = [];
      for (let i = 0; i <= breakpoints.length; i++) {
        next[i] = prev[i] ?? {
          discountType: uiOfferKind === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
          discountValue: 0,
          maxDiscountAmount: null,
        };
      }
      return next;
    });
  }, [breakpoints, uiOfferKind]);

  const breakpointLabels = useMemo(() => {
    const bps = [...breakpoints].sort((a, b) => a - b);
    return Array.from({ length: bps.length + 1 }).map((_, i) => {
      if (i === 0) return bps.length ? `Below ₹${bps[0]}` : "All amounts";
      if (i === bps.length) return `Above ₹${bps[bps.length - 1] || "—"}`;
      return `₹${bps[i - 1]} – ₹${bps[i]}`;
    });
  }, [breakpoints]);

  function setField<K extends keyof OfferTemplateForm>(
    key: K,
    raw: string,
    checked: boolean
  ) {
    setForm((prev) => {
      if (!prev) return prev;
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, checked, type } = target;

    if (name === "uiOfferKind") {
      const v = value as UiOfferKind;
      setUiOfferKind(v);
      if (v === "GRANTS") setUseTiers(false);

      setForm((prev) =>
        prev
          ? {
              ...prev,
              offerType: mapUiKindToOfferType(v),
              discountPercentage: undefined,
              maxDiscountAmount: undefined,
              discountAmount: undefined,
            }
          : prev
      );
      return;
    }

    setField(
      name as keyof OfferTemplateForm,
      type === "checkbox" ? (checked ? "1" : "") : value,
      checked
    );
  };

  const uploadTemplateImages = useCallback(
    async (files: File[]) => {
      if (!files.length || !actingBusinessId) return;

      const bucket =
        (import.meta as any).env?.VITE_SUPABASE_BUCKET ||
        (import.meta as any).env?.VITE_STORAGE_BUCKET ||
        "public";

      const folderRoot = "offer-template-images";
      const businessSeg = safeSegment(actingBusinessId);
      const templateSeg = safeSegment(offerTemplateId ?? "draft");

      setUploadingImages(true);

      try {
        const uploaded: UiAttachment[] = [];

        for (const file of files) {
          const mime = file.type || "application/octet-stream";
          if (!mime.startsWith("image/")) continue;

          const safeName = safeSegment(file.name || "image");
          const path = `${folderRoot}/${businessSeg}/${templateSeg}/${randomId()}_${safeName}`;

          const { error } = await supabase.storage.from(bucket).upload(path, file, {
            upsert: false,
            contentType: mime,
            cacheControl: "3600",
          });

          if (error) throw error;

          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          const url = data?.publicUrl;
          if (!url) throw new Error("Failed to resolve public URL for uploaded image");

          uploaded.push({
            url,
            name: file.name || "image",
            mime,
            sizeBytes: file.size ?? null,
            kind: "IMAGE",
            path,
            isPrimary: false,
          });
        }

        setForm((prev) =>
          prev
            ? {
                ...prev,
                images: normalizePrimaryImages([...(prev.images ?? []), ...uploaded]),
              }
            : prev
        );
      } catch (err) {
        console.error("Failed to upload template images", err);
        alert(err instanceof Error ? err.message : "Failed to upload images");
      } finally {
        setUploadingImages(false);
      }
    },
    [actingBusinessId, offerTemplateId]
  );

  const onImageSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      await uploadTemplateImages(files);
    },
    [uploadTemplateImages]
  );

  const setPrimaryImage = useCallback((idx: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = (prev.images ?? []).map((img, i) => ({
        ...img,
        isPrimary: i === idx,
      }));
      return { ...prev, images: normalizePrimaryImages(next) };
    });
  }, []);

  const removeImage = useCallback((idx: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = (prev.images ?? []).filter((_, i) => i !== idx);
      return { ...prev, images: normalizePrimaryImages(next) };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving || !actingBusinessId) return;

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

    if (form.scopeKind === "LIST") {
      const count = form.scopeItems?.length ?? 0;
      if (count === 0) {
        alert("Select at least one product or bundle in the scope list.");
        return;
      }
    }

    if (form.validityType === "RELATIVE" && !form.trigger) {
      alert("Please pick an activation trigger for relative validity.");
      return;
    }

    if (
      form.purchasableWithPoints &&
      (form.pointsPrice == null || form.pointsPrice <= 0)
    ) {
      alert("Please set a positive points price for wallet purchases.");
      return;
    }

    let payloadForm: OfferTemplateForm = {
      ...form,
      businessId: actingBusinessId,
      images: normalizePrimaryImages(form.images ?? []),
    };

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
      setSaving(true);

      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const payload = buildOfferTemplatePayload(payloadForm);
      const saved = await upsertOfferTemplate(payload, actingBusinessId, token);

      const destId =
        saved?.offerTemplateId ||
        payload.offerTemplateId ||
        form.offerTemplateId ||
        offerTemplateId;

      if (destId && businessSlug) {
        navigate(
          `/businesses/${encodeURIComponent(businessSlug)}/offers/${encodeURIComponent(destId)}`
        );
      } else if (businessSlug) {
        navigate(`/businesses/${encodeURIComponent(businessSlug)}`);
      } else {
        navigate("/app");
      }
    } catch (err) {
      console.error("Failed to save template", err);
      const msg = err instanceof Error ? err.message : "Error saving template";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-wrap">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="page-wrap">
        <div className="form-card">
          <p className="error-text" style={{ textAlign: "center" }}>
            {loadError}
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                businessSlug
                  ? navigate(`/businesses/${encodeURIComponent(businessSlug)}`)
                  : navigate("/app")
              }
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return <div className="page-wrap">Unable to load form.</div>;
  }

  return (
    <div className="page-wrap">
      <div className="form-card">
        <h2 className="page-title">
          {isEdit ? "Edit Offer Template" : "Create Offer Template"}
        </h2>

        <form onSubmit={handleSubmit} className="th-form th-form--horizontal ot-editor-form" noValidate>
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
                <label className="th-label">Offer Type</label>
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

              <div className="th-field ot-field--stack th-col-span-2">
                <label className="th-label">Description</label>
                <textarea
                  className="th-textarea"
                  name="description"
                  placeholder="Short description customers will see"
                  value={form.description ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="th-field ot-field--stack th-col-span-2">
                <label className="th-label">Images</label>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={onImageSelected}
                />

                <div className="th-vlist">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImages || saving}
                    >
                      {uploadingImages ? "Uploading..." : "+ Add images"}
                    </button>

                    <div className="help">
                      Upload one or more images. One image will be marked primary.
                    </div>
                  </div>

                  {(form.images ?? []).length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {(form.images ?? []).map((img, idx) => (
                        <div
                          key={`${img.url}-${idx}`}
                          className="th-list-row"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "16 / 10",
                              borderRadius: 10,
                              overflow: "hidden",
                              background: "#f4f4f5",
                              border: img.isPrimary ? "2px solid #111827" : "1px solid #e5e7eb",
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.name || ""}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              className="th-list-title"
                              title={img.name}
                              style={{ display: "flex", alignItems: "center", gap: 8 }}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                {img.name}
                              </span>
                              {img.isPrimary ? (
                                <span className="th-pill" style={{ padding: "2px 8px" }}>
                                  Primary
                                </span>
                              ) : null}
                            </div>
                            <div className="subtitle">
                              {img.mime || "image"}
                              {img.sizeBytes ? ` · ${formatBytes(img.sizeBytes)}` : ""}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              disabled={img.isPrimary}
                              onClick={() => setPrimaryImage(idx)}
                            >
                              {img.isPrimary ? "Primary" : "Set primary"}
                            </button>

                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => removeImage(idx)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="help">No images uploaded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="section-block section-block--accent">
            <div className="section-header">🧩 Offer type-specific fields</div>
            <div className="section-grid">
              {(uiOfferKind === "PERCENTAGE" || uiOfferKind === "ABSOLUTE") && (
                <>
                  <div className="th-field ot-field--stack th-col-span-2">
                    <label className="th-check">
                      <input
                        type="checkbox"
                        checked={useTiers}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseTiers(checked);

                          if (checked) {
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    discountPercentage: undefined,
                                    maxDiscountAmount: undefined,
                                    discountAmount: undefined,
                                  }
                                : prev
                            );
                          }
                        }}
                      />
                      Use tiered discounts
                    </label>
                    <div className="help">
                      When enabled, tiers override the base discount.
                    </div>
                  </div>

                  {!useTiers && uiOfferKind === "PERCENTAGE" && (
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
                            setField("discountPercentage", e.target.value, false)
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
                  )}

                  {!useTiers && uiOfferKind === "ABSOLUTE" && (
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

                  {useTiers && (
                    <div className="th-field ot-field--stack th-col-span-2">
                      <label className="th-label">Breakpoints & bands</label>

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
                            setBreakpoints((bps) => [...bps, (bps.at(-1) ?? 0) + 100])
                          }
                        >
                          + Add breakpoint
                        </button>
                        <div className="help">
                          Bands are “Below first”, “Between”, and “Above last”.
                        </div>
                      </div>

                      <div className="th-vlist">
                        {bands.map((b, i) => (
                          <div key={i} className="th-pill" style={{ gap: 8 }}>
                            <div className="th-list-title" style={{ minWidth: 180 }}>
                              {breakpointLabels[i]}
                            </div>

                            <select
                              className="select discount-type"
                              value={b.discountType}
                              onChange={(e) => {
                                const val = e.target.value as BandRow["discountType"];
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
                        setForm((p) =>
                          p
                            ? {
                                ...p,
                                grantPickLimit: e.target.value
                                  ? Number(e.target.value)
                                  : 1,
                              }
                            : p
                        )
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
                          setForm((p) =>
                            p
                              ? {
                                  ...p,
                                  grantDiscountType: e.target.value as any,
                                  grantDiscountValue:
                                    e.target.value === "FREE"
                                      ? undefined
                                      : p.grantDiscountValue,
                                }
                              : p
                          )
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
                          setForm((p) =>
                            p
                              ? {
                                  ...p,
                                  grantDiscountValue:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                }
                              : p
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="th-field ot-field--stack th-col-span-2">
                    <label className="th-label">Free items</label>
                    <GrantEditor
                      value={form.grants ?? []}
                      onChange={(gr) => setForm((p) => (p ? { ...p, grants: gr } : p))}
                      fetchProducts={productPickerForGrant}
                      fetchBundles={bundlePickerForGrant}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

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
                    setForm((p) => (p ? { ...p, scopeKind: e.target.value as any } : p))
                  }
                >
                  <option value="ANY">Any purchase (global)</option>
                  <option value="LIST">Specific list (products and/or bundles)</option>
                </select>
              </div>

              {form.scopeKind === "LIST" && (
                <>
                  <div className="th-field">
                    <label className="th-label">Add product</label>
                    <div className="th-pill">
                      <ProductPicker
                        value={null}
                        onChange={(id, item) => {
                          if (!id) return;
                          setForm((prev) => {
                            if (!prev) return prev;
                            const next = [...(prev.scopeItems ?? [])];

                            const key = (it: ScopeItem) =>
                              it.itemType === "PRODUCT"
                                ? `P:${it.product.id}`
                                : `B:${it.bundle.id}`;
                            const exists = new Set(next.map(key));

                            const meta = (item?.payload as any) ?? {};

                            const prod = item
                              ? {
                                  id: item.id,
                                  slug: meta.slug,
                                  businessSlug: meta.businessSlug,
                                  name: item.title,
                                  primaryImageUrl: item.imageUrl ?? null,
                                  sku: meta.sku ?? null,
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

                  <div className="th-field">
                    <label className="th-label">Add bundle</label>
                    <div className="th-pill">
                      <BundlePicker
                        value={null}
                        onChange={(id, item) => {
                          if (!id) return;
                          setForm((prev) => {
                            if (!prev) return prev;
                            const next = [...(prev.scopeItems ?? [])];

                            const key = (it: ScopeItem) =>
                              it.itemType === "PRODUCT"
                                ? `P:${it.product.id}`
                                : `B:${it.bundle.id}`;
                            const exists = new Set(next.map(key));

                            const meta = (item?.payload as any) ?? {};

                            const bund = item
                              ? {
                                  id: item.id,
                                  slug: meta.slug,
                                  businessSlug: meta.businessSlug,
                                  title: item.title,
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

                  <div className="th-field ot-field--stack th-col-span-2">
                    <label className="th-label">Selected items</label>
                    <div className="th-vlist">
                      {(form.scopeItems ?? []).length === 0 && (
                        <div className="help">No items selected yet.</div>
                      )}

                      {(form.scopeItems ?? []).map((it, i) => {
                        const isProduct = it.itemType === "PRODUCT";
                        const data = isProduct ? it.product : it.bundle;
                        const id = data.id;
                        const title =
                          (isProduct ? (data as any).name : (data as any).title) ?? id;
                        const subtitle =
                          (data as any).slug ?? (data as any).businessSlug ?? "";
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
                                  (e.target as HTMLImageElement).style.visibility = "hidden";
                                }}
                              />
                              <div style={{ overflow: "hidden" }}>
                                <div className="th-list-title" title={title}>
                                  {isProduct ? "Product" : "Bundle"}: {title}
                                </div>
                                {subtitle && <div className="subtitle">{subtitle}</div>}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        scopeItems: (prev.scopeItems ?? []).filter((x) => {
                                          const xData =
                                            x.itemType === "PRODUCT"
                                              ? x.product
                                              : x.bundle;
                                          return !(
                                            x.itemType === it.itemType &&
                                            xData.id === id
                                          );
                                        }),
                                      }
                                    : prev
                                )
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
                  <label className="th-label">Minimum purchase quantity</label>
                  <input
                    className="th-input"
                    type="number"
                    name="minPurchaseQty"
                    value={form.minPurchaseQty ?? ""}
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

                <div className="th-field ot-field--stack th-col-span-2">
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

          <div className="actions">
            <button type="submit" className="btn btn--primary" disabled={saving || uploadingImages}>
              {saving ? "Saving..." : "Save Template"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                businessSlug
                  ? navigate(`/businesses/${encodeURIComponent(businessSlug)}`)
                  : navigate("/app")
              }
              disabled={saving || uploadingImages}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferTemplateEditor;