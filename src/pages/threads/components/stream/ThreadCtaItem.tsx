// src/pages/threads/components/stream/ThreadCtaItem.tsx
import type { ThreadCtaDTO, ThreadParticipantDTO } from "../../../../types/threads";

type Props = {
  item: {
    key: string;
    createdAt?: string | null;
    cta: ThreadCtaDTO;
    ctaMessage: string;
    ctaDetail?: string | null;
    requestedCount?: number;
    attachmentCount?: number;
  };
  effectiveIdentity: any;
  participantByKey: Map<string, ThreadParticipantDTO>;
  fmtDateTime: (iso?: string | null) => string;
  initials: (name: string) => string;
  makeKey: (type: string, id: string) => string;
  badgeName: (b: any) => string;
  badgeImage: (b: any) => string | null;
  fullName: (u?: any) => string;
  ctaCreatedByIdentity: (cta: any) => any;
  ctaAssignedToIdentity: (cta: any) => any;
  onOpenThreadCta: (cta: ThreadCtaDTO) => void;
  navigateToParticipant: (p: ThreadParticipantDTO) => void;
  hideActorHeader?: boolean;
};

export default function ThreadCtaItem({
  item,
  effectiveIdentity,
  participantByKey,
  fmtDateTime,
  initials,
  makeKey,
  badgeName,
  badgeImage,
  fullName,
  ctaCreatedByIdentity,
  ctaAssignedToIdentity,
  onOpenThreadCta,
  navigateToParticipant,
  hideActorHeader = false,
}: Props) {
  const cta = item.cta;

  const creatorIdent = ctaCreatedByIdentity(cta as any);
  const creatorKey = creatorIdent
    ? makeKey(String(creatorIdent.participantType), String(creatorIdent.participantId))
    : "";
  const creator = creatorKey ? participantByKey.get(creatorKey) : undefined;

  const createdByBadge = (cta as any)?.createdByBadge ?? null;

  const creatorName =
    (createdByBadge ? badgeName(createdByBadge) : null) ||
    creator?.displayName ||
    creator?.businessMini?.name ||
    fullName(creator?.userMini) ||
    "Someone";

  const creatorImg =
    (createdByBadge ? badgeImage(createdByBadge) : null) ||
    (creator as any)?.imageUrl ||
    creator?.userMini?.profileImageUrl ||
    creator?.businessMini?.logoUrl ||
    null;

  const isMine =
    !!effectiveIdentity &&
    !!creatorIdent &&
    String(creatorIdent.participantType ?? "").toUpperCase() ===
      String(effectiveIdentity.participantType ?? "").toUpperCase() &&
    String(creatorIdent.participantId ?? "") === String(effectiveIdentity.participantId ?? "");

  return (
    <div className={`streamMsgRow ${isMine ? "mine" : "theirs"}`}>
      <button
        type="button"
        className="streamAvatarBtn"
        onClick={() => {
          const p = creator ?? null;
          if (p) navigateToParticipant(p);
        }}
        title={creator ? "Open profile" : creatorName}
        disabled={!creator}
      >
        <span className="avatar">
          {creatorImg ? (
            <img src={creatorImg} alt="" />
          ) : (
            <span className="avatarFallback">{initials(creatorName)}</span>
          )}
        </span>
      </button>

      <div className="streamMsgBody">
        {!hideActorHeader ? (
          <div className="streamMeta">
            <div className="streamWhoLine">
              <span
                className={`streamWho ${creator ? "clickable" : ""}`}
                onClick={() => {
                  if (creator) navigateToParticipant(creator);
                }}
              >
                {creatorName}
              </span>
              <span className="streamTime">{fmtDateTime(item.createdAt ?? null)}</span>
            </div>
          </div>
        ) : null}

        <div className="streamCards">
          <button
            type="button"
            className={`th-ctaBubble ${isMine ? "mine" : "theirs"}`}
            onClick={() => onOpenThreadCta(cta)}
            title="Open"
          >
            <div className="th-ctaText">{item.ctaMessage}</div>

            {item.ctaDetail ? (
              <div className="th-ctaDetail">{item.ctaDetail}</div>
            ) : null}

            <div className="th-ctaMeta">
              {(() => {
                const assignedIdent = ctaAssignedToIdentity(cta as any);
                const assignedKey = assignedIdent
                  ? makeKey(
                      String(assignedIdent.participantType),
                      String(assignedIdent.participantId)
                    )
                  : "";
                const assignedP = assignedKey ? participantByKey.get(assignedKey) : undefined;
                const assignedBadge = (cta as any)?.assignedToBadge ?? null;

                const assignedName =
                  (assignedBadge ? badgeName(assignedBadge) : null) ||
                  assignedP?.displayName ||
                  assignedP?.businessMini?.name ||
                  fullName(assignedP?.userMini) ||
                  null;

                const linkedRefCount = Array.isArray((cta as any)?.linked?.referrals)
                  ? (cta as any).linked.referrals.length
                  : 0;
                const linkedRecCount = Array.isArray((cta as any)?.linked?.recommendations)
                  ? (cta as any).linked.recommendations.length
                  : 0;

                const linkedCount = linkedRefCount + linkedRecCount;

                const req = Number(item.requestedCount ?? 0) || 0;
                const isComplete = req > 0 && linkedCount >= req;

                const progress =
                  req > 0
                    ? `${linkedCount}/${req} done`
                    : linkedCount > 0
                    ? `${linkedCount} linked`
                    : "";

                const expires =
                  !isComplete && (cta as any)?.expiresAt
                    ? `Expires ${fmtDateTime((cta as any).expiresAt)}`
                    : "";

                const attCount = Number(item.attachmentCount ?? 0) || 0;
                const attBit =
                  !isComplete && attCount > 0
                    ? `${attCount} attachment${attCount === 1 ? "" : "s"}`
                    : "";

                const bits = [
                  assignedName ? `Assigned to ${assignedName}` : "",
                  progress,
                  attBit,
                  expires,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return bits ? <span className="th-ctaMetaText">{bits}</span> : null;
              })()}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}