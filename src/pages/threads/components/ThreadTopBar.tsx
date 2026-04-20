// src/pages/threads/components/ThreadTopBar.tsx
import React from "react";
import type {
  AllowedActionsDTO,
  IntroEmailResultDTO,
  ThreadParticipantDTO,
} from "../../../types/threads";
import type { IdentityOption } from "../useIdentitySelector";
import ThreadIdentityMenu from "./ThreadIdentityMenu";
import ThreadActionsMenu from "./ThreadActionsMenu";

type Props = {
  navigate: (to: string) => void;

  isDirectThread: boolean;
  isReferralThread: boolean;
  otherParticipant: ThreadParticipantDTO | null;
  participants: ThreadParticipantDTO[];
  participantName: (p: ThreadParticipantDTO | null | undefined) => string;
  participantImage: (p: ThreadParticipantDTO | null | undefined) => string | null;
  initials: (name: string) => string;
  navigateToParticipant: (p: ThreadParticipantDTO) => void;

  threadCtx: any;
  referralDetailsLoading: boolean;
  setShowParticipantModal: React.Dispatch<React.SetStateAction<boolean>>;

  showIdentityMenu: boolean;
  setShowIdentityMenu: React.Dispatch<React.SetStateAction<boolean>>;
  identityMenuRef: React.RefObject<HTMLDivElement | null>;
  hasIdentities: boolean;
  effectiveIdentity: IdentityOption | null;
  myDisplayName: string;
  safeIdentities: IdentityOption[];
  asKey: string;
  keyOf: (i: IdentityOption) => string;
  setAsKey: (k: string) => void;
  identityRef: React.MutableRefObject<IdentityOption | null>;

  showActionsMenu: boolean;
  setShowActionsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;

  introQuotaText: string | null;
  canCancel: boolean;
  canReject: boolean;
  referralActionBusy: boolean;
  canIntro: boolean;
  onCancelReferral: () => void;
  onRejectReferral: () => void;

  setIntroOpen: React.Dispatch<React.SetStateAction<boolean>>;

  error: string | null;
  introResult: IntroEmailResultDTO | null;

  allowedActions: AllowedActionsDTO | null;

  ReferralHeader: React.ComponentType<any>;
  referralHeaderProps: any;
};

export default function ThreadTopBar({
  navigate,
  isDirectThread,
  isReferralThread,
  otherParticipant,
  participants,
  participantName,
  participantImage,
  initials,
  navigateToParticipant,
  threadCtx,
  referralDetailsLoading,
  setShowParticipantModal,

  showIdentityMenu,
  setShowIdentityMenu,
  identityMenuRef,
  hasIdentities,
  effectiveIdentity,
  myDisplayName,
  safeIdentities,
  asKey,
  keyOf,
  setAsKey,
  identityRef,

  showActionsMenu,
  setShowActionsMenu,
  actionsMenuRef,
  introQuotaText,
  canCancel,
  canReject,
  referralActionBusy,
  canIntro,
  onCancelReferral,
  onRejectReferral,
  setIntroOpen,

  error,
  introResult,

  ReferralHeader,
  referralHeaderProps,
}: Props) {
  return (
    <div className="threadTopShell">
      <div className="threadTopBar">
        <div className="threadTopLeft">
          <button className="btn" onClick={() => navigate("/threads")}>
            ← Back
          </button>

          {isDirectThread && otherParticipant ? (
            <div
              className="directHeaderIdentity clickable"
              onClick={() => navigateToParticipant(otherParticipant)}
            >
              <span className="avatar">
                {participantImage(otherParticipant) ? (
                  <img src={participantImage(otherParticipant)!} alt="" />
                ) : (
                  <span className="avatarFallback">{initials(participantName(otherParticipant))}</span>
                )}
              </span>

              <div className="directHeaderText">
                <div className="directHeaderName">{participantName(otherParticipant)}</div>
                <div className="directHeaderSub">{otherParticipant.participantType}</div>
              </div>
            </div>
          ) : (
            <div className="threadTitleBlock">
              <div className="threadTitle">{String(threadCtx?.title ?? "Conversation")}</div>
              <div className="threadSubtitle">
                {!isDirectThread && (!isReferralThread || participants.length > 3) && (
                  <button
                    type="button"
                    className="linkLike"
                    onClick={() => setShowParticipantModal(true)}
                    title="View participants"
                  >
                    {Number(participants.length)} participants
                  </button>
                )}

                {referralDetailsLoading ? " · loading referral…" : ""}
              </div>
            </div>
          )}
        </div>

        <div className="threadTopRight">
          <div className="threadHeaderPostingAs">
            <span className="muted">Posting as</span>{" "}
          </div>

          <ThreadIdentityMenu
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
          />

          <ThreadActionsMenu
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
          />
        </div>
      </div>

      {error && <div className="threadError">{error}</div>}

      {introResult && (
        <div className={`threadHint ${introResult.ok ? "" : ""}`} style={{ marginTop: 8 }}>
          {introResult.ok ? "Intro email queued." : introResult.error || "Intro email failed."}
          {introResult.remainingIntroEmails !== null &&
            introResult.remainingIntroEmails !== undefined && (
              <> (Remaining: {introResult.remainingIntroEmails})</>
            )}
        </div>
      )}

      {isReferralThread && <ReferralHeader {...referralHeaderProps} />}
    </div>
  );
}