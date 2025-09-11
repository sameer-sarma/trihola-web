// utils/uiHelper.tsx
import { useEffect, useState } from "react";

export interface AvatarOrPlaceholderProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: number;          // px
  showLabel?: boolean;    // show visible "No Image" text inside the circle
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
