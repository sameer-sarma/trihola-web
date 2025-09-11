// src/components/OfferCard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import { OfferDetailsDTO, OfferClaimDTO } from "../types/offer";
import "../css/OfferDetails.css";
import { supabase } from "../supabaseClient";
import { requestClaim, fetchActiveClaimForMe } from "../services/offerService";
import { QRCodeCanvas } from "qrcode.react";

interface Props {
  offer: OfferDetailsDTO;

  /** If provided, the card will NOT fetch claims by itself */
  manualClaim?: OfferClaimDTO | null;
  onlineClaim?: OfferClaimDTO | null;

  /** If provided, the card will call these instead of creating claims itself */
  onGenerateManual?: () => Promise<OfferClaimDTO | void>;
  onGenerateOnline?: () => Promise<OfferClaimDTO | void>;
}

/** Treat a claim as "active" if it's PENDING and not expired */
function isActiveClaim(c: OfferClaimDTO | null | undefined): boolean {
  if (!c) return false;
  if (String(c.status).toUpperCase() !== "PENDING") return false;
  if (!c.expiresAt) return true;
  const t = Date.parse(c.expiresAt);
  return Number.isNaN(t) ? true : t > Date.now();
}


const OfferCard: React.FC<Props> = ({
  offer,
  manualClaim,
  onlineClaim,
  onGenerateManual,
  onGenerateOnline,
}) => {

  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);

  // Local fallback state (used only if parent didn't pass claims)
  const [localManual, setLocalManual] = useState<OfferClaimDTO | null>(null);
  const [localOnline, setLocalOnline] = useState<OfferClaimDTO | null>(null);

  // Resolve source of truth for claims
  const manual = typeof manualClaim !== "undefined" ? manualClaim : localManual;
  const online = typeof onlineClaim !== "undefined" ? onlineClaim : localOnline;

  // Is offer within valid window and ACTIVE?
  const isOfferWindowActive = useMemo(() => {
    const now = Date.now();
    const startMs = offer.validFrom ? Date.parse(offer.validFrom) : NaN;
    const endMs = offer.validUntil ? Date.parse(offer.validUntil) : NaN;
    const startsOk = !offer.validFrom || !Number.isFinite(startMs) || startMs <= now;
    const endsOk = !offer.validUntil || !Number.isFinite(endMs) || endMs >= now;
    const statusOk = (offer.status ?? "").toUpperCase() === "ACTIVE";
    return startsOk && endsOk && statusOk;
  }, [offer.validFrom, offer.validUntil, offer.status]);

  // Also respect canClaim from server
  const isClaimable = isOfferWindowActive && !!offer.canClaim;

  // Self-fetch ONLY if parent didn't pass claims
  useEffect(() => {
    if (
      typeof manualClaim !== "undefined" ||
      typeof onlineClaim !== "undefined"
    ) {
      return; // parent controls data
    }
    let abort = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !offer.assignedOfferId) return;

      try {
        const [m, o] = await Promise.all([
          fetchActiveClaimForMe(token, offer.assignedOfferId, "MANUAL"),
          fetchActiveClaimForMe(token, offer.assignedOfferId, "ONLINE"),
        ]);
        if (abort) return;
        setLocalManual(isActiveClaim(m) ? m : null);
        setLocalOnline(isActiveClaim(o) ? o : null);
      } catch {
        // best-effort
      }
    })();
    return () => { abort = true; };
  }, [offer.assignedOfferId, manualClaim, onlineClaim]);

  const policy = offer.claimPolicy ?? "BOTH";
  const allowManual = (policy === "MANUAL" || policy === "BOTH") && isClaimable;
  const allowOnline = (policy === "ONLINE" || policy === "BOTH") && isClaimable;

  const hasManual = isActiveClaim(manual);
  const hasOnline = isActiveClaim(online);

  // ====== Generate actions ======
  const handleManualClaim = useCallback(async () => {
    // Prefer parent handler if supplied
    if (onGenerateManual) {
      const c = (await onGenerateManual()) || null;
      if (c) setLocalManual(c);
      return;
    }

    if (!offer.assignedOfferId) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

  const claim = await requestClaim(token, offer.assignedOfferId, {
  redemptionType: offer.offerType,
  expiresInMinutes: 15,
  claimSource: "MANUAL",
});

      setLocalManual(claim);
    } catch (e) {
      alert((e as Error).message || "Could not create in-store claim");
    } finally {
      setBusy(false);
    }
  }, [onGenerateManual, offer.assignedOfferId, offer.offerType]);

  const handleOnlineClaim = useCallback(async () => {
    // Prefer parent handler if supplied
    if (onGenerateOnline) {
      const c = (await onGenerateOnline()) || null;
      if (c) setLocalOnline(c);
      return;
    }

    if (!offer.assignedOfferId) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const claim = await requestClaim(token, offer.assignedOfferId, {
        redemptionType: offer.offerType,
        expiresInMinutes: 10,
        claimSource: "ONLINE",
      });

      setLocalOnline(claim);
      try {
        if (claim.discountCode) await navigator.clipboard.writeText(claim.discountCode);
      } catch {}
    } catch (e) {
      alert((e as Error).message || "Could not create online code");
    } finally {
      setBusy(false);
    }
  }, [onGenerateOnline, offer.assignedOfferId, offer.offerType]);

  // ====== Derived UI bits ======
  const qrUrl = useMemo(() => {
    if (!manual?.id) return null;
    const code = manual.discountCode ?? "";
    return `https://www.trihola.com/redeem-offer?claimId=${encodeURIComponent(manual.id)}&code=${encodeURIComponent(code)}`;
  }, [manual?.id, manual?.discountCode]);

  const onlineCode = online?.discountCode ?? null;
  const formatDate = (s?: string) =>
    s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

