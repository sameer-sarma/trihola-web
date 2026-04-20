import type { ThreadParticipantDTO, ParticipantIdentity } from "../types/threads";
import type {
  ThreadOfferRecipientOption,
  OfferRecipientSpec,
} from "../types/offerAssignmentPlanTypes";

type AssignableRecipientsFromDirectThreadArgs = {
  participants: ThreadParticipantDTO[];
  actingIdentity: ParticipantIdentity;
  participantName: (p: ThreadParticipantDTO | null | undefined) => string;
  participantImage: (p: ThreadParticipantDTO | null | undefined) => string | null;
};

function sameIdentity(
  a: ParticipantIdentity | null | undefined,
  b: ParticipantIdentity | null | undefined
) {
  if (!a || !b) return false;
  return (
    String(a.participantType).toUpperCase() === String(b.participantType).toUpperCase() &&
    String(a.participantId) === String(b.participantId)
  );
}

function makeRecipientKey(participantType: string, participantId: string) {
  return `${String(participantType).toUpperCase()}:${String(participantId)}`;
}

export function assignableRecipientsFromDirectThread({
  participants,
  actingIdentity,
  participantName,
  participantImage,
}: AssignableRecipientsFromDirectThreadArgs): ThreadOfferRecipientOption[] {
  if (!Array.isArray(participants) || !actingIdentity) return [];

  const filtered = participants.filter((p) => {
    const participantIdentity: ParticipantIdentity = {
      participantType:
        String(p.participantType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER",
      participantId: String(p.participantId),
    };

    return !sameIdentity(participantIdentity, actingIdentity);
  });

  const mapped = filtered
    .map((p): ThreadOfferRecipientOption | null => {
      const participantType = String(p.participantType).toUpperCase();
      const participantId = String(p.participantId ?? "").trim();
      if (!participantId) return null;

      if (participantType === "BUSINESS") {
        return {
          key: makeRecipientKey("BUSINESS", participantId),
          label: participantName(p),
          identityType: "BUSINESS",
          businessId: participantId,
          userId: null,
          subtitle: "Business",
          avatarUrl: participantImage(p),
        };
      }

      return {
        key: makeRecipientKey("USER", participantId),
        label: participantName(p),
        identityType: "USER",
        userId: participantId,
        businessId: null,
        subtitle: "User",
        avatarUrl: participantImage(p),
      };
    })
    .filter((x): x is ThreadOfferRecipientOption => !!x);

  const seen = new Set<string>();
  return mapped.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

export function recipientOptionToSpec(
  option: ThreadOfferRecipientOption
): OfferRecipientSpec {
  return {
    selectorType: "EXPLICIT_IDENTITY",
    identityType: option.identityType,
    userId: option.userId ?? null,
    businessId: option.businessId ?? null,
    role: null,
  };
}