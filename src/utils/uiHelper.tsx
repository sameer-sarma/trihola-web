// utils/uiHelper.tsx
import { useEffect, useState } from "react";

import type {
  AttachmentDTO,
} from "../types/threads";

export interface AvatarOrPlaceholderProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: number;          // px
  showLabel?: boolean;    // show visible "No Image" text inside the circle
}

export function toApiAttachment(x: any): AttachmentDTO | null {
  const url = String(x?.url ?? "").trim();
  if (!url) return null;

  const name = String(x?.name ?? x?.fileName ?? "attachment").trim();
  const mime = String(x?.mime ?? x?.mimeType ?? "application/octet-stream").trim();

  const sizeBytes =
    typeof x?.sizeBytes === "number"
      ? x.sizeBytes
      : typeof x?.size === "number"
      ? x.size
      : null;

  return {
    url,
    name,
    mime,
    sizeBytes,
  };
}

export const AvatarOrPlaceholder: React.FC<AvatarOrPlaceholderProps> = ({
  src,
  name,
  className,
  size,
  showLabel, // if undefined, we'll auto-hide for small avatars
}) => {
  const [ok, setOk] = useState<boolean>(!!src);

  useEffect(() => {
    setOk(!!src);
  }, [src]);

  const style = size ? { width: size, height: size } : undefined;
  const shouldShowLabel = showLabel ?? (size ? size > 24 : true); // hide text for small inline avatars

  if (ok && src) {
    return (
      <img
        src={src}
        alt={name ? `${name} — profile photo` : "Profile photo"}
        className={`profile-img ${className ?? ""}`.trim()}
        style={style}
        onError={() => setOk(false)}
      />
    );
  }

  return (
    <div
      className={`profile-noimg ${className ?? ""}`.trim()}
      style={style}
      aria-label={name ? `${name} — no image` : "No image"}
      role="img"
    >
      {shouldShowLabel ? (
        <span>No Image</span>
      ) : (
        // Accessible text but visually hidden to avoid shifting inline layout
        <span className="sr-only">No Image</span>
      )}
    </div>
  );
};
