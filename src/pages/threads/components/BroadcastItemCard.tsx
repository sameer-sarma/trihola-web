import { useMemo } from "react";
import type { BroadcastItemCreateDTO } from "../../../types/broadcasts";
import "../../../css/broadcast-composer.css";

type Props = {
  index: number;
  item: BroadcastItemCreateDTO;
  disabled?: boolean;

  isFirst: boolean;
  isLast: boolean;

  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function itemTypeLabel(type: BroadcastItemCreateDTO["itemType"]) {
  switch (type) {
    case "MESSAGE":
      return "Message";
    case "CTA":
      return "CTA";
    case "OFFER":
      return "Offer";
    case "ORDER":
      return "Order";
  }
}

function getAttachmentCount(item: BroadcastItemCreateDTO): number {
  if (item.itemType !== "MESSAGE") return 0;
  return item.payload?.attachments?.length ?? 0;
}

function makeShortPreview(text: string, maxLen = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return normalized.slice(0, maxLen - 1).trimEnd() + "…";
}

function ctaKindLabel(kind?: string | null): string {
  switch ((kind ?? "").trim().toUpperCase()) {
    case "REFERRAL_ADD":
      return "Ask for referrals";
    case "RECOMMEND_BUSINESS":
      return "Ask for business recommendations";
    default:
      return kind?.trim() || "CTA";
  }
}

export default function BroadcastItemCard({
  index,
  item,
  disabled = false,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const attachmentCount = getAttachmentCount(item);

  const previewText = useMemo(() => {
    if (item.itemType === "MESSAGE") {
      if (item.messageText?.trim()) {
        return makeShortPreview(item.messageText);
      }

      if (attachmentCount > 0) {
        return `${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`;
      }

      return "Empty message";
    }

    if (item.itemType === "CTA") {
      return ctaKindLabel(item.ctaKind);
    }

    if (item.itemType === "ORDER") {
      const gross = item.orderPayload?.grossAmount?.trim() || "";
      const summary = item.orderPayload?.summary?.trim() || "";

      if (summary && gross) {
        return `${summary} • ₹${gross}`;
      }

      if (gross) {
        return `₹${gross}`;
      }

      if (summary) {
        return makeShortPreview(summary);
      }

      return "Order item";
    }

    if (item.note?.trim()) {
      return makeShortPreview(item.note);
    }

    return "Selected offer";
  }, [item, attachmentCount]);

  const metaText = useMemo(() => {
    const parts: string[] = [];

    if (item.itemType === "MESSAGE") {
      if (attachmentCount > 0) {
        parts.push(
          `${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`
        );
      }
    } else if (item.itemType === "CTA") {
      parts.push("CTA");
    } else if (item.itemType === "ORDER") {
      parts.push("Order");

      const itemCount = item.orderPayload?.items?.length ?? 0;
      if (itemCount > 0) {
        parts.push(`${itemCount} line item${itemCount > 1 ? "s" : ""}`);
      }
    } else {
      parts.push("Offer");

      if (
        typeof item.maxRedemptionsOverride === "number" &&
        Number.isFinite(item.maxRedemptionsOverride) &&
        item.maxRedemptionsOverride > 0
      ) {
        parts.push(`Max ${item.maxRedemptionsOverride}`);
      }

      if (item.dueAt || item.expiresAt) {
        parts.push("Has schedule");
      }
    }

    return parts.join(" • ");
  }, [item, attachmentCount]);

  const titleText = useMemo(() => {
    if (item.itemType === "MESSAGE") {
      return item.messageText?.trim() || previewText;
    }

    if (item.itemType === "CTA") {
      return ctaKindLabel(item.ctaKind);
    }

    if (item.itemType === "ORDER") {
      return item.orderPayload?.notes?.trim() || previewText;
    }

    return item.note?.trim() || "Selected offer";
  }, [item, previewText]);

  return (
    <div className="broadcast-item-row">
      <div className="broadcast-item-row__index">
        {index + 1}
      </div>

      <div className="broadcast-item-row__content">
        <div className="broadcast-item-row__title">
          {itemTypeLabel(item.itemType)}
        </div>

        <div
          className="broadcast-item-row__preview"
          title={titleText}
        >
          {previewText}
        </div>

        {metaText && (
          <div className="broadcast-item-row__meta">
            {metaText}
          </div>
        )}
      </div>

      <div className="broadcast-item-row__actions">
        <button
          type="button"
          className="broadcast-item-row__icon"
          onClick={onEdit}
          disabled={disabled}
          title="Edit item"
          aria-label={`Edit item ${index + 1}`}
        >
          ✎
        </button>

        <button
          type="button"
          className="broadcast-item-row__icon"
          onClick={onMoveUp}
          disabled={disabled || isFirst}
          title="Move up"
          aria-label={`Move item ${index + 1} up`}
        >
          ↑
        </button>

        <button
          type="button"
          className="broadcast-item-row__icon"
          onClick={onMoveDown}
          disabled={disabled || isLast}
          title="Move item down"
          aria-label={`Move item ${index + 1} down`}
        >
          ↓
        </button>

        <button
          type="button"
          className="broadcast-item-row__icon danger"
          onClick={onDelete}
          disabled={disabled}
          title="Delete item"
          aria-label={`Delete item ${index + 1}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}