// src/components/notifications/NotificationDropdown.tsx
import React from "react";
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
  if (n.kind.startsWith("referral.")) return "💬";
  if (n.kind.startsWith("invite.")) return "📨";
  if (n.kind.startsWith("offer.")) return "🎁";
  if (n.kind.startsWith("wallet.") || n.kind.startsWith("points.")) return "⭐";
  return "🔔";
}

type Props = {
  onClose?: () => void;
};

export const NotificationDropdown: React.FC<Props> = ({ onClose }) => {
  const { notifications, loading, markRead, markAllRead } = useNotifications(20, 0);
  const navigate = useNavigate();

  const handleClick = (n: NotificationDTO) => {
    navigateFromNotification(n, navigate);
    if (!n.isRead) {
      markRead(n.id);
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
      ) : notifications.length === 0 ? (
        <div style={{ padding: "12px", fontSize: "13px" }}>No notifications yet.</div>
      ) : (
        <ul className="notification-list">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`notification-item ${n.isRead ? "" : "unread"}`}
              onClick={() => handleClick(n)}
            >
              <div className="notification-item-layout">
                <div className="notification-item-icon">{getNotificationIcon(n)}</div>
                <div className="notification-item-content">
                  <p className="notification-item-title">{n.title}</p>
                  <p className="notification-item-body">{n.body}</p>
                  <div className="notification-item-time">
                    {formatRelativeTime(n.createdAt)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
