import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/Notification.js';
import { emitToUser, emitToRole, broadcastPublic } from '../socket.js';
import { getOfficers } from './user.service.js';

export interface CreateNotificationDTO {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  incidentId?: string;
  investigationId?: string;
  alertId?: string;
  link?: string;
}

export interface SafeNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  incidentId?: string;
  investigationId?: string;
  alertId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// In-Memory Datastore Fallback
const memoryNotifications = new Map<string, any>();

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function toSafeNotification(doc: any): SafeNotification {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    recipientId: doc.recipientId ? (doc.recipientId._id ? doc.recipientId._id.toString() : doc.recipientId.toString()) : '',
    type: doc.type,
    title: doc.title,
    body: doc.body,
    incidentId: doc.incidentId ? (doc.incidentId._id ? doc.incidentId._id.toString() : doc.incidentId.toString()) : undefined,
    investigationId: doc.investigationId ? (doc.investigationId._id ? doc.investigationId._id.toString() : doc.investigationId.toString()) : undefined,
    alertId: doc.alertId ? (doc.alertId._id ? doc.alertId._id.toString() : doc.alertId.toString()) : undefined,
    link: doc.link,
    isRead: !!doc.isRead,
    createdAt: new Date(doc.createdAt || Date.now()).toISOString(),
  };
}

// Seed initial notifications for demo accounts
let hasSeededNotifications = false;

export async function seedInitialDemoNotifications(): Promise<void> {
  if (hasSeededNotifications && memoryNotifications.size > 0) return;
  hasSeededNotifications = true;

  const officers = await getOfficers();
  const primaryOfficer = officers.find((o) => o.role === 'officer') || officers[0];

  if (primaryOfficer) {
    const demoItems = [
      {
        id: 'notif-demo-1',
        recipientId: primaryOfficer.id,
        type: 'new_incident' as NotificationType,
        title: 'New Incident Submitted',
        body: 'Report [INC-2026-00008] Missing Elderly Citizen submitted in Janpath district.',
        incidentId: 'inc-demo-8',
        link: '/officer',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: 'notif-demo-2',
        recipientId: primaryOfficer.id,
        type: 'investigation_assigned' as NotificationType,
        title: 'Assigned to Investigation Case',
        body: 'You were assigned as Lead Detective on Case INV-2026-00101 (Commercial Burglary Syndicated Forensics).',
        investigationId: 'inv-case-001',
        link: '/officer/investigations/inv-case-001',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
    ];

    for (const item of demoItems) {
      memoryNotifications.set(item.id, item);
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Create Notification and Emit Real-Time Socket Event
// ---------------------------------------------------------------------------
export async function createNotification(data: CreateNotificationDTO): Promise<SafeNotification> {
  const now = new Date();

  if (isMongoConnected()) {
    const doc = await Notification.create({
      recipientId: new mongoose.Types.ObjectId(data.recipientId),
      type: data.type,
      title: data.title.trim(),
      body: data.body.trim(),
      incidentId: data.incidentId && mongoose.Types.ObjectId.isValid(data.incidentId) ? new mongoose.Types.ObjectId(data.incidentId) : undefined,
      investigationId: data.investigationId && mongoose.Types.ObjectId.isValid(data.investigationId) ? new mongoose.Types.ObjectId(data.investigationId) : undefined,
      alertId: data.alertId && mongoose.Types.ObjectId.isValid(data.alertId) ? new mongoose.Types.ObjectId(data.alertId) : undefined,
      link: data.link,
      isRead: false,
      createdAt: now,
    });

    const safeNotif = toSafeNotification(doc);
    // Real-time socket push to recipient's private channel
    emitToUser(data.recipientId, 'notification:new', safeNotif);
    return safeNotif;
  }

  // Memory Fallback
  await seedInitialDemoNotifications();

  const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const memoryRecord = {
    id,
    recipientId: data.recipientId,
    type: data.type,
    title: data.title.trim(),
    body: data.body.trim(),
    incidentId: data.incidentId,
    investigationId: data.investigationId,
    alertId: data.alertId,
    link: data.link,
    isRead: false,
    createdAt: now,
  };

  memoryNotifications.set(id, memoryRecord);
  const safeNotif = toSafeNotification(memoryRecord);

  // Real-time socket push to recipient's private channel
  emitToUser(data.recipientId, 'notification:new', safeNotif);
  return safeNotif;
}

// ---------------------------------------------------------------------------
// 2. Get Notifications for User
// ---------------------------------------------------------------------------
export async function getNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<{ unreadCount: number; notifications: SafeNotification[] }> {
  const limit = options.limit || 50;

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { unreadCount: 0, notifications: [] };
    }

    const recipientObjId = new mongoose.Types.ObjectId(userId);
    const unreadCount = await Notification.countDocuments({
      recipientId: recipientObjId,
      isRead: false,
    });

    const query: any = { recipientId: recipientObjId };
    if (options.unreadOnly) {
      query.isRead = false;
    }

    const docs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return {
      unreadCount,
      notifications: docs.map((d) => toSafeNotification(d)),
    };
  }

  // Memory Fallback
  await seedInitialDemoNotifications();

  const userNotifs = Array.from(memoryNotifications.values()).filter(
    (n) => n.recipientId === userId
  );

  const unreadCount = userNotifs.filter((n) => !n.isRead).length;

  let filtered = [...userNotifs];
  if (options.unreadOnly) {
    filtered = filtered.filter((n) => !n.isRead);
  }

  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    unreadCount,
    notifications: filtered.slice(0, limit).map((n) => toSafeNotification(n)),
  };
}

// ---------------------------------------------------------------------------
// 3. Mark Single Notification as Read
// ---------------------------------------------------------------------------
export async function markNotificationAsRead(
  id: string,
  userId: string
): Promise<SafeNotification | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await Notification.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), recipientId: new mongoose.Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true }
    ).exec();

    return doc ? toSafeNotification(doc) : null;
  }

  // Memory Fallback
  await seedInitialDemoNotifications();
  const notif = memoryNotifications.get(id);
  if (!notif || notif.recipientId !== userId) return null;

  notif.isRead = true;
  return toSafeNotification(notif);
}

// ---------------------------------------------------------------------------
// 4. Mark All Notifications as Read for User
// ---------------------------------------------------------------------------
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return 0;

    const result = await Notification.updateMany(
      { recipientId: new mongoose.Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    ).exec();

    return result.modifiedCount || 0;
  }

  // Memory Fallback
  await seedInitialDemoNotifications();
  let count = 0;
  for (const notif of memoryNotifications.values()) {
    if (notif.recipientId === userId && !notif.isRead) {
      notif.isRead = true;
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 5. Broadcast to Authorities (Officers & Admins)
// ---------------------------------------------------------------------------
export async function notifyAuthorities(
  type: NotificationType,
  title: string,
  body: string,
  metadata: { incidentId?: string; investigationId?: string; link?: string } = {}
): Promise<void> {
  // 1. Emit live WebSocket event to authority room
  emitToRole('officer', 'authority:broadcast', {
    type,
    title,
    body,
    ...metadata,
    timestamp: new Date().toISOString(),
  });

  // 2. Persist notification in inbox of all active officers/admins
  const officers = await getOfficers();
  for (const officer of officers) {
    await createNotification({
      recipientId: officer.id,
      type,
      title,
      body,
      incidentId: metadata.incidentId,
      investigationId: metadata.investigationId,
      link: metadata.link || '/officer',
    });
  }
}
