// src/pages/threads/components/stream/types.ts
import type {
  RecommendationActivityPayloadDTO,
  ThreadActivityDTO,
  ThreadCtaDTO,
  ThreadParticipantDTO,
} from "../../../../types/threads";
import type { ReferralAskPayload } from "../../../../components/referrals/ReferralAskCard";
import type { ThreadOrderCardDTO } from "../../../../types/orderTypes";

export type RenderSystem = {
  kind: "system";
  key: string;
  text: string;
  raw?: any;
  payload?: Record<string, unknown> | null;
  systemEventKey?: string | null;
  assignedOfferId?: string | null;
  note?: string | null;
  offerTitle?: string | null;
  status?: string | null;
};

export type RenderDivider = { kind: "divider"; key: string; text: string };

export type RenderGroup = {
  kind: "group";
  key: string;
  mine: boolean;
  actorKey: string;
  displayName: string;
  badge?: string | null;
  participant?: ThreadParticipantDTO | null;
  createdAt?: string | null;
  messages: ThreadActivityDTO[];
};

export type RenderRecommendation = {
  kind: "recommendation";
  key: string;
  createdAt?: string | null;
  payload: RecommendationActivityPayloadDTO;
};

export type RenderReferralAsk = {
  kind: "referralAsk";
  key: string;
  createdAt?: string | null;
  content?: string | null;
  payload: ReferralAskPayload;
  actorKey?: string | null;
};

export type RenderCta = {
  kind: "cta";
  key: string;
  createdAt?: string | null;
  cta: ThreadCtaDTO;
  ctaMessage: string;
  ctaDetail?: string | null;
  requestedCount?: number;
  attachmentCount?: number;
};

export type RenderOrder = {
  kind: "order";
  key: string;
  createdAt?: string | null;
  order: ThreadOrderCardDTO;
};

export type RenderItem =
  | RenderSystem
  | RenderDivider
  | RenderGroup
  | RenderRecommendation
  | RenderReferralAsk
  | RenderOrder
  | BroadcastEnvelopeItem
  | RenderCta;

/* ---------------- broadcast meta ---------------- */

export type BroadcastMeta = {
  source: "BROADCAST";
  broadcastId: string;
  broadcastItemId?: string | null;
  broadcastPosition?: number | null;
};

/* ---------------- child items ---------------- */

export type BroadcastChildItem =
  | {
      kind: "message";
      activity: ThreadActivityDTO;
      meta: BroadcastMeta;
      createdAt?: string | null;
    }
  | {
      kind: "offer";
      activity: ThreadActivityDTO;
      meta: BroadcastMeta;
      createdAt?: string | null;
    }
  | {
      kind: "cta";
      cta: ThreadCtaDTO;
      meta: BroadcastMeta;
      createdAt?: string | null;
    }
  | {
      kind: "order";
      order: ThreadOrderCardDTO;
      meta: BroadcastMeta;
      createdAt?: string | null;
    };
    
/* ---------------- envelope ---------------- */

export type BroadcastEnvelopeItem = {
  kind: "broadcast_envelope";
  key: string;
  broadcastId: string;
  occurredAt?: string | null;
  children: BroadcastChildItem[];
};