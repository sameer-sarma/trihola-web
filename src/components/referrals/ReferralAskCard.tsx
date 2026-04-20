import "../../css/referral-ask-card.css";

type ParticipantMini = {
  slug?: string | null;
  imageUrl?: string | null;
  displayName?: string | null;
  participantId?: string | null;
  participantType?: "USER" | "BUSINESS" | string | null;
};

export type ReferralAskPayload = {
  note?: string | null;
  ctaId?: string | null;
  referralId?: string | null;
  referralSlug?: string | null;
  referralStatus?: string | null;
  referralThreadId?: string | null;
  activityType?: string | null;

  actor?: ParticipantMini | null;
  referrer?: ParticipantMini | null;
  prospect?: ParticipantMini | null;
  target?: ParticipantMini | null;

  targetAcceptanceStatus?: string | null;
  prospectAcceptanceStatus?: string | null;
};

type Props = {
  payload?: ReferralAskPayload | null;
  content?: string | null;
  createdAt?: string | null;
  compact?: boolean;
};

function safeText(v?: string | null, fallback = "") {
  return (v ?? "").trim() || fallback;
}

export default function ReferralAskCard({
  payload,
  content,
  createdAt,
  compact = true,
}: Props) {
  const initiatorName = safeText(
    payload?.actor?.displayName || payload?.referrer?.displayName,
    "Someone"
  );
  const prospectName = safeText(payload?.prospect?.displayName, "someone");
  const targetName = safeText(payload?.target?.displayName, "someone");
  const note = safeText(payload?.note);

  const summary =
    payload?.actor || payload?.referrer || payload?.prospect || payload?.target
      ? `${initiatorName} wants ${prospectName} and ${targetName} to connect`
      : safeText(content, "Referral request");

  return (
    <div
      className={[
        "referralAskCard",
        compact ? "referralAskCard--compact" : "",
      ].join(" ")}
    >
      <div className="referralAskCard__summary">{summary}</div>

      {note && (
        <div className="referralAskCard__noteRow">
          <span className="referralAskCard__noteLabel">NOTE</span>
          <span className="referralAskCard__noteText">{note}</span>
        </div>
      )}

      {!compact && createdAt && (
        <div className="referralAskCard__footer">
          <span>{new Date(createdAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}