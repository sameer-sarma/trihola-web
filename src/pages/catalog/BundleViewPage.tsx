import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getBusinessPublicViewBySlug } from "../../services/businessService";
import { deleteBundle, listBundlesForBusinessSlug } from "../../services/bundleService";

import type { UUID, BundleRecord } from "../../types/catalog";
import type { BusinessPublicViewDTO } from "../../types/business";

function safeText(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}

const BundleViewPage: React.FC = () => {
  const { businessSlug, bundleSlug } = useParams<{ businessSlug: string; bundleSlug: string }>();
  const navigate = useNavigate();

  const [ctx, setCtx] = useState<BusinessPublicViewDTO | null>(null);
  const [bundle, setBundle] = useState<BundleRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewerRole = useMemo(
    () => (ctx?.viewerRelation ?? "").toUpperCase(),
    [ctx?.viewerRelation]
  );
  const canManageCatalog = viewerRole === "OWNER" || viewerRole === "ADMIN";

  useEffect(() => {
    if (!businessSlug || !bundleSlug) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await getBusinessPublicViewBySlug(businessSlug);
        if (cancelled) return;
        setCtx(c);

        const list = await listBundlesForBusinessSlug(businessSlug, {
          active: undefined,
          limit: 200,
          offset: 0,
        });
        if (cancelled) return;

        const wanted = decodeURIComponent(bundleSlug);
        const found = (list ?? []).find((b) => (b.slug ?? "") === wanted);

        if (!found) {
          setBundle(null);
          setError("Bundle not found.");
        } else {
          setBundle(found);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load bundle");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessSlug, bundleSlug]);

  const onDelete = async () => {
    if (!canManageCatalog || !ctx || !bundle) return;
    const actingBusinessId = ((ctx as any).businessId ?? (ctx as any).businessId ?? ctx.businessId) as UUID;

    const ok = window.confirm(`Delete bundle "${bundle.title}"?\n\nThis cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await deleteBundle(actingBusinessId, bundle.id);
      navigate(`/businesses/${encodeURIComponent(businessSlug!)}`, { replace: true });
    } catch (e: any) {
      // backend may return 409 "BUNDLE_IN_PROTECTED_USE"
      setError(e?.response?.data ?? e?.message ?? "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  const firstImage = useMemo(() => {
    const img = bundle?.items?.find((x) => !!(x as any).primaryImageUrl)?.primaryImageUrl;
    return img ?? null;
  }, [bundle]);

  if (loading) return <div className="th-page">Loading…</div>;

  return (
    <div className="th-page">
      <div className="th-card" style={{ maxWidth: 980, margin: "0 auto" }}>
        <div className="th-form-header">
          <div>
            <div className="th-page-title" style={{ marginBottom: 6 }}>
              {bundle ? safeText(bundle.title) : "Bundle"}
            </div>
            <div className="th-text-muted">
              Business: <b>{businessSlug}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn"
              onClick={() => navigate(`/businesses/${encodeURIComponent(businessSlug!)}`)}
            >
              Back to business
            </button>

            {canManageCatalog && bundle && (
              <>
                <button
                  className="btn btn--primary"
                  disabled={busy}
                  onClick={() =>
                    navigate(
                      `/businesses/${encodeURIComponent(businessSlug!)}/bundles/${encodeURIComponent(
                        bundleSlug!
                      )}/edit`
                    )
                  }
                >
                  Edit
                </button>
                <button className="btn" disabled={busy} onClick={onDelete}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="th-text-muted" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        {!bundle ? null : (
          <div className="th-form">
            <div className="th-section">
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={safeText(bundle.title)}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.7)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: "var(--muted)",
                    }}
                  >
                    No image
                  </div>
                )}

                <div style={{ minWidth: 240, flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>
                    {safeText(bundle.title)}
                  </div>
                  <div className="th-text-muted" style={{ marginTop: 6 }}>
                    slug: <b>{safeText(bundle.slug)}</b> •{" "}
                    {bundle.isActive ? "ACTIVE" : "INACTIVE"}
                  </div>
                  <div className="th-text-muted" style={{ marginTop: 6 }}>
                    {bundle.items?.length ?? 0} item(s)
                  </div>
                </div>
              </div>
            </div>

            <div className="th-field">
              <div className="th-label">Description</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{safeText(bundle.description)}</div>
            </div>

            <div className="th-field">
              <div className="th-label">Items</div>

              {bundle.items?.length ? (
                <div className="th-form">
                  {bundle.items.map((it) => (
                    <button
                      key={it.productId}
                      type="button"
                      className="th-item-card"
                      onClick={() =>
                        (it as any).slug &&
                        navigate(
                          `/businesses/${encodeURIComponent(businessSlug!)}/p/${encodeURIComponent(
                            (it as any).slug
                          )}`
                        )
                      }
                      style={{
                        cursor: (it as any).slug ? "pointer" : "default",
                        textAlign: "left",
                      }}
                      disabled={!(it as any).slug}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                        {(it as any).primaryImageUrl ? (
                          <img
                            src={(it as any).primaryImageUrl}
                            alt={safeText((it as any).name)}
                            style={{
                              width: 54,
                              height: 54,
                              objectFit: "cover",
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              background: "rgba(255,255,255,0.7)",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              background: "rgba(255,255,255,0.6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              color: "var(--muted)",
                              flexShrink: 0,
                            }}
                          >
                            {safeText((it as any).name).slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {safeText((it as any).name)}
                          </div>
                          <div className="th-text-muted" style={{ marginTop: 4 }}>
                            slug: {safeText((it as any).slug)}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 900 }}>x {safeText((it as any).qty)}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="th-text-muted">No items.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundleViewPage;
