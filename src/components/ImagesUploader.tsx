// src/components/images/ImagesUploader.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  ImagesUploaderProps,
  DEFAULT_ACCEPT,
  UploadedMedia,
  UploadContext,
} from "../types/imagesUploader";

export default function ImagesUploader({
  // Core
  mode = "multiple",
  value,
  defaultValue,
  onChange,
  onUploadComplete,
  onError,

  // Constraints
  maxCount = mode === "single" ? 1 : 10,
  maxFileSizeMB = 10,
  accept = DEFAULT_ACCEPT,
  //allowReorder = true,
  allowCoverSelect = mode === "multiple",
  allowAltEdit = false,
  allowCaption = false,

  // Storage
  bucket,
  pathTemplate,
  tokenMap = {},
  makePublic = true,
  signURLs = false,
  signTTLSeconds = 86400,
  uploader,
  transform,

  // Workflow
  //uploadStrategy = "immediate",
  //concurrency = 3,
  //deleteFromStorageOnRemove = false,

  // UI
  label = "Upload media",
  hint,
  emptyState,
  variant = "grid",
  className,
}: ImagesUploaderProps) {
  // uncontrolled fallback
  const [internal, setInternal] = useState<UploadedMedia[]>(defaultValue ?? []);
  const items = value ?? internal;

  const primaryUrl = useMemo(() => {
    const cover = items.find((m) => m.isCover);
    return cover?.url ?? items[0]?.url ?? null;
  }, [items]);

  const ctx: UploadContext = {
    bucket,
    pathTemplate,
    tokenMap,
    makePublic,
    signURLs,
    signTTLSeconds,
  };

  const inputRef = useRef<HTMLInputElement | null>(null);

  const emitChange = (next: UploadedMedia[]) => {
    if (!value) setInternal(next);
    onChange?.(next, next.find((m) => m.isCover)?.url ?? next[0]?.url ?? null);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    try {
      const capped = files.slice(0, Math.max(0, maxCount - items.length));
      const prepared = await Promise.all(
        capped.map(async (f) => (transform ? await transform(f) : f))
      );

      // naive sequential upload; swap for a pool if needed
      const uploaded: UploadedMedia[] = [];
      for (const f of prepared) {
        if (f.size / (1024 * 1024) > maxFileSizeMB) {
          throw Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE" });
        }
        const media = await uploader(f, ctx);
        uploaded.push(media);
      }

      const next = [...items, ...uploaded].slice(0, maxCount);
      emitChange(next);
      onUploadComplete?.(next, ctx);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      onError?.(err);
    }
  };

  const setCover = (id: string) => {
    if (!allowCoverSelect) return;
    const next = items.map((m) => ({ ...m, isCover: m.id === id }));
    emitChange(next);
  };

  const removeItem = (id: string) => {
    const next = items.filter((m) => m.id !== id);
    emitChange(next);
    // if (deleteFromStorageOnRemove) { /* call storage delete */ }
  };

  return (
    <div className={className}>
      <label className="th-label">{label}</label>
      {hint && <div className="help-text">{hint}</div>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={mode === "multiple"}
        onChange={onPick}
        style={{ display: "none" }}
      />
      <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()}>
        Select files
      </button>

      {items.length === 0 ? (
        emptyState ?? <div className="empty">No media yet.</div>
      ) : (
        <div className={`media-${variant}`} style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {items.map((m) => (
            <div key={m.id} className="media-item" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* naive preview – image/video detection */}
                {m.mimeType.startsWith("image/") ? (
                  <img src={m.url} alt={m.alt ?? ""} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }} />
                ) : (
                  <video src={m.url} style={{ width: 80, height: 80, borderRadius: 6 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#374151" }}>{m.url}</div>
                  {allowAltEdit && (
                    <input
                      placeholder="Alt text"
                      defaultValue={m.alt ?? ""}
                      className="th-input"
                      onBlur={(e) => emitChange(items.map(x => x.id === m.id ? { ...x, alt: e.target.value } : x))}
                    />
                  )}
                  {allowCaption && (
                    <input
                      placeholder="Caption"
                      defaultValue={m.caption ?? ""}
                      className="th-input"
                      onBlur={(e) => emitChange(items.map(x => x.id === m.id ? { ...x, caption: e.target.value } : x))}
                    />
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {allowCoverSelect && (
                  <button type="button" className="btn" onClick={() => setCover(m.id)}>
                    {m.isCover ? "Primary ✓" : "Make primary"}
                  </button>
                )}
                <button type="button" className="btn" onClick={() => removeItem(m.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* If you want to expose primaryUrl to parent, it’s already part of onChange’s 2nd arg */}
      {<div className="help-text">Primary: {primaryUrl ?? "—"}</div>}
    </div>
  );
}
