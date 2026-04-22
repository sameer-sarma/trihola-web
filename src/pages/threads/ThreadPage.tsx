// src/pages/threads/ThreadPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../../supabaseClient";
import {
  sendThreadMessage,
  sendIntroEmail,
  acceptReferralV2,
  rejectReferralV2,
  cancelReferralV2,
  inviteRecommenderToReferralThread,
  createThreadCta,
} from "../../services/threadService";

import { bulkCreateReferrals } from "../../services/referralService";

import AddReferralCta, {
  type CreateReferralCtaPayload,
} from "./AddReferralCta";

import AddRecommendationCta from "./AddRecommendationCta";
import ReferralAddCtaModal from "./ReferralAddCtaModal";
import RecommendationAddCtaModal, {
  type TargetPick,
  type UiAttachment,
} from "./RecommendationCtaModal";

import AssignOfferDrawer from "./AssignOfferDrawer";
import { assignableRecipientsFromDirectThread } from "../../utils/offerAssignmentPlanMappers";
import { listOfferTemplates } from "../../services/offerTemplateService";
import { createOfferAssignmentPlan } from "../../services/offerAssignmentPlanService";

import type {
  CreateOfferAssignmentPlanRequest,
  OfferAssignmentRuleSpec,
  ThreadOfferRecipientOption,
} from "../../types/offerAssignmentPlanTypes";

import type { OfferTemplateResponse } from "../../types/offerTemplateTypes";

import type {
  ThreadCtaDTO,
  ThreadParticipantDTO,
  ParticipantIdentity,
  UUID,
  AllowedActionsDTO,
  IntroEmailRequest,
  IntroEmailResultDTO,
  ThreadContextType,
  UserMiniDTO,
  BusinessMiniDTO,
  RecommendationActivityPayloadDTO,
  AttachmentDTO,
  BroadcastItemPayloadDTO,
} from "../../types/threads";

import { useAppData } from "../../context/AppDataContext";
import { useThreadStore } from "../../context/ThreadStoreContext";
import ImageLightbox, { type LightboxItem } from "../../components/ImageLightbox";
import ParticipantListModal from "./ParticipantListModal";

import ThreadTopBar from "./components/ThreadTopBar";
import ThreadEmailComposerModal, {
  type EmailComposerRecipient,
} from "./components/ThreadEmailComposerModal";
import ThreadStream from "./components/ThreadStream";
import ThreadComposer from "./components/ThreadComposer";
import { useThreadScroll } from "./components/useThreadScroll";

import type { RenderItem } from "./components/stream/types";
import { useThreadRenderItems } from "./components/stream/useThreadRenderItems";
import { useAttachmentUpload } from "./components/useAttachmentUpload";

import { useThreadIdentity } from "./hooks/useThreadIdentity";
import { useThreadData } from "./hooks/useThreadData";

import { toApiAttachment } from "../../utils/uiHelper";

import CreateOrderModal, {
  type OrderActorOption,
  type OrderBusinessOption,
  type OrderRecipientOption,
} from "../../components/CreateOrderModal";

import {
  fetchDraftOrdersByThreadId,
  submitOrderByBusiness,
  submitOrderForBusinessReview,
  deleteDraftOrder,
} from "../../services/orderService";

import DraftOrdersSidebar from "./components/DraftOrdersSidebar";
import OrderDetailsDrawer from "./components/OrderDetailsDrawer";

import OfferDetailsDrawer from "./components/OfferDetailsDrawer";
import type { OfferOrderPreviewDraftPayloadDTO } from "../../components/OfferOrderPreviewModal";

import "../../css/thread-page.css";
import "../../css/thread-cta.css";
import { OrderDTO } from "../../types/orderTypes";

export type MyProfile = {
  slug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

/* -------------------------------- helpers -------------------------------- */

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso ?? "");
  }
}

