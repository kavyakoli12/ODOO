import mongoose from 'mongoose';
import { Alert, IAlert, AlertType } from '../models/Alert.js';
import { broadcastPublic, broadcastGlobal } from '../socket.js';
import { createNotification } from './notification.service.js';
import { User } from '../models/User.js';

export interface CreateAlertDTO {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  alertType?: AlertType;
  cityName?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  startsAt?: Date;
  expiresAt: Date;
  publishedById: string;
  publishedByName: string;
}

export interface SafeAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  alertType: string;
  geographicScope: any;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  publishedByName: string;
  createdAt: string;
}

// In-memory fallback
const memAlerts: Map<string, any> = new Map();

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function toSafeAlert(a: any): SafeAlert {
  return {
    id: a._id ? a._id.toString() : a.id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    alertType: a.alertType || 'safety_warning',
    geographicScope: a.geographicScope || { type: 'city_wide', cityName: a.cityName || 'All Areas' },
    isActive: !!a.isActive,
    startsAt: new Date(a.startsAt || a.createdAt || Date.now()).toISOString(),
    expiresAt: new Date(a.expiresAt).toISOString(),
    publishedByName: a.publishedByName || 'Authority',
    createdAt: new Date(a.createdAt || Date.now()).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Create Alert
// ---------------------------------------------------------------------------
export async function createAlert(dto: CreateAlertDTO): Promise<SafeAlert> {
  const now = new Date();

  const hasCoordinates = dto.latitude != null && dto.longitude != null;
  const geographicScope: any = {
    type: hasCoordinates ? 'radius' : 'city_wide',
    cityName: dto.cityName || 'All Areas',
  };

  if (hasCoordinates) {
    geographicScope.center = {
      type: 'Point',
      coordinates: [dto.longitude!, dto.latitude!],
    };
    if (dto.radiusKm) {
      geographicScope.radiusKm = dto.radiusKm;
    }
  }

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(dto.publishedById)) {
      throw new Error('Invalid publisher ID');
    }

    const doc = await Alert.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      severity: dto.severity,
      alertType: dto.alertType || 'safety_warning',
      geographicScope,
      isActive: true,
      startsAt: dto.startsAt || now,
      expiresAt: dto.expiresAt,
      publishedBy: new mongoose.Types.ObjectId(dto.publishedById),
      publishedByName: dto.publishedByName,
    });

    const safe = toSafeAlert(doc);
    await broadcastAlert(safe);
    return safe;
  }

  // Memory fallback
  const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const memRecord = {
    id,
    title: dto.title.trim(),
    description: dto.description.trim(),
    severity: dto.severity,
    alertType: dto.alertType || 'safety_warning',
    geographicScope,
    cityName: dto.cityName || 'All Areas',
    isActive: true,
    startsAt: dto.startsAt || now,
    expiresAt: dto.expiresAt,
    publishedByName: dto.publishedByName,
    createdAt: now,
  };
  memAlerts.set(id, memRecord);

  const safe = toSafeAlert(memRecord);
  await broadcastAlert(safe);
  return safe;
}

async function broadcastAlert(safe: SafeAlert): Promise<void> {
  // Real-time push to everyone
  broadcastGlobal('alert:new', safe);

  // Also notify all citizens via their notification inboxes
  if (isMongoConnected()) {
    const citizens = await User.find({ role: 'citizen', isActive: true }).select('_id').lean();
    for (const c of citizens) {
      await createNotification({
        recipientId: c._id.toString(),
        type: 'alert_published',
        title: `🚨 Safety Alert: ${safe.title}`,
        body: safe.description.slice(0, 120),
        alertId: safe.id,
        link: '/safety-alerts',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Get Active Alerts (public)
// ---------------------------------------------------------------------------
export async function getActiveAlerts(): Promise<SafeAlert[]> {
  const now = new Date();

  if (isMongoConnected()) {
    const docs = await Alert.find({
      isActive: true,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toSafeAlert);
  }

  return Array.from(memAlerts.values())
    .filter((a) => a.isActive && new Date(a.expiresAt) > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toSafeAlert);
}

// ---------------------------------------------------------------------------
// Get All Alerts (authority)
// ---------------------------------------------------------------------------
export async function getAllAlerts(): Promise<SafeAlert[]> {
  if (isMongoConnected()) {
    const docs = await Alert.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(toSafeAlert);
  }

  return Array.from(memAlerts.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toSafeAlert);
}

// ---------------------------------------------------------------------------
// Update Alert
// ---------------------------------------------------------------------------
export async function updateAlert(
  alertId: string,
  updates: Partial<Pick<CreateAlertDTO, 'title' | 'description' | 'severity' | 'alertType' | 'expiresAt' | 'cityName'>>
): Promise<SafeAlert | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(alertId)) return null;

    const doc = await Alert.findByIdAndUpdate(
      alertId,
      {
        $set: {
          ...(updates.title && { title: updates.title.trim() }),
          ...(updates.description && { description: updates.description.trim() }),
          ...(updates.severity && { severity: updates.severity }),
          ...(updates.alertType && { alertType: updates.alertType }),
          ...(updates.expiresAt && { expiresAt: updates.expiresAt }),
          ...(updates.cityName && { 'geographicScope.cityName': updates.cityName }),
        },
      },
      { new: true }
    ).lean();

    if (!doc) return null;
    const safe = toSafeAlert(doc);
    broadcastGlobal('alert:updated', safe);
    return safe;
  }

  const alert = memAlerts.get(alertId);
  if (!alert) return null;

  Object.assign(alert, updates);
  const safe = toSafeAlert(alert);
  broadcastGlobal('alert:updated', safe);
  return safe;
}

// ---------------------------------------------------------------------------
// Expire Alert
// ---------------------------------------------------------------------------
export async function expireAlert(alertId: string): Promise<SafeAlert | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(alertId)) return null;

    const doc = await Alert.findByIdAndUpdate(
      alertId,
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!doc) return null;
    const safe = toSafeAlert(doc);
    broadcastGlobal('alert:expired', { id: alertId });
    return safe;
  }

  const alert = memAlerts.get(alertId);
  if (!alert) return null;

  alert.isActive = false;
  broadcastGlobal('alert:expired', { id: alertId });
  return toSafeAlert(alert);
}
