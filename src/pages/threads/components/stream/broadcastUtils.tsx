import type {
  ThreadActivityDTO,
  ThreadCtaDTO,
} from "../../../../types/threads";
import type {
  BroadcastMeta,
  BroadcastChildItem,
} from "./types";
import type {
 ThreadOrderCardDTO,
} from "../../../../types/orderTypes";

/* ---------------- helpers ---------------- */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

/* ---------------- extraction ---------------- */

export function extractBroadcastMetaFromActivity(
  activity: ThreadActivityDTO
): BroadcastMeta | null {
  const p = asRecord(activity.payload);
  if (!p) return null;

  const source = readString(p.source);
  const broadcastId = readString(p.broadcastId);

  if (source !== "BROADCAST" || !broadcastId) return null;

  return {
    source: "BROADCAST",
    broadcastId,
    broadcastItemId: readString(p.broadcastItemId),
    broadcastPosition: readNumber(p.broadcastPosition),
  };
}

export function extractBroadcastMetaFromCta(
  cta: ThreadCtaDTO
): BroadcastMeta | null {
  try {
    const cfg = JSON.parse((cta as any).configJson || "{}");

    const source = readString(cfg.source);
    const broadcastId = readString(cfg.broadcastId);

    if (source !== "BROADCAST" || !broadcastId) return null;

    return {
      source: "BROADCAST",
      broadcastId,
      broadcastItemId: readString(cfg.broadcastItemId),
      broadcastPosition: readNumber(cfg.broadcastPosition),
    };
  } catch {
    return null;
  }
}

export function extractBroadcastMetaFromOrder(
  order: ThreadOrderCardDTO
) {
  const broadcastId =
    typeof order?.sourceBroadcastId === "string" &&
    order.sourceBroadcastId.trim()
      ? order.sourceBroadcastId.trim()
      : null;

  if (!broadcastId) return null;

  const broadcastItemId =
    typeof order?.sourceBroadcastItemId === "string" &&
    order.sourceBroadcastItemId.trim()
      ? order.sourceBroadcastItemId.trim()
      : null;

  const broadcastPosition =
    typeof order?.sourceBroadcastPosition === "number" &&
    Number.isFinite(order.sourceBroadcastPosition)
      ? order.sourceBroadcastPosition
      : null;

  return {
    source: "BROADCAST" as const,
    broadcastId,
    broadcastItemId,
    broadcastPosition,
  };
}

/* ---------------- child mapping ---------------- */

export function toBroadcastChildFromActivity(
  activity: ThreadActivityDTO,
  meta: BroadcastMeta
): BroadcastChildItem | null {
  const type = String((activity as any)?.type ?? "").toUpperCase();
  const eventKey = String((activity.payload as any)?.eventKey ?? "").toUpperCase();

  // OFFER
  if (eventKey === "OFFER_ASSIGNED") {
    return {
      kind: "offer",
      activity,
      meta,
      createdAt: activity.createdAt,
    };
  }

  // MESSAGE ONLY (strict)
  if (type === "MESSAGE") {
    return {
      kind: "message",
      activity,
      meta,
      createdAt: activity.createdAt,
    };
  }

  // 🚨 IMPORTANT: ignore everything else
  return null;
}

export function toBroadcastChildFromCta(
  cta: ThreadCtaDTO,
  meta: BroadcastMeta
): BroadcastChildItem {
  return {
    kind: "cta",
    cta,
    meta,
    createdAt: (cta as any).createdAt ?? null,
  };
}

export function toBroadcastChildFromOrder(
  order: ThreadOrderCardDTO,
  meta: {
    source: "BROADCAST";
    broadcastId: string;
    broadcastItemId?: string | null;
    broadcastPosition?: number | null;
  }
) {
  return {
    kind: "order" as const,
    order,
    meta,
    createdAt: order.updatedAt ?? order.createdAt ?? null,
  };
}

/* ---------------- grouping ---------------- */

type TimelineAtom =
  | {
      kind: "activity";
      createdAt?: string | null;
      activity: ThreadActivityDTO;
      meta: BroadcastMeta | null;
    }
  | {
      kind: "cta";
      createdAt?: string | null;
      cta: ThreadCtaDTO;
      meta: BroadcastMeta | null;
    };

function safeMs(iso?: string | null) {
  const ms = Date.parse(String(iso ?? ""));
  return Number.isFinite(ms) ? ms : 0;
}

export function groupBroadcastAtoms(atoms: TimelineAtom[]) {
  const result: any[] = [];

  let i = 0;

  while (i < atoms.length) {
    const current = atoms[i];
    const meta = current.meta;

    if (!meta?.broadcastId) {
      result.push(current);
      i++;
      continue;
    }

    const group: TimelineAtom[] = [current];
    let j = i + 1;

    while (j < atoms.length) {
      const next = atoms[j];
      if (
        next.meta?.broadcastId === meta.broadcastId &&
        next.meta?.source === "BROADCAST"
      ) {
        group.push(next);
        j++;
      } else {
        break;
      }
    }

    group.sort((a, b) => {
      const pa = a.meta?.broadcastPosition ?? Number.MAX_SAFE_INTEGER;
      const pb = b.meta?.broadcastPosition ?? Number.MAX_SAFE_INTEGER;

      if (pa !== pb) return pa - pb;

      return safeMs(a.createdAt) - safeMs(b.createdAt);
    });

    result.push({
      kind: "broadcast_group",
      broadcastId: meta.broadcastId,
      atoms: group,
    });

    i = j;
  }

  return result;
}