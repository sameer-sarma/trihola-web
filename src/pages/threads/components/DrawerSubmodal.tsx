// src/pages/threads/components/DrawerSubmodal.tsx
import React, { useEffect } from "react";
import "../../../css/drawer-submodal.css";

type Props = {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
  ariaLabel?: string;
};

export default function DrawerSubmodal({
  open,
  title,
  onClose,
  children,
  footer,
  panelClassName,
  bodyClassName,
  hideHeader,
  ariaLabel,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="drawer-submodal"
      role="dialog"
      aria-modal="true"
      aria-label={hideHeader ? ariaLabel : undefined}
      aria-labelledby={!hideHeader ? "drawer-submodal-title" : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`drawer-submodal__panel ${panelClassName || ""}`.trim()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!hideHeader && (
          <div className="drawer-submodal__header">
            <h3 id="drawer-submodal-title" className="drawer-submodal__title">
              {title}
            </h3>
            <button
              className="drawer-submodal__close"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        <div className={`drawer-submodal__body ${bodyClassName || ""}`.trim()}>
          {children}
        </div>

        {footer ? <div className="drawer-submodal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}