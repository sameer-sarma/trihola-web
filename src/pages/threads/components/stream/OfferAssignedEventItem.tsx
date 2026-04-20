// src/pages/threads/components/stream/OfferAssignedEventItem.tsx
import React from "react";

type Props = {
  text: string;
  offerTitle?: string | null;
  note?: string | null;
  status?: string | null;
  assignedOfferId?: string | null;

  createdAt?: string | null;
  actorName?: string | null;
  actorImageUrl?: string | null;
  assignedToName?: string | null;

  isMine?: boolean;
  initials?: (name: string) => string;
  fmtDateTime?: (iso?: string | null) => string;
  hideActorHeader?: boolean;

  onOpenOffer: (assignedOfferId: string) => void;
  onOpenActor?: () => void;
};

function titleCaseToken(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function badgeClass(status?: string | null) {
  switch (status) {
    case "ACTIVE":
      return "threadOfferEvent__badge threadOfferEvent__badge--active";
    case "ASSIGNED":
      return "threadOfferEvent__badge threadOfferEvent__badge--assigned";
    case "CLAIMED":
      return "threadOfferEvent__badge threadOfferEvent__badge--claimed";
    case "REDEEMED":
      return "threadOfferEvent__badge threadOfferEvent__badge--redeemed";
    case "EXPIRED":
    case "CANCELLED":
      return "threadOfferEvent__badge threadOfferEvent__badge--ended";
    default:
      return "threadOfferEvent__badge";
  }
}

function fallbackInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "?";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function fallbackFmtDateTime(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return date.toLocaleString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function OfferAssignedEventItem({
  text,
  offerTitle,
  note,
  status,
  assignedOfferId,

  createdAt,
  actorName,
  actorImageUrl,
  assignedToName,

  isMine = false,
  initials,
  fmtDateTime,
  hideActorHeader = false,

  onOpenOffer,
  onOpenActor,
}: Props) {
  const clickable = !!assignedOfferId;
  const safeActorName = actorName?.trim() || "Business";
  const avatarText = initials ? initials(safeActorName) : fallbackInitials(safeActorName);
  const createdLabel = fmtDateTime
    ? fmtDateTime(createdAt ?? null)
    : fallbackFmtDateTime(createdAt ?? null);

  const metaBits = [
    assignedToName ? `Assigned to ${assignedToName}` : "",
    note ? note : "",
  ].filter(Boolean);

  const openOffer = () => {
    if (assignedOfferId) onOpenOffer(assignedOfferId);
  };

  return (
    <div className={`streamMsgRow ${isMine ? "mine" : "theirs"}`}>
      <button
        type="button"
        className="streamAvatarBtn"
        onClick={() => onOpenActor?.()}
        title={safeActorName}
        disabled={!onOpenActor}
      >
        <span className="avatar">
          {actorImageUrl ? (
            <img src={actorImageUrl} alt="" />
          ) : (
            <span className="avatarFallback">{avatarText}</span>
          )}
        </span>
      </button>

      <div className="streamMsgBody">
        {!hideActorHeader ? (
          <div className="streamMeta">
            <div className="streamWhoLine">
              <span
                className={`streamWho ${onOpenActor ? "clickable" : ""}`}
                onClick={() => onOpenActor?.()}
              >
                {safeActorName}
              </span>
              {createdLabel ? <span className="streamTime">{createdLabel}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="streamCards">
          <button
            type="button"
            className={[
              "threadOfferEvent",
              "threadOfferEvent--compact",
              clickable ? "threadOfferEvent--clickable" : "",
              isMine ? "mine" : "theirs",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={openOffer}
            onKeyDown={(e) => {
              if (!assignedOfferId) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openOffer();
              }
            }}
            title={clickable ? "Open offer details" : undefined}
            disabled={!clickable}
          >
            <div className="threadOfferEvent__top">
              <div className="threadOfferEvent__eyebrow">
                Offer assigned
              </div>

              {status ? (
                <span className={badgeClass(status)}>{titleCaseToken(status)}</span>
              ) : null}
            </div>

            <div className="threadOfferEvent__title">{offerTitle || text}</div>

            {metaBits.length > 0 ? (
              <div className="threadOfferEvent__meta">{metaBits.join(" · ")}</div>
            ) : null}

          </button>
        </div>
      </div>
    </div>
  );
}