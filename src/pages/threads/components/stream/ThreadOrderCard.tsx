import "../../../../css/ThreadOrderCard.css";
import type { ThreadOrderCardDTO } from "../../../../types/orderTypes";

type ThreadOrderCardProps = {
  order: ThreadOrderCardDTO;
  onClick?: (orderId: string) => void;
  className?: string;
};

function formatCurrency(amount?: string | null, currencyCode?: string | null): string {
  const numeric = Number(amount ?? 0);

  if (!Number.isFinite(numeric)) {
    return amount ?? "";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currencyCode || "INR"} ${numeric.toLocaleString("en-IN")}`;
  }
}

function formatStatus(status?: string | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_BUSINESS_REVIEW":
      return "Pending review";
    case "SUBMITTED":
      return "Submitted";
    case "PAYMENT_REPORTED":
      return "Payment reported";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status || "Unknown";
  }
}

function formatPaymentStatus(status?: string | null): string {
  switch (status) {
    case "NOT_REQUIRED":
      return "Not required";
    case "AWAITING_PAYMENT":
      return "Awaiting payment";
    case "PROOF_SUBMITTED":
      return "Proof submitted";
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    default:
      return status || "Unknown";
  }
}

export default function ThreadOrderCard({
  order,
  onClick,
  className,
}: ThreadOrderCardProps) {
  const clickable = typeof onClick === "function";

  return (
    <button
      type="button"
      className={`th-orderBubble ${className ?? ""} ${clickable ? "clickable" : ""}`}
      onClick={() => onClick?.(order.id)}
      title={clickable ? "Open order" : undefined}
    >
      <div className="th-orderHeader">
        <div className="th-orderKicker">Order</div>
        <div className="th-orderAmount">
          {formatCurrency(order.finalAmount, order.currencyCode)}
        </div>
      </div>

      {order.lastEventText ? (
        <div className="th-orderSummary">{order.lastEventText}</div>
      ) : null}

      {order.notes ? (
        <div className="th-orderTitle">{order.notes}</div>
      ) : null}

      <div className="th-orderMetaGrid">
        <div className="th-orderMetaItem">
          <span className="th-orderMetaLabel">Gross</span>
          <span className="th-orderMetaValue">
            {formatCurrency(order.grossAmount, order.currencyCode)}
          </span>
        </div>

        <div className="th-orderMetaItem">
          <span className="th-orderMetaLabel">Discount</span>
          <span className="th-orderMetaValue">
            {formatCurrency(order.discountAmount, order.currencyCode)}
          </span>
        </div>

        <div className="th-orderMetaItem">
          <span className="th-orderMetaLabel">Status</span>
          <span className="th-orderMetaValue">{formatStatus(order.status)}</span>
        </div>

        <div className="th-orderMetaItem">
          <span className="th-orderMetaLabel">Payment</span>
          <span className="th-orderMetaValue">
            {formatPaymentStatus(order.paymentStatus)}
          </span>
        </div>
      </div>
    </button>
  );
}