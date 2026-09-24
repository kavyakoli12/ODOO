import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, ExternalLink, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { initSocket } from '@/lib/socket';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICON: Record<string, string> = {
  new_incident: '🚨',
  status_changed: '🔄',
  message_received: '💬',
  alert_published: '⚠️',
  investigation_assigned: '🔍',
  report_received: '📋',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isAuthenticated, user } = useAuthStore();
  const { notifications, unreadCount, hasFetched, fetchNotifications, addNotification, markAsRead, markAllAsRead } =
    useNotificationStore();

  // Fetch on first mount if authenticated
  useEffect(() => {
    if (isAuthenticated && !hasFetched) {
      fetchNotifications();
    }
  }, [isAuthenticated, hasFetched, fetchNotifications]);

  // Subscribe to real-time socket events
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = initSocket();

    const handleNew = (notif: any) => {
      addNotification(notif);
    };

    socket.on('notification:new', handleNew);

    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [isAuthenticated, user, addNotification]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!isAuthenticated) return null;

  const handleClick = (notif: any) => {
    if (!notif.isRead) markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm max-h-[480px] rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ animation: 'notif-slide-in 0.18s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                <AlertCircle className="w-8 h-8 opacity-40" />
                <span className="text-sm">No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 group ${
                    n.isRead
                      ? 'hover:bg-slate-800/40'
                      : 'bg-brand-500/5 hover:bg-brand-500/10 border-l-2 border-brand-500'
                  }`}
                >
                  <div className="text-xl mt-0.5 shrink-0">{TYPE_ICON[n.type] || '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug truncate ${n.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="shrink-0 p-0.5 rounded text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Mark read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-500">{timeAgo(n.createdAt)}</span>
                      {n.link && (
                        <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-brand-400 transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
