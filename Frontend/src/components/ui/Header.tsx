'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, CheckCheck, HelpCircle, Inbox } from 'lucide-react';
import { UserDropdown } from '../UserDropdown';
import {
  notificationService,
  NOTIFICATIONS_UPDATED_EVENT,
  type NotificationItem,
} from '../../services/notificationService';

interface HeaderProps {
  showBack?: boolean;
  backPath?: string;
  username?: string | null;
  avatar?: string | null;
}

export function Header({ showBack = false, backPath, username, avatar }: HeaderProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };

  const getUserId = React.useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_id') || 'guest';
  }, []);

  const refreshNotifications = React.useCallback(async () => {
    const items = await notificationService.getNotifications(getUserId());
    setNotifications(items);
  }, [getUserId]);

  React.useEffect(() => {
    refreshNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
    window.addEventListener('storage', refreshNotifications);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
      window.removeEventListener('storage', refreshNotifications);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [refreshNotifications]);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const handleNotificationClick = async (item: NotificationItem) => {
    await notificationService.markAsRead(getUserId(), item.id);
    setIsNotificationsOpen(false);
    if (item.actionUrl) router.push(item.actionUrl);
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(getUserId());
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-[72px] bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen((value) => !value)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            aria-label="Thong bao"
          >
            <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#F7F8FA] dark:border-gray-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1A1F2B] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Thong bao</h3>
                  <p className="text-[11px] text-gray-400">{unreadCount} chua doc</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Doc tat ca
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Chua co thong bao</p>
                    <p className="text-xs text-gray-400 mt-1">Cac cap nhat moi se xuat hien tai day.</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="w-full px-4 py-3 text-left flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-b-0"
                    >
                      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.readAt ? 'bg-gray-200 dark:bg-gray-700' : 'bg-orange-500'}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-gray-800 dark:text-white truncate">{item.title}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{item.message}</span>
                        <span className="block text-[11px] text-gray-400 mt-2">{formatNotificationTime(item.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/support')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
          <span className="font-medium">Ho tro</span>
        </button>

        <UserDropdown username={username} avatar={avatar} />
      </div>
    </header>
  );
}

function formatNotificationTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '';

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Vua xong';
  if (diffMinutes < 60) return `${diffMinutes} phut truoc`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} gio truoc`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngay truoc`;

  return new Date(value).toLocaleDateString('vi-VN');
}
