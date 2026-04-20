// src/components/notifications/NotificationDropdown.tsx
import React, { useMemo } from "react";
import "../css/NotificationBell.css";
import { useNotifications } from "../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { navigateFromNotification } from "../utils/navigateFromNotification";
import { NotificationDTO } from "../types/notification";

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} d ago`;
}

function getNotificationIcon(n: NotificationDTO): string {
  const k = String(n.kind ?? "");
  if (k.startsWith("thread.") || k.startsWith("message.") || k.startsWith("announcement.")) return "💬";
  if (k.startsWith("referral.")) return "💬";
  if (k.startsWith("invite.")) return "📨";
  if (k.startsWith("offer.")) return "🎁";
  if (k.startsWith("wallet.") || k.startsWith("points.")) return "⭐";
  return "🔔";
}

function safeIsoMs(iso?: string | null) {
  if (!iso) return 0;
  const ms = Date.parse(String(iso));
  return Number.isFinite(ms) ? ms : 0;
}

function extractThreadId(n: NotificationDTO): string | null {
  const ct = String(n.contextType ?? "").toUpperCase();

  const metaThreadId =
    (n.metadata as any)?.threadId ||
    (n.metadata as any)?.referralThreadId ||
    (n.metadata as any)?.inviteThreadId ||
    (n.metadata as any)?.threadID ||
    (n.metadata as any)?.referral_thread_id ||
    null;

  const threadId =
    (typeof metaThreadId === "string" && metaThreadId.trim() ? metaThreadId.trim() : null) ||
    ((ct.includes("THREAD") || ct === "THREAD") &&
    typeof n.contextId === "string" &&
    n.contextId.trim()
      ? n.contextId.trim()
      : null);

  return threadId;
}

type AggregatedRow =
  | {
      kind: "thread";
      key: string; // THREAD:<threadId>
      threadId: string;
      latest: NotificationDTO;
      items: NotificationDTO[];
      unreadCount: number;
    }
  | {
      kind: "single";
      key: string; // NOTIF:<id>
      latest: NotificationDTO;
      items: NotificationDTO[]; // singleton
      unreadCount: number;
    };

function aggregateNotifications(notifs: NotificationDTO[]): AggregatedRow[] {
  const threadBuckets = new Map<string, NotificationDTO[]>();
  const singles: NotificationDTO[] = [];

  for (const n of notifs) {
    const tid = extractThreadId(n);
    if (tid) {
      const k = `THREAD:${tid}`;
      const arr = threadBuckets.get(k) ?? [];
      arr.push(n);
      threadBuckets.set(k, arr);
    } else {
      singles.push(n);
    }
  }

  const rows: AggregatedRow[] = [];

  // thread groups
  for (const [key, items] of threadBuckets.entries()) {
    const sorted = [...items].sort((a, b) => safeIsoMs(b.createdAt) - safeIsoMs(a.createdAt));
    const latest = sorted[0];
    const unreadCount = sorted.filter((x) => !x.isRead).length;

    const threadId = key.slice("THREAD:".length);

    rows.push({
      kind: "thread",
      key,
      threadId,
      latest,
      items: sorted,
      unreadCount,
    });
  }

  // singles
  for (const n of singles) {
    rows.push({
      kind: "single",
      key: `NOTIF:${n.id}`,
      latest: n,
      items: [n],
      unreadCount: n.isRead ? 0 : 1,
    });
  }

  // global sorting by latest activity time (whatsapp-like)
  rows.sort((a, b) => safeIsoMs(b.latest.createdAt) - safeIsoMs(a.latest.createdAt));

  return rows;
}

type Props = {
  onClose?: () => void;
};

export const NotificationDropdown: React.FC<Props> = ({ onClose }) => {
  const { notifications, loading, markRead, markAllRead } = useNotifications(20, 0);
  const navigate = useNavigate();

  const rows = useMemo(() => aggregateNotifications(notifications ?? []), [notifications]);

  const markGroupRead = async (items: NotificationDTO[]) => {
    const unread = items.filter((x) => !x.isRead).map((x) => x.id);
    if (!unread.length) return;
    // markRead is a hook action; keep it simple + safe
    for (const id of unread) {
      try {
        await Promise.resolve(markRead(id));
      } catch {
        // ignore per-item failures; WS/react-query will reconcile
      }
    }
  };

  const handleClick = async (row: AggregatedRow) => {
    if (row.kind === "thread") {
      navigate(`/threads/${encodeURIComponent(row.threadId)}`);
      await markGroupRead(row.items);
      if (onClose) onClose();
      return;
    }

    // single: keep existing navigation mapping
    navigateFromNotification(row.latest, navigate);
    if (!row.latest.isRead) {
      try {
        await Promise.resolve(markRead(row.latest.id));
      } catch {
        // ignore
      }
    }
    if (onClose) onClose();
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-dropdown-header">
        <div className="notification-dropdown-title">Notifications</div>
        <button
          className="notification-dropdown-mark-all"
          onClick={() => markAllRead()}
          disabled={loading}
        >
          Mark all as read
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "12px", fontSize: "13px" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "12px", fontSize: "13px" }}>No notifications yet.</div>
      ) : (
        <ul className="notification-list">
          {rows.map((row) => {
            const n = row.latest;
            const isUnread = row.unreadCount > 0;

            const moreCount = Math.max(0, row.items.length - 1);
            const metaThreadTitle =
              (n.metadata as any)?.threadTitle ||
              (n.metadata as any)?.title ||
              null;

            const title =
              row.kind === "thread"
                ? (metaThreadTitle || n.title)
                : n.title;

            // “some level of aggregation”: show latest body + “+N more”
            const body =
              row.kind === "thread" && moreCount > 0
                ? `${n.body}  · +${moreCount} more`
                : n.body;

            return (
              <li
                key={row.key}
                className={`notification-item ${isUnread ? "unread" : ""}`}
                onClick={() => handleClick(row)}
              >
                <div className="notification-item-layout">
                  <div className="notification-item-icon">{getNotificationIcon(n)}</div>

                  <div className="notification-item-content" style={{ minWidth: 0 }}>
                    <p className="notification-item-title">{title}</p>
                    <p className="notification-item-body">{body}</p>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="notification-item-time">
                        {formatRelativeTime(n.createdAt)}
                      </div>

                      {row.kind === "thread" && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {row.items.length} update{row.items.length === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side unread badge (per thread aggregate or single) */}
                  {isUnread && (
                    <div
                      style={{
                        marginLeft: 10,
                        minWidth: 22,
                        height: 22,
                        padding: "0 6px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                      title={`${row.unreadCount} unread`}
                    >
                      {row.unreadCount > 99 ? "99+" : row.unreadCount}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};