return (
  <div className="offer-card">
    {/* ====== HEADER + OFFER INFO ====== */}
    <div style={{ display: "grid", gap: 8 }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Gift size={18} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          {offer.offerTitle || "Offer"}
        </h3>

        {/* Status badge */}
        {offer.status && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 999,
              background:
                (offer.status ?? "").toUpperCase() === "ACTIVE"
                  ? "#10b98122"
                  : "#f59e0b22",
              color:
                (offer.status ?? "").toUpperCase() === "ACTIVE"
                  ? "#065f46"
                  : "#92400e",
              border: "1px solid #e5e7eb",
            }}
          >
            {String(offer.status).toUpperCase()}
          </span>
        )}
      </div>

      {/* What you get */}
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>What you get</div>
        <div style={{ fontWeight: 600 }}>
          {typeof offer.discountPercentage === "number"
            ? `${offer.discountPercentage}% off`
            : typeof offer.discountAmount === "number"
            ? `Flat ₹${offer.discountAmount.toLocaleString("en-IN")} off`
            : offer.offerType === "GRANT" && offer.grants?.length
            ? "Free item(s)"
            : offer.description ?? "Special offer"}
        </div>
      </div>

      {/* Validity + Claim policy */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Valid from</div>
          <div>{offer.validFrom ? formatDate(offer.validFrom) : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Valid until</div>
          <div>{offer.validUntil ? formatDate(offer.validUntil) : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>How to claim</div>
          <div>
            {(() => {
              const p = (offer.claimPolicy ?? "BOTH").toUpperCase();
              if (p === "ONLINE") return "Online code at checkout";
              if (p === "MANUAL") return "In-store QR (business scans)";
              return "In-store QR or Online code";
            })()}
          </div>
        </div>
      </div>

      {/* Applies (merged Scope) */}
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Applies</div>

        {offer.appliesToType === "ANY_PURCHASE" && (
          <div style={{ fontWeight: 500 }}>Any purchase</div>
        )}

        {offer.appliesToType === "PRODUCT" && offer.appliesProduct && (
          <button
            type="button"
            className="th-item-row btn--ghost"
            onClick={() => {
              const p = offer.appliesProduct!;
              if (p.businessSlug && p.slug) {
                navigate(`/${p.businessSlug}/${p.slug}`);
              } else {
                navigate(`/products/${p.id}`);
              }
            }}
            style={{ textAlign: "left", marginTop: 4, width: "100%" }}
          >
            <div className="th-thumb-64">
              {offer.appliesProduct.primaryImageUrl ? (
                <img
                  className="img-cover"
                  src={offer.appliesProduct.primaryImageUrl!}
                  alt=""
                />
              ) : (
                <div className="th-placeholder" />
              )}
            </div>
            <div>
              <div className="th-card-title">{offer.appliesProduct.name}</div>
              <div className="th-card-sub">Click to view product</div>
            </div>
          </button>
        )}

        {offer.appliesToType === "BUNDLE" && offer.appliesBundle && (
          <button
            type="button"
            className="th-item-row btn--ghost"
            onClick={() => {
              const b = offer.appliesBundle!;
              if (b.businessSlug && b.slug) {
                navigate(`/${b.businessSlug}/bundles/${b.slug}`);
              } else {
                navigate(`/bundles/${b.id}`);
              }
            }}
            style={{ textAlign: "left", marginTop: 4, width: "100%" }}
          >
            <div className="th-thumb-64">
              {offer.appliesBundle.primaryImageUrl ? (
                <img
                  className="img-cover"
                  src={offer.appliesBundle.primaryImageUrl!}
                  alt=""
                />
              ) : (
                <div className="th-placeholder" />
              )}
            </div>
            <div>
              <div className="th-card-title">{offer.appliesBundle.title}</div>
              <div className="th-card-sub">Click to view bundle</div>
            </div>
          </button>
        )}
      </div>

      {/* Minimum purchase */}
      {typeof offer.minPurchaseAmount === "number" && (
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Minimum purchase</div>
          <div>₹{offer.minPurchaseAmount.toLocaleString("en-IN")}</div>
        </div>
      )}

      {/* Redemptions summary */}
      {typeof offer.redemptionsUsed === "number" &&
        typeof offer.effectiveMaxRedemptions === "number" && (
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Redemptions</div>
            <div>
              {offer.redemptionsUsed} / {offer.effectiveMaxRedemptions}
              {typeof offer.redemptionsLeft === "number"
                ? ` · Left: ${offer.redemptionsLeft}`
                : ""}
            </div>
          </div>
        )}

      {/* Optional details */}
      {offer.description && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          <strong>Details:</strong> {offer.description}
        </div>
      )}
    </div>

    {/* ====== CLAIM AREA (buttons + active displays) ====== */}
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      {/* MANUAL: show QR if active */}
      {hasManual && qrUrl && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Your In-Store Claim (QR)</div>
          <QRCodeCanvas value={qrUrl} size={180} />
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
            Expires: {formatDate(manual?.expiresAt)}
          </div>
        </div>
      )}

      {/* ONLINE: show code if active */}
      {hasOnline && onlineCode && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Your Online Code</div>
          <div
            style={{
              fontFamily: "monospace",
              padding: "6px 10px",
              background: "#f3f4f6",
              borderRadius: 6,
              display: "inline-block",
            }}
          >
            {onlineCode}
          </div>
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
            Expires: {formatDate(online?.expiresAt)}
          </div>
        </div>
      )}

      {/* Guidance when not claimable */}
      {!isClaimable && (
        <div style={{ color: "#9ca3af", fontSize: 13 }}>
          This offer isn’t currently claimable (outside validity window, inactive, or restricted).
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Generate QR — in-store redemption */}
        {allowManual && !hasManual && (
          <button
            disabled={busy}
            onClick={handleManualClaim}
            className="btn"
            title="Create a time-limited QR that the business scans to approve your redemption at the counter."
            aria-label="Generate QR for in-store redemption"
            style={{ background: "#111827", color: "#fff", padding: "6px 10px", borderRadius: 6 }}
          >
            🧾 Generate QR (in-store)
          </button>
        )}

        {/* Generate Code — online checkout */}
        {allowOnline && !hasOnline && (
          <button
            disabled={busy}
            onClick={handleOnlineClaim}
            className="btn"
            title="Create a time-limited coupon code to paste at online checkout."
            aria-label="Generate one-time online coupon code"
            style={{ background: "#2563eb", color: "#fff", padding: "6px 10px", borderRadius: 6 }}
          >
            🔐 Generate Code (online)
          </button>
        )}
      </div>

      {/* Small helper text */}
      {isClaimable && (allowManual || allowOnline) && (!hasManual || !hasOnline) && (
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          • <strong>Generate QR (in-store)</strong>: shows a QR for the business to scan and approve on the spot.
          <br />
          • <strong>Generate Code (online)</strong>: gives you a one-time code to apply at checkout.
        </div>
      )}
    </div>

      {/* If a claim is approved and it carries grants, list what was fulfilled */}
      <div className="th-vlist">
        {(manual?.grants ?? online?.grants ?? []).map((g, idx) => {
          if (g.itemType === "PRODUCT" && g.product) {
            const p = g.product;
            const go = () => {
              if (p.businessSlug && p.slug) navigate(`/business/${p.businessSlug}/products/${p.slug}`);
              else navigate(`/products/${p.id}`);
            };
            return (
              <button key={idx} type="button" className="th-item-row btn--ghost" onClick={go} style={{ textAlign: "left" }}>
                <div className="th-thumb-64">
                  {p.primaryImageUrl ? <img className="img-cover" src={p.primaryImageUrl} alt="" /> : <div className="th-placeholder" />}
                </div>
                <div>
                  <div className="th-card-title">
                    Product — {p.name}{typeof g.quantity === "number" ? ` × ${g.quantity}` : ""}
                  </div>
                  <div className="th-card-sub">Fulfilled with this claim</div>
                </div>
              </button>
            );
          }

          if (g.itemType === "BUNDLE" && g.bundle) {
            const b = g.bundle;
            const go = () => {
              if (b.businessSlug && b.slug) navigate(`/business/${b.businessSlug}/bundles/${b.slug}`);
              else navigate(`/bundles/${b.id}`);
            };
            return (
              <button key={idx} type="button" className="th-item-row btn--ghost" onClick={go} style={{ textAlign: "left" }}>
                <div className="th-thumb-64">
                  {b.primaryImageUrl ? <img className="img-cover" src={b.primaryImageUrl} alt="" /> : <div className="th-placeholder" />}
                </div>
                <div>
                  <div className="th-card-title">
                    Bundle — {b.title}{typeof g.quantity === "number" ? ` × ${g.quantity}` : ""}
                  </div>
                  <div className="th-card-sub">Fulfilled with this claim</div>
                </div>
              </button>
            );
          }

          return null;
        })}
      </div>

      
    {/* ====== GRANTS (optional) ====== */}
    {offer.grants?.length > 0 && (
      <div className="card card--form" style={{ marginTop: 12 }}>
        <h3 className="card__title" style={{ marginBottom: 8 }}>Grant</h3>
        <div className="th-vlist">
          {offer.grants.map((g, idx) => {
            const isP = g.itemType === "PRODUCT";
            const target = isP ? g.product : g.bundle;
            if (!target) return null;

            const title = isP ? (target as any).name : (target as any).title;
            const img = (target as any).primaryImageUrl;

            const go = () => {
              if (isP) {
                const p = target as any as { id: string; slug?: string; businessSlug?: string | null };
                if (p.businessSlug && p.slug) navigate(`/${p.businessSlug}/${p.slug}`);
                else navigate(`/products/${p.id}`);
              } else {
                const b = target as any as { id: string; slug?: string; businessSlug?: string | null };
                if (b.businessSlug && b.slug) navigate(`/${b.businessSlug}/bundles/${b.slug}`);
                else navigate(`/bundles/${b.id}`);
              }
            };

            return (
              <button key={idx} type="button" className="th-item-row btn--ghost" onClick={go} style={{ textAlign: "left" }}>
                <div className="th-thumb-64">
                  {img ? <img className="img-cover" src={img} alt="" /> : <div className="th-placeholder" />}
                </div>
                <div>
                  <div className="th-card-title">
                    {isP ? "Product" : "Bundle"} — {title}
                    {typeof g.quantity === "number" ? ` × ${g.quantity}` : ""}
                  </div>
                  <div className="th-card-sub">Click to open {isP ? "product" : "bundle"}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
};

export default OfferCard;
