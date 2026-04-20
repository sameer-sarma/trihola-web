// src/pages/threads/components/stream/useThreadRenderItems.ts
import { useMemo } from "react";
import type {
  RecommendationActivityPayloadDTO,
  ThreadActivityDTO,
  ThreadCtaDTO,
  ThreadParticipantDTO,
} from "../../../../types/threads";
import type { ReferralAskPayload } from "../../../../components/referrals/ReferralAskCard";
import type { ThreadOrderCardDTO } from "../../../../types/orderTypes";
import type {
  RenderCta,
  RenderDivider,
  RenderGroup,
  RenderItem,
  RenderRecommendation,
  RenderReferralAsk,
  RenderSystem,
  BroadcastEnvelopeItem,
  RenderOrder,
} from "./types";

import {
  extractBroadcastMetaFromActivity,
  extractBroadcastMetaFromCta,
  extractBroadcastMetaFromOrder,
  toBroadcastChildFromActivity,
  toBroadcastChildFromCta,
  toBroadcastChildFromOrder,
} from "./broadcastUtils";

const GROUP_GAP_MS = 24 * 60 * 60 * 1000;

function safeIsoMs(iso?: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(String(iso));
  return Number.isFinite(ms) ? ms : 0;
}

function dayKey(ms: number) {
  try {
    return new Date(ms).toDateString();
  } catch {
    return String(ms);
  }
}

function fmtDivider(ms: number) {
  try {
    const d = new Date(ms);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString();
  } catch {
    return "";
  }
}

function isRecommendationPayload(p: any): p is RecommendationActivityPayloadDTO {
  return !!p && typeof p === "object" && String(p.kind || "").toUpperCase() === "RECOMMENDATION";
}

function isReferralAskPayload(p: any): p is ReferralAskPayload {
  return !!p && typeof p === "object" && String(p.activityType ?? "").toUpperCase() === "REFERRAL_NOTE";
}

