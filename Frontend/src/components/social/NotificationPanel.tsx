'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellDot, Heart, MessageCircle, UserPlus, UserCheck, UserX, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import { useLanguage } from '../LanguageProvider';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Notification {
  id: string;
  type: 'like' | 'reply' | 'follow' | 'friend_request' | 'friend_accept' | 'friend_decline';
  message: string;
  actor_username: string;
  actor_avatar: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON = {
  like: <Heart className="w-3.5 h-3.5 text-rose-500" />,
  reply: <MessageCircle className="w-3.5 h-3.5 text-blue-500" />,
  follow: <UserPlus className="w-3.5 h-3.5 text-brand" />,
  friend_request: <UserPlus className="w-3.5 h-3.5 text-amber-500" />,
  friend_accept: <UserCheck className="w-3.5 h-3.5 text-emerald-500" />,
  friend_decline: <UserX className="w-3.5 h-3.5 text-rose-500" />,
};

const NOTIFICATION_MESSAGE_KEY: Record<Notification['type'], string> = {
  like: 'notifications.likeMessage',
  reply: 'notifications.replyMessage',
  follow: 'notifications.followMessage',
  friend_request: 'notifications.friendRequestMessage',
  friend_accept: 'notifications.friendAcceptMessage',
  friend_decline: 'notifications.friendDeclineMessage',
};

export function NotificationPanel() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const token = isMounted ? localStorage.getItem('access_token') : null;

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read && token) {
      try {
        await fetch(`${BACKEND_URL}/api/v1/social/notifications/mark-read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(0);
        setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      } catch { /* silent */ }
    }
    setIsOpen(false);
    if (['friend_request', 'friend_accept', 'friend_decline'].includes(n.type)) {
      router.push('/friends?focus=requests');
    }
  };

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch { /* silent */ }
  }, [token]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${BACKEND_URL}/api/v1/social/notifications/mark-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  };

  // Poll unread count and notifications (if open) every 5s
  useEffect(() => {
    fetchUnread();
    if (isOpen) {
      fetchNotifications();
    }
    const interval = setInterval(() => {
      fetchUnread();
      if (isOpen) {
        fetchNotifications();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchUnread, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    fetchNotifications();
    if (unreadCount > 0) markAllRead();
  };

  const getNotificationMessage = (n: Notification) => {
    return t(NOTIFICATION_MESSAGE_KEY[n.type]).replace('{actor}', n.actor_username || '');
  };

  if (!token) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border hover:bg-muted/60 transition-colors"
        title={t('notifications.title')}
      >
        {unreadCount > 0
          ? <BellDot className="w-5 h-5 text-brand" />
          : <Bell className="w-5 h-5 text-muted-foreground" />
        }
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-[320px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">{t('notifications.title')}</span>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
                </div>
              ) : (
                notifications.map(n => {
                  const avatar = n.actor_avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_username}`;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors cursor-pointer hover:bg-muted/30 ${
                        n.is_read ? '' : 'bg-brand/5'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img src={avatar} alt={n.actor_username}
                          className="w-9 h-9 rounded-full border border-border bg-muted" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                          {TYPE_ICON[n.type]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{getNotificationMessage(n)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(
                            new Date(n.created_at.endsWith('Z') ? n.created_at : n.created_at + 'Z'),
                            { addSuffix: true, locale: language === 'en' ? enUS : vi }
                          )}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
