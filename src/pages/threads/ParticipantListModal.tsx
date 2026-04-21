import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import "../../css/participant-list-modal.css";

type UserMini = {
  userId?: string;
  slug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

type BusinessMini = {
  businessId?: string;
  slug?: string | null;
  name?: string | null;
  logoUrl?: string | null;
};

export type ThreadParticipantView = {
  participantType?: "USER" | "BUSINESS" | string;
  participantId?: string;
  userMini?: UserMini | null;
  businessMini?: BusinessMini | null;
  displayName?: string | null;
  imageUrl?: string | null;
  role?: string | null;
  referralRole?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  participants: ThreadParticipantView[];
  myUserId?: string | null;
  title?: string;
};

function initialsFromName(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getParticipantSlug(p: ThreadParticipantView) {
  if (String(p.participantType).toUpperCase() === "BUSINESS") {
    return p.businessMini?.slug ?? null;
  }
  return p.userMini?.slug ?? null;
}

function getParticipantImage(p: ThreadParticipantView) {
  if (p.imageUrl) return p.imageUrl;
  if (String(p.participantType).toUpperCase() === "BUSINESS") {
    return p.businessMini?.logoUrl ?? null;
  }
  return p.userMini?.profileImageUrl ?? null;
}

function getParticipantName(p: ThreadParticipantView) {
  if (p.displayName?.trim()) return p.displayName.trim();

  if (String(p.participantType).toUpperCase() === "BUSINESS") {
    return p.businessMini?.name?.trim() || "Business";
  }

  const first = p.userMini?.firstName?.trim() || "";
  const last = p.userMini?.lastName?.trim() || "";
  return `${first} ${last}`.trim() || "User";
}

function prettifyLabel(value?: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getParticipantDescriptor(p: ThreadParticipantView, isMe: boolean) {
  const referralRole = prettifyLabel(p.referralRole);
  const role = prettifyLabel(p.role);

  if (isMe) {
    if (referralRole) return `You - ${referralRole.toLowerCase()}`;
    if (role) return `You - ${role.toLowerCase()}`;
    return "You";
  }

  if (referralRole) return referralRole.toLowerCase();
  if (role) return role.toLowerCase();
  return null;
}

export default function ParticipantListModal({
  open,
  onClose,
  participants,
  myUserId,
  title = "Participants",
}: Props) {
  const navigate = useNavigate();

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aIsMe =
        String(a.participantType).toUpperCase() === "USER" &&
        String(a.participantId ?? "") === String(myUserId ?? "");

      const bIsMe =
        String(b.participantType).toUpperCase() === "USER" &&
        String(b.participantId ?? "") === String(myUserId ?? "");

      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;

      return getParticipantName(a).localeCompare(getParticipantName(b));
    });
  }, [participants, myUserId]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="participant-modal participant-modal--minimal">
        <div className="participant-modal__header">
          <div>
            <h2 className="participant-modal__title">{title}</h2>
            <p className="participant-modal__subtitle">
              {participants.length} participant{participants.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="participant-modal__list participant-modal__list--minimal">
          {sortedParticipants.map((participant) => {
            const name = getParticipantName(participant);
            const image = getParticipantImage(participant);
            const slug = getParticipantSlug(participant);

            const isBusiness =
              String(participant.participantType).toUpperCase() === "BUSINESS";

            const isMe =
              String(participant.participantType).toUpperCase() === "USER" &&
              String(participant.participantId ?? "") === String(myUserId ?? "");

            const descriptor = getParticipantDescriptor(participant, isMe);

            return (
              <div
                key={`${participant.participantType}-${participant.participantId}`}
                className="participant-row participant-row--minimal"
              >
                <button
                  type="button"
                  className={`participant-row__avatarBtn ${slug ? "clickable" : ""}`}
                  onClick={() => {
                    if (!slug) return;
                    onClose();
                    navigate(isBusiness ? `/businesses/${slug}` : `/profile/${slug}`);
                  }}
                  disabled={!slug}
                  title={slug ? `Open ${name}` : name}
                >
                  {image ? (
                    <img src={image} alt={name} className="participant-row__avatar" />
                  ) : (
                    <div className="participant-row__avatarFallback">
                      {initialsFromName(name)}
                    </div>
                  )}
                </button>

                <div className="participant-row__minimalText">
                  <div className="participant-row__name">
                    {name}
                    {descriptor ? (
                      <span className="participant-row__descriptor"> ({descriptor})</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}