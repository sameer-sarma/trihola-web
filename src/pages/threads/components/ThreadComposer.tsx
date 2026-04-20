// src/pages/threads/components/ThreadComposer.tsx
import React from "react";
import type { UiAttachment } from "../../../types/threads";

type AttachMenuLevel = "ROOT" | "ASK_FOR" | "SHARE";

type Props = {
  photoVideoInputRef: React.RefObject<HTMLInputElement | null>;
  docInputRef: React.RefObject<HTMLInputElement | null>;

  onPhotoVideoSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDocSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;

  pendingAttachments: UiAttachment[];
  removePendingAttachment: (idx: number) => void;
  formatBytes: (n?: number | null) => string;

  messageText: string;
  setMessageText: React.Dispatch<React.SetStateAction<string>>;
  allowedActions: any;
  uploadingAttachments: boolean;

  attachMenuRef: React.RefObject<HTMLDivElement | null>;
  showAttachMenu: boolean;
  setShowAttachMenu: React.Dispatch<React.SetStateAction<boolean>>;
  attachMenuLevel: AttachMenuLevel;
  setAttachMenuLevel: React.Dispatch<React.SetStateAction<AttachMenuLevel>>;
  closeAttachMenu: () => void;
  openAskForMenu: () => void;
  openShareMenu: () => void;

  onPickPhotosVideos: () => void;
  onPickDocument: () => void;

  isDirectThread: boolean;
  participantsCount: number;
  canUseReferralCtas: boolean;
  canUseRecommendationCtas: boolean;
  canAssignOffers: boolean;
  canCreateOrders: boolean;
  setShowReferralCtaModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRecommendationCtaModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAssignOfferDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCreateOrderModal: React.Dispatch<React.SetStateAction<boolean>>;

  onSend: () => void;
  sendDisabled: boolean;
};

