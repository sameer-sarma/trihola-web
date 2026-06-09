type Props = {
  text: string;
  isDivider?: boolean;

  linkLabel?: string;
  onLinkClick?: () => void;
};

export default function SystemEventItem({
  text,
  isDivider = false,
  linkLabel,
  onLinkClick,
}: Props) {
  return (
    <div className={`streamSystemRow ${isDivider ? "isDivider" : ""}`}>
      <div className="streamDot" />

      <div className={`streamPill ${isDivider ? "timeDivider" : ""}`}>
        <span>{text}</span>

        {!isDivider && linkLabel && onLinkClick && (
          <>
            {" "}
            <button
              type="button"
              className="streamPillLink"
              onClick={onLinkClick}
            >
              {linkLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}