import React, { useMemo, useState, useEffect } from "react";
import { useBusinessProducts } from "../queries/productQueries";
import { useBusinessBundles } from "../queries/bundleQueries";

export type CreateCampaignReq = {
  title: string;
  message?: string | null;
  affiliateHeadline?: string | null;
  affiliateSubheading?: string | null;
  campaignDescription?: string | null;
  affiliateLongDescription?: string | null;
  prospectDescriptionShort?: string | null;
  prospectDescriptionLong?: string | null;
  themeColor?: string | null;
  primaryImageUrl?: string | null;
  singleProductId?: string | null;
  bundleId?: string | null;
  startsAtIso?: string | null;
  expiresAtIso?: string | null;
};

type Props = {
  businessSlug: string; // <-- pass current business
  initial?: Partial<CreateCampaignReq>;
  onSubmit: (values: CreateCampaignReq) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

// tiny util
const emptyToUndef = (v?: string | null) => (v && v.trim() ? v : undefined);
// convert value from <input type="datetime-local"> to ISO or undefined
const toIsoOrUndef = (local?: string | null) => (local && local.trim() ? new Date(local).toISOString() : undefined);

export default function CampaignForm({
  businessSlug,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Create campaign",
}: Props) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    message: initial?.message ?? "",
    campaignDescription: initial?.campaignDescription ?? "",
    affiliateHeadline: initial?.affiliateHeadline ?? "",
    affiliateSubheading: initial?.affiliateSubheading ?? "",
    affiliateLongDescription: initial?.affiliateLongDescription ?? "",
    prospectDescriptionShort: initial?.prospectDescriptionShort ?? "",
    prospectDescriptionLong: initial?.prospectDescriptionLong ?? "",
    themeColor: initial?.themeColor ?? "",
    primaryImageUrl: initial?.primaryImageUrl ?? "",
    // we’ll manage product/bundle via drawer – keep for initial edit
    singleProductId: initial?.singleProductId ?? "",
    bundleId: initial?.bundleId ?? "",
    startsAtLocal: initial?.startsAtIso ? isoToLocal(initial.startsAtIso) : "",
    expiresAtLocal: initial?.expiresAtIso ? isoToLocal(initial.expiresAtIso) : "",
  });

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // catalog (enabled when we have a slug)
  const qProducts = useBusinessProducts(businessSlug, { active: true, limit: 200, offset: 0 }, { enabled: !!businessSlug });
  const qBundles  = useBusinessBundles(businessSlug, { active: true, limit: 200, offset: 0 }, !!businessSlug);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"products" | "bundles">("products");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(form.singleProductId || "");
  const [selectedBundleId, setSelectedBundleId] = useState(form.bundleId || "");

  useEffect(() => {
    // keep local selections in sync if initial edits change
    setSelectedProductId(form.singleProductId);
    setSelectedBundleId(form.bundleId);
  }, [form.singleProductId, form.bundleId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const xorConflict = !!form.singleProductId && !!form.bundleId;

  const filteredProducts = useMemo(() => {
    const q = (search || "").toLowerCase();
    const list = (qProducts.data ?? []) as Array<{ id: string; name: string; primaryImageUrl?: string | null; description?: string | null }>;
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [qProducts.data, search]);

  const filteredBundles = useMemo(() => {
    const q = (search || "").toLowerCase();
    const list = (qBundles.data ?? []) as Array<{ id: string; title: string; description?: string | null }>;
    return q ? list.filter((b) => b.title.toLowerCase().includes(q)) : list;
  }, [qBundles.data, search]);

  const attachSelection = () => {
    if (drawerTab === "products") {
      setForm((f) => ({ ...f, singleProductId: selectedProductId, bundleId: "" }));
    } else {
      setForm((f) => ({ ...f, bundleId: selectedBundleId, singleProductId: "" }));
    }
    setDrawerOpen(false);
  };

  const clearScope = () => setForm((f) => ({ ...f, singleProductId: "", bundleId: "" }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!form.title.trim()) return setErr("Title is required");
    if (xorConflict)   return setErr("Provide either singleProductId or bundleId, not both");

    setSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        message: emptyToUndef(form.message),
        campaignDescription: emptyToUndef(form.campaignDescription),
        affiliateHeadline: emptyToUndef(form.affiliateHeadline),
        affiliateSubheading: emptyToUndef(form.affiliateSubheading),
        affiliateLongDescription: emptyToUndef(form.affiliateLongDescription),
        prospectDescriptionShort: emptyToUndef(form.prospectDescriptionShort),
        prospectDescriptionLong: emptyToUndef(form.prospectDescriptionLong),
        themeColor: emptyToUndef(form.themeColor),
        primaryImageUrl: emptyToUndef(form.primaryImageUrl),
        singleProductId: emptyToUndef(form.singleProductId),
        bundleId: emptyToUndef(form.bundleId),
        startsAtIso: toIsoOrUndef(form.startsAtLocal),
        expiresAtIso: toIsoOrUndef(form.expiresAtLocal),
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form className="th-form" onSubmit={handleSubmit}>
        {err && <div className="alert alert--error">{err}</div>}

        <div className="th-field">
          <label className="th-label">Title *</label>
          <input
            className="th-input"
            value={form.title}
            onChange={set("title")}
            placeholder='e.g. "Invite & Earn 10%"'
          />
        </div>

        <div className="th-field">
          <label className="th-label">Internal message</label>
          <textarea
            className="th-input"
            value={form.message}
            onChange={set("message")}
            placeholder="Short admin/internal note…"
          />
        </div>

        {/* NEW: Affiliate + prospect copy */}
        <div className="section-block">
          <div className="section-header">Public messaging</div>

          <div className="th-field">
            <label className="th-label">Affiliate headline</label>
            <input
              className="th-input"
              value={form.affiliateHeadline}
              onChange={set("affiliateHeadline")}
              placeholder='e.g. "Help more learners discover Zestchest & earn rewards"'
            />
          </div>

          <div className="th-field">
            <label className="th-label">Affiliate subheading</label>
            <textarea
              className="th-input"
              value={form.affiliateSubheading}
              onChange={set("affiliateSubheading")}
              placeholder="Short 1–2 line pitch for potential affiliates…"
            />
          </div>

          <div className="th-field">
            <label className="th-label">Campaign description</label>
            <textarea
              className="th-input"
              value={form.campaignDescription}
              onChange={set("campaignDescription")}
              placeholder='e.g. "Hi, I’m Dr. Soma from Zestchest. We teach serious learners how to formulate safe, effective cosmetic products…"'
            />
          </div>

          <div className="th-field">
            <label className="th-label">Affiliate long description</label>
            <textarea
              className="th-input"
              value={form.affiliateLongDescription}
              onChange={set("affiliateLongDescription")}
              placeholder="Deeper explanation of how affiliates earn, who this campaign is for, examples, etc."
            />
          </div>

          <div className="th-field">
            <label className="th-label">Prospect description (short)</label>
            <textarea
              className="th-input"
              value={form.prospectDescriptionShort}
              onChange={set("prospectDescriptionShort")}
              placeholder='e.g. "Hands-on, science-backed courses that take learners from basics to advanced formulations."'
            />
          </div>

          <div className="th-field">
            <label className="th-label">Prospect description (long)</label>
            <textarea
              className="th-input"
              value={form.prospectDescriptionLong}
              onChange={set("prospectDescriptionLong")}
              placeholder="Longer version of what prospects get from this campaign."
            />
          </div>
        </div>

        {/* Primary image + date range + theme */}
        <div className="section-block">
          <div className="section-header">Primary media, window & theme</div>
          <div className="section-grid">
            <div>
              <label className="th-label">Primary image URL</label>
              <input
                className="th-input"
                value={form.primaryImageUrl}
                onChange={set("primaryImageUrl")}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="th-label">Starts at</label>
              <input
                className="th-input"
                type="datetime-local"
                value={form.startsAtLocal}
                onChange={set("startsAtLocal")}
              />
            </div>
            <div>
              <label className="th-label">Expires at</label>
              <input
                className="th-input"
                type="datetime-local"
                value={form.expiresAtLocal}
                onChange={set("expiresAtLocal")}
              />
            </div>
            <div>
              <label className="th-label">Theme color (optional)</label>
              <input
                className="th-input"
                value={form.themeColor}
                onChange={set("themeColor")}
                placeholder="#0052cc or any CSS color"
              />
            </div>
          </div>
        </div>

        {/* Scope picker (product OR bundle) */}
        <div className="section-block section-block--accent">
          <div className="section-header">Scope (pick one)</div>

          {form.singleProductId || form.bundleId ? (
            <div className="th-row" style={{ gap: 8 }}>
              <span className="th-chip">
                Attached: {form.singleProductId ? "Product" : "Bundle"}
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={clearScope}
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="optional-hint">
              Attach a specific product or bundle to target this campaign
              (optional).
            </div>
          )}

          <div
            className="th-header-actions"
            style={{ gap: 8, marginTop: 8 }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDrawerTab("products");
                setDrawerOpen(true);
              }}
            >
              Select product…
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDrawerTab("bundles");
                setDrawerOpen(true);
              }}
            >
              Select bundle…
            </button>
          </div>
        </div>

        <div className="actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving}
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>

      {/* RIGHT DRAWER */}
      {drawerOpen && (
        <div
          className="th-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Select item"
        >
          <div
            className="th-drawer__backdrop"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="th-drawer__panel">
            <div className="th-drawer__header">
              <div className="th-tabs">
                <button
                  className={`th-tab ${
                    drawerTab === "products" ? "is-active" : ""
                  }`}
                  onClick={() => setDrawerTab("products")}
                >
                  Products
                </button>
                <button
                  className={`th-tab ${
                    drawerTab === "bundles" ? "is-active" : ""
                  }`}
                  onClick={() => setDrawerTab("bundles")}
                >
                  Bundles
                </button>
              </div>
              <button
                className="th-drawer__close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="th-drawer__search">
              <input
                className="input"
                placeholder={`Search ${drawerTab}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="th-drawer__content">
              {drawerTab === "products" ? (
                qProducts.isLoading ? (
                  <div className="th-muted">Loading products…</div>
                ) : qProducts.error ? (
                  <div className="th-error">
                    {(qProducts.error as Error).message}
                  </div>
                ) : (
                  <div className="th-list">
                    {(filteredProducts ?? []).map((p: any) => (
                      <button
                        type="button"
                        key={p.id}
                        className={`th-list-row drawer-row ${
                          selectedProductId === p.id ? "is-selected" : ""
                        }`}
                        onClick={() => setSelectedProductId(p.id)}
                        aria-pressed={selectedProductId === p.id}
                      >
                        <div className="drawer-col-left">
                          <div className="drawer-thumb">
                            {p.primaryImageUrl ? (
                              <img
                                src={p.primaryImageUrl}
                                alt={p.name}
                                className="img-cover"
                              />
                            ) : (
                              <div className="drawer-thumb--blank" />
                            )}
                          </div>
                          <div
                            className="drawer-title"
                            title={p.name}
                          >
                            {p.name}
                          </div>
                        </div>
                        <div className="drawer-col-right">
                          <div className="drawer-desc">
                            {truncate(p.description)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : qBundles.isLoading ? (
                <div className="th-muted">Loading bundles…</div>
              ) : qBundles.error ? (
                <div className="th-error">
                  {(qBundles.error as Error).message}
                </div>
              ) : (
                <div className="th-list">
                  {(filteredBundles ?? []).map((b: any) => (
                    <button
                      type="button"
                      key={b.id}
                      className={`th-list-row drawer-row ${
                        selectedBundleId === b.id ? "is-selected" : ""
                      }`}
                      onClick={() => setSelectedBundleId(b.id)}
                      aria-pressed={selectedBundleId === b.id}
                    >
                      <div className="drawer-col-left">
                        <div className="drawer-thumb">
                          <div className="drawer-thumb--blank" />
                        </div>
                        <div
                          className="drawer-title"
                          title={b.title}
                        >
                          {b.title}
                        </div>
                      </div>
                      <div className="drawer-col-right">
                        <div className="drawer-desc">
                          {truncate(b.description)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="th-drawer__footer">
              <button
                className="btn"
                onClick={() => setDrawerOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={attachSelection}
                disabled={
                  drawerTab === "products"
                    ? !selectedProductId
                    : !selectedBundleId
                }
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function truncate(s?: string | null, n = 200) {
  return s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "";
}

function isoToLocal(iso: string) {
  // convert ISO to yyyy-MM-ddTHH:mm for datetime-local
  const d = new Date(iso);
  const pad = (x: number) => String(x).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}