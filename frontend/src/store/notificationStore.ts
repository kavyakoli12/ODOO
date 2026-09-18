import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  incidentId?: string;
  investigationId?: string;
  alertId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasFetched: boolean;

  fetchNotifications: () => Promise<void>;
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasFetched: false,

  fetchNotifications: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const res = await api.get('/notifications');
      const data = res.data;
      set({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
        hasFetched: true,
      });
    } catch {
      // silent fail — notifications are non-critical
    } finally {
      set({ isLoading: false });
    }
  },

  addNotification: (n: Notification) => {
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + (n.isRead ? 0 : 1),
    }));
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {}
  },
}));
