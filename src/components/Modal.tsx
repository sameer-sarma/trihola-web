// src/components/Modal.tsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../css/Modal.css";

type ModalProps = {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;

  /** Optional width for the panel. Defaults to 720px max. */
  maxWidth?: number | string;

  /** Optional extra classnames */
  panelClassName?: string;
  bodyClassName?: string;

  /** If true, do not render the default header. */
  hideHeader?: boolean;

  /** Accessibility label when header is hidden */
  ariaLabel?: string;
};

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth,
  panelClassName,
  bodyClassName,
  hideHeader,
  ariaLabel,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const resolvedMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth || "720px";

  const modalNode = (
    <div
      className="th-modal"
      role="dialog"
      aria-modal="true"
      aria-label={hideHeader ? ariaLabel : undefined}
      aria-labelledby={!hideHeader ? "th-modal-title" : undefined}
    >
      <div className="th-modal__backdrop" onMouseDown={onClose} />

      <div
        className={`th-modal__panel ${panelClassName || ""}`.trim()}
        style={{ maxWidth: resolvedMaxWidth }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!hideHeader && (
          <div className="th-modal__header">
            <h3 id="th-modal-title" className="th-modal__title">
              {title}
            </h3>
            <button className="th-modal__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        )}

        <div className={`th-modal__body ${bodyClassName || ""}`.trim()}>{children}</div>

        {footer && <div className="th-modal__footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}