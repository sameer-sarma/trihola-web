import axios from "axios";
import { NotificationDTO } from "../types/notification";

const API_BASE = import.meta.env.VITE_API_BASE as string;

export interface NotificationsPage {
  items: NotificationDTO[];
  limit: number;
  offset: number;
}

export async function fetchNotifications(
  limit: number,
  offset: number,
  token: string
): Promise<NotificationsPage> {
  const response = await axios.get<NotificationDTO[]>(`${API_BASE}/notifications?limit=${limit}&offset=${offset}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return {
    items: response.data,
    limit,
    offset,
  };
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const response = await axios.get<{ unread: number }>(`${API_BASE}/notifications/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.unread;
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/notifications/${id}/read`,
    null,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/notifications/read-all`,
    null,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}