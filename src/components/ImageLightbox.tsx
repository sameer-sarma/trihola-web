// src/components/ImageLightbox.tsx
import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";

export type LightboxItem = {
  src: string;
  alt?: string;
  title?: string;
  openUrl?: string; // fallback to src
};

type Props = {
  open: boolean;
  items: LightboxItem[];
  startIndex?: number;
  onClose: () => void;
};

export default function ImageLightbox({ open, items, startIndex = 0, onClose }: Props) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const clamped = Math.max(0, Math.min(startIndex, Math.max(0, safeItems.length - 1)));
    setIdx(clamped);
  }, [open, startIndex, safeItems.length]);

  const current = safeItems[idx] || null;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((v) => Math.max(0, v - 1));
      if (e.key === "ArrowRight") setIdx((v) => Math.min(safeItems.length - 1, v + 1));
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, safeItems.length]);

  const canPrev = idx > 0;
  const canNext = idx < safeItems.length - 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideHeader
      ariaLabel="Image preview"
      panelClassName="th-lightbox"
      bodyClassName="th-lightbox__body"
      maxWidth={980}
    >
      <div className="th-lightbox__stage">
        <div className="th-lightbox__topbar">
          <span className="th-lightbox__pill">
            {safeItems.length ? `${idx + 1} / ${safeItems.length}` : "No images"}
          </span>
          <button className="th-lightbox__x" onClick={onClose} aria-label="Close preview">
            ×
          </button>
        </div>

        {safeItems.length > 1 && (
          <>
            <button
              className="th-lightbox__nav th-lightbox__nav--left"
              onClick={() => setIdx((v) => Math.max(0, v - 1))}
              disabled={!canPrev}
              aria-label="Previous"
              type="button"
            >
              ‹
            </button>
            <button
              className="th-lightbox__nav th-lightbox__nav--right"
              onClick={() => setIdx((v) => Math.min(safeItems.length - 1, v + 1))}
              disabled={!canNext}
              aria-label="Next"
              type="button"
            >
              ›
            </button>
          </>
        )}

        {current ? (
          <img className="th-lightbox__img" src={current.src} alt={current.alt || "Image"} />
        ) : (
          <div style={{ color: "#fff", opacity: 0.85, fontWeight: 800 }}>No image</div>
        )}

        {current && (
          <div className="th-lightbox__bottombar">
            <div className="th-lightbox__title">{current.title || ""}</div>
            <div className="th-lightbox__actions">
              <a
                className="th-lightbox__link"
                href={current.openUrl || current.src}
                target="_blank"
                rel="noreferrer"
                title="Open in new tab"
              >
                ↗ Open
              </a>
              <a
                className="th-lightbox__link"
                href={current.openUrl || current.src}
                download
                title="Download"
              >
                ⬇ Download
              </a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
