import React, { useEffect, useMemo, useState } from "react";
import { createOrder, evaluateOrderOffers, updateOrder } from "../services/orderService";
import type {
  CreateOrderRequest,
  UpdateOrderRequest,
  EvaluateOrderOffersResponse,
  EvaluatedOrderOfferOptionDTO,
  GrantItemSnapshot,
  OrderDTO,
  OfferSelectionMode,
  SelectedGrantInput,
} from "../types/orderTypes";
import OrderItemizationModal from "../components/OrderItemizationModal";

import PaymentInstructionsModal from "../components/PaymentInstructionsModal";
import type { PaymentInstructionsDraft } from "../types/paymentInstruction";
import {
  createEmptyPaymentInstructionsDraft,
  draftFromPaymentInstructionsJson,
  paymentInstructionsJsonFromDraft,
  serializePaymentInstructions,
} from "../types/paymentInstruction";

import { listOwnerProducts } from "../services/productService";
import { listOwnerBundles } from "../services/bundleService";

import type { OfferOrderPreviewDraftPayloadDTO } from "../components/OfferOrderPreviewModal";

import "../css/CreateOrderModal.css";

type IdentityType = "USER" | "BUSINESS";

export type OrderActorOption = {
  identityType: IdentityType;
  identityId: string;
  label: string;
  subtitle?: string | null;
};

