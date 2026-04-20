import React, { useMemo } from "react";
import "../css/OrderItemizationModal.css";

export type OrderCatalogOption = {
  id: string;
  label: string;
};

export type OrderItemDraft = {
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

export type OrderItemizationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItemDraft[];
  setItems: React.Dispatch<React.SetStateAction<OrderItemDraft[]>>;
  productOptions?: OrderCatalogOption[];
  bundleOptions?: OrderCatalogOption[];
  currencyCode?: string;
  onUseSimpleTotal?: () => void;
};

function parseAmount(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function makeDraftItem(): OrderItemDraft {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id: randomId,
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

export default function OrderItemizationModal({
  isOpen,
  onClose,
  items,
  setItems,
  productOptions = [],
  bundleOptions = [],
  currencyCode = "INR",
  onUseSimpleTotal,
}: OrderItemizationModalProps) {
  const computedGrossAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + parseAmount(item.lineAmount), 0);
  }, [items]);

  const productMap = useMemo(() => {
    return new Map(productOptions.map((option) => [option.id, option.label]));
  }, [productOptions]);

  const bundleMap = useMemo(() => {
    return new Map(bundleOptions.map((option) => [option.id, option.label]));
  }, [bundleOptions]);

  function updateItem(
    itemId: string,
    updater: (current: OrderItemDraft) => OrderItemDraft
  ) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? updater(item) : item))
    );
  }

  function toggleAdvanced(itemId: string) {
    updateItem(itemId, (item) => ({
      ...item,
      showAdvanced: !item.showAdvanced,
    }));
  }

  function handleItemQuantityChange(itemId: string, value: string) {
    const parsedQty = Math.max(1, Number(value || "1"));

    updateItem(itemId, (item) => {
      const unitAmount = parseAmount(item.unitAmount);
      return {
        ...item,
        quantity: parsedQty,
        lineAmount: formatAmountInput(parsedQty * unitAmount),
      };
    });
  }

  function handleItemPriceChange(itemId: string, value: string) {
    updateItem(itemId, (item) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const unit = parseAmount(value);
      return {
        ...item,
        unitAmount: value,
        lineAmount: formatAmountInput(qty * unit),
      };
    });
  }

  function handleItemTotalChange(itemId: string, value: string) {
    updateItem(itemId, (item) => ({
      ...item,
      lineAmount: value,
    }));
  }

  function handleAddItem() {
    setItems((current) => [...current, makeDraftItem()]);
  }

  function handleRemoveItem(itemId: string) {
    setItems((current) => {
      if (current.length === 1) return current;
      return current.filter((item) => item.id !== itemId);
    });
  }

  function handleUseSimpleTotalClick() {
    if (!onUseSimpleTotal) return;
    onUseSimpleTotal();
    onClose();
  }

  function handleProductChange(itemId: string, productId: string) {
    updateItem(itemId, (item) => ({
      ...item,
      productId: productId || null,
      bundleId: productId ? null : item.bundleId,
      label:
        item.label.trim() || !productId
          ? item.label
          : productMap.get(productId) ?? item.label,
      showAdvanced: true,
    }));
  }

  function handleBundleChange(itemId: string, bundleId: string) {
    updateItem(itemId, (item) => ({
      ...item,
      bundleId: bundleId || null,
      productId: bundleId ? null : item.productId,
      label:
        item.label.trim() || !bundleId
          ? item.label
          : bundleMap.get(bundleId) ?? item.label,
      showAdvanced: true,
    }));
  }

  function getMappedSummary(item: OrderItemDraft): string | null {
    if (item.productId) {
      const label = productMap.get(item.productId);
      return label ? `Mapped to product: ${label}` : "Mapped to product";
    }

    if (item.bundleId) {
      const label = bundleMap.get(item.bundleId);
      return label ? `Mapped to bundle: ${label}` : "Mapped to bundle";
    }

    return null;
  }

  if (!isOpen) return null;

  return (
    <div
      className="order-itemization-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="order-itemization-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-itemization-modal-title"
      >
        <div className="order-itemization-modal-header">
          <div className="order-itemization-modal-header-copy">
            <h3 id="order-itemization-modal-title">Itemize order</h3>
            <p>Build the total from line items without wasting screen space.</p>
          </div>

          <button
            type="button"
            className="order-itemization-modal-close"
            onClick={onClose}
            aria-label="Close itemization modal"
          >
            ×
          </button>
        </div>

        <div className="order-itemization-body">
          <div className="order-itemization-list">
            {items.map((item, index) => {
              const mappedSummary = getMappedSummary(item);

              return (
                <div key={item.id} className="order-itemization-card">
                  <div className="order-itemization-card-top">
                    <div className="order-itemization-title-row">
                      <label className="order-itemization-field order-itemization-field-title">
                        <span>Item</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            updateItem(item.id, (current) => ({
                              ...current,
                              label: e.target.value,
                            }))
                          }
                          placeholder={`Item ${index + 1}`}
                        />
                      </label>

                      <label className="order-itemization-field order-itemization-field-qty">
                        <span>Qty</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemQuantityChange(item.id, e.target.value)
                          }
                        />
                      </label>

                      <label className="order-itemization-field order-itemization-field-amount">
                        <span>Price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitAmount}
                          onChange={(e) =>
                            handleItemPriceChange(item.id, e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </label>

                      <label className="order-itemization-field order-itemization-field-amount">
                        <span>Total</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.lineAmount}
                          onChange={(e) =>
                            handleItemTotalChange(item.id, e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </label>

                      <div className="order-itemization-actions">
                        <button
                          type="button"
                          className="order-itemization-map-btn"
                          onClick={() => toggleAdvanced(item.id)}
                          aria-label={item.showAdvanced ? "Hide mapping" : "Show mapping"}
                          title={item.showAdvanced ? "Hide mapping" : "Map to product or bundle"}
                        >
                          {item.showAdvanced ? "Hide" : "Map"}
                        </button>

                        <button
                          type="button"
                          className="order-itemization-icon-btn order-itemization-icon-btn-danger"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length === 1}
                          aria-label="Remove item"
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {mappedSummary ? (
                      <div className="order-itemization-mapped-summary">
                        {mappedSummary}
                      </div>
                    ) : null}
                  </div>

                  {item.showAdvanced ? (
                    <div className="order-itemization-advanced">
                      <label className="order-itemization-field">
                        <span>Map to product</span>
                        <select
                          value={item.productId ?? ""}
                          onChange={(e) => handleProductChange(item.id, e.target.value)}
                        >
                          <option value="">None</option>
                          {productOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="order-itemization-field">
                        <span>Map to bundle</span>
                        <select
                          value={item.bundleId ?? ""}
                          onChange={(e) => handleBundleChange(item.id, e.target.value)}
                        >
                          <option value="">None</option>
                          {bundleOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="order-itemization-field order-itemization-field-full">
                        <span>Item note</span>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) =>
                            updateItem(item.id, (current) => ({
                              ...current,
                              notes: e.target.value,
                            }))
                          }
                          placeholder="Optional note"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="order-itemization-modal-footer">
          <div className="order-itemization-modal-footer-left">
            <button
              type="button"
              className="order-itemization-secondary-btn"
              onClick={handleAddItem}
            >
              Add item
            </button>

            {onUseSimpleTotal ? (
              <button
                type="button"
                className="order-itemization-secondary-btn"
                onClick={handleUseSimpleTotalClick}
              >
                Use simple total instead
              </button>
            ) : null}
          </div>

          <div className="order-itemization-modal-footer-right">
            <span className="order-itemization-total">
              Total {currencyCode} {formatAmountInput(computedGrossAmount)}
            </span>

            <button
              type="button"
              className="order-itemization-primary-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}