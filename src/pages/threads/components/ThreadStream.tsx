// src/pages/threads/components/ThreadStream.tsx
import React from "react";
import type { UiAttachment, ThreadParticipantDTO } from "../../../types/threads";
import type { MyProfile } from "../ThreadPage";
import type {
  RenderItem,
  RenderGroup,
  RenderCta,
  RenderRecommendation,
  RenderReferralAsk,
} from "./stream/types";
import ThreadCtaItem from "./stream/ThreadCtaItem";
import RecommendationEventItem from "./stream/RecommendationEventItem";
import ReferralAskEventItem from "./stream/ReferralAskEventItem";
import SystemEventItem from "./stream/SystemEventItem";
import MessageGroupItem from "./stream/MessageGroupItem";
import OfferAssignedEventItem from "./stream/OfferAssignedEventItem";
import BroadcastEnvelope from "./stream/BroadcastEnvelope";
import ThreadOrderCard from "./stream/ThreadOrderCard";

type Props = {
  streamRef: React.RefObject<HTMLDivElement | null>;
  renderItems: RenderItem[];

  effectiveIdentity: any;
  participantByKey: Map<string, ThreadParticipantDTO>;
  identityByKey: Map<string, any>;
  identityTitleByKey: Map<string, string>;
  myIdentityKeys: Set<string>;
  participants: ThreadParticipantDTO[];
  currentThreadParticipantIdentities: { participantType: string; participantId: string }[];

  myProfile: MyProfile;
  myDisplayName: string;
  threadCtx: any;
  threadId: string;
  allowedActions: any;
  invitingRecId: string | null;
  setInvitingRecId: React.Dispatch<React.SetStateAction<string | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;

  fmtDateTime: (iso?: string | null) => string;
  initials: (name: string) => string;
  participantImage: (p: ThreadParticipantDTO | null | undefined) => string | null;
  participantName: (p: ThreadParticipantDTO | null | undefined) => string;
  makeKey: (type: string, id: string) => string;
  badgeName: (b: any) => string;
  badgeImage: (b: any) => string | null;
  fullName: (u?: any) => string;
  miniNameUser: (u?: any) => string;
  miniNameBusiness: (b?: any) => string;
  miniImageUser: (u?: any) => string | null;
  getThreadContextForRecommendation: (
    currentThreadParticipantIdentities: { participantType: string; participantId: string }[],
    payload: any
  ) => "GROUP" | "REC_PROSPECT" | "REC_TARGET";

  ctaCreatedByIdentity: (cta: any) => any;
  ctaAssignedToIdentity: (cta: any) => any;

  normalizeAttachment: (x: any) => UiAttachment | null;
  formatBytes: (n?: number | null) => string;

  openImagesLightbox: (src: string) => void;
  onOpenThreadCta: (cta: any) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenOffer: (assignedOfferId: string) => void;
  navigateToParticipant: (p: ThreadParticipantDTO) => void;
  navigateToThread: (threadId: string) => void;

  getAuth: () => Promise<{ token: string; userId: string } | null>;
  inviteRecommenderToReferralThread: (
    token: string,
    referralSlug: string,
    body: { recommendationId: string }
  ) => Promise<any>;
  loadThread: () => Promise<void>;
};

