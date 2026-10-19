import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Bell, CheckCheck, ExternalLink, X, Volume2, ShieldAlert } from 'lucide-react';
import { requestPushPermission, getPushPermission, triggerPushAlert } from '../lib/push.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLink: (link: string) => void;
  onUnreadCountChange: (count: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectLink,
  onUnreadCountChange,
}) => {
  const { getAuthToken } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(getPushPermission());
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: AppNotification[] = await res.json();
        setNotifications(data);
        const unread = data.filter((n) => !n.isRead).length;
        onUnreadCountChange(unread);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleEnablePush = async () => {
    const perm = await requestPushPermission();
    setPushStatus(perm);
    if (perm === 'granted') {
      triggerPushAlert('우리반 비밀 상담소 알림', '푸시 알림이 활성화되었습니다! 새로운 상담과 고민 글이 등록되면 즉시 알려드립니다.');
    }
  };

  const handleMarkAsRead = async (id: number, link?: string) => {
    try {
      const token = await getAuthToken();
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      const remainingUnread = notifications.filter((n) => !n.isRead && n.id !== id).length;
      onUnreadCountChange(remainingUnread);
      if (link) {
        onSelectLink(link);
        onClose();
      }
    } catch (e) {
      console.error('Mark read failed:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getAuthToken();
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onUnreadCountChange(0);
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-md bg-stone-50 h-full shadow-2xl flex flex-col border-l border-stone-200">
        {/* Header */}
        <div className="p-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">상담소 알림함</h3>
              <p className="text-xs text-stone-500">실시간 상담 업데이트 & 고민 소식</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-900">
            <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {pushStatus === 'granted'
                ? '브라우저 푸시 알림이 켜져 있습니다'
                : '고민 등록 시 즉시 알림을 받으시겠어요?'}
            </span>
          </div>
          {pushStatus !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-xs transition-colors shrink-0"
            >
              알림 켜기
            </button>
          ) : (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              활성화됨
            </span>
          )}
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <span>전체 알림 {notifications.length}건</span>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              모두 읽음으로 표시
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">새로운 알림이 없습니다.</p>
              <p className="text-xs text-stone-400 mt-1">
                학생의 고민 글이나 선생님의 1:1 답변이 도착하면 즉시 알려드립니다.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id, notif.link)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-white border-stone-200 opacity-75 hover:opacity-100'
                    : 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    )}
                    <h4 className="font-semibold text-sm text-stone-800 leading-snug">
                      {notif.title}
                    </h4>
                  </div>
                  <span className="text-[11px] text-stone-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed line-clamp-2">
                  {notif.body}
                </p>
                {notif.link && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline">
                    <span>해당 내용 바로가기</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
