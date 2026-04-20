import React, { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type UploadedFile = {
  publicUrl: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
};

export type UploadStrategy = "overwrite" | "unique";

type Props = {
  /** Used to create a stable folder path for uploads */
  userId: string;

  /** Supabase bucket name (you likely already use VITE_SUPABASE_BUCKET) */
  bucket: string;

  /** Folder namespace inside the bucket, e.g. "business-media" */
  folder: string;

  /** A short file name base (no extension). We'll append extension if available. */
  filenameBase: string;

  /** Accept string for <input type="file" /> */
  accept: string;

  /** Label shown above the chooser */
  label: string;

  /** Optional helper text */
  help?: string;

  /** Allow selecting multiple files */
  multiple?: boolean;

  /**
   * "overwrite" keeps the old behavior (stable path + upsert=true)
   * "unique" creates a unique path per upload (good for thread attachments)
   */
  strategy?: UploadStrategy;

  /** New API: called with all uploaded files */
  onComplete?: (files: UploadedFile[]) => void;

  /** Back-compat: called with the first file's public URL */
  onUploadComplete?: (publicUrl: string) => void;
};

function extFromFile(file: File) {
  const byName = file.name?.split(".").pop()?.toLowerCase();
  if (byName && byName.length <= 8) return byName;

  // fallback for files without extension
  const byType = file.type?.split("/").pop()?.toLowerCase();
  if (byType && byType.length <= 16) return byType;

  return "bin";
}

function kindFromMime(mime: string): UploadedFile["kind"] {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

function safeSegment(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);
}

function randomId() {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function FileUploader({
  userId,
  bucket,
  folder,
  filenameBase,
  accept,
  label,
  help,
  multiple,
  strategy = "overwrite",
  onComplete,
  onUploadComplete,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [lastFiles, setLastFiles] = useState<UploadedFile[] | null>(null);

  // Forces the input to remount when key factors change (avoid stale selection edge-cases)
  const inputKey = useMemo(
    () => `${folder}:${filenameBase}:${strategy}:${multiple ? "m" : "s"}`,
    [folder, filenameBase, strategy, multiple]
  );

  const buildPath = (file: File) => {
    const ext = extFromFile(file);
    const base = safeSegment(filenameBase || "file");
    const safeName = safeSegment(file.name || `upload.${ext}`);
    const uid = safeSegment(userId);

    if (strategy === "unique") {
      // Example: business-media/user_x/base/uuid_originalname.ext
      return `${folder}/user_${uid}/${base}/${randomId()}_${safeName}`;
    }

    // overwrite: stable path + extension
    return `${folder}/user_${uid}/${base}.${ext}`;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (!picked.length) return;

    setUploading(true);
    setLastFiles(null);

    const uploaded: UploadedFile[] = [];

    try {
      for (const file of picked) {
        const path = buildPath(file);
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: strategy === "overwrite",
          contentType: file.type || undefined,
        });

        if (error) throw error;

        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        const publicUrl = data?.publicUrl;
        if (!publicUrl) throw new Error("Failed to resolve public URL");

        uploaded.push({
          publicUrl,
          path,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind: kindFromMime(file.type || ""),
        });
      }

      setLastFiles(uploaded);

      // New API
      onComplete?.(uploaded);

      // Back-compat: first URL
      if (uploaded[0]?.publicUrl) onUploadComplete?.(uploaded[0].publicUrl);
    } catch (e: any) {
      alert("Upload failed: " + (e?.message ?? String(e)));
    } finally {
      setUploading(false);
      // allow selecting the same file again
      event.target.value = "";
    }
  };

  return (
    <div className="th-field">
      <div className="th-label">{label}</div>

      <input
        key={inputKey}
        className="th-input"
        type="file"
        accept={accept}
        multiple={!!multiple}
        onChange={handleFileChange}
      />

      {help && <div className="th-help">{help}</div>}
      {uploading && <div className="th-help">Uploading…</div>}

      {lastFiles?.length ? (
        <div className="th-help">
          Uploaded:{" "}
          {lastFiles.map((f, idx) => (
            <span key={f.path}>
              <a href={f.publicUrl} target="_blank" rel="noreferrer">
                {lastFiles.length === 1 ? "view" : f.fileName || `file ${idx + 1}`}
              </a>
              {idx < lastFiles.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
