// src/types/orderTypes.ts

export type OrderStatus =
  | "DRAFT"
  | "PENDING_BUSINESS_REVIEW"
  | "SUBMITTED"
  | "PAYMENT_REPORTED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type PaymentStatus =
  | "NOT_REQUIRED"
  | "AWAITING_PAYMENT"
  | "PROOF_SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export type PaymentProofStatus =
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export type PaymentProofType =
  | "SCREENSHOT"
  | "TXN_ID"
  | "RECEIPT"
  | "NOTE";

export type OfferRedemptionAttemptStatus =
  | "INITIATED"
  | "RESERVED"
  | "AWAITING_PAYMENT"
  | "AWAITING_VERIFICATION"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "RELEASED";

export type OfferRedemptionAttemptType =
  | "OFFLINE_MANUAL"
  | "OFFLINE_WITH_PROOF"
  | "ONLINE_CODE"
  | "ONLINE_AUTO"
  | "BROADCAST_ORDER";

export type OfferSelectionMode = "NONE" | "AUTO" | "MANUAL";

export type OrderSourceType =
  | "DIRECT_THREAD"
  | "USER_INITIATED"
  | "POST_FACTO"
  | "BROADCAST";

export type IdentityType = "USER" | "BUSINESS" | string;

export type OrderItemDTO = {
  id: string;
  orderId: string;
  label: string;
  quantity: number;
  unitAmount: string;
  lineAmount: string;
  productId?: string | null;
  bundleId?: string | null;
  sortOrder: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProofAttachmentDTO = {
  id: string;
  paymentProofId: string;
  submittedByIdentityType: IdentityType;
  submittedByIdentityId: string;
  type: PaymentProofType;
  attachmentUrl?: string | null;
  referenceCode?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProofDTO = {
  id: string;
  orderId: string;
  submittedByIdentityType: IdentityType;
  submittedByIdentityId: string;
  comment?: string | null;
  status: PaymentProofStatus;
  verifiedByIdentityType?: IdentityType | null;
  verifiedByIdentityId?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: PaymentProofAttachmentDTO[];
};

export type OfferRedemptionAttemptDTO = {
  id: string;
  assignedOfferId: string;
  orderId: string;
  threadId: string;
  businessId: string;

  recipientIdentityType: IdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;

  attemptType: OfferRedemptionAttemptType;
  status: OfferRedemptionAttemptStatus;

  grossAmountSnapshot: string;
  inScopeAmountSnapshot?: string | null;
  discountAmountSnapshot: string;
  finalAmountSnapshot: string;

  redemptionCode?: string | null;
  codeStatus?: string | null;
  codeExpiresAt?: string | null;

  initiatedByIdentityType: IdentityType;
  initiatedByIdentityId: string;

  expiresAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  releasedAt?: string | null;
  failureReason?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type ThreadOrderCardDTO = {
  id: string;
  threadId: string;
  businessId: string;

  recipientIdentityType: IdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;
  createdByIdentityType: IdentityType;
  createdByIdentityId: string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  sourceBroadcastId?: string | null;
  sourceBroadcastItemId?: string | null;
  sourceBroadcastPosition?: number | null
  
  currencyCode: string;
  grossAmount: string;
  discountAmount: string;
  finalAmount: string;

  lastEventText?: string | null;
  notes?: string | null;

  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type OrderDTO = {
  id: string;
  threadId: string;
  businessId: string;

  recipientIdentityType: IdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;

  sourceType: OrderSourceType;
  sourceBroadcastId?: string | null;
  sourceBroadcastItemId?: string | null;
  orderTemplateId?: string | null;

  currencyCode: string;

  grossAmount: string;
  inScopeAmount?: string | null;
  discountAmount: string;
  finalAmount: string;

  assignedOfferId?: string | null;
  offerSelectionMode: OfferSelectionMode;
  offerSnapshotJson?: string | null;

  status: OrderStatus;
  paymentStatus: PaymentStatus;

  summary?: string | null;
  notes?: string | null;
  paymentInstructionsJson?: string | null;

  createdByIdentityType: IdentityType;
  createdByIdentityId: string;

  approvedByIdentityType?: IdentityType | null;
  approvedByIdentityId?: string | null;

  approvedAt?: string | null;
  completedAt?: string | null;

  createdAt: string;
  updatedAt: string;

  items: OrderItemDTO[];
  paymentProofs: PaymentProofDTO[];
  activeRedemptionAttempt?: OfferRedemptionAttemptDTO | null;
  allowedActions?: OrderAllowedActionsDTO | null;
};

export type SelectedGrantInput = {
  itemType: string;
  productId?: string | null;
  bundleId?: string | null;
  quantity: number;
};

export type CreateOrderItemRequest = {
  label: string;
  quantity?: number;
  unitAmount: string;
  lineAmount: string;
  productId?: string | null;
  bundleId?: string | null;
  sortOrder?: number;
  notes?: string | null;
};

export type CreateOrderRequest = {
  threadId: string;
  businessId: string;

  recipientIdentityType: IdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;

  sourceType?: OrderSourceType;
  sourceBroadcastId?: string | null;
  sourceBroadcastItemId?: string | null;
  orderTemplateId?: string | null;

  currencyCode?: string;

  grossAmount: string;
  inScopeAmount?: string | null;
  discountAmount?: string;
  finalAmount: string;

  notes?: string | null;
  paymentInstructionsJson?: string | null;

  createdByIdentityType: IdentityType;
  createdByIdentityId: string;

  selectedAssignedOfferId?: string | null;
  offerSelectionMode?: OfferSelectionMode;
  offerSnapshotJson?: string | null;

  items?: CreateOrderItemRequest[];
};

export type UpdateOrderRequest = {
  grossAmount?: string;
  inScopeAmount?: string | null;
  discountAmount?: string;
  finalAmount?: string;

  notes?: string | null;
  paymentInstructionsJson?: string | null;

  assignedOfferId?: string | null;
  offerSelectionMode?: OfferSelectionMode | null;
  offerSnapshotJson?: string | null;

  items?: CreateOrderItemRequest[] | null;
};

export type CreatePaymentProofAttachmentRequest = {
  submittedByIdentityType: IdentityType;
  submittedByIdentityId: string;
  type: PaymentProofType;
  attachmentUrl?: string | null;
  referenceCode?: string | null;
  comment?: string | null;
};

export type CreatePaymentProofRequest = {
  submittedByIdentityType: IdentityType;
  submittedByIdentityId: string;
  comment?: string | null;
  attachments?: CreatePaymentProofAttachmentRequest[];
};

export type AddSinglePaymentProofAttachmentRequest = {
  submittedByIdentityType: IdentityType;
  submittedByIdentityId: string;
  type: PaymentProofType;
  attachmentUrl?: string | null;
  referenceCode?: string | null;
  comment?: string | null;
};

export type AddPaymentProofAttachmentsRequest = {
  attachments: CreatePaymentProofAttachmentRequest[];
};

export type ApproveBusinessReviewRequest = {
  approvedByIdentityType: IdentityType;
  approvedByIdentityId: string;
};

export type AttachOfferToOrderRequest = {
  assignedOfferId: string;
  offerSelectionMode: OfferSelectionMode;
  offerSnapshotJson?: string | null;
  initiatedByIdentityType: IdentityType;
  initiatedByIdentityId: string;
};

export type VerifyPaymentProofRequest = {
  verifiedByIdentityType: IdentityType;
  verifiedByIdentityId: string;
};

export type RejectPaymentProofRequest = {
  verifiedByIdentityType: IdentityType;
  verifiedByIdentityId: string;
  rejectionReason?: string | null;
};

export type ScopeItemMini = {
  id: string;
  name?: string | null;
  title?: string | null;
  label?: string | null;
};

export type ScopeItemSnapshot = {
  itemType: "PRODUCT" | "BUNDLE" | string;
  product?: ScopeItemMini | null;
  bundle?: ScopeItemMini | null;
};

export type EvaluatedOrderOfferOptionDTO = {
  assignedOfferId: string;
  offerTemplateId: string;

  offerTitle: string;
  description?: string | null;
  offerType: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "GRANT" | string;

  claimPolicy?: "ONLINE" | "MANUAL" | "BOTH" | string | null;
  scopeKind: "ANY" | "LIST" | string;
  scopeItems: ScopeItemSnapshot[];

  availableGrants?: GrantItemSnapshot[];
  grantPickLimit?: number;
  selectedGrants?: SelectedGrantInput[];

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

export type EvaluateOrderOffersRequest = {
  threadId: string;
  businessId: string;

  recipientIdentityType: IdentityType;
  recipientUserId?: string | null;
  recipientBusinessId?: string | null;

  currencyCode?: string;
  grossAmount: string;
  inScopeAmount?: string | null;

  notes?: string | null;
  paymentInstructionsJson?: string | null;

  items?: CreateOrderItemRequest[];
  selectedGrants?: SelectedGrantInput[];
};

export type EvaluateOrderOffersResponse = {
  grossAmount: string;
  inputInScopeAmount?: string | null;

  recommendedAssignedOfferId?: string | null;
  recommendedOfferSelectionMode: OfferSelectionMode;

  discountAmount: string;
  finalAmount: string;

  requiresManualInScopeAmount: boolean;
  warnings: string[];

  options: EvaluatedOrderOfferOptionDTO[];
};

export type OrderAllowedActionsDTO = {
  canEdit: boolean;
  canDeleteDraft: boolean;
  canSubmit: boolean;
  canSubmitForBusinessReview: boolean;
  canApproveBusinessReview: boolean;
  canRevertToDraft: boolean;
  canCancel: boolean;
  canReject: boolean;
  canAddPaymentProof: boolean;
  canRejectPaymentProof: boolean;
  canComplete: boolean;
  reason?: string | null;
};

export type PaymentProofDraftAttachment = {
  id: string;
  type: PaymentProofType;
  attachmentUrl?: string | null;
  referenceCode?: string | null;
  comment?: string | null;
  file?: File | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  path?: string | null;
};

export type PaymentProofDraft = {
  comment: string;
  attachments: PaymentProofDraftAttachment[];
};

export function makePaymentProofDraftAttachmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `proof-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyPaymentProofDraft(): PaymentProofDraft {
  return {
    comment: "",
    attachments: [],
  };
}

export function createPaymentProofRequestFromDraft(
  draft: PaymentProofDraft,
  submittedByIdentityType: IdentityType,
  submittedByIdentityId: string
): CreatePaymentProofRequest {
  return {
    submittedByIdentityType,
    submittedByIdentityId,
    comment: draft.comment.trim() || null,
    attachments: draft.attachments
      .map((item) => ({
        submittedByIdentityType,
        submittedByIdentityId,
        type: item.type,
        attachmentUrl: item.attachmentUrl?.trim() || null,
        referenceCode: item.referenceCode?.trim() || null,
        comment: item.comment?.trim() || null,
      }))
      .filter(
        (item) =>
          !!item.attachmentUrl ||
          !!item.referenceCode ||
          !!item.comment
      ),
  };
}

export type GrantItemSnapshot = {
  itemType: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    slug?: string;
    primaryImageUrl?: string;
  } | null;
  bundle?: {
    id: string;
    title: string;
  } | null;
};