function initials(name: string) {
  const p = (name || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "•";
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function ctaCreatedByIdentity(cta: any): ParticipantIdentity | null {
  const by = cta?.createdBy;
  if (by?.participantType && by?.participantId) {
    return {
      participantType:
        String(by.participantType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER",
      participantId: String(by.participantId),
    } as ParticipantIdentity;
  }
  if (cta?.createdByType && cta?.createdById) {
    return {
      participantType:
        String(cta.createdByType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER",
      participantId: String(cta.createdById),
    } as ParticipantIdentity;
  }
  return null;
}

function ctaAssignedToIdentity(cta: any): ParticipantIdentity | null {
  const to = cta?.assignedTo;
  if (to?.participantType && to?.participantId) {
    return {
      participantType:
        String(to.participantType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER",
      participantId: String(to.participantId),
    } as ParticipantIdentity;
  }
  if (cta?.assignedToType && cta?.assignedToId) {
    return {
      participantType:
        String(cta.assignedToType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER",
      participantId: String(cta.assignedToId),
    } as ParticipantIdentity;
  }
  return null;
}

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

function badgeName(b: any): string {
  const n = String(b?.displayName ?? "").trim();
  if (n) return n;
  const bt = String(b?.participantType ?? "").toUpperCase();
  if (bt === "BUSINESS") return String(b?.name ?? "Business");
  return "User";
}

function badgeImage(b: any): string | null {
  return (b?.imageUrl ?? b?.logoUrl ?? null) as any;
}

function formatBytes(n?: number | null) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  const dp = i === 0 ? 0 : i === 1 ? 0 : 1;
  return `${x.toFixed(dp)} ${units[i]}`;
}

function isSameId(a?: string, b?: string) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function getThreadContextForRecommendation(
  currentThreadParticipantIdentities: { participantType: string; participantId: string }[],
  payload: RecommendationActivityPayloadDTO
): "GROUP" | "REC_PROSPECT" | "REC_TARGET" {
  if ((currentThreadParticipantIdentities?.length ?? 0) >= 3) return "GROUP";

  const ids = currentThreadParticipantIdentities ?? [];

  const hasRecommender = ids.some(
    (p) => p.participantType === "USER" && isSameId(p.participantId, payload.recommender?.userId)
  );
  const hasProspect = ids.some(
    (p) => p.participantType === "USER" && isSameId(p.participantId, payload.prospect?.userId)
  );

  if (hasRecommender && hasProspect) return "REC_PROSPECT";

  const hasTarget =
    payload.targetType === "BUSINESS"
      ? ids.some(
          (p) =>
            p.participantType === "BUSINESS" &&
            isSameId(p.participantId, payload.targetBusiness?.businessId)
        )
      : ids.some(
          (p) => p.participantType === "USER" && isSameId(p.participantId, payload.targetUser?.userId)
        );

  if (hasRecommender && hasTarget) return "REC_TARGET";

  return "GROUP";
}

function fullName(u?: UserMiniDTO | null) {
  const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
  return name || u?.slug || "Someone";
}

function normalizeAttachment(x: any): AttachmentDTO | null {
  const url = String(x?.url ?? "").trim();
  if (!url) return null;

  const mime = String(x?.mime ?? x?.mimeType ?? "application/octet-stream").trim();
  const name = String(x?.name ?? x?.fileName ?? "attachment").trim();

  const sizeBytes =
    typeof x?.sizeBytes === "number"
      ? x.sizeBytes
      : typeof x?.size === "number"
      ? x.size
      : null;

  const kind: AttachmentDTO["kind"] =
    x?.kind ??
    (mime.startsWith("image/")
      ? "IMAGE"
      : mime.startsWith("video/")
      ? "VIDEO"
      : mime.startsWith("audio/")
      ? "AUDIO"
      : "DOCUMENT");

  return {
    url,
    name,
    mime,
    sizeBytes,
    kind,
    path: x?.path ?? null,
    isPrimary: x?.isPrimary ?? null,
  };
}

function navigateToParticipant(
  navigate: ReturnType<typeof useNavigate>,
  p: ThreadParticipantDTO
) {
  if (p.participantType === "USER" && p.userMini?.slug) {
    navigate(`/profile/${p.userMini.slug}`);
    return;
  }

  if (p.participantType === "BUSINESS" && p.businessMini?.slug) {
    navigate(`/businesses/${p.businessMini.slug}`);
    return;
  }
}

type ReferralRole = "REFERRER" | "PROSPECT" | "TARGET_USER" | "TARGET_BUSINESS" | "BUSINESS";

function referralRoleOf(p: ThreadParticipantDTO): ReferralRole | null {
  const rr = (p as any)?.referralRole;
  if (!rr) return null;
  const s = String(rr).toUpperCase();
  if (
    s === "REFERRER" ||
    s === "PROSPECT" ||
    s === "BUSINESS" ||
    s === "TARGET_USER" ||
    s === "TARGET_BUSINESS"
  ) {
    return s as any;
  }
  if (s === "TARGET") return "TARGET_USER";
  return null;
}

function participantName(p: ThreadParticipantDTO | null | undefined) {
  if (!p) return "—";
  return p.displayName ?? p.userMini?.firstName ?? p.businessMini?.name ?? "Participant";
}

function participantImage(p: ThreadParticipantDTO | null | undefined) {
  if (!p) return null;
  return (
    (p as any).imageUrl ??
    (p as any).userMini?.profileImageUrl ??
    (p as any).businessMini?.logoUrl ??
    null
  );
}

function ReferralHeader({
  ctx,
  participants,
  allowedActions,
  actionBusy,
  onOpenParticipant,
  onAcceptReferral,
  onCancelReferral,
}: {
  ctx: any;
  participants: ThreadParticipantDTO[];
  allowedActions: AllowedActionsDTO | null;
  actionBusy: boolean;
  onOpenParticipant: (p: ThreadParticipantDTO) => void;
  onAcceptReferral: () => void;
  onCancelReferral: () => void;
  note?: string | null;
}) {
  const byRole = useMemo(() => {
    const m = new Map<ReferralRole, ThreadParticipantDTO>();
    for (const p of participants) {
      const rr = referralRoleOf(p);
      if (rr) m.set(rr, p);
    }
    return m;
  }, [participants]);

  const users = participants.filter((p) => p.participantType === "USER");
  const business = participants.find((p) => p.participantType === "BUSINESS") ?? null;

  const referrer = byRole.get("REFERRER") ?? users[0] ?? null;
  const prospect = byRole.get("PROSPECT") ?? users[1] ?? null;
  const target =
    byRole.get("TARGET_BUSINESS") ??
    byRole.get("TARGET_USER") ??
    byRole.get("BUSINESS") ??
    business ??
    null;

  const status = String(ctx?.referralStatus ?? ctx?.status ?? "PENDING");
  const statusClass = `statusPill--${status.toLowerCase()}`;

  return (
    <div className="refHeader">
      <div className="refHeader__top">
        <div className="refHeader__meta">
          <span className="refHeader__kicker">Referral</span>
          <span className={`statusPill ${statusClass}`}>{status.replace(/_/g, " ")}</span>
        </div>

        <div className="refHeader__actions">
          {allowedActions?.canCancelReferral && (
            <button
              className="btn btn-quiet"
              type="button"
              onClick={onCancelReferral}
              disabled={actionBusy}
            >
              Cancel
            </button>
          )}

          {allowedActions?.canAcceptReferral && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={onAcceptReferral}
              disabled={actionBusy}
            >
              Accept
            </button>
          )}
        </div>
      </div>

      <div className="refHeader__people">
        {[
          { p: referrer, label: "Referrer" },
          { p: prospect, label: "Prospect" },
          {
            p: target,
            label:
              target?.participantType === "BUSINESS" || byRole.has("TARGET_BUSINESS")
                ? "Business"
                : "Target",
          },
        ].map(({ p, label }) => (
          <button
            key={label}
            type="button"
            className="refHeader__person"
            onClick={() => p && onOpenParticipant(p)}
            disabled={!p}
            title={p ? "Open profile" : ""}
          >
            <span className="refHeader__avatar">
              {participantImage(p) ? (
                <img src={participantImage(p)!} alt="" />
              ) : (
                <span className="refHeader__avatarFallback">{initials(participantName(p))}</span>
              )}
            </span>

            <span className="refHeader__personText">
              <span className="refHeader__personName">{participantName(p)}</span>
              <span className="refHeader__role">{label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyReferralHeader() {
  return null;
}

function miniNameUser(u?: UserMiniDTO | null): string {
  if (!u) return "—";
  const first = (u.firstName ?? "").trim();
  const last = (u.lastName ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || (u.slug ?? "User");
}

function miniNameBusiness(b?: BusinessMiniDTO | null): string {
  if (!b) return "—";
  return (b.name ?? "").trim() || (b.slug ?? "Business");
}

function miniImageUser(u?: UserMiniDTO | null): string | null {
  return u?.profileImageUrl ?? null;
}

function makeKey(type: string, id: string) {
  return `${type}:${id}`;
}

function parsePositiveIntOrNull(v?: string | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function trimToNull(v?: string | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function hasEnabledReferralReward(payload: CreateReferralCtaPayload): boolean {
  const rewards = payload.rewards;
  return !!(
    rewards.assigneeOnCompletion.enabled ||
    rewards.prospectOnReferralCreation.enabled ||
    rewards.referrerOnReferralCreation.enabled
  );
}

function buildReferralCtaRewardRules(
  payload: CreateReferralCtaPayload
): OfferAssignmentRuleSpec[] {
  const rules: OfferAssignmentRuleSpec[] = [];

  const assignee = payload.rewards.assigneeOnCompletion;
  if (assignee.enabled && assignee.offerTemplateId) {
    rules.push({
      clientRuleKey: "assignee_on_completion",
      offerTemplateId: assignee.offerTemplateId,
      attachToEntityType: "CTA",
      recipient: {
        selectorType: "CTA_ASSIGNEE",
      },
      assignmentCondition: "ON_CTA_COMPLETED",
      activationCondition: "ON_CTA_COMPLETED",
      maxRedemptionsOverride: parsePositiveIntOrNull(assignee.maxRedemptionsOverrideText),
      notes: trimToNull(assignee.notes),
      ruleConfigJson: {},
    });
  }

  const prospect = payload.rewards.prospectOnReferralCreation;
  if (prospect.enabled && prospect.offerTemplateId) {
    rules.push({
      clientRuleKey: "prospect_on_referral_created",
      offerTemplateId: prospect.offerTemplateId,
      attachToEntityType: "REFERRAL",
      recipient: {
        selectorType: "REFERRAL_ROLE",
        identityType: "USER",
        role: "PROSPECT",
      },
      assignmentCondition: "ON_REFERRAL_CREATED",
      activationCondition: "ON_ASSIGNMENT",
      maxRedemptionsOverride: parsePositiveIntOrNull(prospect.maxRedemptionsOverrideText),
      notes: trimToNull(prospect.notes),
      ruleConfigJson: {},
    });
  }

  const referrer = payload.rewards.referrerOnReferralCreation;
  if (referrer.enabled && referrer.offerTemplateId) {
    rules.push({
      clientRuleKey: "referrer_on_referral_created",
      offerTemplateId: referrer.offerTemplateId,
      attachToEntityType: "REFERRAL",
      recipient: {
        selectorType: "REFERRAL_ROLE",
        identityType: "USER",
        role: "REFERRER",
      },
      assignmentCondition: "ON_REFERRAL_CREATED",
      activationCondition: "ON_ASSIGNMENT",
      maxRedemptionsOverride: parsePositiveIntOrNull(referrer.maxRedemptionsOverrideText),
      notes: trimToNull(referrer.notes),
      ruleConfigJson: {},
    });
  }

  return rules;
}

export default function ThreadPage({
  myProfile,
  myUserId: myUserIdProp,
}: {
  myProfile: MyProfile;
  myUserId: string;
}) {
  const { threadId: threadIdParam } = useParams();
  const threadId = threadIdParam as UUID;

  const navigate = useNavigate();
  const { myBusinesses } = useAppData();

  const {
    participantsByThreadId,
    activitiesByThreadId,
    ctasByThreadId,
    setParticipants: storeSetParticipants,
    setActivities: storeSetActivities,
    setCtas: storeSetCtas,
    ensureThreadWS,
    closeThreadWS,
    selectedScope,
    setSelectedScope,
    contextVersionByThreadId,
  } = useThreadStore();

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [invitingRecId, setInvitingRecId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [defaultIdentity, setDefaultIdentity] = useState<ParticipantIdentity | null>(null);
  const [showReferralCtaModal, setShowReferralCtaModal] = useState(false);
  const [showRecommendationCtaModal, setShowRecommendationCtaModal] = useState(false);

  const [showAssignOfferDrawer, setShowAssignOfferDrawer] = useState(false);
  const [offerTemplates, setOfferTemplates] = useState<OfferTemplateResponse[]>([]);
  const [offerTemplatesLoading, setOfferTemplatesLoading] = useState(false);

  const [openCta, setOpenCta] = useState<ThreadCtaDTO | null>(null);
  const [showReferralAddCtaModal, setShowReferralAddCtaModal] = useState(false);
  const [showRecommendationAddCtaModal, setShowRecommendationAddCtaModal] = useState(false);

  const [showIdentityMenu, setShowIdentityMenu] = useState(false);
  const identityMenuRef = useRef<HTMLDivElement | null>(null);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  type AttachMenuLevel = "ROOT" | "ASK_FOR" | "SHARE";
  const [attachMenuLevel, setAttachMenuLevel] = useState<AttachMenuLevel>("ROOT");

  const closeAttachMenu = useCallback(() => {
    setShowAttachMenu(false);
    setAttachMenuLevel("ROOT");
  }, []);

  const openAskForMenu = useCallback(() => {
    setAttachMenuLevel("ASK_FOR");
  }, []);

  const openShareMenu = useCallback(() => {
    setAttachMenuLevel("SHARE");
  }, []);

  const [lbOpen, setLbOpen] = useState(false);
  const [lbItems, setLbItems] = useState<LightboxItem[]>([]);
  const [lbStartIndex, setLbStartIndex] = useState(0);

  const closeImagesLightbox = useCallback(() => {
    setLbOpen(false);
  }, []);

  const [introOpen, setIntroOpen] = useState(false);
  const [introSubject, setIntroSubject] = useState("");
  const [introBody, setIntroBody] = useState("");
  const [introSending, setIntroSending] = useState(false);
  const [introResult, setIntroResult] = useState<IntroEmailResultDTO | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);

  const [referralActionBusy, setReferralActionBusy] = useState(false);

  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDTO | null>(null);
  const [offerPreviewDraft, setOfferPreviewDraft] =
    useState<OfferOrderPreviewDraftPayloadDTO | null>(null);

  const [orders, setOrders] = useState<OrderDTO[]>([]);

  const [showDraftSidebar, setShowDraftSidebar] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetailsDrawer, setShowOrderDetailsDrawer] = useState(false);

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showOfferDetailsDrawer, setShowOfferDetailsDrawer] = useState(false);

  const getAuth = useCallback(async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) return null;

    const payload = JSON.parse(atob(session.access_token.split(".")[1]));
    return { token: session.access_token, userId: payload.sub as string };
  }, []);

  const myDisplayName = useMemo(() => {
    const n = `${myProfile?.firstName ?? ""} ${myProfile?.lastName ?? ""}`.trim();
    return n || myProfile?.slug || "You";
  }, [myProfile]);

  useEffect(() => {
    if (myUserIdProp) setMyUserId(myUserIdProp);
  }, [myUserIdProp]);

  const normalizeThreadType = useCallback((ctx: any): ThreadContextType | null => {
    const raw =
      ctx?.type ??
      ctx?.threadType ??
      ctx?.threadKind ??
      ctx?.kind ??
      ctx?.contextThreadType ??
      null;

    const s = String(raw ?? "").toUpperCase().trim();
    if (!s) return null;
    if (s === "DIRECT" || s === "GROUP") return s as any;
    return s as any;
  }, []);

  const currentIdentityRef = useRef<any | null>(null);

  const handleResolvedMyUserId = useCallback((userId: string) => {
    setMyUserId((prev) => prev ?? userId);
  }, []);

  const handleDefaultIdentity = useCallback((identity: ParticipantIdentity) => {
    setDefaultIdentity((prev) => prev ?? identity);
  }, []);

  const {
    participants,
    activities,
    threadType,
    threadCtx,
    loading,
    referralNote,
    referralDetailsLoading,
    loadThread,
    refreshThreadContextOnly,
  } = useThreadData({
    threadId,
    threadIdParam,
    getAuth,
    normalizeThreadType,
    participantsByThreadId,
    activitiesByThreadId,
    storeSetParticipants,
    storeSetActivities,
    ensureThreadWS,
    closeThreadWS,
    onResolvedMyUserId: handleResolvedMyUserId,
    onDefaultIdentity: handleDefaultIdentity,
    currentIdentityRef,
    contextVersionByThreadId,
  });

  const isDirectThread = threadType === "DIRECT" || normalizeThreadType(threadCtx) === "DIRECT";
  const isReferralThread = threadCtx?.contextType === "REFERRAL" || !!threadCtx?.referralSlug;

  const {
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
  } = useThreadIdentity({
    participants,
    myUserId,
    myBusinesses,
    myProfile,
    myDisplayName,
    isDirectThread,
    selectedScope,
    setSelectedScope,
    defaultIdentity,
  });

  useEffect(() => {
    currentIdentityRef.current = identityRef.current ?? effectiveIdentity ?? null;
  }, [identityRef, effectiveIdentity]);

  const {
    photoVideoInputRef,
    docInputRef,
    pendingAttachments,
    clearPendingAttachments,
    restorePendingAttachments,
    uploadingAttachments,
    onPickPhotosVideos,
    onPickDocument,
    onPhotoVideoSelected,
    onDocSelected,
    removePendingAttachment,
  } = useAttachmentUpload({
    threadIdParam,
    getAuth,
    setError,
  });

  const { streamRef, scrollToBottom, shouldStickToBottomRef } = useThreadScroll(
    String(threadId ?? ""),
    activities,
    loading
  );

  const allowedActions: AllowedActionsDTO | null = threadCtx?.allowedActions ?? null;
  const canIntro = !!allowedActions?.canSendIntroEmail;

  const introQuotaText = useMemo(() => {
    const remaining =
      introResult?.remainingIntroEmails !== null &&
      introResult?.remainingIntroEmails !== undefined
        ? introResult.remainingIntroEmails
        : allowedActions?.remainingIntroEmails;

    if (remaining === null || remaining === undefined) return null;
    return `Intro emails remaining: ${Math.max(0, remaining)}`;
  }, [allowedActions?.remainingIntroEmails, introResult?.remainingIntroEmails]);

  useEffect(() => {
    if (!showActionsMenu) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      const el = actionsMenuRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!el.contains(target)) setShowActionsMenu(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowActionsMenu(false);
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showActionsMenu]);

  const participantByKey = useMemo(() => {
    const m = new Map<string, ThreadParticipantDTO>();
    participants.forEach((p) => m.set(makeKey(p.participantType, p.participantId), p));
    return m;
  }, [participants]);

  const currentThreadParticipantIdentities = useMemo(
    () =>
      (participants ?? []).map((p) => ({
        participantType: String(p.participantType ?? ""),
        participantId: String(p.participantId ?? ""),
      })),
    [participants]
  );

  const introEmailRecipients: EmailComposerRecipient[] = useMemo(() => {
    if (!isReferralThread) return [];

    const byRole = new Map<string, ThreadParticipantDTO>();
    for (const p of participants) {
      const rr = String((p as any)?.referralRole ?? "").toUpperCase();
      if (rr) byRole.set(rr, p);
    }

    const prospect =
      byRole.get("PROSPECT") ??
      participants.find(
        (p) =>
          String(p.participantType).toUpperCase() === "USER" &&
          String(p.participantId) !== String(myUserId ?? "")
      ) ??
      null;

    if (!prospect) return [];

    return [
      {
        participantType:
          String(prospect.participantType).toUpperCase() === "BUSINESS" ? "BUSINESS" : "USER",
        participantId: String(prospect.participantId),
        name: participantName(prospect),
        imageUrl: participantImage(prospect),
        subtitle:
          String(prospect.participantType).toUpperCase() === "BUSINESS" ? "Business" : "Prospect",
      },
    ];
  }, [isReferralThread, participants, myUserId]);

  const storeCtas = useMemo(
    () => ctasByThreadId.get(String(threadId)) ?? [],
    [ctasByThreadId, threadId]
  );

  const liveCtas: ThreadCtaDTO[] = useMemo(() => {
    return storeCtas.map((cta: any) => {
      const assigned = ctaAssignedToIdentity(cta);
      const created = ctaCreatedByIdentity(cta);

      const isAssignee = sameIdentity(assigned, asIdentity);
      const isCreator = sameIdentity(created, asIdentity);

      return {
        ...cta,
        viewerRole: isAssignee ? "ASSIGNEE" : isCreator ? "CREATOR" : null,
        canAct: isAssignee && String(cta.state ?? "").toUpperCase() === "ACTIVE",
      } as ThreadCtaDTO;
    });
  }, [storeCtas, asIdentity]);

  const prevActiveCtasSigRef = useRef<string>("");

  const assignOfferRecipientOptions: ThreadOfferRecipientOption[] = useMemo(() => {
    if (!isDirectThread) return [];
    if (!asIdentity) return [];

    return assignableRecipientsFromDirectThread({
      participants,
      actingIdentity: asIdentity,
      participantName,
      participantImage,
    });
  }, [isDirectThread, asIdentity, participants]);

  const actingBusinessId =
    asIdentity?.participantType === "BUSINESS" ? String(asIdentity.participantId) : null;

  const canConfigureReferralCtaRewards =
    asIdentity?.participantType === "BUSINESS" && !!actingBusinessId;
  
  const shouldLoadOfferTemplates =
    !!actingBusinessId && (showAssignOfferDrawer || showReferralCtaModal);

  useEffect(() => {
    if (!shouldLoadOfferTemplates) return;
    if (!actingBusinessId) {
      setOfferTemplates([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setOfferTemplatesLoading(true);
      try {
        const auth = await getAuth();
        if (!auth?.token) {
          if (!cancelled) setOfferTemplates([]);
          return;
        }

        const res = await listOfferTemplates(actingBusinessId, auth.token);

        if (!cancelled) {
          setOfferTemplates(res ?? []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setOfferTemplates([]);
          setError(e?.message ?? "Failed to load offers");
        }
      } finally {
        if (!cancelled) setOfferTemplatesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldLoadOfferTemplates, actingBusinessId, getAuth]);

  const onOfferAssigned = useCallback(async () => {
    if (!asIdentity) return;
    await refreshThreadContextOnly(asIdentity);
  }, [asIdentity, refreshThreadContextOnly]);
  
  const draftOrders = useMemo(() => {
    if (!asIdentity) return [];

    return orders.filter((order) => {
      if (order.status !== "DRAFT") return false;

      return (
        String(order.createdByIdentityType).toUpperCase() ===
          String(asIdentity.participantType).toUpperCase() &&
        String(order.createdByIdentityId) === String(asIdentity.participantId)
      );
    });
  }, [orders, asIdentity]);

  useEffect(() => {
    if (draftOrders.length === 0 && showDraftSidebar) {
      setShowDraftSidebar(false);
    }
  }, [draftOrders.length, showDraftSidebar]);

  const loadOrders = useCallback(async () => {
    if (!threadId) return;
    if (!effectiveIdentity) return;

    try {
      const auth = await getAuth();
      if (!auth?.token) {
        return;
      }

      const actingBusinessId =
        effectiveIdentity.participantType === "BUSINESS"
          ? String(effectiveIdentity.participantId)
          : null;

      const data = await fetchDraftOrdersByThreadId(threadId, {
        token: auth.token,
        businessId: actingBusinessId,
      });

      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  }, [threadId, effectiveIdentity, getAuth]);

  const openEditOrder = useCallback((order: OrderDTO) => {
    setOfferPreviewDraft(null);
    setEditingOrder(order);
    setShowCreateOrderModal(true);
  }, []);

  const handleSubmitOrder = useCallback(
    async (order: OrderDTO) => {
      const auth = await getAuth();
      if (!auth) return;

      try {
        let updated: OrderDTO;

        if (order.allowedActions?.canSubmitForBusinessReview) {
          updated = await submitOrderForBusinessReview(order.id, {
            token: auth.token,
            businessId: actingBusinessId,
          });
        } else if (order.allowedActions?.canSubmit) {
          updated = await submitOrderByBusiness(order.id, {
            token: auth.token,
            businessId: actingBusinessId,
          });
        } else {
          return;
        }

        setOrders((current) =>
          current.map((o) => (o.id === updated.id ? updated : o))
        );
      } catch (e: any) {
        setError(e?.message ?? "Failed to submit order");
      }
    },
    [getAuth, actingBusinessId]
  );

  const handleUseOfferPreviewDraft = useCallback(
    (draft: OfferOrderPreviewDraftPayloadDTO) => {
      setOfferPreviewDraft(draft);
      setShowOfferDetailsDrawer(false);
      setSelectedOfferId(null);
      setEditingOrder(null);
      setShowCreateOrderModal(true);
    },
    []
  );

  const handleDeleteDraftOrder = useCallback(
      async (order: OrderDTO) => {
        if (!order.allowedActions?.canDeleteDraft) return;

        const ok = window.confirm("Delete this draft order?");
        if (!ok) return;

        const auth = await getAuth();
        if (!auth) return;

        try {
          await deleteDraftOrder(order.id, {
            token: auth.token,
            businessId: actingBusinessId,
          });

          setOrders((current) => current.filter((o) => o.id !== order.id));
        } catch (e: any) {
          setError(e?.message ?? "Failed to delete draft order");
        }
      },
      [getAuth, actingBusinessId]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onOrderUpdated = useCallback(async () => {
    if (!asIdentity) return;

    await refreshThreadContextOnly(asIdentity);
    await loadOrders();
  }, [asIdentity, refreshThreadContextOnly, loadOrders]);

  const closeOrderDetails = useCallback(() => {
    setShowOrderDetailsDrawer(false);
    setSelectedOrderId(null);
  }, []);

  const openOfferDetailsDrawer = useCallback((assignedOfferId: string) => {
    if (!assignedOfferId) return;
    setSelectedOfferId(assignedOfferId);
    setShowOfferDetailsDrawer(true);
  }, []);

  const closeOfferDetailsDrawer = useCallback(() => {
    setShowOfferDetailsDrawer(false);
    setSelectedOfferId(null);
  }, []);


  useEffect(() => {
    if (!threadId || !threadCtx?.activeCtas) return;

    const sig = JSON.stringify(
      (threadCtx.activeCtas ?? []).map((c: any) => ({
        id: c?.id,
        state: c?.state,
        updatedAt: c?.updatedAt,
        progressJson: c?.progressJson,
        configJson: c?.configJson,
      }))
    );

    if (prevActiveCtasSigRef.current === sig) return;
    prevActiveCtasSigRef.current = sig;

    storeSetCtas(String(threadId), (threadCtx.activeCtas ?? []) as any);
  }, [storeSetCtas, threadId, threadCtx?.activeCtas]);

  useEffect(() => {
    if (!openCta) return;
    const updated = liveCtas.find((c) => String(c.id) === String(openCta.id));
    if (updated && updated !== openCta) setOpenCta(updated);
  }, [liveCtas, openCta]);

  useEffect(() => {
    if (!showIdentityMenu) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      const el = identityMenuRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!el.contains(target)) setShowIdentityMenu(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIdentityMenu(false);
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showIdentityMenu]);

  useEffect(() => {
    if (!showAttachMenu) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      const el = attachMenuRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!el.contains(target)) closeAttachMenu();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAttachMenu();
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showAttachMenu, closeAttachMenu]);

  const lastLoadSignatureRef = useRef<string>("");
  const loadIdentityType = asIdentity?.participantType ?? null;
  const loadIdentityId = asIdentity?.participantId ?? null;

  useEffect(() => {
    if (!threadIdParam) return;

    const sig = `${threadIdParam}|${loadIdentityType ?? ""}|${loadIdentityId ?? ""}`;

    if (lastLoadSignatureRef.current === sig) return;
    lastLoadSignatureRef.current = sig;

    const loadAsIdentity =
      loadIdentityType && loadIdentityId
        ? {
            participantType: loadIdentityType,
            participantId: loadIdentityId,
          }
        : undefined;

    loadThread(loadAsIdentity);
  }, [threadIdParam, loadIdentityType, loadIdentityId, loadThread]);

  const allImages: LightboxItem[] = useMemo(() => {
    const items: LightboxItem[] = [];

    for (const a of activities as any[]) {
      const raw = a?.payload?.attachments ?? a?.attachments;
      const atts = Array.isArray(raw) ? raw : [];

      for (const x of atts) {
        const att = normalizeAttachment(x);
        if (!att) continue;
        if (att.kind !== "IMAGE") continue;

        items.push({
          src: att.url,
          alt: att.name || "Image",
          title: att.name || "",
          openUrl: att.url,
        });
      }
    }

    const seen = new Set<string>();
    return items.filter((it) => {
      if (seen.has(it.src)) return false;
      seen.add(it.src);
      return true;
    });
  }, [activities]);

  const openImagesLightbox = useCallback(
    (src: string) => {
      const idx = Math.max(0, allImages.findIndex((x) => x.src === src));
      setLbItems(allImages);
      setLbStartIndex(idx >= 0 ? idx : 0);
      setLbOpen(true);
    },
    [allImages]
  );

  const handleOpenParticipant = useCallback(
    (p: ThreadParticipantDTO) => navigateToParticipant(navigate, p),
    [navigate]
  );

  const handleNavigateToThread = useCallback(
    (id: string) => navigate(`/threads/${encodeURIComponent(id)}`),
    [navigate]
  );

  const threadTitle = useMemo(() => {
    const raw = String(threadCtx?.title ?? "").trim();
    if (raw) return raw;
    if (isDirectThread && otherParticipant) return participantName(otherParticipant);
    return "Thread";
  }, [threadCtx?.title, isDirectThread, otherParticipant]);

  const sendDisabled =
    sending ||
    uploadingAttachments ||
    (!messageText.trim() && pendingAttachments.length === 0) ||
    (!!allowedActions && !allowedActions.canSendMessage);

  const canReject = !!allowedActions?.canRejectReferral;
  const canCancel = !!allowedActions?.canCancelReferral;

  async function onSend() {
    const asIdentityForSend =
      selectedIdentity ??
      effectiveIdentity ??
      (defaultIdentity
        ? ({
            participantType: defaultIdentity.participantType,
            participantId: defaultIdentity.participantId,
            title: myDisplayName,
          } as any)
        : null);

    const hasText = !!messageText.trim();
    const hasAttachments = pendingAttachments.length > 0;

    if (sending || (!hasText && !hasAttachments) || !asIdentityForSend) return;

    const auth = await getAuth();
    if (!auth) return;

    const textToSend = hasText ? messageText.trim() : "";
    const pendingBeforeSend = [...pendingAttachments];

    const attachmentsForApi: AttachmentDTO[] = hasAttachments
      ? pendingAttachments.map(toApiAttachment).filter((x): x is AttachmentDTO => !!x)
      : [];

    const payloadToSend: BroadcastItemPayloadDTO | null =
      attachmentsForApi.length > 0 ? { attachments: attachmentsForApi } : null;

    setMessageText("");
    clearPendingAttachments();
    setSending(true);
    setError(null);
    shouldStickToBottomRef.current = true;
    scrollToBottom("auto");

    try {
      await sendThreadMessage(auth.token, threadId, {
        asIdentity: {
          participantType: asIdentityForSend.participantType,
          participantId: asIdentityForSend.participantId,
        },
        text: textToSend,
        payload: payloadToSend,
      });
    } catch (e: any) {
      setMessageText(textToSend);
      if (pendingBeforeSend.length) {
        restorePendingAttachments(pendingBeforeSend);
      }
      setError(e?.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function onSendIntroEmail() {
    if (!canIntro || introSending) return;

    const auth = await getAuth();
    if (!auth) return;

    if (!effectiveIdentity?.participantType || !effectiveIdentity?.participantId) return;

    setIntroSending(true);
    setIntroResult(null);
    setError(null);

    try {
      const attachments = await Promise.all(
        emailAttachments.map(async (file) => ({
          filename: file.name,
          base64Content: await fileToBase64(file),
          contentType: file.type || "application/octet-stream",
        }))
      );

      const req: IntroEmailRequest = {
        asIdentity: {
          participantType: effectiveIdentity.participantType,
          participantId: String(effectiveIdentity.participantId),
        },
        subject: introSubject?.trim() ? introSubject.trim() : null,
        textBody: introBody?.trim() ? introBody.trim() : null,
        htmlBody: null,
        attachments,
      };

      const res = await sendIntroEmail(auth.token, threadId, req);
      setIntroResult(res);
      await loadThread(req.asIdentity);

      if (res.ok) {
        setIntroOpen(false);
        setIntroSubject("");
        setIntroBody("");
        setEmailAttachments([]);
      }
    } catch (e: any) {
      setIntroResult({ ok: false, error: e?.message ?? "Failed to send intro email" });
    } finally {
      setIntroSending(false);
    }
  }

  const onAcceptReferral = useCallback(async () => {
    if (!threadCtx?.referralSlug) return;
    if (!allowedActions?.canAcceptReferral || referralActionBusy) return;

    const auth = await getAuth();
    if (!auth) return;
    if (!effectiveIdentity?.participantType || !effectiveIdentity?.participantId) return;

    setReferralActionBusy(true);
    setError(null);

    try {
      await acceptReferralV2(auth.token, threadCtx.referralSlug, {
        asIdentity: {
          participantType: effectiveIdentity.participantType,
          participantId: String(effectiveIdentity.participantId) as any,
        },
        note: null,
      });

      await loadThread({
        participantType: effectiveIdentity.participantType as any,
        participantId: String(effectiveIdentity.participantId) as any,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to accept referral");
    } finally {
      setReferralActionBusy(false);
    }
  }, [
    threadCtx?.referralSlug,
    allowedActions?.canAcceptReferral,
    referralActionBusy,
    getAuth,
    effectiveIdentity?.participantType,
    effectiveIdentity?.participantId,
    loadThread,
  ]);

  async function onRejectReferral() {
    if (!threadCtx?.referralSlug) return;
    if (!allowedActions?.canRejectReferral || referralActionBusy) return;

    const ok = window.confirm("Reject this referral?\n\nThis action cannot be undone.");
    if (!ok) return;

    const auth = await getAuth();
    if (!auth) return;
    if (!effectiveIdentity?.participantType || !effectiveIdentity?.participantId) return;

    setReferralActionBusy(true);
    setError(null);

    try {
      await rejectReferralV2(auth.token, threadCtx.referralSlug, {
        asIdentity: {
          participantType: effectiveIdentity.participantType,
          participantId: String(effectiveIdentity.participantId) as any,
        },
        note: null,
      });

      await loadThread({
        participantType: effectiveIdentity.participantType as any,
        participantId: String(effectiveIdentity.participantId) as any,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to reject referral");
    } finally {
      setReferralActionBusy(false);
    }
  }

  const onCancelReferral = useCallback(async () => {
    if (!threadCtx?.referralSlug) return;
    if (!allowedActions?.canCancelReferral || referralActionBusy) return;

    const auth = await getAuth();
    if (!auth) return;
    if (!effectiveIdentity?.participantType || !effectiveIdentity?.participantId) return;

    setReferralActionBusy(true);
    setError(null);

    try {
      await cancelReferralV2(auth.token, threadCtx.referralSlug, {
        asIdentity: {
          participantType: effectiveIdentity.participantType,
          participantId: String(effectiveIdentity.participantId) as any,
        },
        note: null,
      });

      await loadThread({
        participantType: effectiveIdentity.participantType as any,
        participantId: String(effectiveIdentity.participantId) as any,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to cancel referral");
    } finally {
      setReferralActionBusy(false);
    }
  }, [
    threadCtx?.referralSlug,
    allowedActions?.canCancelReferral,
    referralActionBusy,
    getAuth,
    effectiveIdentity?.participantType,
    effectiveIdentity?.participantId,
    loadThread,
  ]);

  const sidebarReferralHeaderProps = useMemo(
    () => ({
      ctx: threadCtx,
      participants,
      allowedActions,
      note: referralNote,
      actionBusy: referralActionBusy,
      onOpenParticipant: handleOpenParticipant,
      onAcceptReferral,
      onCancelReferral,
    }),
    [
      threadCtx,
      participants,
      allowedActions,
      referralNote,
      referralActionBusy,
      handleOpenParticipant,
      onAcceptReferral,
      onCancelReferral,
    ]
  );

  const onCreateReferralRequest = useCallback(
    async (payload: CreateReferralCtaPayload) => {
      if (!threadId) return;

      const auth = await getAuth();
      if (!auth?.token) {
        throw new Error("Not authenticated.");
      }

      if (!asIdentity?.participantType || !asIdentity?.participantId) {
        throw new Error("Missing acting identity.");
      }

      const createReq = {
        kind: "REFERRAL_ADD",
        createdBy: {
          participantType: asIdentity.participantType,
          participantId: asIdentity.participantId,
        },
        assignedTo: {
          participantType: payload.assignedTo.participantType,
          participantId: payload.assignedTo.participantId,
        },
        configJson: JSON.stringify(payload.config),
        dueAt: payload.schedule.dueAt,
        expiresAt: payload.schedule.expiresAt,
      };

      const createdCta = await createThreadCta(auth.token, threadId, createReq as any);

      const needsPlan = hasEnabledReferralReward(payload);
      if (needsPlan) {
        if (!actingBusinessId) {
          throw new Error("Offer rewards require a business identity.");
        }

        const rules = buildReferralCtaRewardRules(payload);

        if (rules.length > 0) {
          const planReq: CreateOfferAssignmentPlanRequest = {
            source: {
              sourceType: "CTA",
              threadId: String(threadId),
              ctaId: String((createdCta as any)?.id ?? ""),
            },
            rules,
            createdByUserId: auth.userId,
          };

          const planRes = await createOfferAssignmentPlan(
            planReq,
            auth.token,
            actingBusinessId
          );

          if (!planRes.ok) {
            throw new Error(
              planRes.error.message || "CTA created, but failed to create offer rewards."
            );
          }
        }
      }

      await refreshThreadContextOnly(asIdentity);
    },
    [threadId, getAuth, asIdentity, actingBusinessId, refreshThreadContextOnly]
  );

  const onCreateRecommendationRequest = useCallback(
    async (
      assignedTo: ParticipantIdentity,
      config: any,
      schedule: { dueAt: string | null; expiresAt: string | null }
    ) => {
      const auth = await getAuth();
      if (!auth?.token) throw new Error("Not authenticated");
      if (!asIdentity) throw new Error("No identity selected");

      await createThreadCta(auth.token, threadId, {
        createdBy: asIdentity,
        assignedTo,
        kind: "RECOMMEND_BUSINESS",
        configJson: JSON.stringify(config),
        progressJson: "{}",
        dueAt: schedule?.dueAt ?? null,
        expiresAt: schedule?.expiresAt ?? null,
      } as any);

      await refreshThreadContextOnly(asIdentity);
    },
    [getAuth, asIdentity, threadId, refreshThreadContextOnly]
  );

  const onOpenThreadCta = useCallback((cta: ThreadCtaDTO) => {
    const kind = String(cta?.kind ?? "").toUpperCase();

    setOpenCta(cta);

    if (kind === "REFERRAL_ADD") {
      setShowReferralAddCtaModal(true);
    } else if (kind === "RECOMMEND_BUSINESS") {
      setShowRecommendationAddCtaModal(true);
    }
  }, []);

  const onCloseReferralAddCta = useCallback(() => {
    setShowReferralAddCtaModal(false);
    setOpenCta(null);
  }, []);

  const onCloseRecommendationAddCta = useCallback(() => {
    setShowRecommendationAddCtaModal(false);
    setOpenCta(null);
  }, []);

  const onSubmitReferralAddCta = useCallback(
    async (args: {
      ctaId: string;
      threadId: string;
      referrals: Array<{
        prospectUserId: string;
        displayName: string;
        phone?: string;
        email?: string;
        note?: string;
      }>;
      referralDefaults?: {
        suggestedNote?: string;
        attachments?: Array<{
          id?: string;
          url: string;
          name: string;
          mime: string;
          sizeBytes?: number;
          kind?: string;
          path?: string;
        }>;
      };
    }) => {
      const auth = await getAuth();
      if (!auth?.token) throw new Error("Not authenticated");
      if (!myUserId) throw new Error("Missing user id");
      if (!asIdentity) throw new Error("No identity selected");

      const otherBusiness = (participants ?? []).find(
        (p) => String((p as any).participantType ?? "").toUpperCase() === "BUSINESS"
      );
      const otherUser = (participants ?? []).find((p) => {
        const t = String((p as any).participantType ?? "").toUpperCase();
        const pid = String((p as any).participantId ?? "");
        return t === "USER" && pid && pid !== String(myUserId);
      });

      let targetType: "USER" | "BUSINESS";
      let targetUserId: string | null = null;
      let targetBusinessId: string | null = null;

      if (otherBusiness) {
        targetType = "BUSINESS";
        targetBusinessId = String((otherBusiness as any).participantId);
      } else if (otherUser) {
        targetType = "USER";
        targetUserId = String((otherUser as any).participantId);
      } else {
        throw new Error("Couldn't infer the target for these referrals (missing participants).");
      }

      const defaultsNote = (args.referralDefaults?.suggestedNote ?? "").trim();
      const defaultsAtt = args.referralDefaults?.attachments ?? [];

      const attachmentsForApi =
        defaultsAtt.length
          ? defaultsAtt.map((a: any) => ({
              url: a.url,
              name: a.name ?? a.fileName ?? "attachment",
              mime: a.mime ?? a.mimeType ?? "application/octet-stream",
              sizeBytes: a.sizeBytes ?? a.size ?? null,
            }))
          : undefined;

      const items = (args.referrals ?? []).map((r) => ({
        prospectUserId: r.prospectUserId,
        targetType,
        targetUserId: targetType === "USER" ? targetUserId : null,
        targetBusinessId: targetType === "BUSINESS" ? targetBusinessId : null,
        note: (r.note ?? "").trim() || defaultsNote,
        sourceCtaId: args.ctaId,
        attachments: attachmentsForApi,
      }));

      const result = await bulkCreateReferrals(auth.token, {
        items,
        options: { continueOnError: true, dedupeWithinBatch: true },
      } as any);

      const succeeded =
        (result.createdReferrals ?? 0) +
        (result.createdRecommendations ?? 0) +
        (result.addedNotesToExisting ?? 0);

      if (!succeeded) {
        const firstErr = result.results?.find((x) => x.error)?.error;
        throw new Error(firstErr || "Failed to create any referrals.");
      }

      await refreshThreadContextOnly(asIdentity);
    },
    [getAuth, myUserId, asIdentity, participants, refreshThreadContextOnly]
  );

  const onSubmitRecommendationAddCta = useCallback(
    async (args: {
      ctaId: string;
      threadId: string;
      targets: TargetPick[];
      note?: string;
      referralDefaults?: {
        suggestedNote?: string;
        attachments?: UiAttachment[];
      };
    }) => {
      const auth = await getAuth();
      if (!auth?.token) throw new Error("Not authenticated");
      if (!asIdentity) throw new Error("No identity selected");
      if (!myUserId) throw new Error("Missing user id");

      const prospect =
        (participants ?? []).find(
          (p) =>
            String(p.participantType).toUpperCase() === "USER" &&
            String(p.participantId) !== String(myUserId)
        ) ?? null;

      if (!prospect) throw new Error("Could not determine prospect from thread.");

      const defaultsNote = (args.referralDefaults?.suggestedNote ?? "").trim();
      const defaultsAtt = args.referralDefaults?.attachments ?? [];

      const attachmentsForApi = defaultsAtt
        .filter((a: any) => !(a?._isObjectUrl) && !String(a?.url ?? "").startsWith("blob:"))
        .map((a: any) => ({
          url: String(a.url),
          name: String(a.name ?? "attachment"),
          mime: String(a.mime ?? "application/octet-stream"),
          sizeBytes: a.sizeBytes ?? null,
        }));

      const items = (args.targets ?? []).map((t) => {
        const tt = String((t as any).targetType).toUpperCase();

        return {
          prospectUserId: String(prospect.participantId),
          targetType: tt as "USER" | "BUSINESS",
          targetUserId: tt === "USER" ? String((t as any).targetUserId ?? "") : null,
          targetBusinessId: tt === "BUSINESS" ? String((t as any).targetBusinessId ?? "") : null,
          note: args.note?.trim() || defaultsNote,
          sourceCtaId: args.ctaId,
          attachments: attachmentsForApi.length ? attachmentsForApi : undefined,
        };
      });

      const result = await bulkCreateReferrals(auth.token, {
        items,
        options: { continueOnError: true, dedupeWithinBatch: true },
      } as any);

      const succeeded =
        (result.createdReferrals ?? 0) +
        (result.createdRecommendations ?? 0) +
        (result.addedNotesToExisting ?? 0);

      if (!succeeded) {
        const firstErr = result.results?.find((x) => x.error)?.error;
        throw new Error(firstErr || "Failed to create recommendations.");
      }

      await refreshThreadContextOnly(asIdentity);
    },
    [getAuth, asIdentity, participants, myUserId, refreshThreadContextOnly]
  );

  const createOrderActorOptions = useMemo<OrderActorOption[]>(() => {
    return safeIdentities.map((identity) => {
      const key = keyOf(identity);

      return {
        identityType:
          identity.participantType === "BUSINESS"
            ? ("BUSINESS" as const)
            : ("USER" as const),
        identityId: identity.participantId,
        label: identityTitleByKey.get(key) ?? identity.participantType,
        subtitle:
          identity.participantType === "BUSINESS"
            ? "Business identity"
            : "Personal identity",
      };
    });
  }, [safeIdentities, identityTitleByKey, keyOf]);

  const createOrderBusinessOptions = useMemo<OrderBusinessOption[]>(() => {
    const fromThread = participants
      .filter((p) => p.participantType === "BUSINESS")
      .map((p) => ({
        id: p.participantId,
        label: p.displayName ?? p.businessMini?.name ?? "Business",
        subtitle: "Business",
        imageUrl:
          (p as any).imageUrl ??
          p.businessMini?.logoUrl ??
          null,
      }));

    const fromMyBusinesses = (myBusinesses ?? []).map((b: any) => ({
      id: b.businessId ?? b.id,
      label: b.name ?? b.displayName ?? "Business",
      subtitle: "Business",
      imageUrl: b.logoUrl ?? b.imageUrl ?? null,
    }));

    const merged = [...fromThread, ...fromMyBusinesses];
    const seen = new Set<string>();

    return merged.filter((b) => {
      if (!b.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [participants, myBusinesses]);

  const createOrderRecipientOptions = useMemo<OrderRecipientOption[]>(() => {
    return participants
      .filter((p) => {
        if (!effectiveIdentity) return true;

        return !sameIdentity(effectiveIdentity, {
          participantType: p.participantType === "BUSINESS" ? "BUSINESS" : "USER",
          participantId: p.participantId,
        });
      })
      .map((p) => ({
        identityType:
          p.participantType === "BUSINESS"
            ? ("BUSINESS" as const)
            : ("USER" as const),
        userId: p.participantType === "USER" ? p.participantId : null,
        businessId: p.participantType === "BUSINESS" ? p.participantId : null,
        label:
          p.displayName ??
          (p.participantType === "BUSINESS"
            ? p.businessMini?.name
            : [p.userMini?.firstName, p.userMini?.lastName].filter(Boolean).join(" ")) ??
          "Participant",
        subtitle: p.participantType === "BUSINESS" ? "Business" : "User",
        imageUrl:
          (p as any).imageUrl ??
          p.userMini?.profileImageUrl ??
          p.businessMini?.logoUrl ??
          null,
      }));
  }, [participants, effectiveIdentity]);

  const initialCreateOrderBusinessId = useMemo(() => {
    if (effectiveIdentity?.participantType === "BUSINESS") {
      return effectiveIdentity.participantId;
    }

    const businessParticipant = participants.find((p) => p.participantType === "BUSINESS");
    return businessParticipant?.participantId ?? null;
  }, [effectiveIdentity, participants]);

  const initialCreateOrderRecipient = useMemo<{
    identityType: OrderRecipientOption["identityType"];
    userId?: string | null;
    businessId?: string | null;
  } | null>(() => {
    const userParticipants = participants.filter((p) => p.participantType === "USER");
    const businessParticipants = participants.filter((p) => p.participantType === "BUSINESS");

    // Direct USER <-> BUSINESS thread:
    // businessId should be the business, recipient should default to the user.
    if (userParticipants.length === 1 && businessParticipants.length === 1) {
      const user = userParticipants[0];
      return {
        identityType: "USER",
        userId: user.participantId,
        businessId: null,
      };
    }

    const other = participants.find((p) => {
      if (!effectiveIdentity) return true;

      return !sameIdentity(effectiveIdentity, {
        participantType: p.participantType === "BUSINESS" ? "BUSINESS" : "USER",
        participantId: p.participantId,
      });
    });

    if (!other) return null;

    return {
      identityType:
        other.participantType === "BUSINESS"
          ? ("BUSINESS" as const)
          : ("USER" as const),
      userId: other.participantType === "USER" ? other.participantId : null,
      businessId: other.participantType === "BUSINESS" ? other.participantId : null,
    };
  }, [participants, effectiveIdentity]);

  const renderItems: RenderItem[] = useThreadRenderItems({
    activities,
    liveCtas,
    threadActiveCtas: threadCtx?.activeCtas ?? [],
    visibleOrders: threadCtx?.visibleOrders ?? [],
    myIdentityKeys,
    participantByKey,
    identityTitleByKey,
    myDisplayName,
    makeKey,
    fmtDateTime,
  });

  if (loading) {
    return (
      <div className="threadPage threadWorkspace threadWorkspace--loading">
        <div className="threadWorkspace__main">
          <div className="threadWorkspace__loadingCard">Loading…</div>
        </div>
      </div>
    );
  }

  return (
      <div
        className={`threadPage threadWorkspace ${
          isReferralThread || showDraftSidebar
            ? "threadWorkspace--withSidebar"
            : "threadWorkspace--noSidebar"
        } ${isDirectThread ? "direct" : "group"}`}
      >
      <ThreadEmailComposerModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        title="Send introduction email"
        description="This email introduces the selected participant from this thread."
        recipients={introEmailRecipients}
        subject={introSubject}
        setSubject={setIntroSubject}
        body={introBody}
        setBody={setIntroBody}
        attachments={emailAttachments}
        setAttachments={setEmailAttachments}
        sending={introSending}
        canSend={canIntro}
        allowedActions={allowedActions}
        sendLabel="Send introduction"
        onSend={onSendIntroEmail}
      />

      {lbOpen && (
        <ImageLightbox
          open={lbOpen}
          items={lbItems}
          startIndex={lbStartIndex}
          onClose={closeImagesLightbox}
        />
      )}

      <div className="threadWorkspace__main">
        <div className="threadWorkspace__topbar">
          <ThreadTopBar
            navigate={navigate}
            isDirectThread={isDirectThread}
            isReferralThread={isReferralThread}
            otherParticipant={otherParticipant}
            participants={participants}
            participantName={participantName}
            participantImage={participantImage}
            initials={initials}
            navigateToParticipant={handleOpenParticipant}
            threadCtx={threadCtx}
            referralDetailsLoading={referralDetailsLoading}
            setShowParticipantModal={setShowParticipantModal}
            showIdentityMenu={showIdentityMenu}
            setShowIdentityMenu={setShowIdentityMenu}
            identityMenuRef={identityMenuRef}
            hasIdentities={hasIdentities}
            effectiveIdentity={effectiveIdentity}
            myDisplayName={myDisplayName}
            safeIdentities={safeIdentities}
            asKey={asKey}
            keyOf={keyOf}
            setAsKey={setAsKey}
            identityRef={identityRef}
            showActionsMenu={showActionsMenu}
            setShowActionsMenu={setShowActionsMenu}
            actionsMenuRef={actionsMenuRef}
            introQuotaText={introQuotaText}
            canIntro={canIntro}
            canCancel={canCancel}
            canReject={canReject}
            referralActionBusy={referralActionBusy}
            onCancelReferral={onCancelReferral}
            onRejectReferral={onRejectReferral}
            setIntroOpen={setIntroOpen}
            error={error}
            introResult={introResult}
            allowedActions={allowedActions}
            ReferralHeader={EmptyReferralHeader}
            referralHeaderProps={sidebarReferralHeaderProps}
          />

          {draftOrders.length > 0 && (
            <button
              className="btn btn-quiet"
              onClick={() => setShowDraftSidebar((s) => !s)}
            >
              Draft Orders ({draftOrders.length})
            </button>
          )}

        </div>

        <div className="threadWorkspace__stream">
          
          <ThreadStream
            streamRef={streamRef}
            renderItems={renderItems}
            effectiveIdentity={effectiveIdentity}
            participantByKey={participantByKey}
            identityByKey={identityByKey}
            identityTitleByKey={identityTitleByKey}
            myIdentityKeys={myIdentityKeys}
            participants={participants}
            currentThreadParticipantIdentities={currentThreadParticipantIdentities}
            myProfile={myProfile}
            onOpenOffer={openOfferDetailsDrawer}
            onOpenOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setShowOrderDetailsDrawer(true);
            }}
            myDisplayName={myDisplayName}
            threadCtx={threadCtx}
            threadId={String(threadId)}
            allowedActions={allowedActions}
            invitingRecId={invitingRecId}
            setInvitingRecId={setInvitingRecId}
            setError={setError}
            fmtDateTime={fmtDateTime}
            initials={initials}
            participantImage={participantImage}
            participantName={participantName}
            makeKey={makeKey}
            badgeName={badgeName}
            badgeImage={badgeImage}
            fullName={fullName}
            miniNameUser={miniNameUser}
            miniNameBusiness={miniNameBusiness}
            miniImageUser={miniImageUser}
            getThreadContextForRecommendation={getThreadContextForRecommendation}
            ctaCreatedByIdentity={ctaCreatedByIdentity}
            ctaAssignedToIdentity={ctaAssignedToIdentity}
            normalizeAttachment={normalizeAttachment}
            formatBytes={formatBytes}
            openImagesLightbox={openImagesLightbox}
            onOpenThreadCta={onOpenThreadCta}
            navigateToParticipant={handleOpenParticipant}
            navigateToThread={handleNavigateToThread}
            getAuth={getAuth}
            inviteRecommenderToReferralThread={inviteRecommenderToReferralThread}
            loadThread={loadThread}
          />
        </div>

        <ThreadComposer
          photoVideoInputRef={photoVideoInputRef}
          docInputRef={docInputRef}
          onPhotoVideoSelected={onPhotoVideoSelected}
          onDocSelected={onDocSelected}
          pendingAttachments={pendingAttachments}
          removePendingAttachment={removePendingAttachment}
          formatBytes={formatBytes}
          messageText={messageText}
          setMessageText={setMessageText}
          allowedActions={allowedActions}
          uploadingAttachments={uploadingAttachments}
          attachMenuRef={attachMenuRef}
          showAttachMenu={showAttachMenu}
          setShowAttachMenu={setShowAttachMenu}
          attachMenuLevel={attachMenuLevel}
          setAttachMenuLevel={setAttachMenuLevel}
          closeAttachMenu={closeAttachMenu}
          openAskForMenu={openAskForMenu}
          openShareMenu={openShareMenu}
          onPickPhotosVideos={() => {
            closeAttachMenu();
            onPickPhotosVideos();
          }}
          onPickDocument={() => {
            closeAttachMenu();
            onPickDocument();
          }}
          isDirectThread={isDirectThread}
          participantsCount={participants.length}
          canUseReferralCtas={!!allowedActions?.canAskForReferrals}
          canUseRecommendationCtas={!!allowedActions?.canAskForRecommendation}
          canAssignOffers={
            !!allowedActions?.canAssignOffers &&
            !!asIdentity &&
            assignOfferRecipientOptions.length > 0
            }
          canCreateOrders={!!allowedActions?.canCreateOrder && !!asIdentity}
          setShowReferralCtaModal={setShowReferralCtaModal}
          setShowRecommendationCtaModal={setShowRecommendationCtaModal}
          setShowAssignOfferDrawer={setShowAssignOfferDrawer}
          setShowCreateOrderModal={(open) => {
            if (open) {
              setOfferPreviewDraft(null);
              setEditingOrder(null);
            }
            setShowCreateOrderModal(open);
          }}
          onSend={onSend}
          sendDisabled={sendDisabled}
        />
      </div>

      {showDraftSidebar && (
        <aside className="threadWorkspace__sidebar">
          <DraftOrdersSidebar
            orders={draftOrders}
            onEdit={(order) => {
              openEditOrder(order);
            }}
            onSubmit={(order) => {
              handleSubmitOrder(order);
            }}
            onDelete={(order) => {
              handleDeleteDraftOrder(order);
            }}
            onClose={() => setShowDraftSidebar(false)}
          />
        </aside>
      )}

      {isReferralThread ? (
        <aside className="threadWorkspace__sidebar">
          <div className="threadSidebarCard threadSidebarCard--referral">
            <ReferralHeader {...sidebarReferralHeaderProps} />
          </div>
        </aside>
        ) : showDraftSidebar ? (
          <aside className="threadWorkspace__sidebar">
            <DraftOrdersSidebar
              orders={draftOrders}
              onEdit={(order) => {
                openEditOrder(order);
              }}
              onSubmit={(order) => {
                handleSubmitOrder(order);
              }}
              onDelete={(order) => {
                handleDeleteDraftOrder(order);
              }}
              onClose={() => setShowDraftSidebar(false)}
            />
          </aside>
        ) : null}

      <ParticipantListModal
        open={showParticipantModal}
        onClose={() => setShowParticipantModal(false)}
        participants={participants}
        myUserId={myUserId}
        title="Participants"
      />

      {asIdentity && myUserId && canUseReferralCtas && (
        <AddReferralCta
          open={showReferralCtaModal}
          onClose={() => setShowReferralCtaModal(false)}
          viewingAs={asIdentity!}
          participants={participants}
          uploaderUserId={myUserId!}
          threadId={threadId}
          offerTemplates={offerTemplates.map((t) => ({
            id: t.offerTemplateId,
            name: t.templateTitle,
            description: t.description ?? null,
            maxRedemptions: t.maxRedemptions ?? null,
          }))}
          offerTemplatesLoading={offerTemplatesLoading}
          enableOfferRewards={canConfigureReferralCtaRewards}
          onCreate={onCreateReferralRequest}
        />
      )}

      {asIdentity && myUserId && canUseRecommendationCtas && (
        <AddRecommendationCta
          open={showRecommendationCtaModal}
          onClose={() => setShowRecommendationCtaModal(false)}
          viewingAs={asIdentity!}
          participants={participants}
          uploaderUserId={myUserId!}
          threadId={threadId}
          onCreate={onCreateRecommendationRequest}
        />
      )}

      <AssignOfferDrawer
        open={showAssignOfferDrawer}
        onClose={() => setShowAssignOfferDrawer(false)}
        getAuth={getAuth}
        actingBusinessId={actingBusinessId}
        threadId={String(threadId)}
        threadTitle={threadTitle}
        recipientOptions={assignOfferRecipientOptions}
        offerTemplates={offerTemplates.map((t) => ({
          id: t.offerTemplateId,
          name: t.templateTitle,
          description: t.description ?? null,
          maxRedemptions: t.maxRedemptions ?? null,
        }))}
        offerTemplatesLoading={offerTemplatesLoading}
        onAssigned={onOfferAssigned}
      />

      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => {
          setShowCreateOrderModal(false);
          setEditingOrder(null);
        }}
        threadId={threadId}
        threadLabel={otherParticipant?.displayName ?? String(threadId)}
        mode="thread"
        getAuth={getAuth}
        actingBusinessId={actingBusinessId}
        actorOptions={createOrderActorOptions}
        businessOptions={createOrderBusinessOptions}
        recipientOptions={createOrderRecipientOptions}
        editingOrder={editingOrder}
        initialDraft={offerPreviewDraft}
        initialActorIdentityType={
          effectiveIdentity?.participantType === "BUSINESS" ? "BUSINESS" : "USER"
        }
        initialActorIdentityId={effectiveIdentity?.participantId ?? null}
        initialBusinessId={initialCreateOrderBusinessId}
        initialRecipientIdentityType={initialCreateOrderRecipient?.identityType}
        initialRecipientUserId={initialCreateOrderRecipient?.userId ?? null}
        initialRecipientBusinessId={initialCreateOrderRecipient?.businessId ?? null}
        onCreated={(order) => {
          console.log("Order created", order);
          loadOrders();
          setShowCreateOrderModal(false);
          setEditingOrder(null);
        }}
          paymentInstructionsUserId={myUserId ?? ""}
      />

      <OrderDetailsDrawer
        open={showOrderDetailsDrawer}
        orderId={selectedOrderId}
        onClose={closeOrderDetails}
        getAuth={getAuth}
        businessId={actingBusinessId}
        onUpdated={onOrderUpdated}
      />

      <OfferDetailsDrawer
        open={showOfferDetailsDrawer}
        assignedOfferId={selectedOfferId}
        threadId={String(threadId)}
        onClose={closeOfferDetailsDrawer}
        getAuth={getAuth}
        businessId={selectedScope?.asType === "BUSINESS" ? selectedScope.asId : null}
        onUseDraft={handleUseOfferPreviewDraft}
      />

      {openCta && String((openCta as any)?.kind ?? "").toUpperCase() === "REFERRAL_ADD" && (
        <ReferralAddCtaModal
          open={showReferralAddCtaModal}
          onClose={onCloseReferralAddCta}
          cta={openCta}
          onSubmit={onSubmitReferralAddCta}
        />
      )}

      {openCta &&
        String((openCta as any)?.kind ?? "").toUpperCase() === "RECOMMEND_BUSINESS" &&
        canUseRecommendationCtas && (
          <RecommendationAddCtaModal
            open={showRecommendationAddCtaModal}
            onClose={onCloseRecommendationAddCta}
            cta={openCta}
            onSubmit={onSubmitRecommendationAddCta}
          />
        )}
    </div>
  );
}