// src/pages/threads/components/stream/SystemEventItem.tsx

type Props = {
  text: string;
  isDivider?: boolean;
};

export default function SystemEventItem({ text, isDivider = false }: Props) {
  return (
    <div className={`streamSystemRow ${isDivider ? "isDivider" : ""}`}>
      <div className="streamDot" />
      <div className={`streamPill ${isDivider ? "timeDivider" : ""}`}>{text}</div>
    </div>
  );
}