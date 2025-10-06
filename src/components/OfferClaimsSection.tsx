import React, { useId, useState } from "react";
import {OfferClaimView } from "../types/offer";
import "../css/cards.css";
import "../css/ui-forms.css";


/** —— helpers —— */
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
};

const showSecondRow = (status: string) => {
  const s = status?.toUpperCase();
  return s === "APPROVED" || s === "REDEEMED" || s === "REJECTED";
};

const ClaimCard: React.FC<{ c: OfferClaimView }> = ({ c }) => {
  const showDiscount =
    c.redemptionType === "DISCOUNT" && (c.redemptionValue ?? "") !== "";
  const showGrants =
    c.redemptionType === "GRANT" &&
    Array.isArray(c.grantItems) &&
    c.grantItems.length > 0;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      {/* Row 1: 4 columns (always) */}
      <div className="kv-grid-4">
        <div className="kv-item">
          <div className="kv-label">Claimed At</div>
          <div className="kv-value">{fmt(c.claimedAt)}</div>
        </div>
        <div className="kv-item">
          <div className="kv-label">Source</div>
          <div className="kv-value">{c.source}</div>
        </div>
        <div className="kv-item">
          <div className="kv-label">Discount Code</div>
          <div className="kv-value">{c.discountCode ?? "—"}</div>
        </div>
        <div className="kv-item">
          <div className="kv-label">Status</div>
          <div className="kv-value">{c.status}</div>
        </div>
      </div>

      {showSecondRow(c.status) && <div className="divider" />}

      {/* Row 2: 4 columns; Note spans 2 columns */}
      {showSecondRow(c.status) && (
        <div className="kv-grid-4">
          <div className="kv-item">
            <div className="kv-label">Redeemed At</div>
            <div className="kv-value">{fmt(c.redeemedAt)}</div>
          </div>

          <div className="kv-item">
            <div className="kv-label">Redemption Value</div>
            <div className="kv-value">
              {showDiscount && <>{c.redemptionValue}</>}
              {showGrants &&
                c.grantItems!.map((gi, i) => (
                  <div key={i}>
                    {gi.quantity} Free{" "}
                    {gi.product?.name ?? gi.title ?? gi.bundleTitle ?? "Item"}
                  </div>
                ))}
              {!showDiscount && !showGrants && <>—</>}
            </div>
          </div>

          <div className="kv-item span-2">
            <div className="kv-label">Note</div>
            <div className="kv-value">{c.note ?? "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const isArchived = (status: string) => status !== "PENDING";

/** —— main section with collapsible archived list —— */
const OfferClaimsSection: React.FC<{ claims: OfferClaimView[] }> = ({ claims }) => {
  if (!claims || claims.length === 0) return null;

  const current = claims.filter((c) => !isArchived(c.status));
  const archived = claims.filter((c) => isArchived(c.status));

  const [open, setOpen] = useState(false); // collapsed by default
  const panelId = useId();

  return (
    <section style={{ marginTop: 16 }}>
      {current.length > 0 && (
        <>
          <h3 className="section-title">Current Claim</h3>
          {current.map((c) => (
            <ClaimCard key={c.id} c={c} />
          ))}
        </>
      )}

      {archived.length > 0 && (
        <>
          <div className="collapse-header">
            <button
              type="button"
              className="collapse-toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              <span>Archived Claims ({archived.length})</span>
              <span className={`chev ${open ? "open" : ""}`} aria-hidden />
            </button>
          </div>

          <div id={panelId} className={`collapse ${open ? "open" : ""}`}>
            {archived.map((c) => (
              <ClaimCard key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default OfferClaimsSection;