export default function ThreadComposer({
  photoVideoInputRef,
  docInputRef,
  onPhotoVideoSelected,
  onDocSelected,
  pendingAttachments,
  removePendingAttachment,
  formatBytes,
  messageText,
  setMessageText,
  allowedActions,
  uploadingAttachments,
  attachMenuRef,
  showAttachMenu,
  setShowAttachMenu,
  attachMenuLevel,
  setAttachMenuLevel,
  closeAttachMenu,
  openAskForMenu,
  openShareMenu,
  onPickPhotosVideos,
  onPickDocument,
  isDirectThread,
  participantsCount,
  canUseReferralCtas,
  canUseRecommendationCtas,
  canAssignOffers,
  canCreateOrders,
  setShowReferralCtaModal,
  setShowRecommendationCtaModal,
  setShowAssignOfferDrawer,
  setShowCreateOrderModal,
  onSend,
  sendDisabled,
}: Props) {
  const canOpenActionMenus = isDirectThread && participantsCount === 2;
  const canOpenShareMenu = canAssignOffers || canCreateOrders;

  return (
    <div className="threadComposer">
      <div className="threadComposerInner">
        <input
          ref={photoVideoInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={onPhotoVideoSelected}
        />
        <input
          ref={docInputRef}
          type="file"
          accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          multiple
          style={{ display: "none" }}
          onChange={onDocSelected}
        />

        <div className="composerMain">
          {pendingAttachments.length > 0 && (
            <div className="pendingRow">
              {pendingAttachments.map((a, i) => (
                <div className="pendingChip" key={`${a.url}-${i}`}>
                  <span className="pendingIcon">
                    {a.kind === "IMAGE"
                      ? "🖼️"
                      : a.kind === "VIDEO"
                      ? "🎬"
                      : a.kind === "AUDIO"
                      ? "🎤"
                      : "📎"}
                  </span>
                  <span className="pendingName" title={a.name}>
                    {a.name}
                  </span>
                  <span className="pendingSize">
                    {a.sizeBytes ? formatBytes(a.sizeBytes) : ""}
                  </span>
                  <button
                    type="button"
                    className="pendingRemove"
                    onClick={() => removePendingAttachment(i)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="threadTextarea"
            value={messageText}
            placeholder={
              allowedActions && !allowedActions.canSendMessage
                ? allowedActions.reason ?? "Messaging disabled"
                : uploadingAttachments
                ? "Uploading attachment…"
                : "Write a message…"
            }
            onChange={(e) => setMessageText(e.target.value)}
            disabled={!!allowedActions && !allowedActions.canSendMessage}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
        </div>

        <div className="attachWrap" ref={attachMenuRef}>
          <button
            type="button"
            className="btn btn-quiet attachBtn"
            onClick={(e) => {
              e.stopPropagation();
              setShowAttachMenu((v) => {
                const next = !v;
                if (next) setAttachMenuLevel("ROOT");
                return next;
              });
            }}
            disabled={uploadingAttachments || (!!allowedActions && !allowedActions.canSendMessage)}
            title="Attach"
          >
            ＋
          </button>

          {showAttachMenu && (
            <div className="attachMenu">
              {attachMenuLevel === "ROOT" && (
                <>
                  <button type="button" className="attachItem" onClick={onPickPhotosVideos}>
                    <span className="attachIcon">🖼️</span>
                    <span className="attachText">Photos & videos</span>
                  </button>

                  <button type="button" className="attachItem" onClick={onPickDocument}>
                    <span className="attachIcon">📄</span>
                    <span className="attachText">Document</span>
                  </button>

                  {canOpenActionMenus && (canUseReferralCtas || canUseRecommendationCtas) && (
                    <button
                      type="button"
                      className="attachItem"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAskForMenu();
                      }}
                    >
                      <span className="attachIcon">💬</span>
                      <span className="attachText">Ask for</span>
                      <span className="attachChevron" aria-hidden="true">
                        →
                      </span>
                    </button>
                  )}

                  {canOpenActionMenus && canOpenShareMenu && (
                    <button
                      type="button"
                      className="attachItem"
                      onClick={(e) => {
                        e.stopPropagation();
                        openShareMenu();
                      }}
                    >
                      <span className="attachIcon">📤</span>
                      <span className="attachText">Share</span>
                      <span className="attachChevron" aria-hidden="true">
                        →
                      </span>
                    </button>
                  )}
                </>
              )}

              {attachMenuLevel === "ASK_FOR" && (
                <>
                  <button
                    type="button"
                    className="attachItem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachMenuLevel("ROOT");
                    }}
                  >
                    <span className="attachIcon">←</span>
                    <span className="attachText">Back</span>
                  </button>

                  {canUseReferralCtas && (
                    <button
                      type="button"
                      className="attachItem"
                      onClick={() => {
                        closeAttachMenu();
                        setShowReferralCtaModal(true);
                      }}
                    >
                      <span className="attachIcon">🎯</span>
                      <span className="attachText">Referrals</span>
                    </button>
                  )}

                  {canUseRecommendationCtas && (
                    <button
                      type="button"
                      className="attachItem"
                      onClick={() => {
                        closeAttachMenu();
                        setShowRecommendationCtaModal(true);
                      }}
                    >
                      <span className="attachIcon">💡</span>
                      <span className="attachText">Recommendations</span>
                    </button>
                  )}
                </>
              )}

              {attachMenuLevel === "SHARE" && (
                <>
                  <button
                    type="button"
                    className="attachItem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachMenuLevel("ROOT");
                    }}
                  >
                    <span className="attachIcon">←</span>
                    <span className="attachText">Back</span>
                  </button>

                  {canAssignOffers && (
                    <button
                      type="button"
                      className="attachItem"
                      onClick={() => {
                        closeAttachMenu();
                        setShowAssignOfferDrawer(true);
                      }}
                    >
                      <span className="attachIcon">🎁</span>
                      <span className="attachText">Offer</span>
                    </button>
                  )}

                  {canCreateOrders && (
                    <button
                      type="button"
                      className="attachItem"
                      onClick={() => {
                        closeAttachMenu();
                        setShowCreateOrderModal(true);
                      }}
                    >
                      <span className="attachIcon">🧾</span>
                      <span className="attachText">Order</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary sendBtn"
          onClick={onSend}
          disabled={sendDisabled}
          title={
            allowedActions && !allowedActions.canSendMessage
              ? allowedActions.reason ?? "Not allowed"
              : uploadingAttachments
              ? "Uploading attachment…"
              : ""
          }
        >
          →
        </button>

        <div className="threadHint">
          {uploadingAttachments ? "Uploading…" : "Enter to send · Shift+Enter for newline"}
        </div>
      </div>
    </div>
  );
}