export default function ThreadStream({
  streamRef,
  renderItems,
  effectiveIdentity,
  participantByKey,
  identityByKey,
  identityTitleByKey,
  myIdentityKeys,
  participants,
  currentThreadParticipantIdentities,
  myProfile,
  myDisplayName,
  threadCtx,
  threadId,
  allowedActions,
  invitingRecId,
  setInvitingRecId,
  setError,
  fmtDateTime,
  initials,
  participantImage,
  participantName,
  makeKey,
  badgeName,
  badgeImage,
  fullName,
  miniNameUser,
  miniNameBusiness,
  miniImageUser,
  getThreadContextForRecommendation,
  ctaCreatedByIdentity,
  ctaAssignedToIdentity,
  normalizeAttachment,
  formatBytes,
  openImagesLightbox,
  onOpenThreadCta,
  onOpenOrder,
  onOpenOffer,
  navigateToParticipant,
  navigateToThread,
  getAuth,
  inviteRecommenderToReferralThread,
  loadThread,
}: Props) {
  void identityTitleByKey;
  void threadId;
  void participantName;

  function resolveIdentityParticipant(identity: any): ThreadParticipantDTO | null {
    if (!identity) return null;
    const key = makeKey(String(identity.participantType), String(identity.participantId));
    return participantByKey.get(key) ?? null;
  }

  function resolveIdentityName(identity: any): string | null {
    const p = resolveIdentityParticipant(identity);
    return p?.displayName || p?.businessMini?.name || fullName(p?.userMini) || null;
  }

  function resolveIdentityImage(identity: any): string | null {
    const p = resolveIdentityParticipant(identity);
    return (
      (p as any)?.imageUrl ||
      p?.userMini?.profileImageUrl ||
      p?.businessMini?.logoUrl ||
      null
    );
  }

  function resolveActivityActorIdentity(activity: any) {
    const payload = (activity?.payload ?? {}) as any;

    return (
      payload?.actor ??
      payload?.createdBy ??
      (payload?.actorParticipantType && payload?.actorParticipantId
        ? {
            participantType: payload.actorParticipantType,
            participantId: payload.actorParticipantId,
          }
        : null) ??
      (activity?.participantType && activity?.participantId
        ? {
            participantType: activity.participantType,
            participantId: activity.participantId,
          }
        : null)
    );
  }

  function resolveActivityAssignedIdentity(activity: any) {
    const payload = (activity?.payload ?? {}) as any;

    if (payload?.assignedTo) return payload.assignedTo;

    if (payload?.assignedToParticipantType && payload?.assignedToParticipantId) {
      return {
        participantType: payload.assignedToParticipantType,
        participantId: payload.assignedToParticipantId,
      };
    }

    if (payload?.recipientIdentityType === "USER" && payload?.recipientUserId) {
      return {
        participantType: "USER",
        participantId: payload.recipientUserId,
      };
    }

    if (payload?.recipientIdentityType === "BUSINESS" && payload?.recipientBusinessId) {
      return {
        participantType: "BUSINESS",
        participantId: payload.recipientBusinessId,
      };
    }

    return null;
  }

  function resolveActorViewModel(activity: any, fallbackName = "Business") {
    const payload = (activity?.payload ?? {}) as any;
    const actorBadge = payload?.actorBadge ?? payload?.createdByBadge ?? null;
    const actorIdentity = resolveActivityActorIdentity(activity);
    const actorParticipant = resolveIdentityParticipant(actorIdentity);

    const actorName =
      (actorBadge ? badgeName(actorBadge) : null) ||
      resolveIdentityName(actorIdentity) ||
      fallbackName;

    const actorImageUrl =
      (actorBadge ? badgeImage(actorBadge) : null) ||
      resolveIdentityImage(actorIdentity) ||
      null;

    const isMine =
      !!effectiveIdentity &&
      !!actorIdentity &&
      String(actorIdentity.participantType ?? "").toUpperCase() ===
        String(effectiveIdentity.participantType ?? "").toUpperCase() &&
      String(actorIdentity.participantId ?? "") ===
        String(effectiveIdentity.participantId ?? "");

    const onOpenActor =
      actorParticipant != null ? () => navigateToParticipant(actorParticipant) : undefined;

    const actorSig = actorIdentity
      ? makeKey(String(actorIdentity.participantType), String(actorIdentity.participantId))
      : null;

    return {
      actorIdentity,
      actorParticipant,
      actorName,
      actorImageUrl,
      isMine,
      onOpenActor,
      actorSig,
    };
  }

  function resolveOfferEventViewModel(activity: any, createdAt?: string | null) {
    const payload = (activity?.payload ?? {}) as any;
    const assignedBadge = payload?.assignedToBadge ?? null;
    const assignedIdentity = resolveActivityAssignedIdentity(activity);

    const actorVm = resolveActorViewModel(activity, "Business");

    const assignedToName =
      (assignedBadge ? badgeName(assignedBadge) : null) ||
      resolveIdentityName(assignedIdentity) ||
      null;

    return {
      createdAt: createdAt ?? activity?.createdAt ?? null,
      actorName: actorVm.actorName,
      actorImageUrl: actorVm.actorImageUrl,
      assignedToName,
      isMine: actorVm.isMine,
      onOpenActor: actorVm.onOpenActor,
      actorSig: actorVm.actorSig,
    };
  }
  
  function getItemActorSig(it: RenderItem): string | null {
    if (it.kind === "group") {
      return (it as RenderGroup).actorKey ?? null;
    }

    if (it.kind === "cta") {
      const creatorIdent = ctaCreatedByIdentity((it as RenderCta).cta as any);
      return creatorIdent
        ? makeKey(String(creatorIdent.participantType), String(creatorIdent.participantId))
        : null;
    }

    if (it.kind === "referralAsk") {
      return (it as RenderReferralAsk).actorKey ?? null;
    }

    if (it.kind === "system") {
      const sys = it as any;
      if (sys.systemEventKey === "OFFER_ASSIGNED" && sys.assignedOfferId) {
        const activity = sys.activity ?? sys.raw ?? {};
        return resolveActorViewModel(activity, "Business").actorSig ?? null;
      }
    }

    return null;
  }

  let previousActorSig: string | null = null;

  return (
    <div className="threadStreamCard" ref={streamRef}>
      <div className="threadStream">
        <div className="threadRail" aria-hidden="true" />

        {renderItems.map((it, idx) => {
          const currentActorSig = getItemActorSig(it);
          const hideActorHeader = !!currentActorSig && currentActorSig === previousActorSig;

          if (it.kind === "cta") {
            previousActorSig = currentActorSig;

            return (
              <ThreadCtaItem
                key={it.key ?? String(idx)}
                item={it as RenderCta}
                effectiveIdentity={effectiveIdentity}
                participantByKey={participantByKey}
                fmtDateTime={fmtDateTime}
                initials={initials}
                makeKey={makeKey}
                badgeName={badgeName}
                badgeImage={badgeImage}
                fullName={fullName}
                ctaCreatedByIdentity={ctaCreatedByIdentity}
                ctaAssignedToIdentity={ctaAssignedToIdentity}
                onOpenThreadCta={onOpenThreadCta}
                navigateToParticipant={navigateToParticipant}
                hideActorHeader={hideActorHeader}
              />
            );
          }

          if (it.kind === "recommendation") {
            previousActorSig = null;

            return (
              <RecommendationEventItem
                key={it.key ?? String(idx)}
                item={it as RenderRecommendation}
                currentThreadParticipantIdentities={currentThreadParticipantIdentities}
                participants={participants}
                threadCtx={threadCtx}
                allowedActions={allowedActions}
                invitingRecId={invitingRecId}
                setInvitingRecId={setInvitingRecId}
                setError={setError}
                fmtDateTime={fmtDateTime}
                initials={initials}
                miniNameUser={miniNameUser}
                miniNameBusiness={miniNameBusiness}
                miniImageUser={miniImageUser}
                getThreadContextForRecommendation={getThreadContextForRecommendation}
                navigateToThread={navigateToThread}
                getAuth={getAuth}
                inviteRecommenderToReferralThread={inviteRecommenderToReferralThread}
                loadThread={loadThread}
              />
            );
          }

          if (it.kind === "referralAsk") {
            previousActorSig = currentActorSig;

            return (
              <ReferralAskEventItem
                key={it.key ?? String(idx)}
                item={it as RenderReferralAsk}
                myIdentityKeys={myIdentityKeys}
                participantByKey={participantByKey}
                identityByKey={identityByKey}
                myProfileImageUrl={myProfile?.profileImageUrl ?? null}
                myDisplayName={myDisplayName}
                fmtDateTime={fmtDateTime}
                participantImage={participantImage}
                navigateToParticipant={navigateToParticipant}
              />
            );
          }

          if (it.kind === "order") {
            previousActorSig = null;

            const order = it.order;

            const isMine =
              !!effectiveIdentity &&
              String(order.createdByIdentityType ?? "").toUpperCase() ===
                String(effectiveIdentity.participantType ?? "").toUpperCase() &&
              String(order.createdByIdentityId ?? "") ===
                String(effectiveIdentity.participantId ?? "");

            return (
              <ThreadOrderCard
                key={it.key ?? String(idx)}
                order={order}
                onClick={() => onOpenOrder(order.id)}
                className={isMine ? "mine" : "theirs"}
              />
            );
          }

          if (it.kind === "broadcast_envelope") {
            previousActorSig = null;

            return (
              <BroadcastEnvelope key={it.key ?? String(idx)} item={it}>
                {it.children.map((child, cIdx) => {
                  if (child.kind === "message") {
                    const safeActivity = {
                      ...child.activity,
                      payload: {
                        ...(child.activity.payload ?? {}),
                        attachments: Array.isArray((child.activity.payload as any)?.attachments)
                          ? (child.activity.payload as any).attachments
                          : [],
                      },
                    };

                    const actorVm = resolveActorViewModel(child.activity, "Trihola");

                    const broadcastMessageGroup = {
                      kind: "group",
                      key: `b-msg-${cIdx}`,
                      mine: actorVm.isMine,
                      actorKey: actorVm.actorIdentity
                        ? makeKey(
                            String(actorVm.actorIdentity.participantType),
                            String(actorVm.actorIdentity.participantId)
                          )
                        : `broadcast-${cIdx}`,
                      displayName: actorVm.actorName,
                      badge: null,
                      participant: actorVm.actorParticipant,
                      createdAt: child.createdAt ?? null,
                      messages: [safeActivity],
                      actorImageUrl: actorVm.actorImageUrl,
                      onOpenActor: actorVm.onOpenActor ?? null,
                    } as unknown as RenderGroup;

                    return (
                      <MessageGroupItem
                        key={`b-msg-${cIdx}`}
                        item={broadcastMessageGroup as any}
                        identityByKey={identityByKey}
                        myProfileImageUrl={myProfile?.profileImageUrl ?? null}
                        participantImage={participantImage}
                        fmtDateTime={fmtDateTime}
                        navigateToParticipant={navigateToParticipant}
                        normalizeAttachment={normalizeAttachment}
                        formatBytes={formatBytes}
                        openImagesLightbox={openImagesLightbox}
                        hideActorHeader
                      />
                    );
                  }

                  if (child.kind === "cta") {
                    return (
                      <ThreadCtaItem
                        key={`b-cta-${cIdx}`}
                        item={
                          (() => {
                            const raw = (child.cta as any)?.configJson as string | undefined;
                            let cfg: any = null;

                            try {
                              cfg = raw ? JSON.parse(raw) : null;
                            } catch {
                              cfg = null;
                            }

                            const detail = String(cfg?.message ?? "").trim() || null;

                            const createdByIdent = ctaCreatedByIdentity(child.cta as any);
                            const createdByKey = createdByIdent
                              ? makeKey(
                                  String(createdByIdent.participantType),
                                  String(createdByIdent.participantId)
                                )
                              : "";

                            const createdByP = createdByKey ? participantByKey.get(createdByKey) : undefined;

                            const creatorName =
                              createdByP?.displayName ||
                              createdByP?.businessMini?.name ||
                              fullName(createdByP?.userMini) ||
                              "Someone";

                            const kindUpper = String((child.cta as any)?.kind ?? "").toUpperCase();

                            const ctaMessage =
                              kindUpper === "REFERRAL_ADD"
                                ? `${creatorName} has asked for referral(s)`
                                : kindUpper === "RECOMMEND_BUSINESS"
                                ? `${creatorName} has asked for recommendation(s)`
                                : "Request";

                            return {
                              kind: "cta",
                              key: `b-cta-${cIdx}`,
                              createdAt: child.createdAt ?? null,
                              cta: child.cta,
                              ctaMessage,
                              ctaDetail: detail,
                            } as RenderCta;
                          })()
                        }
                        effectiveIdentity={effectiveIdentity}
                        participantByKey={participantByKey}
                        fmtDateTime={fmtDateTime}
                        initials={initials}
                        makeKey={makeKey}
                        badgeName={badgeName}
                        badgeImage={badgeImage}
                        fullName={fullName}
                        ctaCreatedByIdentity={ctaCreatedByIdentity}
                        ctaAssignedToIdentity={ctaAssignedToIdentity}
                        onOpenThreadCta={onOpenThreadCta}
                        navigateToParticipant={navigateToParticipant}
                        hideActorHeader
                      />
                    );
                  }

                  if (child.kind === "offer") {
                    const vm = resolveOfferEventViewModel(
                      child.activity,
                      child.createdAt ?? null
                    );

                    return (
                      <OfferAssignedEventItem
                        key={`b-offer-${cIdx}`}
                        text={child.activity.content ?? ""}
                        offerTitle={(child.activity.payload as any)?.offerTitle}
                        note={(child.activity.payload as any)?.notes}
                        status={(child.activity.payload as any)?.status}
                        assignedOfferId={(child.activity.payload as any)?.assignedOfferId}
                        createdAt={vm.createdAt}
                        actorName={vm.actorName}
                        actorImageUrl={vm.actorImageUrl}
                        assignedToName={vm.assignedToName}
                        isMine={vm.isMine}
                        initials={initials}
                        fmtDateTime={fmtDateTime}
                        hideActorHeader
                        onOpenActor={vm.onOpenActor}
                        onOpenOffer={onOpenOffer}
                      />
                    );
                  }

                  if (child.kind === "order") {
                    const order = child.order;

                    const isMine =
                      !!effectiveIdentity &&
                      String(order.createdByIdentityType ?? "").toUpperCase() ===
                        String(effectiveIdentity.participantType ?? "").toUpperCase() &&
                      String(order.createdByIdentityId ?? "") ===
                        String(effectiveIdentity.participantId ?? "");

                    return (
                      <ThreadOrderCard
                        key={`b-order-${cIdx}`}
                        order={order}
                        onClick={() => onOpenOrder(order.id)}
                        className={isMine ? "mine" : "theirs"}
                      />
                    );
                  }

                  return null;
                })}
              </BroadcastEnvelope>
            );
          }

          if (it.kind === "system") {
            if (it.systemEventKey === "OFFER_ASSIGNED" && it.assignedOfferId) {
              const activity = (it as any).activity ?? (it as any).raw ?? {};
              const vm = resolveOfferEventViewModel(
                activity,
                (it as any).createdAt ?? activity?.createdAt ?? null
              );

              previousActorSig = vm.actorSig ?? null;

              return (
                <OfferAssignedEventItem
                  key={it.key ?? String(idx)}
                  text={it.text}
                  offerTitle={(it as any).offerTitle}
                  note={(it as any).note}
                  status={(it as any).status}
                  assignedOfferId={(it as any).assignedOfferId}
                  createdAt={vm.createdAt}
                  actorName={vm.actorName}
                  actorImageUrl={vm.actorImageUrl}
                  assignedToName={vm.assignedToName}
                  isMine={vm.isMine}
                  initials={initials}
                  fmtDateTime={fmtDateTime}
                  hideActorHeader={hideActorHeader}
                  onOpenActor={vm.onOpenActor}
                  onOpenOffer={onOpenOffer}
                />
              );
            }

            previousActorSig = null;

            return (
              <SystemEventItem
                key={it.key ?? String(idx)}
                text={it.text}
                isDivider={false}
              />
            );
          }

          if (it.kind === "divider") {
            previousActorSig = null;

            return (
              <SystemEventItem
                key={it.key ?? String(idx)}
                text={it.text}
                isDivider
              />
            );
          }

          previousActorSig = currentActorSig;

          return (
            <MessageGroupItem
              key={it.key ?? String(idx)}
              item={it as RenderGroup}
              identityByKey={identityByKey}
              myProfileImageUrl={myProfile?.profileImageUrl ?? null}
              participantImage={participantImage}
              fmtDateTime={fmtDateTime}
              navigateToParticipant={navigateToParticipant}
              normalizeAttachment={normalizeAttachment}
              formatBytes={formatBytes}
              openImagesLightbox={openImagesLightbox}
              hideActorHeader={hideActorHeader}
            />
          );
        })}
      </div>
    </div>
  );
}