export type OrderBusinessOption = {
  id: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

export type OrderRecipientOption = {
  identityType: IdentityType;
  userId?: string | null;
  businessId?: string | null;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

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

export type CreateOrderModalSubmitDraft = {
  threadId?: string | null;
  businessId: string;
  recipientIdentityType: IdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  createdByIdentityType: IdentityType;
  createdByIdentityId: string;
  currencyCode: string;
  grossAmount: string;
  finalAmount: string;
  notes?: string | null;
  paymentInstructionsJson?: string | null;
  items: Array<{
    label: string;
    quantity: number;
    unitAmount: string;
    lineAmount: string;
    productId?: string | null;
    bundleId?: string | null;
    sortOrder: number;
    notes?: string | null;
  }>;
  orderDate: string;
  mode: "thread" | "standalone";
};

export type CreateOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (order: OrderDTO) => void;
  onSubmitDraft?: (draft: CreateOrderModalSubmitDraft) => Promise<void> | void;

  getAuth: () => Promise<{ token: string; userId: string } | null>;
  actingBusinessId?: string | null;

  mode?: "thread" | "standalone";
  threadId?: string | null;
  threadLabel?: string | null;

  actorOptions: OrderActorOption[];
  businessOptions: OrderBusinessOption[];
  recipientOptions: OrderRecipientOption[];

  editingOrder?: OrderDTO | null;
  initialDraft?: OfferOrderPreviewDraftPayloadDTO | null;

  initialActorIdentityType?: IdentityType;
  initialActorIdentityId?: string | null;

  initialBusinessId?: string | null;

  initialRecipientIdentityType?: IdentityType;
  initialRecipientUserId?: string | null;
  initialRecipientBusinessId?: string | null;

  initialNotes?: string;

  initialPaymentInstructionsJson?: string | null;
  paymentInstructionsUserId: string;

  defaultCurrencyCode?: string;
};

function todayInputValue(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function makeDraftItemFromPreviewItem(
  item: OfferOrderPreviewDraftPayloadDTO["items"][number]
): OrderItemDraft {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id: randomId,
    label: item.label ?? "",
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    unitAmount: item.unitAmount ?? "",
    lineAmount: item.lineAmount ?? "",
    notes: item.notes ?? "",
    productId: item.productId ?? null,
    bundleId: item.bundleId ?? null,
    showAdvanced: false,
  };
}

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

function getRecipientKey(option: OrderRecipientOption): string {
  return option.identityType === "BUSINESS"
    ? `BUSINESS:${option.businessId ?? ""}`
    : `USER:${option.userId ?? ""}`;
}

function initials(label?: string | null) {
  const parts = String(label ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•";
}

function grantIdentityKey(grant: SelectedGrantInput): string {
  if (grant.itemType.toUpperCase() === "PRODUCT") {
    return `PRODUCT:${grant.productId ?? ""}`;
  }
  return `BUNDLE:${grant.bundleId ?? ""}`;
}

function grantSnapshotKey(grant: GrantItemSnapshot): string {
  if (grant.itemType.toUpperCase() === "PRODUCT") {
    return `PRODUCT:${grant.product?.id ?? ""}`;
  }
  return `BUNDLE:${grant.bundle?.id ?? ""}`;
}

function grantSnapshotLabel(grant: GrantItemSnapshot): string {
  if (grant.itemType.toUpperCase() === "PRODUCT") {
    return grant.product?.name || "Free product";
  }
  return grant.bundle?.title || "Free bundle";
}

function grantSnapshotToSelectedGrant(grant: GrantItemSnapshot): SelectedGrantInput {
  return {
    itemType: grant.itemType,
    productId: grant.product?.id ?? null,
    bundleId: grant.bundle?.id ?? null,
    quantity: Math.max(1, Number(grant.quantity ?? 1)),
  };
}

type PickerOption<T extends string> = {
  key: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  typeLabel: T;
};

function ParticipantPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: PickerOption<T>[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.key === value) ?? options[0] ?? null;

  return (
    <div className="th-field create-order-field">
      <label className="th-label">{label}</label>

      <div className="create-order-picker">
        <button
          type="button"
          className="create-order-picker-trigger"
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
          }}
          disabled={disabled}
        >
          <span className="create-order-picker-trigger-left">
            <span className="create-order-picker-avatar">
              {selected?.imageUrl ? (
                <img src={selected.imageUrl} alt="" />
              ) : (
                <span className="create-order-picker-avatar-fallback">
                  {initials(selected?.title)}
                </span>
              )}
            </span>

            <span className="create-order-picker-text">
              <span className="create-order-picker-title">
                {selected?.title ?? "Select"}
              </span>
              <span className="create-order-picker-subtitle">
                {selected?.subtitle || selected?.typeLabel || ""}
              </span>
            </span>
          </span>

          <span className="create-order-picker-chevron" aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <div className="create-order-picker-menu">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                className="create-order-picker-option"
                onClick={() => {
                  if (disabled) return;
                  onChange(option.key);
                  setOpen(false);
                }}
                disabled={disabled}
              >
                <span className="create-order-picker-avatar">
                  {option.imageUrl ? (
                    <img src={option.imageUrl} alt="" />
                  ) : (
                    <span className="create-order-picker-avatar-fallback">
                      {initials(option.title)}
                    </span>
                  )}
                </span>

                <span className="create-order-picker-text">
                  <span className="create-order-picker-title">{option.title}</span>
                  <span className="create-order-picker-subtitle">
                    {option.subtitle || option.typeLabel}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  onCreated,
  onSubmitDraft,
  getAuth,
  actingBusinessId,
  mode = "thread",
  threadId = null,
  actorOptions,
  businessOptions,
  recipientOptions,
  editingOrder = null,
  initialDraft = null,
  initialActorIdentityType,
  initialActorIdentityId = null,
  initialBusinessId = null,
  initialRecipientIdentityType,
  initialRecipientUserId = null,
  initialRecipientBusinessId = null,
  initialNotes = "",
  initialPaymentInstructionsJson = null,
  paymentInstructionsUserId,
  defaultCurrencyCode = "INR",
}: CreateOrderModalProps) {
  const [actorIdentityType, setActorIdentityType] = useState<IdentityType>("USER");
  const [actorIdentityId, setActorIdentityId] = useState<string>("");

  const [businessId, setBusinessId] = useState<string>(initialBusinessId ?? "");
  const [recipientIdentityType, setRecipientIdentityType] = useState<IdentityType>("USER");
  const [recipientUserId, setRecipientUserId] = useState<string>("");
  const [recipientBusinessId, setRecipientBusinessId] = useState<string>("");

  const [orderDate, setOrderDate] = useState<string>(todayInputValue());
  const [isItemized, setIsItemized] = useState<boolean>(false);

  const [totalAmount, setTotalAmount] = useState<string>("");
  const [title, setTitle] = useState<string>(initialNotes);

  const [paymentInstructionsDraft, setPaymentInstructionsDraft] =
    useState<PaymentInstructionsDraft>(createEmptyPaymentInstructionsDraft());
  const [paymentInstructionsModalOpen, setPaymentInstructionsModalOpen] =
    useState<boolean>(false);

  const [items, setItems] = useState<OrderItemDraft[]>([makeDraftItem()]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [inScopeAmount, setInScopeAmount] = useState<string>("");
  const [evaluatingOffers, setEvaluatingOffers] = useState<boolean>(false);
  const [offerEvaluation, setOfferEvaluation] =
    useState<EvaluateOrderOffersResponse | null>(null);
  const [selectedOffer, setSelectedOffer] =
    useState<EvaluatedOrderOfferOptionDTO | null>(null);
  const [offerPickerOpen, setOfferPickerOpen] = useState<boolean>(false);
  const [offerSelectionMode, setOfferSelectionMode] =
    useState<OfferSelectionMode>("NONE");

  const [selectedGrants, setSelectedGrants] = useState<SelectedGrantInput[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);

  const [internalProductOptions, setInternalProductOptions] = useState<OrderCatalogOption[]>([]);
  const [internalBundleOptions, setInternalBundleOptions] = useState<OrderCatalogOption[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (!businessId) {
      setInternalProductOptions([]);
      setInternalBundleOptions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [products, bundles] = await Promise.all([
          listOwnerProducts(businessId, { active: true, limit: 100, offset: 0 }),
          listOwnerBundles(businessId, { active: true, limit: 100, offset: 0 }),
        ]);

        if (!cancelled) {
          setInternalProductOptions(
            (products ?? []).map((p: any) => ({
              id: p.id,
              label: p.name,
            }))
          );

          setInternalBundleOptions(
            (bundles ?? []).map((b: any) => ({
              id: b.id,
              label: b.title,
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load order catalog", e);
        if (!cancelled) {
          setInternalProductOptions([]);
          setInternalBundleOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, businessId]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingOrder) {
      const actor =
        actorOptions.find(
          (option) =>
            option.identityType === editingOrder.createdByIdentityType &&
            option.identityId === editingOrder.createdByIdentityId
        ) ?? actorOptions[0];

      const recipient =
        recipientOptions.find((option) => {
          if (editingOrder.recipientIdentityType === "BUSINESS") {
            return (
              option.identityType === "BUSINESS" &&
              option.businessId === editingOrder.recipientBusinessId
            );
          }
          return (
            option.identityType === "USER" &&
            option.userId === editingOrder.recipientUserId
          );
        }) ?? recipientOptions[0];

      const mappedItems: OrderItemDraft[] =
        editingOrder.items?.length
          ? editingOrder.items.map((item) => ({
              id:
                item.id ??
                (typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`),
              label: item.label ?? "",
              quantity: Number(item.quantity ?? 1),
              unitAmount: item.unitAmount ?? "",
              lineAmount: item.lineAmount ?? "",
              notes: item.notes ?? "",
              productId: item.productId ?? null,
              bundleId: item.bundleId ?? null,
              showAdvanced: false,
            }))
          : [makeDraftItem()];

      const hasStructuredOrderItems = editingOrder.items?.some(
        (item) =>
          (item.label ?? "").trim() &&
          (parseAmount(item.lineAmount) > 0 ||
            Number(item.quantity ?? 0) > 0 ||
            !!item.productId ||
            !!item.bundleId)
      );

      setActorIdentityType(actor?.identityType ?? "USER");
      setActorIdentityId(actor?.identityId ?? "");
      setBusinessId(editingOrder.businessId ?? "");

      setRecipientIdentityType(recipient?.identityType ?? "USER");
      setRecipientUserId(editingOrder.recipientUserId ?? "");
      setRecipientBusinessId(editingOrder.recipientBusinessId ?? "");

      setOrderDate(
        editingOrder.createdAt
          ? String(editingOrder.createdAt).slice(0, 10)
          : todayInputValue()
      );

      setIsItemized(!!hasStructuredOrderItems);
      setTotalAmount(editingOrder.grossAmount ?? "");
      setTitle(editingOrder.notes ?? "");

      let parsedPaymentInstructions = null;
      try {
        parsedPaymentInstructions = editingOrder.paymentInstructionsJson
          ? JSON.parse(editingOrder.paymentInstructionsJson)
          : null;
      } catch {
        parsedPaymentInstructions = null;
      }

      setPaymentInstructionsDraft(
        draftFromPaymentInstructionsJson(parsedPaymentInstructions)
      );

      setItems(mappedItems);
      setSubmitting(false);
      setErrorMessage("");

      setInScopeAmount(editingOrder.inScopeAmount ?? "");
      setEvaluatingOffers(false);
      setOfferEvaluation(null);
      setOfferPickerOpen(false);
      setSelectedGrants([]);

      setOfferSelectionMode(editingOrder.offerSelectionMode ?? "NONE");

      setSelectedOffer(
        editingOrder.assignedOfferId
          ? ({
              assignedOfferId: editingOrder.assignedOfferId,
              offerTemplateId: "",
              offerTitle: "Selected offer",
              description: null,
              offerType: "FIXED_DISCOUNT",
              claimPolicy: null,
              scopeKind: "ANY",
              scopeItems: [],
              selectedGrants: [],
              availableGrants: [],
              grantPickLimit: undefined,
              isEligible: true,
              isBest: false,
              skipReason: null,
              requiresManualInScopeAmount: false,
              computedInScopeAmount: editingOrder.inScopeAmount ?? null,
              discountAmount: editingOrder.discountAmount ?? "0.00",
              finalAmount: editingOrder.finalAmount ?? editingOrder.grossAmount ?? "0.00",
              redemptionsUsed: 0,
              effectiveMaxRedemptions: null,
              redemptionsLeft: null,
            } as EvaluatedOrderOfferOptionDTO)
          : null
      );

      setItemModalOpen(false);
      setPaymentInstructionsModalOpen(false);
      return;
    }

    if (initialDraft) {
      const actor =
        actorOptions.find(
          (option) =>
            option.identityType === initialActorIdentityType &&
            option.identityId === initialActorIdentityId
        ) ?? actorOptions[0];

      const recipient =
        recipientOptions.find((option) => {
          if (initialDraft.recipientIdentityType === "BUSINESS") {
            return (
              option.identityType === "BUSINESS" &&
              option.businessId === initialDraft.recipientBusinessId
            );
          }
          return (
            option.identityType === "USER" &&
            option.userId === initialDraft.recipientUserId
          );
        }) ?? recipientOptions[0];

      const previewOfferSelectionMode: OfferSelectionMode =
        initialDraft.assignedOfferId &&
        (initialDraft.offerSelectionMode === "AUTO" ||
          initialDraft.offerSelectionMode === "MANUAL" ||
          initialDraft.offerSelectionMode === "NONE")
          ? initialDraft.offerSelectionMode
          : initialDraft.assignedOfferId
            ? "MANUAL"
            : "NONE";

      const previewSelectedGrants: SelectedGrantInput[] =
        (initialDraft.items ?? [])
          .filter((item) => {
            const isMapped = !!item.productId || !!item.bundleId;
            const isZeroPriced =
              parseAmount(item.lineAmount ?? "0") <= 0 &&
              parseAmount(item.unitAmount ?? "0") <= 0;
            const isOutOfScope = item.inScope === false;

            return isMapped && isZeroPriced && isOutOfScope;
          })
          .map((item) => ({
            itemType: item.productId ? "PRODUCT" : "BUNDLE",
            productId: item.productId ?? null,
            bundleId: item.bundleId ?? null,
            quantity: Math.max(1, Number(item.quantity ?? 1)),
          }));

      const isGrantDraft = previewSelectedGrants.length > 0;

      const mappedItemsFromPreview: OrderItemDraft[] =
        initialDraft.items?.length
          ? initialDraft.items.map((item) => makeDraftItemFromPreviewItem(item))
          : [];

      const hasPreviewItems = mappedItemsFromPreview.length > 0;
      const shouldStartItemized = hasPreviewItems;
      
      const previewGrossAmount = parseAmount(initialDraft.grossAmount);
      const previewItemizedAmount = mappedItemsFromPreview.reduce(
        (sum, item) => sum + parseAmount(item.lineAmount),
        0
      );
      const remainingNonGrantAmount = Math.max(
        0,
        previewGrossAmount - previewItemizedAmount
      );

      const shouldAddAllOthersRow =
        isGrantDraft && remainingNonGrantAmount > 0.0001;

      const mappedItems: OrderItemDraft[] = shouldAddAllOthersRow
        ? [
            ...mappedItemsFromPreview,
            {
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              label: "All Others",
              quantity: 1,
              unitAmount: formatAmountInput(remainingNonGrantAmount),
              lineAmount: formatAmountInput(remainingNonGrantAmount),
              notes: "Non-grant purchase amount",
              productId: null,
              bundleId: null,
              showAdvanced: false,
            },
          ]
        : mappedItemsFromPreview;

      setActorIdentityType(actor?.identityType ?? "USER");
      setActorIdentityId(actor?.identityId ?? "");
      setBusinessId(initialDraft.businessId ?? "");

      setRecipientIdentityType(
        recipient?.identityType ?? initialDraft.recipientIdentityType ?? "USER"
      );
      setRecipientUserId(initialDraft.recipientUserId ?? "");
      setRecipientBusinessId(initialDraft.recipientBusinessId ?? "");

      setOrderDate(initialDraft.orderDate || todayInputValue());
      setIsItemized(shouldStartItemized);

      setItems(
        shouldStartItemized
          ? mappedItems   // ✅ includes "All Others" if needed
          : [makeDraftItem()]
      );

      setTotalAmount(
        shouldStartItemized
          ? ""
          : initialDraft.grossAmount ?? ""
      );
      setTitle(initialDraft.notes ?? "");
      setPaymentInstructionsDraft(draftFromPaymentInstructionsJson(null));
      setSubmitting(false);
      setErrorMessage("");
      setInScopeAmount(initialDraft.inScopeAmount ?? "");
      setEvaluatingOffers(false);
      setOfferEvaluation(null);
      setOfferPickerOpen(false);
      setSelectedGrants(previewSelectedGrants);
      setOfferSelectionMode(previewOfferSelectionMode);

      setSelectedOffer(
        initialDraft.assignedOfferId
          ? ({
              assignedOfferId: initialDraft.assignedOfferId,
              offerTemplateId: "",
              offerTitle: "Selected offer",
              description: null,
              offerType: isGrantDraft ? "GRANT" : "FIXED_DISCOUNT",
              claimPolicy: null,
              scopeKind: "ANY",
              scopeItems: [],
              selectedGrants: previewSelectedGrants,
              availableGrants: [],
              grantPickLimit: undefined,
              isEligible: true,
              isBest: true,
              skipReason: null,
              requiresManualInScopeAmount: false,
              computedInScopeAmount: initialDraft.inScopeAmount ?? null,
              discountAmount: initialDraft.discountAmount ?? "0.00",
              finalAmount:
                initialDraft.finalAmount ?? initialDraft.grossAmount ?? "0.00",
              redemptionsUsed: 0,
              effectiveMaxRedemptions: null,
              redemptionsLeft: null,
            } as EvaluatedOrderOfferOptionDTO)
          : null
      );

      setItemModalOpen(false);
      setPaymentInstructionsModalOpen(false);
      return;
    }

    const actor =
      actorOptions.find(
        (option) =>
          option.identityType === initialActorIdentityType &&
          option.identityId === initialActorIdentityId
      ) ?? actorOptions[0];

    const recipient =
      recipientOptions.find((option) => {
        if (initialRecipientIdentityType === "BUSINESS") {
          return (
            option.identityType === "BUSINESS" &&
            option.businessId === initialRecipientBusinessId
          );
        }
        if (initialRecipientIdentityType === "USER") {
          return (
            option.identityType === "USER" &&
            option.userId === initialRecipientUserId
          );
        }
        return false;
      }) ?? recipientOptions[0];

    let parsedInitialPaymentInstructions = null;
    try {
      parsedInitialPaymentInstructions = initialPaymentInstructionsJson
        ? JSON.parse(initialPaymentInstructionsJson)
        : null;
    } catch {
      parsedInitialPaymentInstructions = null;
    }

    setActorIdentityType(actor?.identityType ?? "USER");
    setActorIdentityId(actor?.identityId ?? "");
    setBusinessId(initialBusinessId ?? "");
    setRecipientIdentityType(recipient?.identityType ?? "USER");
    setRecipientUserId(recipient?.userId ?? "");
    setRecipientBusinessId(recipient?.businessId ?? "");
    setOrderDate(todayInputValue());
    setIsItemized(false);
    setTotalAmount("");
    setTitle(initialNotes);
    setPaymentInstructionsDraft(
      draftFromPaymentInstructionsJson(parsedInitialPaymentInstructions)
    );
    setItems([makeDraftItem()]);
    setSubmitting(false);
    setErrorMessage("");
    setInScopeAmount("");
    setEvaluatingOffers(false);
    setOfferEvaluation(null);
    setSelectedOffer(null);
    setOfferPickerOpen(false);
    setOfferSelectionMode("NONE");
    setSelectedGrants([]);
    setItemModalOpen(false);
    setPaymentInstructionsModalOpen(false);
  }, [
    isOpen,
    editingOrder,
    initialDraft,
    actorOptions,
    recipientOptions,
    initialActorIdentityType,
    initialActorIdentityId,
    initialBusinessId,
    initialRecipientIdentityType,
    initialRecipientUserId,
    initialRecipientBusinessId,
    initialNotes,
    initialPaymentInstructionsJson,
  ]);

  useEffect(() => {
    if (!selectedOffer || selectedOffer.offerType !== "GRANT") return;

    const currentGrantKeys = new Set(selectedGrants.map(grantIdentityKey));

    setItems((current) => {
      const nonGrantItems = current.filter(
        (item) =>
          !(
            item.notes === "Included via offer" &&
            (!!item.productId || !!item.bundleId)
          )
      );

      const grantItems: OrderItemDraft[] = selectedGrants.map((grant) => {
        const key = grantIdentityKey(grant);
        const existing = current.find((item) => {
          const itemKey = item.productId
            ? `PRODUCT:${item.productId}`
            : item.bundleId
              ? `BUNDLE:${item.bundleId}`
              : "";
          return item.notes === "Included via offer" && itemKey === key;
        });

        return {
          id:
            existing?.id ??
            (typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`),
          label:
            existing?.label ||
            (grant.itemType.toUpperCase() === "PRODUCT" ? "Free product" : "Free bundle"),
          quantity: Math.max(1, Number(grant.quantity ?? 1)),
          unitAmount: "0.00",
          lineAmount: "0.00",
          notes: "Included via offer",
          productId: grant.productId ?? null,
          bundleId: grant.bundleId ?? null,
          showAdvanced: true,
        };
      });

      const unchanged =
        current.length === nonGrantItems.length + grantItems.length &&
        currentGrantKeys.size ===
          current.filter(
            (item) =>
              item.notes === "Included via offer" &&
              (!!item.productId || !!item.bundleId)
          ).length &&
        current.every((item) => {
          if (item.notes !== "Included via offer") return true;
          const key = item.productId
            ? `PRODUCT:${item.productId}`
            : item.bundleId
              ? `BUNDLE:${item.bundleId}`
              : "";
          return currentGrantKeys.has(key);
        });

      return unchanged ? current : [...nonGrantItems, ...grantItems];
    });
  }, [selectedOffer, selectedGrants]);

  const businessPickerOptions = useMemo<PickerOption<"BUSINESS">[]>(() => {
    return businessOptions.map((option) => ({
      key: option.id,
      title: option.label,
      subtitle: option.subtitle ?? null,
      imageUrl: option.imageUrl ?? null,
      typeLabel: "BUSINESS",
    }));
  }, [businessOptions]);

  const recipientPickerOptions = useMemo<PickerOption<"USER" | "BUSINESS">[]>(() => {
    return recipientOptions.map((option) => ({
      key: getRecipientKey(option),
      title: option.label,
      subtitle: option.subtitle ?? null,
      imageUrl: option.imageUrl ?? null,
      typeLabel: option.identityType,
    }));
  }, [recipientOptions]);

  const computedGrossAmount = useMemo(() => {
    if (!isItemized) return parseAmount(totalAmount);
    return items.reduce((sum, item) => sum + parseAmount(item.lineAmount), 0);
  }, [isItemized, totalAmount, items]);

  const canEditOrder = editingOrder ? !!editingOrder.allowedActions?.canEdit : true;

  const canSubmit = useMemo(() => {
    if (!actorIdentityId) return false;
    if (!businessId) return false;
    if (!canEditOrder) return false;

    if (recipientIdentityType === "USER" && !recipientUserId) return false;
    if (recipientIdentityType === "BUSINESS" && !recipientBusinessId) return false;
    if (!title.trim()) return false;

    if (!isItemized) {
      return parseAmount(totalAmount) > 0;
    }

    const hasAtLeastOneItem = items.some((item) => {
      const hasLabel = !!item.label.trim();
      const hasPositiveAmount = parseAmount(item.lineAmount) > 0;
      const hasQuantity = Math.max(1, Number(item.quantity || 1)) > 0;
      const isMappedGrantLikeRow = !!item.productId || !!item.bundleId;
      return hasLabel && (hasPositiveAmount || hasQuantity || isMappedGrantLikeRow);
    });

    return hasAtLeastOneItem && computedGrossAmount > 0;
  }, [
    actorIdentityId,
    businessId,
    recipientIdentityType,
    recipientUserId,
    recipientBusinessId,
    title,
    isItemized,
    totalAmount,
    items,
    computedGrossAmount,
    canEditOrder,
  ]);

  const paymentInstructionEntryCount = paymentInstructionsDraft.entries.length;

  const paymentInstructionsSummaryText = useMemo(() => {
    const count = paymentInstructionsDraft.entries.length;
    const hasText = !!paymentInstructionsDraft.text.trim();

    if (count === 0 && !hasText) return "No payment instructions added";
    if (count === 0 && hasText) return "Intro text added";
    if (count === 1) {
      return hasText ? "1 payment method and intro text" : "1 payment method";
    }
    return hasText
      ? `${count} payment methods and intro text`
      : `${count} payment methods`;
  }, [paymentInstructionsDraft]);

  function handleRecipientChange(value: string) {
    const [type, id] = value.split(":");

    if (type === "BUSINESS") {
      setRecipientIdentityType("BUSINESS");
      setRecipientBusinessId(id ?? "");
      setRecipientUserId("");
      return;
    }

    setRecipientIdentityType("USER");
    setRecipientUserId(id ?? "");
    setRecipientBusinessId("");
  }

  function buildSanitizedItems() {
    return isItemized
      ? items
          .filter((item) => {
            const hasLabel = !!item.label.trim();
            const hasPositiveAmount = parseAmount(item.lineAmount) > 0;
            const hasQuantity = Math.max(1, Number(item.quantity || 1)) > 0;
            const isMappedGrantLikeRow = !!item.productId || !!item.bundleId;

            return hasLabel && (hasPositiveAmount || hasQuantity || isMappedGrantLikeRow);
          })
          .map((item, index) => ({
            label: item.label.trim(),
            quantity: Math.max(1, Number(item.quantity || 1)),
            unitAmount: item.unitAmount.trim() || "0.00",
            lineAmount: item.lineAmount.trim() || "0.00",
            productId: item.productId || null,
            bundleId: item.bundleId || null,
            sortOrder: index,
            notes: item.notes.trim() || null,
          }))
      : [];
  }

  const sanitizedItemsPreview = useMemo(() => buildSanitizedItems(), [items, isItemized]);
  const itemCount = sanitizedItemsPreview.length;

  const itemSummaryText = useMemo(() => {
    if (!itemCount) return "No items added";
    const labels = sanitizedItemsPreview.map((item) => item.label).filter(Boolean);
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
  }, [sanitizedItemsPreview, itemCount]);

  function buildEvaluateRequest() {
    if (!threadId) {
      throw new Error("threadId is required to evaluate offers.");
    }

    const sanitizedItems = buildSanitizedItems();
    const grossAmount = formatAmountInput(computedGrossAmount);
    const paymentInstructionsJson = serializePaymentInstructions(
      paymentInstructionsJsonFromDraft(paymentInstructionsDraft)
    );

    return {
      threadId,
      businessId,
      recipientIdentityType,
      recipientUserId:
        recipientIdentityType === "USER" ? recipientUserId || null : null,
      recipientBusinessId:
        recipientIdentityType === "BUSINESS" ? recipientBusinessId || null : null,
      currencyCode: defaultCurrencyCode,
      grossAmount,
      inScopeAmount: inScopeAmount.trim() || null,
      notes: title.trim() || null,
      paymentInstructionsJson,
      items: sanitizedItems,
      selectedGrants,
    };
  }

  async function handleEvaluateOffers() {
    if (!threadId) return;
    if (!canSubmit) return;

    const auth = await getAuth();
    if (!auth?.token) {
      setErrorMessage("Authentication is not ready yet. Please try again.");
      return;
    }

    setEvaluatingOffers(true);
    setErrorMessage("");

    try {
      const result = await evaluateOrderOffers(buildEvaluateRequest(), {
        token: auth.token,
        businessId: actingBusinessId,
      });

      setOfferEvaluation(result);

      const recommended =
        result.options.find(
          (option) => option.assignedOfferId === result.recommendedAssignedOfferId
        ) ??
        result.options.find((option) => option.isBest) ??
        null;

      const hasManualSelection =
        offerSelectionMode === "MANUAL" && !!selectedOffer?.assignedOfferId;

      if (!hasManualSelection) {
        setSelectedOffer(recommended);
        setOfferSelectionMode(
          recommended ? result.recommendedOfferSelectionMode || "AUTO" : "NONE"
        );
      } else if (selectedOffer?.assignedOfferId) {
        const refreshedSelected =
          result.options.find(
            (option) => option.assignedOfferId === selectedOffer.assignedOfferId
          ) ?? selectedOffer;

        setSelectedOffer(refreshedSelected);
      }

      if (recommended?.computedInScopeAmount && !inScopeAmount.trim()) {
        setInScopeAmount(recommended.computedInScopeAmount);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to evaluate offers.");
    } finally {
      setEvaluatingOffers(false);
    }
  }

  function handleUseNoOffer() {
    setSelectedOffer(null);
    setOfferSelectionMode("NONE");
    setOfferPickerOpen(false);
    setInScopeAmount("");
    setSelectedGrants([]);
  }

  function handleSelectOffer(option: EvaluatedOrderOfferOptionDTO) {
    if (!option.isEligible) return;

    setSelectedOffer(option);
    setOfferSelectionMode("MANUAL");

    if (option.offerType !== "GRANT") {
      setSelectedGrants([]);
    }

    if (option.offerType === "GRANT") {
      setIsItemized(true);
    }

    if (option.computedInScopeAmount) {
      setInScopeAmount(option.computedInScopeAmount);
    }

    setOfferPickerOpen(false);
  }

  function toggleGrantSelection(option: EvaluatedOrderOfferOptionDTO, grant: GrantItemSnapshot) {
    const nextGrant = grantSnapshotToSelectedGrant(grant);
    const nextKey = grantSnapshotKey(grant);
    const pickLimit = Math.max(1, Number(option.grantPickLimit ?? 1));

    setSelectedOffer(option);
    setOfferSelectionMode("MANUAL");
    setIsItemized(true);

    setSelectedGrants((current) => {
      const exists = current.some((entry) => grantIdentityKey(entry) === nextKey);

      if (pickLimit <= 1) {
        return exists ? [] : [nextGrant];
      }

      if (exists) {
        return current.filter((entry) => grantIdentityKey(entry) !== nextKey);
      }

      if (current.length >= pickLimit) {
        return [...current.slice(1), nextGrant];
      }

      return [...current, nextGrant];
    });
  }

  const grossAmountDisplay = formatAmountInput(computedGrossAmount);

  const displayedDiscountAmount =
    offerSelectionMode === "NONE"
      ? "0.00"
      : selectedOffer?.discountAmount ?? offerEvaluation?.discountAmount ?? "0.00";

  const displayedFinalAmount =
    offerSelectionMode === "NONE"
      ? grossAmountDisplay
      : selectedOffer?.finalAmount ?? offerEvaluation?.finalAmount ?? grossAmountDisplay;

  const displayedInScopeAmount =
    offerSelectionMode === "NONE"
      ? ""
      : selectedOffer?.computedInScopeAmount ?? inScopeAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const auth = await getAuth();
    if (!auth?.token) {
      setErrorMessage("Authentication is not ready yet. Please try again.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const sanitizedItems = buildSanitizedItems();
      const amount = formatAmountInput(computedGrossAmount);
      const paymentInstructionsJson = serializePaymentInstructions(
        paymentInstructionsJsonFromDraft(paymentInstructionsDraft)
      );

      if (threadId) {
        let result: OrderDTO;

        if (editingOrder?.id) {
          const request: UpdateOrderRequest = {
            grossAmount: amount,
            inScopeAmount: inScopeAmount.trim() || null,
            discountAmount: displayedDiscountAmount,
            finalAmount: displayedFinalAmount,
            notes: title.trim() || null,
            paymentInstructionsJson,
            assignedOfferId: selectedOffer?.assignedOfferId ?? null,
            offerSelectionMode,
            offerSnapshotJson: null,
            items: sanitizedItems,
          };

          result = await updateOrder(editingOrder.id, request, {
            token: auth.token,
            businessId: actingBusinessId,
          });
        } else {
          const request: CreateOrderRequest = {
            threadId,
            businessId,
            recipientIdentityType,
            recipientUserId:
              recipientIdentityType === "USER" ? recipientUserId || null : null,
            recipientBusinessId:
              recipientIdentityType === "BUSINESS"
                ? recipientBusinessId || null
                : null,
            sourceType: mode === "thread" ? "DIRECT_THREAD" : "USER_INITIATED",
            currencyCode: defaultCurrencyCode,
            grossAmount: amount,
            inScopeAmount: inScopeAmount.trim() || null,
            discountAmount: displayedDiscountAmount,
            finalAmount: displayedFinalAmount,
            notes: title.trim() || null,
            paymentInstructionsJson,
            createdByIdentityType: actorIdentityType,
            createdByIdentityId: actorIdentityId,
            selectedAssignedOfferId: selectedOffer?.assignedOfferId ?? null,
            offerSelectionMode,
            offerSnapshotJson: null,
            items: sanitizedItems,
          };

          result = await createOrder(request, {
            token: auth.token,
            businessId: actingBusinessId,
          });
        }

        onCreated?.(result);
        onClose();
        return;
      }

      if (onSubmitDraft) {
        await onSubmitDraft({
          threadId,
          businessId,
          recipientIdentityType,
          recipientUserId:
            recipientIdentityType === "USER" ? recipientUserId || null : null,
          recipientBusinessId:
            recipientIdentityType === "BUSINESS"
              ? recipientBusinessId || null
              : null,
          createdByIdentityType: actorIdentityType,
          createdByIdentityId: actorIdentityId,
          currencyCode: defaultCurrencyCode,
          grossAmount: amount,
          finalAmount: displayedFinalAmount,
          notes: title.trim() || null,
          paymentInstructionsJson,
          items: sanitizedItems,
          orderDate,
          mode,
        });

        onClose();
        return;
      }

      onClose();
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          (editingOrder ? "Failed to update order." : "Failed to create order.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="create-order-modal-backdrop" onClick={onClose}>
        <div
          className="create-order-modal create-order-modal--compact"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-order-modal-title"
        >
          <div className="create-order-modal-header">
            <div className="create-order-modal-title-wrap">
              <h2 id="create-order-modal-title">
                {editingOrder ? "Edit Order" : "Create Order"}
              </h2>
              <p className="create-order-modal-subtitle">
                {editingOrder
                  ? "Update this draft order."
                  : "Start with a total, then itemize only if needed."}
              </p>
            </div>

            <div className="create-order-modal-header-right">
              <label className="create-order-header-date">
                <span>Order date</span>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={!canEditOrder || submitting}
                />
              </label>

              <button
                type="button"
                className="create-order-modal-close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </div>

          <form className="create-order-modal-form th-form" onSubmit={handleSubmit}>
            <div className="create-order-shell">
              <div className="create-order-left">
                <section className="th-section create-order-section">
                  <div className="th-section-header create-order-section-header">
                    <h3 className="th-section-title">Order for</h3>
                  </div>

                  <div className="th-form-row--2 create-order-grid">
                    <ParticipantPicker
                      label="Business"
                      value={businessId}
                      options={businessPickerOptions}
                      onChange={setBusinessId}
                      disabled={!canEditOrder || submitting}
                    />

                    <ParticipantPicker
                      label="Recipient"
                      value={
                        recipientIdentityType === "BUSINESS"
                          ? `BUSINESS:${recipientBusinessId}`
                          : `USER:${recipientUserId}`
                      }
                      options={recipientPickerOptions}
                      onChange={handleRecipientChange}
                      disabled={!canEditOrder || submitting}
                    />
                  </div>
                </section>

                <section className="th-section create-order-section">
                  <div className="th-section-header create-order-section-header create-order-section-header-split">
                    <h3 className="th-section-title">Order details</h3>

                    <button
                      type="button"
                      className="btn btn--ghost create-order-toggle-btn"
                      onClick={() => {
                        if (!canEditOrder || submitting) return;
                        if (!isItemized) setIsItemized(true);
                        setItemModalOpen(true);
                      }}
                      disabled={!canEditOrder || submitting}
                    >
                      {isItemized ? "Edit items" : "Itemize this order"}
                    </button>
                  </div>

                  <div className="create-order-details-grid">
                    <div className="create-order-details-main">
                      <label className="th-field create-order-field create-order-field-full">
                        <span className="th-label">Title</span>
                        <input
                          className="th-input"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          disabled={!canEditOrder || submitting}
                          required
                        />
                      </label>

                      {!isItemized ? (
                        <label className="th-field create-order-field create-order-field-full">
                          <span className="th-label">Total amount</span>
                          <input
                            className="th-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            disabled={!canEditOrder || submitting}
                          />
                        </label>
                      ) : (
                        <div className="create-order-items-summary-card create-order-field-full">
                          <div className="create-order-items-summary-head">
                            <strong>
                              {itemCount} item{itemCount === 1 ? "" : "s"}
                            </strong>
                            <span>
                              {defaultCurrencyCode} {formatAmountInput(computedGrossAmount)}
                            </span>
                          </div>

                          <div className="create-order-items-summary-text">
                            {itemSummaryText}
                          </div>

                          <div className="create-order-items-summary-actions">
                            <button
                              type="button"
                              className="btn btn--ghost create-order-secondary-btn"
                              onClick={() => setItemModalOpen(true)}
                              disabled={!canEditOrder || submitting}
                            >
                              Edit items
                            </button>

                            <button
                              type="button"
                              className="create-order-secondary-btn"
                              onClick={() => {
                                if (!canEditOrder || submitting) return;
                                setIsItemized(false);
                                setItems([makeDraftItem()]);
                                setSelectedGrants([]);
                              }}
                              disabled={!canEditOrder || submitting}
                            >
                              Use simple total
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="create-order-details-side">
                      <div className="th-field create-order-field create-order-field-full">
                        <span className="th-label">Payment instructions</span>

                        <div className="create-order-payment-instructions-card">
                          <div className="create-order-payment-instructions-text">
                            {paymentInstructionsSummaryText}
                          </div>

                          <button
                            type="button"
                            className="btn btn--ghost create-order-secondary-btn"
                            onClick={() => setPaymentInstructionsModalOpen(true)}
                            disabled={!canEditOrder || submitting}
                          >
                            {paymentInstructionEntryCount > 0 ||
                            paymentInstructionsDraft.text.trim()
                              ? "Edit payment instructions"
                              : "Add payment instructions"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="create-order-right">
                <div className="create-order-summary-panel">
                  <div className="create-order-summary-panel-header">
                    <span className="create-order-summary-panel-kicker">
                      Order summary
                    </span>
                    <strong>
                      {defaultCurrencyCode} {formatAmountInput(computedGrossAmount)}
                    </strong>
                  </div>

                  <div className="create-order-divider" />

                  <div className="create-order-summary-row create-order-summary-row--input">
                    <span>In-scope amount</span>
                    <input
                      className="th-input"
                      type="number"
                      value={displayedInScopeAmount}
                      onChange={(e) => setInScopeAmount(e.target.value)}
                      disabled={!canEditOrder || submitting}
                    />
                  </div>

                  <div className="create-order-summary-row">
                    <span>Discount</span>
                    <strong>
                      {defaultCurrencyCode} {displayedDiscountAmount}
                    </strong>
                  </div>

                  <div className="create-order-summary-row create-order-summary-final">
                    <span>Payable</span>
                    <strong>
                      {defaultCurrencyCode} {displayedFinalAmount}
                    </strong>
                  </div>

                  <div className="create-order-actions-inline">
                    <button
                      type="button"
                      className="btn btn--ghost create-order-secondary-btn"
                      onClick={handleEvaluateOffers}
                      disabled={!threadId || !canSubmit || !canEditOrder || submitting}
                    >
                      {evaluatingOffers ? "Evaluating..." : "Evaluate offers"}
                    </button>

                    {offerEvaluation?.options?.length ? (
                      <button
                        type="button"
                        className="btn btn--ghost create-order-secondary-btn"
                        onClick={() => setOfferPickerOpen(true)}
                        disabled={!canEditOrder || submitting}
                      >
                        {selectedOffer ? "Change offer" : "View offers"}
                      </button>
                    ) : null}
                  </div>

                  {selectedOffer ? (
                    <div className="create-order-offer-inline">
                      <strong>{selectedOffer.offerTitle}</strong>
                      {selectedOffer.offerType === "GRANT" && selectedGrants.length > 0 ? (
                        <div className="create-order-offer-option-reason">
                          {selectedGrants.length} grant item selected
                        </div>
                      ) : null}
                    </div>
                  ) : offerSelectionMode === "NONE" ? (
                    <div className="create-order-offer-inline">
                      <strong>No offer selected</strong>
                    </div>
                  ) : null}

                  {offerEvaluation?.warnings?.length ? (
                    <div className="create-order-offer-warnings">
                      {offerEvaluation.warnings.map((warning, index) => (
                        <div key={`${warning}-${index}`} className="create-order-warning">
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {errorMessage && <div className="create-order-error">{errorMessage}</div>}

            {editingOrder && !canEditOrder && editingOrder.allowedActions?.reason ? (
              <div className="create-order-inline-note">
                {editingOrder.allowedActions.reason}
              </div>
            ) : null}

            <div className="create-order-footer th-actions">
              <button
                type="button"
                className="btn btn--ghost create-order-secondary-btn"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn--primary create-order-primary-btn"
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Saving..." : editingOrder ? "Update order" : "Create order"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <OrderItemizationModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        items={items}
        setItems={setItems}
        productOptions={internalProductOptions}
        bundleOptions={internalBundleOptions}
        currencyCode={defaultCurrencyCode}
        onUseSimpleTotal={() => {
          setIsItemized(false);
          setItems([makeDraftItem()]);
          setSelectedGrants([]);
        }}
      />

      <PaymentInstructionsModal
        isOpen={paymentInstructionsModalOpen}
        onClose={() => setPaymentInstructionsModalOpen(false)}
        initialValue={paymentInstructionsDraft}
        onSave={setPaymentInstructionsDraft}
        userId={paymentInstructionsUserId}
      />

      {offerPickerOpen ? (
        <div
          className="create-order-offer-picker-backdrop"
          onClick={() => setOfferPickerOpen(false)}
        >
          <div
            className="create-order-offer-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="create-order-offer-picker-header">
              <h3>Available offers</h3>
              <button
                type="button"
                className="create-order-modal-close"
                onClick={() => setOfferPickerOpen(false)}
                aria-label="Close offers"
              >
                ×
              </button>
            </div>

            <div className="create-order-offer-picker-list">
              <button
                type="button"
                className={`create-order-offer-option ${!selectedOffer ? "active" : ""}`}
                onClick={handleUseNoOffer}
              >
                <div className="create-order-offer-option-head">
                  <strong>No offer</strong>
                </div>
                <div className="create-order-offer-option-meta">
                  <span>
                    Payable {defaultCurrencyCode} {formatAmountInput(computedGrossAmount)}
                  </span>
                </div>
              </button>

              {(offerEvaluation?.options ?? []).map((option) => {
                const grantPickLimit = Math.max(1, Number(option.grantPickLimit ?? 1));

                return (
                  <div
                    key={option.assignedOfferId}
                    className={`create-order-offer-option ${
                      selectedOffer?.assignedOfferId === option.assignedOfferId
                        ? "active"
                        : ""
                    } ${!option.isEligible ? "disabled" : ""}`}
                  >
                    <button
                      type="button"
                      className="create-order-offer-option-click"
                      onClick={() => handleSelectOffer(option)}
                      disabled={!option.isEligible}
                    >
                      <div className="create-order-offer-option-head">
                        <strong>{option.offerTitle}</strong>
                        {option.isBest ? (
                          <span className="create-order-offer-option-badge">Best</span>
                        ) : null}
                      </div>

                      {option.description ? (
                        <p className="create-order-offer-option-description">
                          {option.description}
                        </p>
                      ) : null}

                      <div className="create-order-offer-option-meta">
                        <span>
                          Saves {defaultCurrencyCode} {option.discountAmount}
                        </span>
                        <span>
                          Payable {defaultCurrencyCode} {option.finalAmount}
                        </span>
                      </div>
                    </button>

                    {option.offerType === "GRANT" && option.availableGrants?.length ? (
                      <div className="grant-picker">
                        <div className="create-order-offer-option-reason">
                          {option.skipReason || `Choose up to ${grantPickLimit} grant item(s).`}
                        </div>

                        <div className="grant-picker-grid">
                          {option.availableGrants.map((grant) => {
                            const key = grantSnapshotKey(grant);
                            const isSelected = selectedGrants.some(
                              (entry) => grantIdentityKey(entry) === key
                            );

                            return (
                              <button
                                key={key}
                                type="button"
                                className={`grant-option ${isSelected ? "selected" : ""}`}
                                onClick={() => toggleGrantSelection(option, grant)}
                                disabled={!option.isEligible}
                              >
                                {grantSnapshotLabel(grant)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : option.skipReason ? (
                      <div className="create-order-offer-option-reason">
                        {option.skipReason}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}