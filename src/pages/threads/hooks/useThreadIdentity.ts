// src/pages/threads/hooks/useThreadIdentity.ts
import { useEffect, useMemo, useRef, useCallback } from "react";
import type {
  ParticipantIdentity,
  ThreadParticipantDTO,
} from "../../../types/threads";
import type { ThreadScope } from "../../../context/ThreadStoreContext";
import { useIdentitySelector, type IdentityOption } from "../useIdentitySelector";

function makeKey(type: string, id: string) {
  return `${type}:${id}`;
}

function scopeToKey(scope: ThreadScope | null): string {
  if (!scope) return "";
  return `${scope.asType}:${String(scope.asId)}`;
}

function keyToScope(k: string): ThreadScope | null {
  const s = String(k || "").trim();
  if (!s) return null;

  const [tRaw, idRaw] = s.split(":");
  const asType = String(tRaw || "").toUpperCase();
  const asId = String(idRaw || "").trim();

  if ((asType !== "USER" && asType !== "BUSINESS") || !asId) return null;
  return { asType: asType as any, asId: asId as any };
}

type MyBusinessLike = {
  businessId?: string | null;
  businessName?: string | null;
  businessLogoUrl?: string | null;
  role?: string | null;
};

type Params = {
  participants: ThreadParticipantDTO[];
  myUserId: string | null;
  myBusinesses: MyBusinessLike[] | null | undefined;
  myProfile: {
    profileImageUrl?: string | null;
  };
  myDisplayName: string;
  isDirectThread: boolean;
  selectedScope: ThreadScope | null;
  setSelectedScope: (scope: ThreadScope | null) => void;
  defaultIdentity: ParticipantIdentity | null;
};

