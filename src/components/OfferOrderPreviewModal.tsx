import { useEffect, useMemo, useState } from "react";
import type { AssignedOfferDetailsDTO } from "../types/offerDetailsTypes";
import "../css/new-chat-drawer.css";
import "../css/CreateOrderModal.css";
import "../css/OfferOrderPreviewModal.css";

type AuthResult = { token: string; userId: string } | null;

type Props = {
  open: boolean;
  offer: AssignedOfferDetailsDTO | null;
  threadId: string;
  businessId?: string | null;
  getAuth: () => Promise<AuthResult>;
  onClose: () => void;
  onUseDraft: (draft: OfferOrderPreviewDraftPayloadDTO) => void;
};

type OfferOrderPreviewSelectedGrantInput = {
  itemType: string;
  productId?: string | null;
  bundleId?: string | null;
  quantity: number;
};

type OfferOrderPreviewScopeAmountInput = {
  scopeItemRef: string;
  label?: string | null;
  amount: string;
};

type PreviewRequest = {
  threadId: string;
  notes?: string | null;
  orderDate?: string | null;
  currencyCode: string;
  totalAmount?: string | null;
  scopedAmounts: OfferOrderPreviewScopeAmountInput[];
  outOfScopeAmount?: string | null;
  selectedGrants: OfferOrderPreviewSelectedGrantInput[];
};

export type OfferOrderPreviewDraftItemDTO = {
  label: string;
  quantity: number;
  unitAmount: string;
  lineAmount: string;
  productId?: string | null;
  bundleId?: string | null;
  sortOrder: number;
  notes?: string | null;
  inScope: boolean;
};

export type OfferOrderPreviewDraftPayloadDTO = {
  threadId: string;
  businessId: string;
  recipientIdentityType: string;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  currencyCode: string;
  grossAmount: string;
  inScopeAmount?: string | null;
  discountAmount: string;
  finalAmount: string;
  assignedOfferId?: string | null;
  offerSelectionMode: string;
  notes?: string | null;
  orderDate?: string | null;
  items: OfferOrderPreviewDraftItemDTO[];
};

type PreviewOptionDTO = {
  assignedOfferId: string;
  offerTemplateId: string;
  offerTitle: string;
  description?: string | null;
  offerType: string;
  claimPolicy?: string | null;
  scopeKind: string;
  scopeItems: Array<{
    itemType: string;
    product?: { id: string; name?: string | null; title?: string | null } | null;
    bundle?: { id: string; title?: string | null; name?: string | null } | null;
  }>;
  selectedGrants?: OfferOrderPreviewSelectedGrantInput[];
  validFrom?: string | null;
  validUntil?: string | null;
  redemptionsUsed: number;
  effectiveMaxRedemptions?: number | null;
  redemptionsLeft?: number | null;
  requiresManualInScopeAmount: boolean;
  isEligible: boolean;
  skipReason?: string | null;
  computedInScopeAmount?: string | null;
  discountAmount: string;
  finalAmount: string;
  isBest: boolean;
};

type PreviewResponse = {
  assignedOfferId: string;
  isEligible: boolean;
  requiresManualInScopeAmount: boolean;
  skipReason?: string | null;
  warnings: string[];
  grossAmount: string;
  computedInScopeAmount?: string | null;
  discountAmount: string;
  finalAmount: string;
  option?: PreviewOptionDTO | null;
  draftPayload?: OfferOrderPreviewDraftPayloadDTO | null;
};

type ScopeRowState = {
  ref: string;
  label: string;
  amount: string;
};

type GrantSelectionState = {
  key: string;
  itemType: string;
  productId?: string | null;
  bundleId?: string | null;
  label: string;
  defaultQuantity: number;
  selected: boolean;
  quantity: string;
};

