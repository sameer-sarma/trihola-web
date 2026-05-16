// src/pages/threads/components/stream/BroadcastEnvelope.tsx
import type { BroadcastEnvelopeItem } from "./types";

type Props = {
  item: BroadcastEnvelopeItem;
  children: React.ReactNode;
};

export default function BroadcastEnvelope({ item, children }: Props) {
  return (
    <div className="broadcast-envelope" data-broadcast-id={item.broadcastId}>
      <div className="broadcast-envelope__header" aria-label="Broadcast">
        <span className="broadcast-envelope__icon" aria-hidden="true">
          📢
        </span>

        <div className="broadcast-envelope__titleBlock">
          <div className="broadcast-envelope__title">
            {item.broadcastTitle?.trim() || "Broadcast"}
          </div>

          {!!item.occurredAt && (
            <div className="broadcast-envelope__meta">
              {new Date(item.occurredAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="broadcast-envelope__body">{children}</div>
    </div>
  );
}