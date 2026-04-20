// src/pages/threads/components/stream/RecommendationEventItem.tsx
import React from "react";
import type { RecommendationActivityPayloadDTO, ThreadParticipantDTO } from "../../../../types/threads";

type Props = {
  item: {
    key: string;
    createdAt?: string | null;
    payload: RecommendationActivityPayloadDTO;
  };
  currentThreadParticipantIdentities: { participantType: string; participantId: string }[];
  participants: ThreadParticipantDTO[];
  threadCtx: any;
  allowedActions: any;
  invitingRecId: string | null;
  setInvitingRecId: React.Dispatch<React.SetStateAction<string | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  fmtDateTime: (iso?: string | null) => string;
  initials: (name: string) => string;
  miniNameUser: (u?: any) => string;
  miniNameBusiness: (b?: any) => string;
  miniImageUser: (u?: any) => string | null;
  getThreadContextForRecommendation: (
    currentThreadParticipantIdentities: { participantType: string; participantId: string }[],
    payload: RecommendationActivityPayloadDTO
  ) => "GROUP" | "REC_PROSPECT" | "REC_TARGET";
  navigateToThread: (threadId: string) => void;
  getAuth: () => Promise<{ token: string; userId: string } | null>;
  inviteRecommenderToReferralThread: (
    token: string,
    referralSlug: string,
    body: { recommendationId: string }
  ) => Promise<any>;
  loadThread: () => Promise<void>;
};

export default function RecommendationEventItem({
  item,
  currentThreadParticipantIdentities,
  participants,
  threadCtx,
  allowedActions,
  invitingRecId,
  setInvitingRecId,
  setError,
  fmtDateTime,
  initials,
  miniNameUser,
  miniNameBusiness,
  miniImageUser,
  getThreadContextForRecommendation,
  navigateToThread,
  getAuth,
  inviteRecommenderToReferralThread,
  loadThread,
}: Props) {
  const p = item.payload;

  const ctx = getThreadContextForRecommendation(currentThreadParticipantIdentities, p);
  const recommenderName = miniNameUser(p.recommender);
  const prospectName = miniNameUser(p.prospect);

  const tType = String(p.targetType ?? "").toUpperCase();
  const tName =
    tType === "BUSINESS" ? miniNameBusiness(p.targetBusiness) : miniNameUser(p.targetUser);

  const leftImg = miniImageUser(p.recommender);
  const when = fmtDateTime(item.createdAt ?? null);

  const referralThreadId =
    (p.referralThreadId ?? "").toString().trim() || (p as any).threadId?.toString?.() || "";

  const recommendationId = String((p as any).recommendationId ?? "").trim();
  const isInReferralThread = !!threadCtx?.referralSlug;

  const recommenderUserId = String(p.recommender?.userId ?? "").trim();
  const recommenderAlreadyInThread =
    !!recommenderUserId &&
    (participants ?? []).some(
      (x) =>
        String(x.participantType).toUpperCase() === "USER" &&
        String(x.participantId) === recommenderUserId
    );

  const canInviteRecommender =
    !!allowedActions?.canInviteRecommender &&
    !!threadCtx?.referralSlug &&
    !!recommendationId &&
    !recommenderAlreadyInThread;

  const inviteBusy = invitingRecId === recommendationId;

  const recommenderFirst =
    (p.recommender?.firstName ?? "").trim() || recommenderName.split(" ")[0] || "recommender";

  const addLabel = `Add ${recommenderFirst} to thread`;

  let title = "";
  if (ctx === "REC_PROSPECT") {
    title = `${recommenderName} also recommended ${tName} to you`;
  } else if (ctx === "REC_TARGET") {
    title = `${recommenderName} also recommended ${prospectName} to ${tName}`;
  } else {
    title = `${recommenderName} also recommended ${prospectName} to ${tName}`;
  }

  return (
    <div className="streamSystemRow">
      <div className="streamDot" />
      <div className="streamPill" style={{ width: "min(860px, 96%)", padding: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "10px 12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <span className="avatar" style={{ width: 34, height: 34 }}>
              {leftImg ? (
                <img src={leftImg} alt="" />
              ) : (
                <span className="avatarFallback">{initials(recommenderName)}</span>
              )}
            </span>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </div>

              {when && <div style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>{when}</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isInReferralThread ? (
              canInviteRecommender ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={inviteBusy}
                  onClick={async () => {
                    const auth = await getAuth();
                    if (!auth?.token) return;

                    setInvitingRecId(recommendationId);
                    setError(null);

                    try {
                      await inviteRecommenderToReferralThread(auth.token, threadCtx.referralSlug, {
                        recommendationId,
                      });
                      await loadThread();
                    } catch (e: any) {
                      setError(e?.message ?? "Failed to add recommender to thread");
                    } finally {
                      setInvitingRecId(null);
                    }
                  }}
                  title="Add recommender to this referral thread"
                >
                  {inviteBusy ? "Adding…" : addLabel}
                </button>
              ) : null
            ) : (
              <button
                type="button"
                className="btn"
                disabled={!referralThreadId}
                onClick={() => {
                  if (!referralThreadId) return;
                  navigateToThread(referralThreadId);
                }}
                title={!referralThreadId ? "No referral thread id" : "Open referral thread"}
              >
                View
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}