function todayInputValue(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseAmount(value?: string | null): number {
  if (!value) return 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyString(value: string | number): string {
  const n = typeof value === "number" ? value : parseAmount(value);
  return n.toFixed(2);
}

function formatMoney(value?: string | number | null): string {
  const n =
    typeof value === "number"
      ? value
      : value == null
        ? 0
        : Number(String(value).replace(/,/g, "").trim());

  const safe = Number.isFinite(n) ? n : 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(safe);
}

function titleCaseToken(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function scopeItemLabel(
  item: NonNullable<AssignedOfferDetailsDTO["scopeItems"]>[number]
): { ref: string; label: string } | null {
  if (item.itemType === "PRODUCT" && item.product?.id) {
    return {
      ref: item.product.id,
      label: item.product.name || "Product",
    };
  }
  if (item.itemType === "BUNDLE" && item.bundle?.id) {
    return {
      ref: item.bundle.id,
      label: item.bundle.title || "Bundle",
    };
  }
  return null;
}

function grantLabel(
  grant: NonNullable<AssignedOfferDetailsDTO["grants"]>[number],
  index: number
): GrantSelectionState | null {
  if (grant.itemType === "PRODUCT" && grant.product?.id) {
    return {
      key: `PRODUCT:${grant.product.id}:${index}`,
      itemType: "PRODUCT",
      productId: grant.product.id,
      bundleId: null,
      label: grant.product.name || "Product",
      defaultQuantity: Math.max(1, Number(grant.quantity ?? 1)),
      selected: false,
      quantity: String(Math.max(1, Number(grant.quantity ?? 1))),
    };
  }

  if (grant.itemType === "BUNDLE" && grant.bundle?.id) {
    return {
      key: `BUNDLE:${grant.bundle.id}:${index}`,
      itemType: "BUNDLE",
      productId: null,
      bundleId: grant.bundle.id,
      label: grant.bundle.title || "Bundle",
      defaultQuantity: Math.max(1, Number(grant.quantity ?? 1)),
      selected: false,
      quantity: String(Math.max(1, Number(grant.quantity ?? 1))),
    };
  }

  return null;
}

export default function OfferOrderPreviewModal({
  open,
  offer,
  threadId,
  businessId,
  getAuth,
  onClose,
  onUseDraft,
}: Props) {
  const [orderDate, setOrderDate] = useState<string>(todayInputValue());
  const [notes, setNotes] = useState<string>("");

  const [totalAmount, setTotalAmount] = useState<string>("");
  const [outOfScopeAmount, setOutOfScopeAmount] = useState<string>("");

  const [scopeRows, setScopeRows] = useState<ScopeRowState[]>([]);
  const [grantRows, setGrantRows] = useState<GrantSelectionState[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const hasListScope = String(offer?.scopeKind ?? "ANY").toUpperCase() === "LIST";
  const hasGrants = (offer?.grants?.length ?? 0) > 0;
  const isGrantOffer = String(offer?.offerType ?? "").toUpperCase() === "GRANT";

  const grantPickLimit = Math.max(
    1,
    Number(offer?.grantPickLimit ?? offer?.grants?.length ?? 1)
  );

  useEffect(() => {
    if (!open || !offer) return;

    setOrderDate(todayInputValue());
    setNotes("");
    setTotalAmount("");
    setOutOfScopeAmount("");
    setErrorMessage("");
    setPreview(null);
    setSubmitting(false);

    const initialScopeRows =
      offer.scopeItems
        ?.map(scopeItemLabel)
        .filter(Boolean)
        .map((item) => ({
          ref: item!.ref,
          label: item!.label,
          amount: "",
        })) ?? [];

    const initialGrantRows =
      offer.grants
        ?.map(grantLabel)
        .filter(Boolean)
        .map((g) => g!) ?? [];

    setScopeRows(initialScopeRows);
    setGrantRows(initialGrantRows);
  }, [open, offer]);

  const selectedGrantCount = useMemo(() => {
    return grantRows.filter((g) => g.selected).length;
  }, [grantRows]);

  const selectedGrantsPayload = useMemo<OfferOrderPreviewSelectedGrantInput[]>(() => {
    return grantRows
      .filter((g) => g.selected)
      .map((g) => ({
        itemType: g.itemType,
        productId: g.productId ?? null,
        bundleId: g.bundleId ?? null,
        quantity: Math.max(1, Number(g.quantity || "1")),
      }));
  }, [grantRows]);

  const scopedAmountsPayload = useMemo<OfferOrderPreviewScopeAmountInput[]>(() => {
    return scopeRows
      .filter((row) => parseAmount(row.amount) > 0)
      .map((row) => ({
        scopeItemRef: row.ref,
        label: row.label,
        amount: moneyString(row.amount),
      }));
  }, [scopeRows]);

  const localComputedGross = useMemo(() => {
    if (!hasListScope) {
      return parseAmount(totalAmount);
    }

    const inScope = scopeRows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
    const extra = parseAmount(outOfScopeAmount);
    return inScope + extra;
  }, [hasListScope, totalAmount, scopeRows, outOfScopeAmount]);

  const inScopeEnteredAmount = useMemo(() => {
    return scopeRows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
  }, [scopeRows]);

  const canPreview = useMemo(() => {
    if (!offer?.assignedOfferId) return false;
    if (!threadId) return false;
    if (!orderDate) return false;

    if (hasListScope) {
      const anyScoped = scopeRows.some((row) => parseAmount(row.amount) > 0);
      const extra = parseAmount(outOfScopeAmount) > 0;
      if (!anyScoped && !extra) return false;
    } else {
      if (parseAmount(totalAmount) <= 0) return false;
    }

    if (hasGrants) {
      if (selectedGrantCount > grantPickLimit) return false;
      if (isGrantOffer && selectedGrantCount === 0) return false;
    }

    return true;
  }, [
    offer,
    threadId,
    orderDate,
    hasListScope,
    scopeRows,
    outOfScopeAmount,
    totalAmount,
    hasGrants,
    selectedGrantCount,
    grantPickLimit,
    isGrantOffer,
  ]);

  async function handlePreview() {
    if (!offer?.assignedOfferId) return;

    try {
      setSubmitting(true);
      setErrorMessage("");
      setPreview(null);

      const auth = await getAuth();
      if (!auth?.token) {
        setErrorMessage("Not authenticated");
        return;
      }

      const body: PreviewRequest = {
        threadId,
        notes: notes.trim() || null,
        orderDate,
        currencyCode: "INR",
        totalAmount: hasListScope ? null : moneyString(totalAmount),
        scopedAmounts: hasListScope ? scopedAmountsPayload : [],
        outOfScopeAmount: hasListScope ? moneyString(outOfScopeAmount || "0") : null,
        selectedGrants: selectedGrantsPayload,
      };

      const API_BASE_URL = __API_BASE__;

      const response = await fetch(
        `${API_BASE_URL}/offers/${offer.assignedOfferId}/order-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
            ...(businessId ? { "X-Acting-Business-Id": businessId } : {}),
          },
          body: JSON.stringify(body),
        }
      );
      
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to preview order from this offer."
        );
      }

      setPreview(data as PreviewResponse);
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Failed to preview order");
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue() {
    if (!preview?.draftPayload) return;
    onUseDraft(preview.draftPayload);
  }

  function toggleGrant(key: string, nextSelected: boolean) {
    setGrantRows((current) => {
      const currentSelectedCount = current.filter((row) => row.selected).length;

      if (
        nextSelected &&
        currentSelectedCount >= grantPickLimit &&
        !current.find((row) => row.key === key)?.selected
      ) {
        return current;
      }

      return current.map((row) =>
        row.key === key ? { ...row, selected: nextSelected } : row
      );
    });
  }

  function setGrantQuantity(key: string, quantity: string) {
    setGrantRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, quantity } : row
      )
    );
  }

  function setScopeAmount(ref: string, amount: string) {
    setScopeRows((current) =>
      current.map((row) =>
        row.ref === ref ? { ...row, amount } : row
      )
    );
  }

  function getPreviewItemLabel(item: OfferOrderPreviewDraftItemDTO): string {
    if (!item.inScope) {
      if (item.productId) {
        const matchedGrant = grantRows.find((g) => g.productId === item.productId);
        if (matchedGrant?.label) return matchedGrant.label;
      }

      if (item.bundleId) {
        const matchedGrant = grantRows.find((g) => g.bundleId === item.bundleId);
        if (matchedGrant?.label) return matchedGrant.label;
      }
    }

    return item.label;
  }

  if (!open || !offer) return null;

  const offerValue =
    offer.offerType === "PERCENTAGE_DISCOUNT" && offer.discountPercentage != null
      ? `${offer.discountPercentage}% OFF`
      : offer.offerType === "FIXED_DISCOUNT" && offer.discountAmount != null
        ? formatMoney(offer.discountAmount)
        : "Grant";

  const showStructuredHint = hasListScope || isGrantOffer;

  const previewItems = preview?.draftPayload?.items ?? [];

  return (
    <div className="create-order-modal-backdrop" onClick={onClose}>
      <div
        className="create-order-modal offer-preview-modal-shell"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-order-preview-title"
      >
        <div className="create-order-modal-header">
          <div className="create-order-modal-title-wrap">
            <h2 id="offer-order-preview-title">Use Offer</h2>
            <p className="create-order-modal-subtitle">
              Build an order from this offer, preview it, then continue with a prefilled draft.
            </p>
          </div>

          <div className="create-order-modal-header-right">
            <label className="create-order-header-date">
              <span>Order date</span>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                disabled={submitting}
              />
            </label>

            <button
              type="button"
              className="create-order-modal-close"
              onClick={onClose}
              disabled={submitting}
            >
              ×
            </button>
          </div>
        </div>

        <div className="create-order-modal-form th-form offer-preview-shell-form">
          <section className="th-section create-order-section offer-preview-hero-card">
            <div className="offer-preview-hero-top">
              <div className="offer-preview-hero-copy">
                <div className="offer-preview-eyebrow">
                  {offer.businessName || "Business"}
                </div>
                <h3 className="offer-preview-title">{offer.offerTitle}</h3>
                {offer.description ? (
                  <p className="offer-preview-description">{offer.description}</p>
                ) : null}
              </div>

              <div className="offer-preview-value-block">
                <div className="offer-preview-value-label">Offer</div>
                <div className="offer-preview-value">{offerValue}</div>
              </div>
            </div>

            <div className="offer-preview-meta-grid">
              <div className="offer-preview-meta-item">
                <span className="offer-preview-meta-label">Scope</span>
                <strong className="offer-preview-meta-value">
                  {titleCaseToken(offer.scopeKind ?? "ANY")}
                </strong>
              </div>

              {offer.minPurchaseAmount != null ? (
                <div className="offer-preview-meta-item">
                  <span className="offer-preview-meta-label">Minimum purchase</span>
                  <strong className="offer-preview-meta-value">
                    {formatMoney(offer.minPurchaseAmount)}
                  </strong>
                </div>
              ) : null}

              {offer.redemptionsLeft != null ? (
                <div className="offer-preview-meta-item">
                  <span className="offer-preview-meta-label">Remaining</span>
                  <strong className="offer-preview-meta-value">
                    {offer.redemptionsLeft}
                  </strong>
                </div>
              ) : null}

              {hasGrants ? (
                <div className="offer-preview-meta-item">
                  <span className="offer-preview-meta-label">Grant picks</span>
                  <strong className="offer-preview-meta-value">
                    Up to {grantPickLimit}
                  </strong>
                </div>
              ) : null}
            </div>
          </section>

          <div className="offer-preview-shell">
            <div className="offer-preview-left">
              <section className="th-section create-order-section offer-preview-card">
                <div className="th-section-header create-order-section-header">
                  <div>
                    <h3 className="th-section-title">Order details</h3>
                    {showStructuredHint ? (
                      <div className="offer-preview-structured-hint">
                        This offer builds a structured order with generated line items.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="offer-preview-details-grid">
                  <div className="offer-preview-details-main">
                    <label className="th-field create-order-field create-order-field-full">
                      <span className="th-label">Title / note</span>
                      <input
                        className="th-input"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Eg. April purchase, Salon visit, Consultation package"
                        disabled={submitting}
                      />
                    </label>

                    {!hasListScope ? (
                      <label className="th-field create-order-field create-order-field-full">
                        <span className="th-label">
                          {isGrantOffer ? "Purchase amount" : "Total amount"}
                        </span>
                        <input
                          className="th-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          placeholder="Enter amount"
                          disabled={submitting}
                        />
                      </label>
                    ) : (
                      <label className="th-field create-order-field create-order-field-full">
                        <span className="th-label">Out-of-scope amount</span>
                        <input
                          className="th-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={outOfScopeAmount}
                          onChange={(e) => setOutOfScopeAmount(e.target.value)}
                          placeholder="Optional"
                          disabled={submitting}
                        />
                      </label>
                    )}

                    {hasListScope ? (
                      <div className="th-field create-order-field create-order-field-full">
                        <span className="th-label">Eligible scoped amounts</span>
                        <div className="offer-preview-scope-grid">
                          {scopeRows.map((row) => (
                            <div key={row.ref} className="offer-preview-scope-card">
                              <div className="offer-preview-scope-card-title">
                                {row.label}
                              </div>

                              <label className="offer-preview-scope-card-inputWrap">
                                <span className="offer-preview-scope-card-inputLabel">
                                  Amount
                                </span>
                                <input
                                  className="th-input offer-preview-scope-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.amount}
                                  onChange={(e) => setScopeAmount(row.ref, e.target.value)}
                                  placeholder="Amount"
                                  disabled={submitting}
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {hasGrants ? (
                      <div className="th-field create-order-field create-order-field-full">
                        <div className="offer-preview-inline-header">
                          <span className="th-label">
                            {isGrantOffer ? "Choose grant item(s)" : "Select included items"}
                          </span>
                          <span className="offer-preview-inline-meta">
                            Select up to {grantPickLimit}
                          </span>
                        </div>

                        <div className="offer-preview-grant-grid">
                          {grantRows.map((grant) => {
                            const disabled =
                              submitting ||
                              (!grant.selected && selectedGrantCount >= grantPickLimit);

                            return (
                              <label
                                key={grant.key}
                                className={`offer-preview-grant-card ${
                                  grant.selected ? "is-selected" : ""
                                }`}
                              >
                                <span className="offer-preview-grant-check">
                                  <input
                                    type="checkbox"
                                    checked={grant.selected}
                                    onChange={(e) => toggleGrant(grant.key, e.target.checked)}
                                    disabled={disabled}
                                  />
                                </span>

                                <div className="offer-preview-grant-copy">
                                  <div className="offer-preview-grant-title">{grant.label}</div>
                                  <div className="offer-preview-grant-subtitle">
                                    {titleCaseToken(grant.itemType)}
                                  </div>
                                </div>

                                <input
                                  className="th-input offer-preview-grant-qty"
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={grant.quantity}
                                  onChange={(e) => setGrantQuantity(grant.key, e.target.value)}
                                  disabled={submitting || !grant.selected}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <div className="offer-preview-right">
              <section className="th-section create-order-section offer-preview-summary-panel">
                <div className="th-section-header create-order-section-header">
                  <h3 className="th-section-title">Preview</h3>
                </div>

                <div className="offer-preview-summary-grid">
                  <div className="offer-preview-summary-card">
                    <span className="offer-preview-summary-label">Gross</span>
                    <strong className="offer-preview-summary-value">
                      {formatMoney(localComputedGross)}
                    </strong>
                  </div>

                  <div className="offer-preview-summary-card">
                    <span className="offer-preview-summary-label">In scope</span>
                    <strong className="offer-preview-summary-value">
                      {formatMoney(preview?.computedInScopeAmount ?? inScopeEnteredAmount)}
                    </strong>
                  </div>

                  <div className="offer-preview-summary-card">
                    <span className="offer-preview-summary-label">Discount</span>
                    <strong className="offer-preview-summary-value">
                      {formatMoney(preview?.discountAmount ?? 0)}
                    </strong>
                  </div>

                  <div className="offer-preview-summary-card offer-preview-summary-card--final">
                    <span className="offer-preview-summary-label">Payable</span>
                    <strong className="offer-preview-summary-value offer-preview-summary-value--final">
                      {formatMoney(preview?.finalAmount ?? localComputedGross)}
                    </strong>
                  </div>
                </div>

                {(() => {
                  const warningMessages = (preview?.warnings ?? [])
                    .map((msg) => String(msg ?? "").trim())
                    .filter(Boolean);

                  const skipReasonMessage = String(preview?.skipReason ?? "").trim();

                  const seen = new Set<string>();
                  const combinedMessages: Array<{ text: string; tone: "warn" | "neutral" }> = [];

                  for (const warning of warningMessages) {
                    const key = warning.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    combinedMessages.push({ text: warning, tone: "warn" });
                  }

                  if (skipReasonMessage) {
                    const key = skipReasonMessage.toLowerCase();
                    if (!seen.has(key)) {
                      combinedMessages.push({
                        text: skipReasonMessage,
                        tone: "neutral",
                      });
                    }
                  }

                  if (!combinedMessages.length) return null;

                  return (
                    <div className="offer-preview-message-stack">
                      {combinedMessages.map((message, index) => (
                        <div
                          key={`${message.tone}-${index}-${message.text}`}
                          className={
                            message.tone === "warn"
                              ? "offer-preview-note offer-preview-note--warn"
                              : "offer-preview-note offer-preview-note--neutral"
                          }
                        >
                          {message.text}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {previewItems.length ? (
                  <>
                    <div className="offer-preview-items-heading">
                      Items ({previewItems.length})
                    </div>

                    <div className="offer-preview-draft-list">
                      {previewItems.map((item, index) => (
                        <div
                          key={`${item.label}-${index}`}
                          className={`offer-preview-draft-row ${
                            item.inScope ? "is-inscope" : ""
                          }`}
                        >
                          <div className="offer-preview-draft-main">
                            <span className="offer-preview-draft-title">
                              {getPreviewItemLabel(item)}
                            </span>
                            <span className="offer-preview-draft-divider">·</span>
                            <span className="offer-preview-draft-qty">
                              {item.quantity} unit{item.quantity === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="offer-preview-draft-amount">
                            {formatMoney(item.lineAmount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="offer-preview-empty">
                    Preview once to see the generated order items here.
                  </div>
                )}
              </section>
            </div>
          </div>

          {!!errorMessage && <div className="create-order-error">{errorMessage}</div>}

          <div className="create-order-footer th-actions">
            <button
              type="button"
              className="btn btn--ghost create-order-secondary-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn--ghost create-order-secondary-btn"
              onClick={handlePreview}
              disabled={!canPreview || submitting}
            >
              {submitting ? "Previewing..." : "Preview"}
            </button>

            <button
              type="button"
              className="btn btn--primary create-order-primary-btn"
              onClick={handleContinue}
              disabled={!preview?.isEligible || !preview?.draftPayload || submitting}
            >
              Continue to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}