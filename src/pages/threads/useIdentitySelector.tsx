// src/pages/threads/useIdentitySelector.tsx
import { useEffect, useMemo, useState } from "react";
import type { ParticipantType, UUID } from "../../types/threads";

export type IdentityOption = {
  participantType: ParticipantType;
  participantId: UUID;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

export function identityKey(i?: IdentityOption | null) {
  if (!i) return "";
  return `${i.participantType}:${String(i.participantId)}`;
}

function tryRead(key?: string): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function tryWrite(key: string | undefined, val: string) {
  if (!key) return;
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore
  }
}

type Params = {
  identities: Array<IdentityOption | null | undefined>;
  defaultIdentity: IdentityOption | null;

  // Uncontrolled mode persistence (legacy / page-local)
  persistKey?: string;

  // Controlled mode (preferred for global identity state)
  controlledKey?: string;
  setControlledKey?: (k: string) => void;

  debug?: boolean;
};

export function useIdentitySelector(params: Params) {
  const { identities, defaultIdentity, persistKey, controlledKey, setControlledKey, debug } = params;

  const safeIdentities = useMemo(
    () => (identities ?? []).filter(Boolean) as IdentityOption[],
    [identities]
  );

  const effectiveDefault = useMemo<IdentityOption | null>(() => {
    if (defaultIdentity) return defaultIdentity;
    return safeIdentities[0] ?? null;
  }, [defaultIdentity, safeIdentities]);

  const availableKeys = useMemo(() => new Set(safeIdentities.map(identityKey)), [safeIdentities]);
  const defKey = useMemo(() => identityKey(effectiveDefault), [effectiveDefault]);

  const isControlled = !!setControlledKey;

  // Uncontrolled internal state (only used when not controlled)
  const [uncontrolledKey, setUncontrolledKey] = useState<string>(() => {
    const persisted = tryRead(persistKey);
    return persisted || defKey;
  });

  // The "source of truth" key for selection
  const asKey = isControlled ? (controlledKey ?? "") : uncontrolledKey;

  const setAsKey = (k: string) => {
    if (isControlled) {
      setControlledKey?.(k);
    } else {
      setUncontrolledKey(k);
    }
  };

  // Keep key valid when identities list changes
  useEffect(() => {
    if (safeIdentities.length === 0) return;

    const cur = asKey;

    // if current is valid, keep it
    if (cur && availableKeys.has(cur)) return;

    // ✅ Controlled mode: DO NOT auto-fallback.
    // The parent/store owns the selection; identities may not be ready yet.
    if (isControlled) return;

    // uncontrolled: try persisted key if it exists and is valid
    const persisted = tryRead(persistKey);
    if (persisted && availableKeys.has(persisted)) {
      setUncontrolledKey(persisted);
      return;
    }

    // fall back to default
    if (defKey) setAsKey(defKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdentities, availableKeys, defKey, isControlled, asKey, persistKey]);

  // Persist only in uncontrolled mode
  useEffect(() => {
    if (isControlled) return;
    if (persistKey && asKey) tryWrite(persistKey, asKey);
  }, [isControlled, persistKey, asKey]);

  const selectedIdentity = useMemo<IdentityOption | null>(() => {
    const found = safeIdentities.find((i) => identityKey(i) === asKey);
    return found ?? effectiveDefault ?? null;
  }, [safeIdentities, asKey, effectiveDefault]);

  useEffect(() => {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.log("[useIdentitySelector]", {
      mode: isControlled ? "controlled" : "uncontrolled",
      asKey,
      defKey,
      count: safeIdentities.length,
    });
  }, [debug, isControlled, asKey, defKey, safeIdentities.length]);

  return {
    safeIdentities,
    selectedIdentity,
    asKey,
    setAsKey,
    identityKey,
    hasIdentities: safeIdentities.length > 0,
  };
}