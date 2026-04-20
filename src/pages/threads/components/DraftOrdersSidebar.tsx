import { useMemo } from "react";
import { OrderDTO } from "../../../types/orderTypes";

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso ?? "");
  }
}

export default function DraftOrdersSidebar({
  orders,
  onEdit,
  onSubmit,
  onDelete,
  onClose,
}: {
  orders: OrderDTO[];
  onEdit: (order: OrderDTO) => void;
  onSubmit: (order: OrderDTO) => void;
  onDelete?: (order: OrderDTO) => void;
  onClose: () => void;
}) {
  const drafts = useMemo(
    () => orders.filter((o) => o.status === "DRAFT"),
    [orders]
  );

  const totalAmount = useMemo(
    () => drafts.reduce((sum, o) => sum + Number(o.finalAmount ?? 0), 0),
    [drafts]
  );

  if (drafts.length === 0) {
    return (
      <div className="draftSidebar">
        <div className="draftSidebar__header">
          <strong>Draft Orders</strong>
          <button onClick={onClose}>×</button>
        </div>

        <div className="draftSidebar__empty">No draft orders</div>
      </div>
    );
  }

  return (
    <div className="draftSidebar">
      <div className="draftSidebar__header">
        <div>
          <strong>Draft Orders</strong>
          <div className="draftSidebar__sub">
            {drafts.length} drafts • ₹{totalAmount}
          </div>
        </div>

        <button onClick={onClose}>←</button>
      </div>

      <div className="draftSidebar__list">
        {drafts.map((order) => {
          const canDelete = !!order.allowedActions?.canDeleteDraft && !!onDelete;
          const canEdit = !!order.allowedActions?.canEdit;
          const canSubmit = !!order.allowedActions?.canSubmit;
          const canSubmitForReview = !!order.allowedActions?.canSubmitForBusinessReview;
          const showSubmit = canSubmit || canSubmitForReview;

          return (
            <div key={order.id} className="draftSidebar__card">
              <div className="draftSidebar__top">
                <span className="draftSidebar__title">
                  {order.summary || "Untitled order"}
                </span>
                <span className="draftSidebar__amount">₹{order.finalAmount}</span>
              </div>

              <div className="draftSidebar__meta">
                Draft • {order.paymentStatus}
              </div>

              <div className="draftSidebar__meta">
                Updated {fmtDateTime(order.updatedAt)}
              </div>

              {!!order.allowedActions?.reason && (
                <div className="draftSidebar__meta">{order.allowedActions.reason}</div>
              )}

              <div className="draftSidebar__actions">
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => onDelete?.(order)}
                  >
                    Delete
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => onEdit(order)}
                  >
                    Edit
                  </button>
                )}

                {showSubmit && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onSubmit(order)}
                  >
                    {canSubmitForReview ? "Send for Review" : "Submit"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}