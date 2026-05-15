export type NotificationType = "system" | "search" | "support" | "account";

export interface NotificationItem {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const NOTIFICATIONS_KEY = "wanderbite_notifications";
export const NOTIFICATIONS_UPDATED_EVENT = "wanderbite:notifications-updated";

function getStorageUserId(userId?: string | null): string {
  return userId || "guest";
}

function readNotificationMap(): Record<string, NotificationItem[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) as Record<string, NotificationItem[]> : {};
  } catch {
    return {};
  }
}

function writeNotificationMap(data: Record<string, NotificationItem[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

function sortNewestFirst(items: NotificationItem[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `notification_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const notificationService = {
  async getNotifications(userId?: string | null): Promise<NotificationItem[]> {
    const key = getStorageUserId(userId);
    const data = readNotificationMap();
    return sortNewestFirst(data[key] || []);
  },

  async getUnreadCount(userId?: string | null): Promise<number> {
    const notifications = await notificationService.getNotifications(userId);
    return notifications.filter((item) => !item.readAt).length;
  },

  async addNotification(
    userId: string | null | undefined,
    input: CreateNotificationInput,
  ): Promise<NotificationItem> {
    const key = getStorageUserId(userId);
    const data = readNotificationMap();
    const now = new Date().toISOString();
    const notification: NotificationItem = {
      id: createId(),
      userId: key,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
      readAt: null,
      createdAt: now,
    };

    data[key] = [notification, ...(data[key] || [])].slice(0, 50);
    writeNotificationMap(data);
    return notification;
  },

  async markAsRead(userId: string | null | undefined, notificationId: string): Promise<void> {
    const key = getStorageUserId(userId);
    const data = readNotificationMap();
    const now = new Date().toISOString();
    data[key] = (data[key] || []).map((item) =>
      item.id === notificationId ? { ...item, readAt: item.readAt || now } : item,
    );
    writeNotificationMap(data);
  },

  async markAllAsRead(userId?: string | null): Promise<void> {
    const key = getStorageUserId(userId);
    const data = readNotificationMap();
    const now = new Date().toISOString();
    data[key] = (data[key] || []).map((item) => ({ ...item, readAt: item.readAt || now }));
    writeNotificationMap(data);
  },

  async removeNotification(userId: string | null | undefined, notificationId: string): Promise<void> {
    const key = getStorageUserId(userId);
    const data = readNotificationMap();
    data[key] = (data[key] || []).filter((item) => item.id !== notificationId);
    writeNotificationMap(data);
  },
};
