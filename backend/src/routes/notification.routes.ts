import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service.js';

export const notificationRouter = Router();

// GET /api/v1/notifications
notificationRouter.get('/', authenticate, async (req: any, res) => {
  try {
    const result = await getNotifications(req.user.id, { limit: 50 });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/notifications/read-all  — must come before /:id/read
notificationRouter.patch('/read-all', authenticate, async (req: any, res) => {
  try {
    const count = await markAllNotificationsAsRead(req.user.id);
    res.json({ success: true, markedCount: count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/notifications/:id/read
notificationRouter.patch('/:id/read', authenticate, async (req: any, res) => {
  try {
    const notif = await markNotificationAsRead(req.params.id, req.user.id);
    if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, notification: notif });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
