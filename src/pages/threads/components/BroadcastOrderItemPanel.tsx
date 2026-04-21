import { useEffect, useMemo, useState } from "react";
import DrawerSubmodal from "./DrawerSubModal";
import PaymentInstructionsModal from "../../../components/PaymentInstructionsModal";
import OrderItemizationModal from "../../../components/OrderItemizationModal";

import type { BroadcastOrderItemDraft } from "../../../types/broadcasts";
import type { CreateOrderItemRequest } from "../../../types/orderTypes";
import type { PaymentInstructionsDraft } from "../../../types/paymentInstruction";

import {
  createEmptyPaymentInstructionsDraft,
  parsePaymentInstructionsJson,
  draftFromPaymentInstructionsJson,
  paymentInstructionsJsonFromDraft,
  serializePaymentInstructions,
} from "../../../types/paymentInstruction";

import "../../../css/form.css";
import "../../../css/add-referral-cta.css";
import "../../../css/thread-page.css";
import "../../../css/broadcast-composer.css";

type OrderCatalogOption = {
  id: string;
  label: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialValue: BroadcastOrderItemDraft | null;
  onSave: (item: BroadcastOrderItemDraft) => void;
  title?: string;
  userId: string;
  productOptions?: OrderCatalogOption[];
  bundleOptions?: OrderCatalogOption[];
};

