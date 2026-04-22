import { useEffect, useState } from "react";
import {
  approveBusinessReview,
  cancelOrder,
  completeOrder,
  createPaymentProof,
  rejectPaymentProof, 
  deleteDraftOrder,
  fetchOrderById,
  rejectOrder,
  revertOrderToDraft,
  submitOrderByBusiness,
  submitOrderForBusinessReview,
} from "../../../services/orderService";
import type {
  OrderDTO,
  PaymentProofDraft,
} from "../../../types/orderTypes";
import AddPaymentProofModal from "../../../components/AddPaymentProofModal";
import { parsePaymentInstructionsJson } from "../../../types/paymentInstruction";
import "../../../css/new-chat-drawer.css";

function formatMoney(value?: string | number | null) {
  return Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    window.prompt("Copy this value:", value);
  }
}

type Props = {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
  getAuth: () => Promise<{ token: string; userId: string } | null>;
  businessId?: string | null;
  onUpdated?: () => Promise<void> | void;
};

export default function OrderDetailsDrawer({
  open,
  orderId,
  onClose,
  getAuth,
  businessId,
  onUpdated,
}: Props) {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAddPaymentProofModal, setShowAddPaymentProofModal] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const auth = await getAuth();
        if (!auth?.token) {
          if (!cancelled) setErr("Not authenticated");
          return;
        }

        const data = await fetchOrderById(orderId, {
          token: auth.token,
          businessId,
        });

        if (!cancelled) {
          setOrder(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Failed to load order");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, orderId, getAuth, businessId]);

  const allowed = order?.allowedActions;

  async function refreshCurrentOrder() {
    if (!order?.id) return;

    const auth = await getAuth();
    if (!auth?.token) {
      setErr("Not authenticated");
      return;
    }

    const refreshed = await fetchOrderById(order.id, {
      token: auth.token,
      businessId,
    });

    setOrder(refreshed);
  }

  async function handleAction(fn: (authToken: string) => Promise<unknown>) {
    if (!order) return;

    try {
      setBusy(true);
      setErr(null);

      const auth = await getAuth();
      if (!auth?.token) {
        setErr("Not authenticated");
        return;
      }

      const res = await fn(auth.token);

      const looksLikeOrder =
        !!res &&
        typeof res === "object" &&
        "id" in res &&
        "status" in res &&
        "threadId" in res &&
        "paymentStatus" in res;

      if (looksLikeOrder) {
        setOrder(res as OrderDTO);
      } else {
        await refreshCurrentOrder();
      }

      await onUpdated?.();
    } catch (e: any) {
      setErr(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  }

    async function handleApproveBusinessReview() {
    if (!order) return;

    const approvedByIdentityType = businessId ? "BUSINESS" : "USER";
    const approvedByIdentityId =
      businessId ||
      order.createdByIdentityId;

    await handleAction((token) =>
      approveBusinessReview(
        order.id,
        {
          approvedByIdentityType,
          approvedByIdentityId,
        },
        {
          token,
          businessId,
        }
      )
    );
  }

  async function handleSavePaymentProof(draft: PaymentProofDraft) {
    if (!order) return;

    const auth = await getAuth();
    if (!auth?.token) {
      setErr("Not authenticated");
      return;
    }

    await createPaymentProof(
      order.id,
      {
        submittedByIdentityType:
          businessId ? "BUSINESS" : order.recipientIdentityType,
        submittedByIdentityId:
          businessId
            ? businessId
            : order.recipientIdentityType === "USER"
              ? order.recipientUserId || auth.userId
              : order.recipientBusinessId || "",
        comment: draft.comment.trim() || null,
        attachments: draft.attachments
          .map((item) => ({
            submittedByIdentityType:
              businessId ? "BUSINESS" : order.recipientIdentityType,
            submittedByIdentityId:
              businessId
                ? businessId
                : order.recipientIdentityType === "USER"
                  ? order.recipientUserId || auth.userId
                  : order.recipientBusinessId || "",
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
      },
      {
        token: auth.token,
        businessId,
      }
    );

    await refreshCurrentOrder();
    await onUpdated?.();
  }

  async function handleRejectPaymentProof() {
    if (!order || order.paymentProofs.length === 0) return;

    const proof = order.paymentProofs[0]; // single proof model

    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;

    await handleAction((token) =>
      rejectPaymentProof(
        proof.id,
        {
          verifiedByIdentityType: businessId ? "BUSINESS" : "USER",
          verifiedByIdentityId:
            businessId || order.createdByIdentityId,
          rejectionReason: reason,
        },
        {
          token,
          businessId,
        }
      )
    );
  }

  const appliedOfferTitle = (() => {
    const raw = order?.offerSnapshotJson;
    if (!raw) return null;

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const title = String(parsed?.offerTitle ?? "").trim();
      return title || null;
    } catch {
      return null;
    }
  })();

  const paymentInstructions = parsePaymentInstructionsJson(
    order?.paymentInstructionsJson ?? null
  );

  const paymentEntries = paymentInstructions?.entries ?? [];
  const paymentIntroText = paymentInstructions?.text?.trim() || null;

  if (!open) return null;

  return (
    <>
      <div className="new-chat-overlay" onClick={onClose}>
        <div className="new-chat-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="new-chat-header">
            <div className="new-chat-title">Order Details</div>
            <button
              type="button"
              className="new-chat-close"
              onClick={onClose}
              disabled={busy}
            >
              ✕
            </button>
          </div>

          <div className="new-chat-body order-details-body">
            {loading && <div className="loading">Loading...</div>}
            {!!err && <div className="error">{err}</div>}

            {order && (
              <div className="order-details-layout">
                <section className="order-card order-card--hero">
                  <div className="order-hero-top">
                    <div>
                      <div className="order-eyebrow">Order status</div>
                      <div className="order-status-row">
                        <span className="order-status-pill">{order.status}</span>
                        <span className="order-payment-pill">
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="order-total-block">
                      <div className="order-total-label">Final amount</div>
                      <div className="order-total-value">
                        ₹
                        {formatMoney(order.finalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="order-meta-grid">
                    <div className="order-meta-item">
                      <span className="order-meta-label">Date</span>
                      <span className="order-meta-value">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="order-meta-item">
                      <span className="order-meta-label">Title</span>
                      <span className="order-meta-value">
                        {order.notes || "Untitled order"}
                      </span>
                    </div>

                    {appliedOfferTitle ? (
                      <div className="order-meta-item">
                        <span className="order-meta-label">Offer applied</span>
                        <span className="order-meta-value">
                          {appliedOfferTitle}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="order-card">
                  <div className="order-section-title">
                    Items ({order.items.length})
                  </div>

                  <div className="order-items-list">
                    {order.items.map((item) => {
                      const isInScope =
                        !!order.inScopeAmount &&
                        Number(item.lineAmount ?? 0) > 0 &&
                        item.label !== "Additional out-of-scope amount";

                      return (
                        <div
                          key={item.id}
                          className={`order-item-row ${isInScope ? "is-inscope" : ""}`}
                        >
                          <div className="order-item-main">
                            <span className="order-item-title">{item.label}</span>
                            <span className="order-item-divider">·</span>
                            <span className="order-item-qty">
                              {item.quantity} unit{item.quantity === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="order-item-amount">
                            ₹{formatMoney(item.lineAmount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="order-card">
                  <div className="order-section-title">Amounts</div>

                  <div className="order-amount-grid">
                    <div className="order-amount-row">
                      <span>Gross</span>
                      <strong>
                        ₹
                        {Number(order.grossAmount ?? 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </div>

                    {order.inScopeAmount ? (
                      <div className="order-amount-row">
                        <span>In scope</span>
                        <strong>
                          ₹
                          {Number(order.inScopeAmount ?? 0).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>
                    ) : null}

                    <div className="order-amount-row">
                      <span>Discount</span>
                      <strong>
                        ₹
                        {Number(order.discountAmount ?? 0).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </strong>
                    </div>

                    <div className="order-amount-row order-amount-row--final">
                      <span>Final</span>
                      <strong>
                        ₹
                        {Number(order.finalAmount ?? 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </div>
                  </div>
                </section>

                {paymentIntroText || paymentEntries.length > 0 ? (
                  <section className="order-card">
                    <div className="order-section-title">How to pay</div>

                    {paymentIntroText ? (
                      <div className="order-payment-intro">
                        {paymentIntroText}
                      </div>
                    ) : null}

                    {paymentEntries.length === 0 ? (
                      <div className="order-empty-state">
                        <div className="muted">No payment instructions added</div>
                      </div>
                    ) : (
                      <div className="order-payment-entry-list">
                        {paymentEntries.map((entry) => {
                          if (entry.type === "PHONE") {
                            return (
                              <div
                                key={entry.id}
                                className="order-payment-entry-card"
                              >
                                <div className="order-payment-entry-top">
                                  <div className="order-payment-entry-label">
                                    {entry.label || "Phone number"}
                                  </div>
                                </div>

                                <div className="order-payment-entry-value">
                                  {entry.phoneNumber}
                                </div>

                                <div className="order-payment-entry-actions">
                                  <button
                                    type="button"
                                    className="order-inline-action"
                                    onClick={() => copyText(entry.phoneNumber)}
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (entry.type === "UPI_ID") {
                            return (
                              <div
                                key={entry.id}
                                className="order-payment-entry-card"
                              >
                                <div className="order-payment-entry-top">
                                  <div className="order-payment-entry-label">
                                    {entry.label || "UPI ID"}
                                  </div>
                                </div>

                                <div className="order-payment-entry-value">
                                  {entry.upiId}
                                </div>

                                <div className="order-payment-entry-actions">
                                  <button
                                    type="button"
                                    className="order-inline-action"
                                    onClick={() => copyText(entry.upiId)}
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (entry.type === "QR_CODE") {
                            return (
                              <div
                                key={entry.id}
                                className="order-payment-entry-card"
                              >
                                <div className="order-payment-entry-top">
                                  <div className="order-payment-entry-label">
                                    {entry.label || "QR code"}
                                  </div>
                                </div>

                                {entry.fileUrl ? (
                                  <a
                                    href={entry.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="order-payment-qr-link"
                                  >
                                    <img
                                      src={entry.fileUrl}
                                      alt={entry.label || "QR code"}
                                      className="order-payment-qr-image"
                                    />
                                  </a>
                                ) : null}

                                {entry.fileName ? (
                                  <div className="order-payment-entry-subtext">
                                    {entry.fileName}
                                  </div>
                                ) : null}

                                <div className="order-payment-entry-actions">
                                  {entry.fileUrl ? (
                                    <a
                                      href={entry.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="order-inline-action order-inline-action-link"
                                    >
                                      Open
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            );
                          }

                          if (entry.type === "NEFT") {
                            return (
                              <div
                                key={entry.id}
                                className="order-payment-entry-card"
                              >
                                <div className="order-payment-entry-top">
                                  <div className="order-payment-entry-label">
                                    {entry.label || "NEFT details"}
                                  </div>
                                </div>

                                <div className="order-payment-detail-grid">
                                  {entry.accountName ? (
                                    <div className="order-payment-detail-row">
                                      <span>Account name</span>
                                      <strong>{entry.accountName}</strong>
                                    </div>
                                  ) : null}

                                  <div className="order-payment-detail-row">
                                    <span>Account number</span>
                                    <strong>{entry.accountNumber}</strong>
                                  </div>

                                  <div className="order-payment-detail-row">
                                    <span>IFSC</span>
                                    <strong>{entry.ifscCode}</strong>
                                  </div>

                                  {entry.bankName ? (
                                    <div className="order-payment-detail-row">
                                      <span>Bank</span>
                                      <strong>{entry.bankName}</strong>
                                    </div>
                                  ) : null}

                                  {entry.branchName ? (
                                    <div className="order-payment-detail-row">
                                      <span>Branch</span>
                                      <strong>{entry.branchName}</strong>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="order-payment-entry-actions">
                                  <button
                                    type="button"
                                    className="order-inline-action"
                                    onClick={() =>
                                      copyText(
                                        [
                                          entry.accountName
                                            ? `Account Name: ${entry.accountName}`
                                            : null,
                                          `Account Number: ${entry.accountNumber}`,
                                          `IFSC: ${entry.ifscCode}`,
                                          entry.bankName
                                            ? `Bank: ${entry.bankName}`
                                            : null,
                                          entry.branchName
                                            ? `Branch: ${entry.branchName}`
                                            : null,
                                        ]
                                          .filter(Boolean)
                                          .join("\n")
                                      )
                                    }
                                  >
                                    Copy details
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

                <section className="order-card">
                  <div className="order-section-title">Payment Proofs</div>

                  {order.paymentProofs.length === 0 ? (
                    <div className="order-empty-state">
                      <div className="muted">No proofs yet</div>
                    </div>
                  ) : (
                    <div className="order-proof-list">
                      {order.paymentProofs.map((p) => (
                        <div key={p.id} className="proof-card">
                          <div className="proof-row">
                            <span>Status</span>
                            <strong>{p.status}</strong>
                          </div>

                          {p.comment ? (
                            <div className="proof-text">
                              <strong>Comment:</strong> {p.comment}
                            </div>
                          ) : null}

                          {p.rejectionReason ? (
                            <div className="proof-text">
                              <strong>Rejection reason:</strong>{" "}
                              {p.rejectionReason}
                            </div>
                          ) : null}

                          <div className="proof-text">
                            <strong>Submitted:</strong>{" "}
                            {new Date(p.createdAt).toLocaleString()}
                          </div>

                          {p.attachments?.length ? (
                            <div className="proof-attachments">
                              {p.attachments.map((a) => (
                                <a
                                  key={a.id}
                                  href={a.attachmentUrl || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="proof-link"
                                >
                                  {a.type}
                                  {a.referenceCode
                                    ? ` • ${a.referenceCode}`
                                    : ""}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {allowed?.canAddPaymentProof ? (
                    <button
                      type="button"
                      className="primary order-secondary-action"
                      disabled={busy}
                      onClick={() => setShowAddPaymentProofModal(true)}
                    >
                      Add Payment Proof
                    </button>
                  ) : null}
                </section>
              </div>
            )}
          </div>

          {order && allowed ? (
            <div className="drawer-footer">
              {allowed.canSubmit ? (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    handleAction((token) =>
                      submitOrderByBusiness(order.id, {
                        token,
                        businessId,
                      })
                    )
                  }
                >
                  Submit
                </button>
              ) : null}

              {allowed.canSubmitForBusinessReview ? (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    handleAction((token) =>
                      submitOrderForBusinessReview(order.id, {
                        token,
                        businessId,
                      })
                    )
                  }
                >
                  Submit for Review
                </button>
              ) : null}

              {allowed.canApproveBusinessReview ? (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={handleApproveBusinessReview}
                >
                  Approve for Payment
                </button>
              ) : null}

              {allowed.canComplete ? (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    handleAction((token) =>
                      completeOrder(order.id, {
                        token,
                        businessId,
                      })
                    )
                  }
                >
                  Complete
                </button>
              ) : null}

              {allowed.canRevertToDraft ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleAction((token) =>
                      revertOrderToDraft(order.id, {
                        token,
                        businessId,
                      })
                    )
                  }
                >
                  Move to Draft
                </button>
              ) : null}

              {allowed.canReject ? (
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    const ok = window.confirm("Reject this order?");
                    if (!ok) return;

                    handleAction((token) =>
                      rejectOrder(order.id, {
                        token,
                        businessId,
                      })
                    );
                  }}
                >
                  Reject order
                </button>
              ) : null}

              {allowed?.canRejectPaymentProof ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRejectPaymentProof}
                >
                  Reject Proof
                </button>
              ) : null}

              {allowed.canCancel ? (
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    const ok = window.confirm("Cancel this order?");
                    if (!ok) return;

                    handleAction((token) =>
                      cancelOrder(order.id, {
                        token,
                        businessId,
                      })
                    );
                  }}
                >
                  Cancel
                </button>
              ) : null}

              {allowed.canDeleteDraft ? (
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!order) return;

                    const ok = window.confirm("Delete this draft order?");
                    if (!ok) return;

                    try {
                      setBusy(true);
                      setErr(null);

                      const auth = await getAuth();
                      if (!auth?.token) {
                        setErr("Not authenticated");
                        return;
                      }

                      await deleteDraftOrder(order.id, {
                        token: auth.token,
                        businessId,
                      });

                      await onUpdated?.();
                      onClose();
                    } catch (e: any) {
                      setErr(e?.message ?? "Failed to delete order");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {order ? (
        <AddPaymentProofModal
          isOpen={showAddPaymentProofModal}
          onClose={() => setShowAddPaymentProofModal(false)}
          onSave={handleSavePaymentProof}
          userId={
            businessId ||
            order.recipientUserId ||
            order.createdByIdentityId
          }
          submittedByIdentityType={
            businessId ? "BUSINESS" : order.recipientIdentityType
          }
          submittedByIdentityId={
            businessId
              ? businessId
              : order.recipientIdentityType === "USER"
                ? order.recipientUserId || order.createdByIdentityId
                : order.recipientBusinessId || order.createdByIdentityId
          }
        />
      ) : null}
    </>
  );
}