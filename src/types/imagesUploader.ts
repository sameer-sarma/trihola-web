// Types for the generic media uploader


export type UploadedMedia = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  alt?: string | null;
  caption?: string | null;
  isCover?: boolean;

  // add these optional fields you already use
  storageKey?: string;   // storage path / object key
  bucket?: string;       // storage bucket
  durationSec?: number;  // for videos

  uploadedAt?: string;      // ISO timestamp (e.g., nowIso())
  originalName?: string;    // original file name
};

export type UploadContext = {
  bucket: string;
  pathTemplate: string;
  tokenMap?: Record<string, string>;
  makePublic: boolean;
  signURLs: boolean;
  signTTLSeconds: number;
};

export type UploaderErrorCode =
| "FILE_TOO_LARGE"
| "BAD_TYPE"
| "DIMENSIONS_TOO_SMALL"
| "UPLOAD_FAILED"
| "SIGN_FAILED"
| "CROP_CANCELLED"
| "UNKNOWN";


export type UploaderError = Error & { code?: string };

export type UploadTransform = (file: File) => Promise<File> | File;

export type Uploader = (file: File, ctx: UploadContext) => Promise<UploadedMedia>;

export const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4";

// Upload options passed through to Supabase Storage
export type UploadOptions = {
upsert?: boolean; // default true for deterministic keys (avatars, fixed slots)
cacheControl?: string; // e.g., "3600" (seconds)
contentType?: string; // MIME type override
};


// Uploader function contract
export type UploaderFn = (args: {
file: File;
path: string; // resolved path under bucket
bucket: string;
makePublic: boolean;
signURLs: boolean;
signTTLSeconds: number;
options?: UploadOptions; // ← NEW: pass upload options
}) => Promise<UploadedMedia>;


// Optional transform hook (crop/resize/compress) — return the file you want to upload
export type TransformFn = (file: File) => Promise<File>;



export type ImagesUploaderProps = {
  // Core
  mode?: "single" | "multiple";
  value?: UploadedMedia[];                            // controlled
  defaultValue?: UploadedMedia[];                     // uncontrolled
  onChange?: (items: UploadedMedia[], primary: string | null) => void;
  onUploadComplete?: (items: UploadedMedia[], ctx: UploadContext) => void;
  onError?: (err: UploaderError) => void;

  // Constraints
  maxCount?: number;          // default: 1 for single, 10 for multiple
  maxFileSizeMB?: number;     // default: 10
  accept?: string;            // CSV for <input accept=...>
  allowReorder?: boolean;     // default: true
  allowCoverSelect?: boolean; // default: mode==='multiple'
  allowAltEdit?: boolean;     // default: false
  allowCaption?: boolean;     // default: false

  // Storage
  bucket: string;
  pathTemplate: string;       // e.g. "campaigns/{id}/media/{yyyy}/{mm}/{dd}/{uuid}.{ext}"
  tokenMap?: Record<string, string>;
  makePublic?: boolean;       // default: true
  signURLs?: boolean;         // default: false
  signTTLSeconds?: number;    // default: 86400 (1 day)
  uploader: Uploader;         // you provide this
  transform?: UploadTransform;

  // Workflow
  uploadStrategy?: "immediate" | "deferred"; // default: immediate
  concurrency?: number;       // default: 3
  deleteFromStorageOnRemove?: boolean; // default: false

  // UI
  label?: string;
  hint?: string;
  emptyState?: React.ReactNode;
  variant?: "grid" | "list";
  className?: string;
};