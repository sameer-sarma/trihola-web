// src/services/orderService.ts

import type {
  AddPaymentProofAttachmentsRequest,
  AddSinglePaymentProofAttachmentRequest,
  ApproveBusinessReviewRequest,
  AttachOfferToOrderRequest,
  CreateOrderRequest,
  CreatePaymentProofRequest,
  EvaluateOrderOffersRequest,
  EvaluateOrderOffersResponse,
  OrderDTO,
  PaymentProofDTO,
  RejectPaymentProofRequest,
  UpdateOrderRequest,
  VerifyPaymentProofRequest,
} from "../types/orderTypes";

//const API_BASE_URL =
//  (import.meta as any)?.env?.VITE_API_BASE_URL || "http://127.0.0.1:8080";

const API_BASE_URL = __API_BASE__;

type RequestOptions = {
  token?: string | null;
  businessId?: string | null;
};

function buildHeaders(options?: RequestOptions, hasBody = false): HeadersInit {
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  if (options?.businessId) {
    headers["X-Acting-Business-Id"] = options.businessId;
  }

  return headers;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return `Request failed with status ${response.status}`;
    }

    try {
      const json = JSON.parse(text);
      if (typeof json === "string") return json;
      if (json?.message) return json.message;
      if (json?.error) return json.error;
      return text;
    } catch {
      return text;
    }
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  options?: RequestOptions
): Promise<T> {
  const hasBody = init.body != null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(options, hasBody),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function requestVoid(
  path: string,
  init: RequestInit = {},
  options?: RequestOptions
): Promise<void> {
  const hasBody = init.body != null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(options, hasBody),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
}

export async function createOrder(
  req: CreateOrderRequest,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function evaluateOrderOffers(
  req: EvaluateOrderOffersRequest,
  options?: RequestOptions
): Promise<EvaluateOrderOffersResponse> {
  return requestJson<EvaluateOrderOffersResponse>(
    "/orders/evaluate-offers",
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function fetchOrderById(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(`/orders/${orderId}`, { method: "GET" }, options);
}

export async function fetchOrdersByThreadId(
  threadId: string,
  options?: RequestOptions
): Promise<OrderDTO[]> {
  return requestJson<OrderDTO[]>(
    `/orders/thread/${threadId}`,
    { method: "GET" },
    options
  );
}

export async function updateOrder(
  orderId: string,
  req: UpdateOrderRequest,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}`,
    {
      method: "PUT",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function attachOfferToOrder(
  orderId: string,
  req: AttachOfferToOrderRequest,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/attach-offer`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function deleteDraftOrder(
  orderId: string,
  options?: RequestOptions
): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(
    `/orders/${orderId}`,
    { method: "DELETE" },
    options
  );
}

export async function submitOrderByBusiness(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/submit`,
    { method: "POST" },
    options
  );
}

export async function submitOrderForBusinessReview(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/submit-for-business-review`,
    { method: "POST" },
    options
  );
}

export async function approveBusinessReview(
  orderId: string,
  req: ApproveBusinessReviewRequest,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/approve-business-review`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function revertOrderToDraft(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/revert-to-draft`,
    { method: "POST" },
    options
  );
}

export async function rejectOrder(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/reject`,
    { method: "POST" },
    options
  );
}

export async function cancelOrder(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/cancel`,
    { method: "POST" },
    options
  );
}

export async function completeOrder(
  orderId: string,
  options?: RequestOptions
): Promise<OrderDTO> {
  return requestJson<OrderDTO>(
    `/orders/${orderId}/complete`,
    { method: "POST" },
    options
  );
}

export async function createPaymentProof(
  orderId: string,
  req: CreatePaymentProofRequest,
  options?: RequestOptions
): Promise<PaymentProofDTO> {
  return requestJson<PaymentProofDTO>(
    `/orders/${orderId}/payment-proofs`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function fetchDraftOrdersByThreadId(
  threadId: string,
  options?: RequestOptions
): Promise<OrderDTO[]> {
  return requestJson<OrderDTO[]>(
    `/orders/thread/${threadId}/drafts`,
    { method: "GET" },
    options
  );
}

export async function fetchPaymentProofsByOrderId(
  orderId: string,
  options?: RequestOptions
): Promise<PaymentProofDTO[]> {
  return requestJson<PaymentProofDTO[]>(
    `/orders/${orderId}/payment-proofs`,
    { method: "GET" },
    options
  );
}

export async function addPaymentProofAttachments(
  paymentProofId: string,
  req: AddPaymentProofAttachmentsRequest,
  options?: RequestOptions
): Promise<PaymentProofDTO> {
  return requestJson<PaymentProofDTO>(
    `/payment-proofs/${paymentProofId}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function addSinglePaymentProofAttachment(
  paymentProofId: string,
  req: AddSinglePaymentProofAttachmentRequest,
  options?: RequestOptions
): Promise<PaymentProofDTO> {
  return requestJson<PaymentProofDTO>(
    `/payment-proofs/${paymentProofId}/attachments/single`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function deletePaymentProofAttachment(
  paymentProofId: string,
  attachmentId: string,
  options?: RequestOptions
): Promise<PaymentProofDTO> {
  return requestJson<PaymentProofDTO>(
    `/payment-proofs/${paymentProofId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    },
    options
  );
}

export async function deletePaymentProof(
  paymentProofId: string,
  options?: RequestOptions
): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(
    `/payment-proofs/${paymentProofId}`,
    {
      method: "DELETE",
    },
    options
  );
}

export async function verifyPaymentProof(
  paymentProofId: string,
  req: VerifyPaymentProofRequest,
  options?: RequestOptions
): Promise<PaymentProofDTO> {
  return requestJson<PaymentProofDTO>(
    `/payment-proofs/${paymentProofId}/verify`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

export async function rejectPaymentProof(
  paymentProofId: string,
  req: RejectPaymentProofRequest,
  options?: RequestOptions
): Promise<PaymentProofDTO> {
  return requestJson<PaymentProofDTO>(
    `/payment-proofs/${paymentProofId}/reject`,
    {
      method: "POST",
      body: JSON.stringify(req),
    },
    options
  );
}

/**
 * Optional convenience helper if you ever need a non-JSON endpoint later.
 * Keeping it here since the rest of your services often evolve.
 */
export async function pingOrderEndpoint(
  options?: RequestOptions
): Promise<void> {
  return requestVoid("/orders", { method: "GET" }, options);
}