export function useThreadIdentity({
  participants,
  myUserId,
  myBusinesses,
  myProfile,
  myDisplayName,
  isDirectThread,
  selectedScope,
  setSelectedScope,
  defaultIdentity,
}: Params) {
  const participantKeys = useMemo(() => {
    const s = new Set<string>();
    for (const p of participants) {
      s.add(makeKey(p.participantType, p.participantId));
    }
    return s;
  }, [participants]);

  const identityOptions: IdentityOption[] = useMemo(() => {
    const out: IdentityOption[] = [];
    if (!myUserId) return out;

    const meRow =
      participants.find((p) => p.participantType === "USER" && p.participantId === myUserId) ?? null;

    out.push({
      participantType: "USER",
      participantId: myUserId as any,
      title: myDisplayName,
      subtitle: "Personal",
      imageUrl: myProfile?.profileImageUrl ?? (meRow as any)?.imageUrl ?? null,
    });

    for (const b of myBusinesses ?? []) {
      out.push({
        participantType: "BUSINESS",
        participantId: String((b as any).businessId) as any,
        title: String((b as any).businessName ?? "Business"),
        subtitle: `Business (${String((b as any).role ?? "MEMBER")})`,
        imageUrl: ((b as any).businessLogoUrl as any) ?? null,
      });
    }

    const seen = new Set<string>();
    const deduped = out.filter((i) => {
      const k = makeKey(i.participantType, String(i.participantId));
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (isDirectThread && participantKeys.size > 0) {
      const filtered = deduped.filter((i) =>
        participantKeys.has(makeKey(i.participantType, String(i.participantId)))
      );
      return filtered.length ? filtered : deduped;
    }

    return deduped;
  }, [participants, myUserId, myBusinesses, myProfile, myDisplayName, isDirectThread, participantKeys]);

  const defaultIdentityOption: IdentityOption | null = useMemo(() => {
    if (!defaultIdentity) return identityOptions[0] ?? null;

    const match = identityOptions.find(
      (i) =>
        i.participantType === defaultIdentity.participantType &&
        String(i.participantId) === String(defaultIdentity.participantId)
    );
    return match ?? identityOptions[0] ?? null;
  }, [defaultIdentity, identityOptions]);

  const controlledKey = useMemo(() => scopeToKey(selectedScope), [selectedScope]);

  const setControlledKey = useCallback(
    (k: string) => {
      const nextKey = String(k || "");
      const currentKey = scopeToKey(selectedScope);

      if (nextKey === currentKey) return;

      const sc = keyToScope(nextKey);
      setSelectedScope(sc);
    },
    [selectedScope, setSelectedScope]
  );

  const { safeIdentities, selectedIdentity, asKey, setAsKey, identityKey: keyOf, hasIdentities } =
    useIdentitySelector({
      identities: identityOptions,
      defaultIdentity: defaultIdentityOption,
      controlledKey,
      setControlledKey,
    });

  const effectiveIdentity = selectedIdentity ?? safeIdentities[0] ?? null;

  const asIdentity: ParticipantIdentity | null = useMemo(() => {
    if (effectiveIdentity?.participantType && effectiveIdentity?.participantId) {
      return {
        participantType: effectiveIdentity.participantType as any,
        participantId: String(effectiveIdentity.participantId) as any,
      } as any;
    }
    if (myUserId) return { participantType: "USER", participantId: myUserId as any } as any;
    return null;
  }, [effectiveIdentity?.participantType, effectiveIdentity?.participantId, myUserId]);

  const identityRef = useRef<IdentityOption | null>(null);
  useEffect(() => {
    identityRef.current = effectiveIdentity;
  }, [effectiveIdentity]);

  const myIdentityKeys = useMemo(() => {
    const s = new Set<string>();
    for (const i of identityOptions) {
      s.add(makeKey(i.participantType, String(i.participantId)));
    }
    return s;
  }, [identityOptions]);

  const identityTitleByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of identityOptions) {
      m.set(makeKey(i.participantType, String(i.participantId)), i.title);
    }
    return m;
  }, [identityOptions]);

  const identityByKey = useMemo(() => {
    const m = new Map<string, IdentityOption>();
    for (const i of identityOptions) {
      m.set(makeKey(i.participantType, String(i.participantId)), i);
    }
    return m;
  }, [identityOptions]);

  const otherParticipant = useMemo(() => {
    if (!isDirectThread) return null;
    if (participants.length === 0) return null;

    if (asIdentity) {
      const meKey = makeKey(asIdentity.participantType, asIdentity.participantId);
      const other = participants.find((p) => makeKey(p.participantType, p.participantId) !== meKey);
      if (other) return other;
    }

    const cp = participants.find((p) => !myIdentityKeys.has(makeKey(p.participantType, p.participantId)));
    if (cp) return cp;

    if (myUserId) {
      return (
        participants.find((p) => !(p.participantType === "USER" && p.participantId === myUserId)) ??
        null
      );
    }

    return participants[0] ?? null;
  }, [participants, isDirectThread, asIdentity, myIdentityKeys, myUserId]);

  const canUseRecommendationCtas = useMemo(() => {
    const actingAsUser =
      !!asIdentity && String(asIdentity.participantType).toUpperCase() === "USER";
    if (!actingAsUser) return false;

    const hasOtherUserParticipant =
      (participants ?? []).some(
        (p) =>
          String(p.participantType).toUpperCase() === "USER" &&
          String(p.participantId) !== String(myUserId)
      );

    return hasOtherUserParticipant;
  }, [asIdentity, participants, myUserId]);

  const canUseReferralCtas = useMemo(() => {
    if (!asIdentity) return false;
    if (!isDirectThread || participants.length !== 2) return false;
    if (!otherParticipant) return false;
    return String(otherParticipant.participantType).toUpperCase() === "USER";
  }, [asIdentity, isDirectThread, participants.length, otherParticipant]);

  return {
    identityOptions,
    safeIdentities,
    selectedIdentity,
    effectiveIdentity,
    asIdentity,
    asKey,
    setAsKey,
    keyOf,
    hasIdentities,
    identityRef,
    myIdentityKeys,
    identityTitleByKey,
    identityByKey,
    otherParticipant,
    canUseRecommendationCtas,
    canUseReferralCtas,
  };
}