type OrderItemEditorDraft = {
  id: string;
  label: string;
  quantity: number;
  unitAmount: string;
  lineAmount: string;
  notes: string;
  productId?: string | null;
  bundleId?: string | null;
  showAdvanced?: boolean;
};

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function makeItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `order-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeEmptyItem(): OrderItemEditorDraft {
  return {
    id: makeItemId(),
    label: "",
    quantity: 1,
    unitAmount: "",
    lineAmount: "",
    notes: "",
    productId: null,
    bundleId: null,
    showAdvanced: false,
  };
}

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function parseAmount(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function sanitizeItems(items: OrderItemEditorDraft[]): CreateOrderItemRequest[] {
  return items
    .filter((item) => clean(item.label) && parseAmount(item.lineAmount) > 0)
    .map((item, index) => ({
      label: clean(item.label),
      quantity: Math.max(1, Number(item.quantity || 1)),
      unitAmount: clean(item.unitAmount) || "0.00",
      lineAmount: clean(item.lineAmount) || "0.00",
      productId: item.productId || null,
      bundleId: item.bundleId || null,
      sortOrder: index,
      notes: clean(item.notes) || null,
    }));
}

function getPaymentInstructionsSummary(draft: PaymentInstructionsDraft): string {
  const count = draft.entries?.length ?? 0;
  const hasText = !!draft.text?.trim();

  if (count === 0 && !hasText) return "No payment instructions added";
  if (count === 0 && hasText) return "Intro text added";
  if (count === 1 && hasText) return "1 method + intro";
  if (count === 1) return "1 payment method";
  return hasText ? `${count} methods + intro` : `${count} payment methods`;
}

function getPaymentInstructionsStatus(draft: PaymentInstructionsDraft): string {
  const count = draft.entries?.length ?? 0;
  const hasText = !!draft.text?.trim();

  if (count === 0 && !hasText) return "Not added";
  if (count === 0 && hasText) return "Intro only";
  if (count === 1) return "1 method";
  return `${count} methods`;
}

export default function BroadcastOrderItemPanel({
  open,
  onClose,
  initialValue,
  onSave,
  title = "Order details",
  userId,
  productOptions = [],
  bundleOptions = [],
}: Props) {
  const [itemized, setItemized] = useState(false);
  const [grossAmount, setGrossAmount] = useState("");
  const [orderTitle, setOrderTitle] = useState("");

  const [paymentInstructionsDraft, setPaymentInstructionsDraft] =
    useState<PaymentInstructionsDraft>(createEmptyPaymentInstructionsDraft());

  const [paymentInstructionsModalOpen, setPaymentInstructionsModalOpen] =
    useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [items, setItems] = useState<OrderItemEditorDraft[]>([makeEmptyItem()]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const incomingItems = Array.isArray(initialValue?.items)
      ? initialValue.items
      : [];

    const parsedJson = parsePaymentInstructionsJson(
      initialValue?.paymentInstructionsJson
    );

    setItemized(incomingItems.length > 0);
    setGrossAmount(initialValue?.grossAmount ?? "");
    setOrderTitle(initialValue?.notes ?? "");

    setPaymentInstructionsDraft(
      draftFromPaymentInstructionsJson(parsedJson)
    );

    setItems(
      incomingItems.length > 0
        ? incomingItems.map((item, index) => ({
            id: `existing-${index}-${makeItemId()}`,
            label: item.label ?? "",
            quantity: Number(item.quantity ?? 1),
            unitAmount: item.unitAmount ?? "",
            lineAmount: item.lineAmount ?? "",
            notes: item.notes ?? "",
            productId: item.productId ?? null,
            bundleId: item.bundleId ?? null,
            showAdvanced: false,
          }))
        : [makeEmptyItem()]
    );

    setItemModalOpen(false);
    setErr(null);
  }, [open, initialValue]);

  const sanitizedItems = useMemo(() => sanitizeItems(items), [items]);

  const computedGrossAmount = useMemo(() => {
    if (!itemized) return parseAmount(grossAmount);
    return sanitizedItems.reduce(
      (sum, item) => sum + parseAmount(item.lineAmount),
      0
    );
  }, [itemized, grossAmount, sanitizedItems]);

  const paymentSummary = useMemo(
    () => getPaymentInstructionsSummary(paymentInstructionsDraft),
    [paymentInstructionsDraft]
  );

  const paymentStatus = useMemo(
    () => getPaymentInstructionsStatus(paymentInstructionsDraft),
    [paymentInstructionsDraft]
  );

  const itemCount = sanitizedItems.length;
  const hasPaymentInstructions =
    (paymentInstructionsDraft.entries?.length ?? 0) > 0 ||
    !!paymentInstructionsDraft.text?.trim();

  function handleOpenItemization() {
    if (!itemized) {
      setItemized(true);
    }
    setItemModalOpen(true);
  }

  function handleUseSimpleTotal() {
    setItemized(false);
    setItems([makeEmptyItem()]);
    setItemModalOpen(false);
  }

  function handleSave() {
    setErr(null);

    if (!clean(orderTitle)) {
      setErr("Please enter a title.");
      return;
    }

    if (!itemized && parseAmount(grossAmount) <= 0) {
      setErr("Please enter a valid total amount.");
      return;
    }

    if (itemized && sanitizedItems.length === 0) {
      setErr("Please add at least one valid line item.");
      return;
    }

    const json = paymentInstructionsJsonFromDraft(paymentInstructionsDraft);
    const serialized = serializePaymentInstructions(json);

    onSave({
      localId: initialValue?.localId ?? makeLocalId(),
      itemType: "ORDER",
      grossAmount: formatAmountInput(computedGrossAmount),
      inScopeAmount: "",
      summary: "",
      notes: clean(orderTitle),
      paymentInstructionsJson: serialized ?? "",
      items: itemized ? sanitizedItems : [],
    });

    onClose();
  }

  return (
    <>
      <DrawerSubmodal
        open={open}
        onClose={onClose}
        title={title}
        footer={
          <div className="th-ctaFooter">
            <button className="btn btn--ghost" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="btn btn--primary" onClick={handleSave} type="button">
              Save
            </button>
          </div>
        }
      >
        <div className="th-ctaGrid broadcast-order-panel">
          <div className="th-ctaField">
            <div className="th-ctaLabel">Title</div>
            <input
              className="th-ctaInput"
              value={orderTitle}
              onChange={(e) => setOrderTitle(e.target.value)}
              placeholder="Example: Starter package, Wellness plan, Intro order"
            />
          </div>

          <div className="th-ctaSection broadcast-order-panel__section">
            <div className="th-ctaSectionHeader broadcast-order-panel__section-header">
              <div>
                <div className="th-ctaSectionTitle">Amount</div>
              </div>

              {!itemized ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleOpenItemization}
                >
                  Add item breakdown
                </button>
              ) : null}
            </div>

            {!itemized ? (
              <div className="broadcast-order-panel__simple-pricing">
                <div className="th-ctaField">
                  <div className="th-ctaLabel">Order total</div>
                  <input
                    className="th-ctaInput"
                    type="number"
                    min="0"
                    step="0.01"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="broadcast-order-panel__hint">
                  Use a simple total when you do not need item-level pricing.
                </div>
              </div>
            ) : (
              <div className="broadcast-order-panel__items-card">
                <div className="broadcast-order-panel__items-head">
                  <div className="broadcast-order-panel__items-title">
                    Items ({itemCount})
                  </div>

                  <div className="broadcast-order-panel__items-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setItemModalOpen(true)}
                    >
                      Edit items
                    </button>

                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={handleUseSimpleTotal}
                    >
                      Use simple total
                    </button>
                  </div>
                </div>

                <div className="broadcast-order-panel__items-list">
                  {sanitizedItems.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className={
                        index === sanitizedItems.length - 1
                          ? "broadcast-order-panel__item-row broadcast-order-panel__item-row--accent"
                          : "broadcast-order-panel__item-row"
                      }
                    >
                      <div className="broadcast-order-panel__item-row-main">
                        <div className="broadcast-order-panel__item-row-label">
                          {item.label}
                        </div>
                        <div className="broadcast-order-panel__item-row-meta">
                          {item.quantity} unit{item.quantity === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div className="broadcast-order-panel__item-row-amount">
                        ₹{Number(parseAmount(item.lineAmount)).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="broadcast-order-panel__items-total">
                  <span className="broadcast-order-panel__items-total-label">Total</span>
                  <span className="broadcast-order-panel__items-total-value">
                    INR {formatAmountInput(computedGrossAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="th-ctaSection broadcast-order-panel__section">
            <div className="th-ctaSectionHeader broadcast-order-panel__section-header">
              <div>
                <div className="th-ctaSectionTitle">Payment instructions</div>
                <div className="th-ctaSectionSubtitle">{paymentSummary}</div>
              </div>

              <button
                className="btn btn--ghost btn--sm"
                type="button"
                onClick={() => setPaymentInstructionsModalOpen(true)}
              >
                {hasPaymentInstructions ? "Edit" : "Add"}
              </button>
            </div>

            {hasPaymentInstructions ? (
              <div className="broadcast-order-panel__payment-status-row">
                <div className="broadcast-order-panel__payment-status">
                  Payment setup added
                </div>
                <div className="broadcast-order-panel__payment-status-meta">
                  Recipients will see how to pay.
                </div>
              </div>
            ) : null}

          </div>

          <div className="broadcast-order-panel__summary-bar">
            <div className="broadcast-order-panel__summary-block">
              <div className="broadcast-order-panel__summary-label">Total</div>
              <div className="broadcast-order-panel__summary-value">
                INR {formatAmountInput(computedGrossAmount)}
              </div>
            </div>

            <div className="broadcast-order-panel__summary-block">
              <div className="broadcast-order-panel__summary-label">Pricing mode</div>
              <div className="broadcast-order-panel__summary-value">
                {itemized ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Simple total"}
              </div>
            </div>

            <div className="broadcast-order-panel__summary-block">
              <div className="broadcast-order-panel__summary-label">Payment</div>
              <div className="broadcast-order-panel__summary-value">
                {paymentStatus}
              </div>
            </div>
          </div>

          {err ? <div className="th-ctaError">{err}</div> : null}
        </div>
      </DrawerSubmodal>

      <OrderItemizationModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        items={items}
        setItems={setItems}
        productOptions={productOptions}
        bundleOptions={bundleOptions}
        currencyCode="INR"
        onUseSimpleTotal={handleUseSimpleTotal}
      />

      <PaymentInstructionsModal
        isOpen={paymentInstructionsModalOpen}
        onClose={() => setPaymentInstructionsModalOpen(false)}
        initialValue={paymentInstructionsDraft}
        onSave={(draft) => {
          setPaymentInstructionsDraft(draft);
          setPaymentInstructionsModalOpen(false);
        }}
        userId={userId}
      />
    </>
  );
}