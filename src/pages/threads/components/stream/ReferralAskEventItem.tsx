// src/pages/threads/components/stream/ReferralAskEventItem.tsx
import type { ThreadParticipantDTO } from "../../../../types/threads";
import ReferralAskCard, {
  type ReferralAskPayload,
} from "../../../../components/referrals/ReferralAskCard";

type Props = {
  item: {
    key: string;
    createdAt?: string | null;
    content?: string | null;
    payload: ReferralAskPayload;
    actorKey?: string | null;
  };
  myIdentityKeys: Set<string>;
  participantByKey: Map<string, ThreadParticipantDTO>;
  identityByKey: Map<string, any>;
  myProfileImageUrl?: string | null;
  myDisplayName: string;
  fmtDateTime: (iso?: string | null) => string;
  participantImage: (p: ThreadParticipantDTO | null | undefined) => string | null;
  navigateToParticipant: (p: ThreadParticipantDTO) => void;
};

export default function ReferralAskEventItem({
  item,
  myIdentityKeys,
  participantByKey,
  identityByKey,
  myProfileImageUrl,
  myDisplayName,
  fmtDateTime,
  participantImage,
  navigateToParticipant,
}: Props) {
  const actorKey = item.actorKey ?? "";
  const mine = actorKey ? myIdentityKeys.has(actorKey) : false;

  const actorParticipant = actorKey ? participantByKey.get(actorKey) ?? null : null;
  const actorIdentity = actorKey ? identityByKey.get(actorKey) : null;
  const payloadActor = item.payload?.actor ?? null;

  const avatarUrl =
    (mine
      ? actorIdentity?.imageUrl ?? myProfileImageUrl ?? null
      : actorParticipant
      ? participantImage(actorParticipant)
      : payloadActor?.imageUrl ?? null) ?? null;

  const displayName = mine
    ? actorIdentity?.title ?? myDisplayName
    : actorParticipant?.displayName ??
      actorParticipant?.businessMini?.name ??
      payloadActor?.displayName ??
      "Participant";

  const avatarFallbackText = (displayName?.[0] ?? "•").toUpperCase();

  return (
    <div className={`streamMsgRow ${mine ? "mine" : "theirs"}`}>
      <button
        type="button"
        className="streamAvatarBtn"
        onClick={() => {
          if (actorParticipant) navigateToParticipant(actorParticipant);
        }}
        title={actorParticipant ? "Open profile" : displayName}
        disabled={!actorParticipant}
      >
        <span className="avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span className="avatarFallback">{avatarFallbackText}</span>
          )}
        </span>
      </button>

      <div className="streamMsgBody">
        <div className="streamMeta">
          <div className="streamWhoLine">
            <span
              className={`streamWho ${!mine && actorParticipant ? "clickable" : ""}`}
              onClick={() => {
                if (!mine && actorParticipant) navigateToParticipant(actorParticipant);
              }}
            >
              {displayName}
            </span>
            <span className="streamTime">{fmtDateTime(item.createdAt ?? null)}</span>
          </div>
        </div>

        <div className="streamCards">
          <ReferralAskCard
            payload={item.payload}
            content={item.content}
            createdAt={item.createdAt}
            compact
          />
        </div>
      </div>
    </div>
  );
}