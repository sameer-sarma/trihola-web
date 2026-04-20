// src/pages/threads/components/stream/MessageGroupItem.tsx
import type { UiAttachment, ThreadParticipantDTO } from "../../../../types/threads";

type GroupItem = {
  key: string;
  mine: boolean;
  actorKey: string;
  displayName: string;
  badge?: string | null;
  participant?: ThreadParticipantDTO | null;
  createdAt?: string | null;
  messages: any[];
  actorImageUrl?: string | null;
  onOpenActor?: (() => void) | null;
};

type Props = {
  item: GroupItem;
  identityByKey: Map<string, any>;
  myProfileImageUrl?: string | null;
  participantImage: (p: ThreadParticipantDTO | null | undefined) => string | null;
  fmtDateTime: (iso?: string | null) => string;
  navigateToParticipant: (p: ThreadParticipantDTO) => void;
  normalizeAttachment: (x: any) => UiAttachment | null;
  formatBytes: (n?: number | null) => string;
  openImagesLightbox: (src: string) => void;
  hideActorHeader?: boolean;
};

export default function MessageGroupItem({
  item,
  identityByKey,
  myProfileImageUrl,
  participantImage,
  fmtDateTime,
  navigateToParticipant,
  normalizeAttachment,
  formatBytes,
  openImagesLightbox,
  hideActorHeader = false,
}: Props) {
  const mine = item.mine;
  const actorIdentity = identityByKey.get(item.actorKey);

  const avatarUrl =
    item.actorImageUrl ??
    (mine
      ? actorIdentity?.imageUrl ?? myProfileImageUrl ?? null
      : item.participant
      ? participantImage(item.participant)
      : null) ??
    null;

  const avatarFallbackText =
    (mine ? actorIdentity?.title ?? item.displayName : item.displayName)?.[0]?.toUpperCase() ??
    "•";

  const canOpenActor = !!item.onOpenActor || (!!item.participant && !mine);

  const handleOpenActor = () => {
    if (item.onOpenActor) {
      item.onOpenActor();
      return;
    }
    if (!mine && item.participant) {
      navigateToParticipant(item.participant);
    }
  };

  return (
    <div className={`streamMsgRow ${mine ? "mine" : "theirs"}`}>
      <button
        type="button"
        className="streamAvatarBtn"
        onClick={handleOpenActor}
        title={canOpenActor ? "Open profile" : ""}
        disabled={!canOpenActor}
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
        {!hideActorHeader ? (
          <div className="streamMeta">
            <div className="streamWhoLine">
              <span
                className={`streamWho ${canOpenActor ? "clickable" : ""}`}
                onClick={handleOpenActor}
              >
                {item.displayName}
                {item.badge && <span className="whoBadge">{item.badge}</span>}
              </span>
              <span className="streamTime">{fmtDateTime(item.createdAt)}</span>
            </div>
          </div>
        ) : null}

        <div className="streamCards">
          {item.messages.map((a: any, j: number) => {
            const payload = a?.payload ?? null;
            const attachmentsRaw = payload?.attachments ?? a?.attachments;

            const attachments: UiAttachment[] = Array.isArray(attachmentsRaw)
              ? attachmentsRaw
                  .map(normalizeAttachment)
                  .filter((x): x is UiAttachment => Boolean(x))
              : [];

            const imgs = attachments.filter((x) => x.kind === "IMAGE" && x.url);
            const vids = attachments.filter((x) => x.kind === "VIDEO" && x.url);
            const files = attachments.filter(
              (x) => (x.kind === "DOCUMENT" || x.kind === "AUDIO") && x.url
            );

            const msgText = String(a?.content ?? "").trim();

            return (
              <div
                key={String(a?.id ?? `${item.key}-${j}`)}
                className={`streamCard ${mine ? "mine" : "theirs"}`}
              >
                {imgs.length > 0 && (
                  <div className="attGrid">
                    {imgs.slice(0, 4).map((att, k) => (
                      <button
                        key={`${att.url}-${k}`}
                        type="button"
                        className="attThumbBtn"
                        onClick={() => openImagesLightbox(String(att.url))}
                        title={att.name}
                      >
                        <img src={String(att.url)} alt={att.name} />
                        {k === 3 && imgs.length > 4 && (
                          <span className="attMorePill">+{imgs.length - 4}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {(vids.length > 0 || files.length > 0) && (
                  <div className="attList">
                    {vids.map((att, k) => (
                      <a
                        key={`v-${att.url}-${k}`}
                        className="attFileRow"
                        href={String(att.url)}
                        target="_blank"
                        rel="noreferrer"
                        title={att.name}
                      >
                        <span className="attFileIcon">🎬</span>
                        <span className="attFileMeta">
                          <span className="attFileName">{att.name}</span>
                          <span className="attFileSub">{formatBytes(att.sizeBytes)}</span>
                        </span>
                        <span className="attOpenPill">Open</span>
                      </a>
                    ))}

                    {files.map((att, k) => (
                      <a
                        key={`f-${att.url}-${k}`}
                        className="attFileRow"
                        href={String(att.url)}
                        target="_blank"
                        rel="noreferrer"
                        title={att.name}
                      >
                        <span className="attFileIcon">{att.kind === "AUDIO" ? "🎤" : "📄"}</span>
                        <span className="attFileMeta">
                          <span className="attFileName">{att.name}</span>
                          <span className="attFileSub">
                            {att.mime ? att.mime : "file"}
                            {att.sizeBytes ? ` · ${formatBytes(att.sizeBytes)}` : ""}
                          </span>
                        </span>
                        <span className="attOpenPill">Open</span>
                      </a>
                    ))}
                  </div>
                )}

                {msgText && <div className="streamText">{msgText}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}