function activityActor(a: any): { participantType: string; participantId: string } | null {
  if (!a) return null;
  const actor = a.actor ?? a.actorIdentity ?? null;
  const pt = actor?.participantType ?? a.participantType ?? a.actorParticipantType ?? null;
  const pid = actor?.participantId ?? a.participantId ?? a.actorParticipantId ?? null;
  if (!pt || !pid) return null;
  return { participantType: String(pt), participantId: String(pid) };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function participantDisplayName(p?: ThreadParticipantDTO | null): string {
  if (!p) return "Someone";

  const full = [p.userMini?.firstName, p.userMini?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return p.displayName || p.businessMini?.name || full || p.userMini?.slug || "Someone";
}

type Params = {
  activities: ThreadActivityDTO[];
  liveCtas: ThreadCtaDTO[];
  threadActiveCtas?: ThreadCtaDTO[] | null;
  myIdentityKeys: Set<string>;
  participantByKey: Map<string, ThreadParticipantDTO>;
  identityTitleByKey: Map<string, string>;
  myDisplayName: string;
  makeKey: (type: string, id: string) => string;
  fmtDateTime: (iso?: string | null) => string;
  visibleOrders?: ThreadOrderCardDTO[];
};

export function useThreadRenderItems({
  activities,
  liveCtas,
  threadActiveCtas,
  myIdentityKeys,
  participantByKey,
  identityTitleByKey,
  myDisplayName,
  makeKey,
  fmtDateTime,
  visibleOrders = [],
}: Params): RenderItem[] {
  return useMemo(() => {
    const items: RenderItem[] = [];
    let current: RenderGroup | null = null;

    let lastSystemSig: string | null = null;
    let lastSystemMs: number | null = null;
    let lastIntroDay: string | null = null;
    let lastAnyDay: string | null = null;

    let broadcastBuffer: any[] = [];
    let currentBroadcastId: string | null = null;

    const flush = () => {
      if (current) items.push(current);
      current = null;
    };

    const flushBroadcast = () => {
      if (!broadcastBuffer.length) return;

      const first = broadcastBuffer[0];

      const children = broadcastBuffer
        .map((entry) => {
          if (entry.kind === "activity") {
            return toBroadcastChildFromActivity(entry.a, entry.meta);
          }
          if (entry.kind === "cta") {
            return toBroadcastChildFromCta(entry.cta, entry.meta);
          }
          return toBroadcastChildFromOrder(entry.order, entry.meta);
        })
        .filter((child): child is NonNullable<typeof child> => child != null)
        .sort((a, b) => {
          const pa = a.meta?.broadcastPosition ?? Number.MAX_SAFE_INTEGER;
          const pb = b.meta?.broadcastPosition ?? Number.MAX_SAFE_INTEGER;
          if (pa !== pb) return pa - pb;

          return safeIsoMs(a.createdAt) - safeIsoMs(b.createdAt);
        });

      const envelope: BroadcastEnvelopeItem = {
        kind: "broadcast_envelope",
        key: `broadcast:${currentBroadcastId}`,
        broadcastId: currentBroadcastId!,
        occurredAt: first.createdAt,
        children,
      };

      items.push(envelope);

      broadcastBuffer = [];
      currentBroadcastId = null;
    };

    type TimelineEntry =
      | { kind: "activity"; createdAt?: string | null; a: ThreadActivityDTO }
      | { kind: "cta"; createdAt?: string | null; cta: ThreadCtaDTO }
      | { kind: "order"; createdAt?: string | null; order: ThreadOrderCardDTO };

    const timelineCtasSource = liveCtas.length > 0 ? liveCtas : threadActiveCtas ?? [];

    const timelineCtas = (timelineCtasSource as ThreadCtaDTO[]).filter((c: any) => {
      const s = String((c as any).state ?? "").toUpperCase();
      return s !== "CANCELLED";
    });

    const timeline: TimelineEntry[] = [
      ...((activities ?? []) as ThreadActivityDTO[]).map(
        (a): TimelineEntry => ({
          kind: "activity" as const,
          createdAt: (a as any).createdAt ?? null,
          a,
        })
      ),
      ...((timelineCtas ?? []) as ThreadCtaDTO[]).map(
        (cta): TimelineEntry => ({
          kind: "cta" as const,
          createdAt: (cta as any).createdAt ?? null,
          cta,
        })
      ),
      ...((visibleOrders ?? []).map(
        (order): TimelineEntry => ({
          kind: "order" as const,
          createdAt: order.updatedAt ?? order.createdAt ?? null,
          order,
        })
      )),
    ];

    timeline.sort((x, y) => safeIsoMs(x.createdAt) - safeIsoMs(y.createdAt));

    const safeJsonParseLocal = (raw: string | null | undefined) => {
      try {
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const parseReferralAdd = (cta: ThreadCtaDTO) => {
      const raw = (cta as any).configJson as string;
      const cfg = safeJsonParseLocal(raw);

      const detail = String(cfg?.message ?? "").trim();
      const requestedCount = Number(cfg?.requestedCount ?? 0) || 0;

      const attachments = Array.isArray(cfg?.referralDefaults?.attachments)
        ? cfg.referralDefaults.attachments
        : [];

      const createdByType =
        String((cta as any)?.createdByType ?? (cta as any)?.created_by_type ?? "").toUpperCase();
      const createdById = String((cta as any)?.createdById ?? (cta as any)?.created_by_id ?? "");

      const createdByKey =
        createdByType && createdById ? makeKey(createdByType, createdById) : "";

      const createdByP = createdByKey ? participantByKey.get(createdByKey) : undefined;
      const creatorName = participantDisplayName(createdByP);

      return {
        message: `${creatorName} has asked for referral(s)`,
        detail: detail || null,
        requestedCount,
        attachmentCount: attachments.length,
      };
    };

    const parseRecommendBusiness = (cta: ThreadCtaDTO) => {
      const raw = (cta as any).configJson as string;
      const cfg = safeJsonParseLocal(raw);

      const detail = String(cfg?.message ?? "").trim();
      const requestedCount = Number(cfg?.requestedCount ?? 0) || 0;

      const attachments = Array.isArray(cfg?.referralDefaults?.attachments)
        ? cfg.referralDefaults.attachments
        : [];

      const createdByType =
        String((cta as any)?.createdByType ?? (cta as any)?.created_by_type ?? "").toUpperCase();
      const createdById = String((cta as any)?.createdById ?? (cta as any)?.created_by_id ?? "");

      const createdByKey =
        createdByType && createdById ? makeKey(createdByType, createdById) : "";

      const createdByP = createdByKey ? participantByKey.get(createdByKey) : undefined;
      const creatorName = participantDisplayName(createdByP);

      return {
        message: `${creatorName} has asked for recommendation(s)`,
        detail: detail || null,
        requestedCount,
        attachmentCount: attachments.length,
      };
    };

    for (let i = 0; i < timeline.length; i++) {
      const entry = timeline[i];
      const ms = safeIsoMs(entry.createdAt);
      const dk = dayKey(ms);

      let meta = null;

      if (entry.kind === "activity") {
        meta = extractBroadcastMetaFromActivity(entry.a);
      } else if (entry.kind === "cta") {
        meta = extractBroadcastMetaFromCta(entry.cta);
      } else if (entry.kind === "order") {
        meta = extractBroadcastMetaFromOrder(entry.order);
      }

      if (meta?.broadcastId) {
        if (!currentBroadcastId) {
          flush();
          currentBroadcastId = meta.broadcastId;
        }

        if (currentBroadcastId === meta.broadcastId) {
          broadcastBuffer.push({
            ...entry,
            meta,
          });
          continue;
        } else {
          flushBroadcast();
          flush();

          currentBroadcastId = meta.broadcastId;
          broadcastBuffer.push({
            ...entry,
            meta,
          });
          continue;
        }
      } else {
        if (broadcastBuffer.length) {
          flushBroadcast();
        }
      }

      if (lastAnyDay && dk !== lastAnyDay) {
        flush();
        const divider: RenderDivider = {
          kind: "divider",
          key: `div-${ms}-${i}`,
          text: fmtDivider(ms),
        };
        items.push(divider);
      }
      lastAnyDay = dk;

      if (entry.kind === "order") {
        const meta = extractBroadcastMetaFromOrder(entry.order);

        if (meta?.broadcastId) {
          const entryBroadcastId = meta.broadcastId;

          if (currentBroadcastId && currentBroadcastId !== entryBroadcastId) {
            flush();
            flushBroadcast();
          }

          flush();

          currentBroadcastId = entryBroadcastId;
          broadcastBuffer.push({
            kind: "order" as const,
            createdAt: entry.createdAt,
            order: entry.order,
            meta,
          });

          continue;
        }

        flushBroadcast();
        flush();

        items.push({
          kind: "order",
          key: `order:${entry.order.id}`,
          createdAt: entry.createdAt,
          order: entry.order,
        });

        continue;
      }

      if (entry.kind === "cta") {
        flush();

        const cta = entry.cta;
        let ctaMessage = "Request";
        let ctaDetail: string | null = null;
        let requestedCount: number | undefined = undefined;
        let attachmentCount: number | undefined = undefined;

        const kindUpper = String((cta as any).kind ?? "").toUpperCase();

        if (kindUpper === "REFERRAL_ADD") {
          const p = parseReferralAdd(cta);
          ctaMessage = p.message;
          ctaDetail = p.detail;
          requestedCount = p.requestedCount;
          attachmentCount = p.attachmentCount;
        } else if (kindUpper === "RECOMMEND_BUSINESS") {
          const p = parseRecommendBusiness(cta);
          ctaMessage = p.message;
          ctaDetail = p.detail;
          requestedCount = p.requestedCount;
          attachmentCount = p.attachmentCount;
        } else {
          const cfg = safeJsonParseLocal((cta as any).configJson);
          const msg = String(cfg?.message ?? "").trim();
          ctaMessage = "Request";
          ctaDetail = msg || null;
        }

        const ctaItem: RenderCta = {
          kind: "cta",
          key: String((cta as any).id ?? `cta-${i}`),
          createdAt: (cta as any).createdAt ?? null,
          cta,
          ctaMessage,
          ctaDetail,
          requestedCount,
          attachmentCount,
        };

        items.push(ctaItem);
        continue;
      }

      const a: any = entry.a;
      const actor = activityActor(a);
      const t = String(a?.type ?? "").toUpperCase();
      const pld: any = a?.payload ?? null;

      if (isReferralAskPayload(pld)) {
        flush();

        const actorKey = actor ? makeKey(actor.participantType, actor.participantId) : null;

        const referralAskItem: RenderReferralAsk = {
          kind: "referralAsk",
          key: String(a?.id ?? `refask-${i}`),
          createdAt: a?.createdAt ?? null,
          content: a?.content ?? null,
          payload: pld,
          actorKey,
        };

        items.push(referralAskItem);
        continue;
      }

      const isSystem = t === "SYSTEM" || t === "EXTERNAL_EVENT" || !actor;

      if (isSystem) {
        flush();

        if (isRecommendationPayload(pld)) {
          const recommendationItem: RenderRecommendation = {
            kind: "recommendation",
            key: String(a?.id ?? `rec-${i}`),
            createdAt: a?.createdAt ?? null,
            payload: pld as RecommendationActivityPayloadDTO,
          };
          items.push(recommendationItem);
          continue;
        }

        const payloadRecord = asRecord(pld);
        const systemEventKey = readString(payloadRecord?.eventKey ?? null);
        const assignedOfferId = readString(payloadRecord?.assignedOfferId ?? null);
        const offerTitle = readString(payloadRecord?.offerTitle ?? null);
        const note = readString(payloadRecord?.notes ?? null);
        const status = readString(payloadRecord?.status ?? null);

        const content = String(a?.content ?? "(event)").trim();

        const sig =
          systemEventKey === "OFFER_ASSIGNED"
            ? `${t}:${systemEventKey}:${assignedOfferId ?? ""}:${status ?? ""}`
            : `${t}:${content}`;

        if (
          lastSystemSig === sig &&
          lastSystemMs !== null &&
          Math.abs(ms - lastSystemMs) < 2 * 60 * 1000
        ) {
          continue;
        }

        const isIntro = /^INTRO_EMAIL_SENT\b/i.test(content);
        if (isIntro) {
          if (lastIntroDay === dk) continue;
          lastIntroDay = dk;
        }

        lastSystemSig = sig;
        lastSystemMs = ms;

        const systemItem: RenderSystem = {
          kind: "system",
          key: String(a?.id ?? `sys-${i}`),
          text: content,
          raw: a,
//          activity: a,
//          createdAt: a?.createdAt ?? null,
          payload: payloadRecord,
          systemEventKey,
          assignedOfferId,
          offerTitle,
          note,
          status,
        };

        items.push(systemItem);
        continue;
      }

      const actorKey = makeKey(actor.participantType, actor.participantId);
      const mine = myIdentityKeys.has(actorKey);
      const p = participantByKey.get(actorKey);

      const displayName = mine
        ? identityTitleByKey.get(actorKey) ?? myDisplayName
        : p?.displayName ?? p?.businessMini?.name ?? "Participant";

      const badge = String(actor.participantType).toUpperCase() === "BUSINESS" ? "Business" : null;

      const lastInGroup = current?.messages?.[current.messages.length - 1] as any;
      const canAppend =
        current &&
        current.actorKey === actorKey &&
        Math.abs(ms - safeIsoMs(lastInGroup?.createdAt)) <= GROUP_GAP_MS;

      if (!canAppend) {
        flush();
        current = {
          kind: "group",
          key: String(a?.id ?? `g-${i}`),
          mine,
          actorKey,
          displayName,
          badge,
          participant: p ?? null,
          createdAt: a?.createdAt ?? null,
          messages: [a],
        };
      } else {
        current?.messages.push(a);
      }
    }

    flushBroadcast();
    flush();
    return items;
  }, [
    activities,
    liveCtas,
    threadActiveCtas,
    visibleOrders,
    myIdentityKeys,
    participantByKey,
    identityTitleByKey,
    myDisplayName,
    makeKey,
  ]);
}