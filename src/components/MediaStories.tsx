import React, { useEffect, useMemo, useRef, useState } from "react";

export type MediaItem = {
  url: string;
  kind?: "image" | "video";
  alt?: string;
  durationMs?: number; // per-frame for images; videos will auto-advance on ended
};

type Props = {
  items: MediaItem[];
  height?: number;      // px
  loop?: boolean;
  showProgress?: boolean;
};

export default function MediaStories({
  items,
  height = 360,
  loop,
  showProgress,
}: Props) {
  const safe = useMemo(() => items.filter((i) => i?.url), [items]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);
  const current = safe[idx];

  const next = () => {
    if (idx < safe.length - 1) setIdx((i) => i + 1);
    else if (loop && safe.length > 0) setIdx(0);
  };

  const prev = () => {
    if (idx > 0) setIdx((i) => i - 1);
    else if (loop && safe.length > 0) setIdx(safe.length - 1);
  };

  // auto-advance for images
  useEffect(() => {
    if (!current) return;
    if (current.kind === "video") return; // videos rely on 'ended'

    const dur = current.durationMs ?? 3500;

    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setTimeout(() => next(), dur);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, current?.url]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // basic drag-to-swipe
  const drag = useRef<{ x: number; dragging: boolean }>({
    x: 0,
    dragging: false,
  });

  const onDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, dragging: true };
  };

  const onUp = (e: React.MouseEvent) => {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.x;
    drag.current.dragging = false;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
  };

  if (!safe.length) return <div className="th-muted">No media</div>;

  return (
    <div className="th-stories th-stories--wide" style={{ height }}>
      {/* progress */}
      {showProgress && (
        <div className="th-stories-progress">
          {safe.map((_, i) => (
            <div key={i} className="th-stories-progress-bar">
              <div
                className="th-stories-progress-fill"
                style={{
                  width:
                    i < idx ? "100%" : i > idx ? "0%" : "100%", // simple (no animated tween)
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* frame */}
      <div
        className="th-stories-frame th-stories-frame--banner"
        onMouseDown={onDown}
        onMouseUp={onUp}
      >
        {current.kind === "video" ? (
          <video
            key={current.url}
            src={current.url}
            className="th-stories-media"
            onEnded={next}
            controls
          />
        ) : (
          <img
            key={current.url}
            src={current.url}
            alt={current.alt || ""}
            className="th-stories-media"
          />
        )}

        {/* prev/next hit areas */}
        <button
          type="button"
          aria-label="Previous"
          onClick={prev}
          className="th-stories-arrow th-stories-arrow--left"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={next}
          className="th-stories-arrow th-stories-arrow--right"
        >
          ›
        </button>
      </div>
    </div>
  );
}
