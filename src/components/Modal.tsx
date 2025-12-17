import { useEffect } from "react";
import "../css/Modal.css";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 980,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="th-modal" role="dialog" aria-modal="true">
      <div className="th-modal__backdrop" onMouseDown={onClose} />
      <div className="th-modal__panel" style={{ maxWidth: width }}>
        <div className="th-modal__header">
          <h3 className="th-modal__title">{title}</h3>
          <button type="button" className="th-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="th-modal__body">{children}</div>

        {footer && <div className="th-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
