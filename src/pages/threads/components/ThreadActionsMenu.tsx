// src/pages/threads/components/ThreadActionsMenu.tsx
import React from "react";

type Props = {
  showActionsMenu: boolean;
  setShowActionsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;

  canIntro: boolean;
  introQuotaText: string | null;

  canCancel: boolean;
  canReject: boolean;
  referralActionBusy: boolean;

  onCancelReferral: () => void;
  onRejectReferral: () => void;
  setIntroOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ThreadActionsMenu({
  showActionsMenu,
  setShowActionsMenu,
  actionsMenuRef,
  canIntro,
  introQuotaText,
  canCancel,
  canReject,
  referralActionBusy,
  onCancelReferral,
  onRejectReferral,
  setIntroOpen,
}: Props) {
  return (
    <div className="thread-actions" ref={actionsMenuRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setShowActionsMenu((v) => !v)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={showActionsMenu}
      >
        …
      </button>

      {showActionsMenu && (
        <div className="actions-menu" role="menu">
          {canIntro && (
            <button
              type="button"
              className="menu-item"
              role="menuitem"
              onClick={() => {
                setShowActionsMenu(false);
                setIntroOpen(true);
              }}
            >
              <div className="menu-item-row">
                <span className="menu-item-icon" aria-hidden="true">
                  ✉
                </span>
                <div className="menu-item-text">
                  <span className="menu-title">Send intro email</span>
                  {introQuotaText && <span className="menu-subtitle">{introQuotaText}</span>}
                </div>
              </div>
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className="menu-item"
              role="menuitem"
              disabled={referralActionBusy}
              onClick={() => {
                setShowActionsMenu(false);
                onCancelReferral();
              }}
            >
              <div className="menu-item-row">
                <span className="menu-item-icon" aria-hidden="true">
                  ⊘
                </span>
                <div className="menu-item-text">
                  <span className="menu-title">Cancel referral</span>
                  <span className="menu-subtitle">Close this referral request</span>
                </div>
              </div>
            </button>
          )}

          {canReject && (
            <button
              type="button"
              className="menu-item danger"
              role="menuitem"
              disabled={referralActionBusy}
              onClick={() => {
                setShowActionsMenu(false);
                onRejectReferral();
              }}
            >
              <div className="menu-item-row">
                <span className="menu-item-icon" aria-hidden="true">
                  ✕
                </span>
                <div className="menu-item-text">
                  <span className="menu-title">Reject referral</span>
                  <span className="menu-subtitle">This cannot be undone</span>
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}