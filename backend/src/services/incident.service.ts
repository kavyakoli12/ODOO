import mongoose from 'mongoose';
import { Incident, IIncident, IncidentStatus } from '../models/Incident.js';
import { IncidentCategory, IIncidentCategory } from '../models/IncidentCategory.js';
import { StatusHistory } from '../models/StatusHistory.js';
import { Evidence } from '../models/Evidence.js';
import type { AuthUser } from '../middleware/auth.middleware.js';
import { emitToUser, emitToRole, broadcastPublic } from '../socket.js';
import { createNotification, notifyAuthorities } from './notification.service.js';
import { syncIncidentToOdoo } from './odoo.service.js';


export interface CreateIncidentDTO {
  title: string;
  description: string;
  categorySlug: string;
  severity: number;
  latitude: number;
  longitude: number;
  address: string;
  incidentDate?: string;
  isAnonymous?: boolean;
}

export interface SafeCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
}

export interface SafeStatusHistory {
  id: string;
  incidentId: string;
  previousStatus: string;
  newStatus: string;
  changedByRole: string;
  reason?: string;
  note?: string;
  createdAt: string;
}

export interface SafeEvidence {
  id: string;
  incidentId: string;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSizeMB: number;
  uploadedAt: string;
}

export interface SafeIncident {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  status: IncidentStatus;
  severity: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  incidentDate: string;
  isAnonymous: boolean;
  reporterId?: string;
  reporterName?: string;
  evidenceCount: number;
  statusHistory?: SafeStatusHistory[];
  evidence?: SafeEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface SafeMapIncident {
  id: string;
  trackingId: string;
  title: string;
  shortDescription: string;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
  categoryIcon: string;
  status: IncidentStatus;
  isVerified: boolean;
  isCitizenReport: boolean;
  severity: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  approximateAddress: string;
  incidentDate: string;
  createdAt: string;
}

export interface MapFiltersDTO {
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  lat?: number;
  lng?: number;
  radiusKm?: number;
  category?: string;
  status?: string;
  timeRange?: string; // 'all' | '24h' | '7d' | '30d'
  limit?: number;
}

export interface OfficerQueueStats {
  newSubmitted: number;
  underReview: number;
  verified: number;
  rejected: number;
  totalActive: number;
}

export interface OfficerQueueFilters {
  status?: string;
  category?: string;
  severity?: number;
  searchQuery?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'severity_desc';
}

export interface OfficerReviewDTO {
  action: 'start_review' | 'verify' | 'reject';
  note?: string;
  reason?: string;
}

// In-memory datastore fallback when MongoDB service is not running
const memoryIncidents = new Map<string, any>();
const memoryStatusHistory: any[] = [];
const memoryEvidence: any[] = [];
let incidentCounter = 1;

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// 10 Official Incident Categories
export const DEFAULT_CATEGORIES: SafeCategory[] = [
  { id: 'cat-1', name: 'Theft / Burglary', slug: 'theft', description: 'Stolen personal property, breaking and entering, shoplifting', color: '#3B82F6', icon: 'ShoppingBag' },
  { id: 'cat-2', name: 'Robbery', slug: 'robbery', description: 'Theft involving force, threat, or physical confrontation', color: '#EF4444', icon: 'ShieldAlert' },
  { id: 'cat-3', name: 'Assault', slug: 'assault', description: 'Physical attack, bodily harm, or violent confrontation', color: '#DC2626', icon: 'AlertOctagon' },
  { id: 'cat-4', name: 'Vandalism / Property Damage', slug: 'vandalism', description: 'Damage to public or private property, graffiti', color: '#F59E0B', icon: 'Hammer' },
  { id: 'cat-5', name: 'Suspicious Activity', slug: 'suspicious-activity', description: 'Unusual, lurking, or potentially criminal behavior', color: '#8B5CF6', icon: 'Eye' },
  { id: 'cat-6', name: 'Traffic Incident', slug: 'traffic-incident', description: 'Reckless driving, hit-and-run, major road violations', color: '#EAB308', icon: 'Car' },
  { id: 'cat-7', name: 'Missing Person', slug: 'missing-person', description: 'Unaccounted individuals, runaway youth, vulnerable adults', color: '#EC4899', icon: 'UserX' },
  { id: 'cat-8', name: 'Cybercrime / Online Fraud', slug: 'cybercrime', description: 'Identity theft, phishing scam, financial extortion', color: '#06B6D4', icon: 'Laptop' },
  { id: 'cat-9', name: 'Harassment / Stalking', slug: 'harassment', description: 'Repeated threats, intimidation, or stalking behavior', color: '#A855F7', icon: 'AlertTriangle' },
  { id: 'cat-10', name: 'Other Incident', slug: 'other', description: 'Other community public safety concerns', color: '#6B7280', icon: 'HelpCircle' },
];

export async function getCategories(): Promise<SafeCategory[]> {
  if (isMongoConnected()) {
    const cats = await IncidentCategory.find({ isActive: true }).sort({ displayOrder: 1 }).exec();
    if (cats.length > 0) {
      return cats.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        color: c.color,
        icon: c.icon,
      }));
    }
  }
  return DEFAULT_CATEGORIES;
}

export function findCategoryBySlug(slug: string): SafeCategory {
  const found = DEFAULT_CATEGORIES.find((c) => c.slug === slug);
  return found || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]; // Default to 'Other'
}

async function generateTrackingId(): Promise<string> {
  const year = new Date().getFullYear();

  if (isMongoConnected()) {
    const count = await Incident.countDocuments();
    let num = count + 1;
    let candidate = `INC-${year}-${num.toString().padStart(5, '0')}`;
    let exists = await Incident.exists({ trackingId: candidate });
    while (exists) {
      num++;
      candidate = `INC-${year}-${num.toString().padStart(5, '0')}`;
      exists = await Incident.exists({ trackingId: candidate });
    }
    return candidate;
  }

  let candidate = `INC-${year}-${(incidentCounter++).toString().padStart(5, '0')}`;
  while (memoryIncidents.has(candidate)) {
    candidate = `INC-${year}-${(incidentCounter++).toString().padStart(5, '0')}`;
  }
  return candidate;
}

export function toSafeIncident(doc: any, history: any[] = [], evidenceList: any[] = []): SafeIncident {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    trackingId: doc.trackingId,
    title: doc.title,
    description: doc.description,
    categoryId: doc.categoryId ? doc.categoryId.toString() : 'cat-default',
    categoryName: doc.categoryName,
    categoryColor: doc.categoryColor,
    categoryIcon: doc.categoryIcon,
    status: doc.status,
    severity: doc.severity,
    location: {
      type: 'Point',
      coordinates: doc.location.coordinates, // [longitude, latitude]
    },
    address: doc.address,
    incidentDate: new Date(doc.incidentDate).toISOString(),
    isAnonymous: !!doc.isAnonymous,
    reporterId: doc.isAnonymous ? undefined : doc.reporterId ? doc.reporterId.toString() : undefined,
    reporterName: doc.isAnonymous ? undefined : doc.reporterName,
    evidenceCount: doc.evidenceCount || evidenceList.length || 0,
    statusHistory: history.map((h) => ({
      id: h._id ? h._id.toString() : h.id,
      incidentId: h.incidentId ? h.incidentId.toString() : doc.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      changedByRole: h.changedByRole,
      reason: h.reason,
      note: h.note,
      createdAt: new Date(h.createdAt).toISOString(),
    })),
    evidence: evidenceList.map((e) => ({
      id: e._id ? e._id.toString() : e.id,
      incidentId: e.incidentId ? e.incidentId.toString() : doc.id,
      fileUrl: e.fileUrl,
      originalFilename: e.originalFilename,
      mimeType: e.mimeType,
      fileSizeMB: e.fileSizeMB,
      uploadedAt: new Date(e.uploadedAt).toISOString(),
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export async function createIncident(data: CreateIncidentDTO, reporter: AuthUser): Promise<SafeIncident> {
  const category = findCategoryBySlug(data.categorySlug);
  const trackingId = await generateTrackingId();
  const now = new Date();

  // Validate incident date (cannot be > 5 mins in future)
  let incidentDate = now;
  if (data.incidentDate) {
    const parsedDate = new Date(data.incidentDate);
    if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() <= now.getTime() + 5 * 60 * 1000) {
      incidentDate = parsedDate;
    }
  }

  // GeoJSON coordinates: [longitude, latitude]
  const coordinates: [number, number] = [data.longitude, data.latitude];

  if (isMongoConnected()) {
    const newIncident = await Incident.create({
      trackingId,
      title: data.title.trim(),
      description: data.description.trim(),
      categoryId: new mongoose.Types.ObjectId(),
      categoryName: category.name,
      categoryColor: category.color,
      categoryIcon: category.icon,
      status: 'submitted',
      severity: data.severity,
      location: {
        type: 'Point',
        coordinates,
      },
      address: data.address.trim(),
      incidentDate,
      isAnonymous: !!data.isAnonymous,
      reporterId: new mongoose.Types.ObjectId(reporter.id),
      reporterName: reporter.name,
      isPublic: false,
      evidenceCount: 0,
      messageCount: 0,
    });

    // Record initial status history entry
    const historyEntry = await StatusHistory.create({
      incidentId: newIncident._id,
      previousStatus: 'none',
      newStatus: 'submitted',
      changedBy: new mongoose.Types.ObjectId(reporter.id),
      changedByRole: reporter.role,
      note: 'Incident report submitted by citizen',
    });

    const safeCreated = toSafeIncident(newIncident, [historyEntry], []);

    // Real-Time Socket Event, Authority Notification & Automatic Odoo Helpdesk Sync
    emitToRole('officer', 'incident:new', safeCreated);
    notifyAuthorities('new_incident', 'New Incident Submitted', `Report [${safeCreated.trackingId}] ${safeCreated.title} reported at ${safeCreated.address}`, { incidentId: safeCreated.id, link: `/officer/incidents/${safeCreated.id}` }).catch(() => {});
    syncIncidentToOdoo(safeCreated.id).catch(() => {});

    return safeCreated;
  }

  // Memory fallback
  const id = new mongoose.Types.ObjectId().toString();
  const memIncident = {
    _id: id,
    id,
    trackingId,
    title: data.title.trim(),
    description: data.description.trim(),
    categoryId: category.id,
    categoryName: category.name,
    categoryColor: category.color,
    categoryIcon: category.icon,
    status: 'submitted',
    severity: data.severity,
    location: {
      type: 'Point',
      coordinates,
    },
    address: data.address.trim(),
    incidentDate,
    isAnonymous: !!data.isAnonymous,
    reporterId: reporter.id,
    reporterName: reporter.name,
    isPublic: false,
    evidenceCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const memHistory = {
    id: `hist-${Date.now()}`,
    incidentId: id,
    previousStatus: 'none',
    newStatus: 'submitted',
    changedBy: reporter.id,
    changedByRole: reporter.role,
    note: 'Incident report submitted by citizen',
    createdAt: now,
  };

  memoryIncidents.set(id, memIncident);
  memoryStatusHistory.push(memHistory);

  const safeMemCreated = toSafeIncident(memIncident, [memHistory], []);

  // Real-Time Socket Event & Authority Notification
  emitToRole('officer', 'incident:new', safeMemCreated);
  notifyAuthorities('new_incident', 'New Incident Submitted', `Report [${safeMemCreated.trackingId}] ${safeMemCreated.title} reported at ${safeMemCreated.address}`, { incidentId: safeMemCreated.id, link: `/officer/incidents/${safeMemCreated.id}` }).catch(() => {});

  return safeMemCreated;
}


export async function getMyIncidents(reporterId: string): Promise<SafeIncident[]> {
  if (isMongoConnected()) {
    const docs = await Incident.find({ reporterId: new mongoose.Types.ObjectId(reporterId) })
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((d) => toSafeIncident(d));
  }

  // Memory fallback
  const results: SafeIncident[] = [];
  for (const inc of memoryIncidents.values()) {
    if (inc.reporterId === reporterId) {
      const history = memoryStatusHistory.filter((h) => h.incidentId === inc.id);
      const evidence = memoryEvidence.filter((e) => e.incidentId === inc.id);
      results.push(toSafeIncident(inc, history, evidence));
    }
  }

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getIncidentById(id: string, requester: AuthUser): Promise<SafeIncident | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const query: any = { _id: id };

    // SECURITY / IDOR: Citizens can ONLY view their own reports
    if (requester.role === 'citizen') {
      query.reporterId = new mongoose.Types.ObjectId(requester.id);
    }

    const doc = await Incident.findOne(query).exec();
    if (!doc) return null;

    const history = await StatusHistory.find({ incidentId: doc._id }).sort({ createdAt: 1 }).exec();
    const evidence = await Evidence.find({ incidentId: doc._id }).sort({ uploadedAt: -1 }).exec();

    return toSafeIncident(doc, history, evidence);
  }

  // Memory fallback
  const inc = memoryIncidents.get(id);
  if (!inc) return null;

  // SECURITY / IDOR: Citizens can ONLY view their own reports
  if (requester.role === 'citizen' && inc.reporterId !== requester.id) {
    return null;
  }

  const history = memoryStatusHistory.filter((h) => h.incidentId === inc.id);
  const evidence = memoryEvidence.filter((e) => e.incidentId === inc.id);

  return toSafeIncident(inc, history, evidence);
}

export async function addIncidentEvidence(
  incidentId: string,
  fileData: { fileUrl: string; originalFilename: string; mimeType: string; fileSizeMB: number },
  uploader: AuthUser
): Promise<SafeEvidence | null> {
  const incident = await getIncidentById(incidentId, uploader);
  if (!incident) return null;

  const now = new Date();

  if (isMongoConnected()) {
    const doc = await Evidence.create({
      incidentId: new mongoose.Types.ObjectId(incidentId),
      uploadedBy: new mongoose.Types.ObjectId(uploader.id),
      uploaderRole: uploader.role,
      fileUrl: fileData.fileUrl,
      originalFilename: fileData.originalFilename,
      mimeType: fileData.mimeType,
      fileSizeMB: fileData.fileSizeMB,
      isVisible: 'officer_only',
      uploadedAt: now,
    });

    await Incident.findByIdAndUpdate(incidentId, { $inc: { evidenceCount: 1 } });

    return {
      id: doc._id.toString(),
      incidentId,
      fileUrl: doc.fileUrl,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSizeMB: doc.fileSizeMB,
      uploadedAt: now.toISOString(),
    };
  }

  // Memory fallback
  const id = `ev-${Date.now()}`;
  const memEvidence = {
    id,
    incidentId,
    uploadedBy: uploader.id,
    uploaderRole: uploader.role,
    fileUrl: fileData.fileUrl,
    originalFilename: fileData.originalFilename,
    mimeType: fileData.mimeType,
    fileSizeMB: fileData.fileSizeMB,
    uploadedAt: now,
  };

  memoryEvidence.push(memEvidence);
  const inc = memoryIncidents.get(incidentId);
  if (inc) {
    inc.evidenceCount = (inc.evidenceCount || 0) + 1;
  }

  return {
    id,
    incidentId,
    fileUrl: fileData.fileUrl,
    originalFilename: fileData.originalFilename,
    mimeType: fileData.mimeType,
    fileSizeMB: fileData.fileSizeMB,
    uploadedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Phase 4: Interactive Map Geospatial Queries & Anonymization
// ---------------------------------------------------------------------------

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function toSafeMapIncident(doc: any): SafeMapIncident {
  const isVerified = doc.status === 'verified' || doc.status === 'resolved';
  const isCitizenReport = doc.status === 'submitted' || doc.status === 'under_review';

  // Privacy protection: strip individual apartment/room/flat numbers while preserving neighborhood/street
  const rawAddress = doc.address || 'General Area';
  const approximateAddress = rawAddress.replace(
    /^(flat|apt|apartment|house|room|unit)\s*#?\s*[a-z0-9\-]+,?\s*/i,
    ''
  );

  const desc = doc.description || '';
  const shortDescription = desc.length > 140 ? desc.substring(0, 137) + '...' : desc;
  const categorySlug = doc.categorySlug || (doc.categoryName ? doc.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'other');

  return {
    id: doc._id ? doc._id.toString() : doc.id,
    trackingId: doc.trackingId,
    title: doc.title,
    shortDescription,
    categoryName: doc.categoryName,
    categorySlug,
    categoryColor: doc.categoryColor || '#3B82F6',
    categoryIcon: doc.categoryIcon || 'AlertTriangle',
    status: doc.status,
    isVerified,
    isCitizenReport,
    severity: doc.severity || 2,
    location: {
      type: 'Point',
      coordinates: doc.location.coordinates, // [longitude, latitude]
    },
    approximateAddress,
    incidentDate: new Date(doc.incidentDate).toISOString(),
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

let hasSeededDemoIncidents = false;

export function seedInitialDemoIncidents(): void {
  if (hasSeededDemoIncidents && memoryIncidents.size >= 6) return;
  hasSeededDemoIncidents = true;

  const demoList = [
    {
      title: 'Bicycle Stolen from Metro Station Rack',
      description: 'A black hybrid commuter bicycle secured with a U-lock was removed from the designated bicycle stand between 9 AM and 5 PM.',
      categorySlug: 'theft',
      status: 'submitted',
      severity: 2,
      coordinates: [77.2185, 28.6315], // [lng, lat] near Connaught Place
      address: 'Rajiv Chowk Metro Station Gate 4, New Delhi',
      hoursAgo: 4,
    },
    {
      title: 'Commercial Burglary at Electronics Store',
      description: 'Break-in discovered by morning staff. Display cases smashed and inventory compromised. Investigating officer assigned.',
      categorySlug: 'theft',
      status: 'verified',
      severity: 4,
      coordinates: [77.2210, 28.6295],
      address: 'Inner Circle Block B, Connaught Place, New Delhi',
      hoursAgo: 16,
    },
    {
      title: 'Two-Vehicle Collision at Intersecting Signal',
      description: 'Sedan collided with delivery van during rain signal malfunction. Traffic management deployed and lane cleared.',
      categorySlug: 'traffic-incident',
      status: 'verified',
      severity: 3,
      coordinates: [77.2260, 28.6275],
      address: 'Barakhamba Road & Tolstoy Marg Crossing, New Delhi',
      hoursAgo: 28,
    },
    {
      title: 'Defacement of Public Monument Wall',
      description: 'Extensive spray paint graffiti observed on the stone masonry wall. Civic authorities notified for restoration.',
      categorySlug: 'vandalism',
      status: 'under_review',
      severity: 2,
      coordinates: [77.2195, 28.6330],
      address: 'Central Park Northern Perimeter, New Delhi',
      hoursAgo: 42,
    },
    {
      title: 'Suspicious Vehicle Idling Near School Grounds',
      description: 'Unattended dark SUV parked for several hours with obscured plates. Security patrol dispatched to examine vehicle.',
      categorySlug: 'suspicious-activity',
      status: 'submitted',
      severity: 2,
      coordinates: [77.2140, 28.6260],
      address: 'Janpath Lane near Modern School, New Delhi',
      hoursAgo: 12,
    },
    {
      title: 'ATM Skimming Device Identified & Removed',
      description: 'Bank technician detected an illicit magnetic stripe reader attached to the primary ATM vestibule. Forensics engaged.',
      categorySlug: 'cybercrime',
      status: 'verified',
      severity: 3,
      coordinates: [77.2115, 28.6300],
      address: 'Baba Kharak Singh Marg Financial Branch, New Delhi',
      hoursAgo: 65,
    },
    {
      title: 'Dispute & Physical Altercation Outside Dining Venue',
      description: 'Verbal dispute escalated to physical scuffle outside premises. Patrol unit responded, parties separated and incident resolved.',
      categorySlug: 'assault',
      status: 'resolved',
      severity: 3,
      coordinates: [77.2340, 28.6245],
      address: 'Mandi House Cultural Hub, New Delhi',
      hoursAgo: 90,
    },
    {
      title: 'Missing Elderly Citizen with Memory Impairment',
      description: 'Elderly individual wearing grey sweater and spectacles last observed walking eastward from park entrance at 10 AM.',
      categorySlug: 'missing-person',
      status: 'submitted',
      severity: 4,
      coordinates: [77.2005, 28.5915],
      address: 'Nehru Park Chanakyapuri, New Delhi',
      hoursAgo: 6,
    },
  ];

  for (const item of demoList) {
    const category = findCategoryBySlug(item.categorySlug);
    const id = new mongoose.Types.ObjectId().toString();
    const trackingId = `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const incidentDate = new Date(Date.now() - item.hoursAgo * 3600 * 1000);

    const record = {
      _id: id,
      id,
      trackingId,
      title: item.title,
      description: item.description,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      categoryColor: category.color,
      categoryIcon: category.icon,
      status: item.status,
      severity: item.severity,
      location: {
        type: 'Point',
        coordinates: item.coordinates as [number, number],
      },
      address: item.address,
      incidentDate,
      isAnonymous: false,
      isPublic: true,
      evidenceCount: 0,
      createdAt: incidentDate,
      updatedAt: incidentDate,
    };

    memoryIncidents.set(id, record);
  }
}

export async function getMapIncidents(filters: MapFiltersDTO): Promise<SafeMapIncident[]> {
  const limit = Math.min(filters.limit || 100, 200);

  // Parse time window filter
  let minDate: Date | null = null;
  if (filters.timeRange === '24h') {
    minDate = new Date(Date.now() - 24 * 3600 * 1000);
  } else if (filters.timeRange === '7d') {
    minDate = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  } else if (filters.timeRange === '30d') {
    minDate = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  }

  if (isMongoConnected()) {
    const query: any = {};

    // Filter by Category
    if (filters.category && filters.category !== 'all') {
      query.$or = [
        { categoryName: new RegExp(`^${filters.category}`, 'i') },
        { categorySlug: filters.category.toLowerCase() },
      ];
    }

    // Filter by Verification / Status
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'verified') {
        query.status = { $in: ['verified', 'resolved'] };
      } else if (filters.status === 'submitted' || filters.status === 'unverified') {
        query.status = { $in: ['submitted', 'under_review'] };
      } else {
        query.status = filters.status;
      }
    }

    // Filter by Date Range
    if (minDate) {
      query.incidentDate = { $gte: minDate };
    }

    // Spatial filter: Bounding Box or Radius
    if (filters.bbox && filters.bbox.length === 4) {
      const [minLng, minLat, maxLng, maxLat] = filters.bbox;
      query.location = {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      };
    } else if (filters.lat !== undefined && filters.lng !== undefined) {
      const radiusKm = filters.radiusKm || 20;
      query.location = {
        $geoWithin: {
          $centerSphere: [[filters.lng, filters.lat], radiusKm / 6378.1],
        },
      };
    }

    const docs = await Incident.find(query)
      .sort({ incidentDate: -1 })
      .limit(limit)
      .exec();

    return docs.map((d) => toSafeMapIncident(d));
  }

  // Memory Fallback: Ensure demo dataset is available
  seedInitialDemoIncidents();

  let results: any[] = Array.from(memoryIncidents.values());

  // Category filter
  if (filters.category && filters.category !== 'all') {
    const catSearch = filters.category.toLowerCase();
    results = results.filter(
      (inc) =>
        (inc.categorySlug && inc.categorySlug.toLowerCase() === catSearch) ||
        (inc.categoryName && inc.categoryName.toLowerCase().includes(catSearch))
    );
  }

  // Status / Verification filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'verified') {
      results = results.filter((inc) => inc.status === 'verified' || inc.status === 'resolved');
    } else if (filters.status === 'submitted' || filters.status === 'unverified') {
      results = results.filter((inc) => inc.status === 'submitted' || inc.status === 'under_review');
    } else {
      results = results.filter((inc) => inc.status === filters.status);
    }
  }

  // Date range filter
  if (minDate) {
    results = results.filter((inc) => new Date(inc.incidentDate) >= minDate);
  }

  // Spatial filter: Bounding Box
  if (filters.bbox && filters.bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = filters.bbox;
    results = results.filter((inc) => {
      const [lng, lat] = inc.location.coordinates;
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    });
  } else if (filters.lat !== undefined && filters.lng !== undefined) {
    const radiusKm = filters.radiusKm || 20;
    results = results.filter((inc) => {
      const [lng, lat] = inc.location.coordinates;
      return haversineDistanceKm(filters.lat!, filters.lng!, lat, lng) <= radiusKm;
    });
  }

  // Sort descending by incident date
  results.sort(
    (a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
  );

  return results.slice(0, limit).map((inc) => toSafeMapIncident(inc));
}

// ---------------------------------------------------------------------------
// Phase 5: Authority Dashboard & Incident Review
// ---------------------------------------------------------------------------

export async function getOfficerQueue(filters: OfficerQueueFilters = {}): Promise<{
  stats: OfficerQueueStats;
  incidents: SafeIncident[];
}> {
  if (isMongoConnected()) {
    // Calculate global queue statistics
    const [statsResult] = await Incident.aggregate([
      {
        $group: {
          _id: null,
          newSubmitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalActive: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$status', 'resolved'] }, { $ne: ['$status', 'rejected'] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats: OfficerQueueStats = statsResult
      ? {
          newSubmitted: statsResult.newSubmitted || 0,
          underReview: statsResult.underReview || 0,
          verified: statsResult.verified || 0,
          rejected: statsResult.rejected || 0,
          totalActive: statsResult.totalActive || 0,
        }
      : { newSubmitted: 0, underReview: 0, verified: 0, rejected: 0, totalActive: 0 };

    // Build filter query
    const query: any = {};
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters.category && filters.category !== 'all') {
      query.$or = [
        { categorySlug: filters.category.toLowerCase() },
        { categoryName: new RegExp(`^${filters.category}`, 'i') },
      ];
    }
    if (filters.severity && filters.severity > 0) {
      query.severity = { $gte: filters.severity };
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      query.$or = [
        { trackingId: new RegExp(q, 'i') },
        { title: new RegExp(q, 'i') },
        { address: new RegExp(q, 'i') },
        { reporterName: new RegExp(q, 'i') },
      ];
    }

    // Sort order
    let sortOptions: any = { incidentDate: -1 };
    if (filters.sortBy === 'severity_desc') {
      sortOptions = { severity: -1, incidentDate: -1 };
    } else if (filters.sortBy === 'date_asc') {
      sortOptions = { incidentDate: 1 };
    }

    const docs = await Incident.find(query).sort(sortOptions).limit(100).exec();
    const incidents = docs.map((d) => toSafeIncident(d));

    return { stats, incidents };
  }

  // Memory Fallback
  seedInitialDemoIncidents();

  const allIncidents = Array.from(memoryIncidents.values());

  const stats: OfficerQueueStats = {
    newSubmitted: allIncidents.filter((i) => i.status === 'submitted').length,
    underReview: allIncidents.filter((i) => i.status === 'under_review').length,
    verified: allIncidents.filter((i) => i.status === 'verified').length,
    rejected: allIncidents.filter((i) => i.status === 'rejected').length,
    totalActive: allIncidents.filter((i) => i.status !== 'resolved' && i.status !== 'rejected').length,
  };

  let filtered = [...allIncidents];

  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((i) => i.status === filters.status);
  }
  if (filters.category && filters.category !== 'all') {
    const cat = filters.category.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        (i.categorySlug && i.categorySlug.toLowerCase() === cat) ||
        (i.categoryName && i.categoryName.toLowerCase().includes(cat))
    );
  }
  if (filters.severity && filters.severity > 0) {
    filtered = filtered.filter((i) => (i.severity || 2) >= filters.severity!);
  }
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        (i.trackingId && i.trackingId.toLowerCase().includes(q)) ||
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.address && i.address.toLowerCase().includes(q)) ||
        (i.reporterName && i.reporterName.toLowerCase().includes(q))
    );
  }

  if (filters.sortBy === 'severity_desc') {
    filtered.sort((a, b) => (b.severity || 0) - (a.severity || 0) || new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime());
  } else if (filters.sortBy === 'date_asc') {
    filtered.sort((a, b) => new Date(a.incidentDate).getTime() - new Date(b.incidentDate).getTime());
  } else {
    filtered.sort((a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime());
  }

  const incidents = filtered.map((inc) => {
    const history = memoryStatusHistory.filter((h) => h.incidentId === inc.id);
    const evidence = memoryEvidence.filter((e) => e.incidentId === inc.id);
    return toSafeIncident(inc, history, evidence);
  });

  return { stats, incidents };
}

export async function getOfficerIncidentDetail(id: string): Promise<SafeIncident | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await Incident.findById(id).exec();
    if (!doc) return null;

    const history = await StatusHistory.find({ incidentId: doc._id }).sort({ createdAt: 1 }).exec();
    const evidence = await Evidence.find({ incidentId: doc._id }).sort({ uploadedAt: -1 }).exec();

    return toSafeIncident(doc, history, evidence);
  }

  seedInitialDemoIncidents();
  const inc = memoryIncidents.get(id);
  if (!inc) return null;

  const history = memoryStatusHistory.filter((h) => h.incidentId === inc.id);
  const evidence = memoryEvidence.filter((e) => e.incidentId === inc.id);

  return toSafeIncident(inc, history, evidence);
}

export async function reviewIncident(
  incidentId: string,
  data: OfficerReviewDTO,
  officer: AuthUser
): Promise<SafeIncident | null> {
  // Determine target status
  let newStatus: IncidentStatus;
  let defaultNote = '';

  if (data.action === 'start_review') {
    newStatus = 'under_review';
    defaultNote = 'Officer initiated formal investigation review';
  } else if (data.action === 'verify') {
    newStatus = 'verified';
    defaultNote = 'Incident verified as authentic by law enforcement officer';
  } else if (data.action === 'reject') {
    newStatus = 'rejected';
    defaultNote = data.reason || data.note || 'Report rejected due to insufficient evidence or duplicate submission';
  } else {
    return null;
  }

  const now = new Date();

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(incidentId)) return null;

    const doc = await Incident.findById(incidentId).exec();
    if (!doc) return null;

    const previousStatus = doc.status;

    // Create status history record
    await StatusHistory.create({
      incidentId: doc._id,
      previousStatus,
      newStatus,
      changedBy: new mongoose.Types.ObjectId(officer.id),
      changedByRole: officer.role,
      reason: data.reason,
      note: data.note || defaultNote,
      createdAt: now,
    });

    // Update incident status & flags
    doc.status = newStatus;
    doc.assignedOfficerId = new mongoose.Types.ObjectId(officer.id);
    if (newStatus === 'verified') {
      doc.isPublic = true;
    } else if (newStatus === 'rejected') {
      doc.isPublic = false;
      doc.rejectionReason = data.reason || data.note;
    }
    doc.updatedAt = now;
    await doc.save();

    const history = await StatusHistory.find({ incidentId: doc._id }).sort({ createdAt: 1 }).exec();
    const evidence = await Evidence.find({ incidentId: doc._id }).sort({ uploadedAt: -1 }).exec();

    const safeDoc = toSafeIncident(doc, history, evidence);

    // Real-Time Socket Updates
    emitToRole('officer', 'incident:updated', safeDoc);
    if (safeDoc.reporterId) {
      emitToUser(safeDoc.reporterId, 'incident:status_changed', {
        incidentId: safeDoc.id,
        trackingId: safeDoc.trackingId,
        status: safeDoc.status,
        note: data.note || defaultNote,
      });
      createNotification({
        recipientId: safeDoc.reporterId,
        type: 'status_changed',
        title: 'Incident Report Status Updated',
        body: `Your report [${safeDoc.trackingId}] status was updated to ${newStatus.toUpperCase()}: ${data.note || defaultNote}`,
        incidentId: safeDoc.id,
        link: `/citizen/reports/${safeDoc.id}`,
      }).catch(() => {});
    }
    if (safeDoc.status === 'verified') {
      broadcastPublic('map:incident_verified', {
        incidentId: safeDoc.id,
        trackingId: safeDoc.trackingId,
        title: safeDoc.title,
        location: safeDoc.location,
        categoryName: safeDoc.categoryName,
        incidentDate: safeDoc.incidentDate,
      });
    }

    return safeDoc;
  }

  // Memory Fallback
  seedInitialDemoIncidents();
  const inc = memoryIncidents.get(incidentId);
  if (!inc) return null;

  const previousStatus = inc.status;

  const historyEntry = {
    id: `hist-${Date.now()}`,
    incidentId: inc.id,
    previousStatus,
    newStatus,
    changedBy: officer.id,
    changedByRole: officer.role,
    reason: data.reason,
    note: data.note || defaultNote,
    createdAt: now,
  };
  memoryStatusHistory.push(historyEntry);

  inc.status = newStatus;
  inc.assignedOfficerId = officer.id;
  if (newStatus === 'verified') {
    inc.isPublic = true;
  } else if (newStatus === 'rejected') {
    inc.isPublic = false;
    inc.rejectionReason = data.reason || data.note;
  }
  inc.updatedAt = now;

  const history = memoryStatusHistory.filter((h) => h.incidentId === inc.id);
  const evidence = memoryEvidence.filter((e) => e.incidentId === inc.id);

  const safeMemDoc = toSafeIncident(inc, history, evidence);

  // Real-Time Socket Updates
  emitToRole('officer', 'incident:updated', safeMemDoc);
  if (safeMemDoc.reporterId) {
    emitToUser(safeMemDoc.reporterId, 'incident:status_changed', {
      incidentId: safeMemDoc.id,
      trackingId: safeMemDoc.trackingId,
      status: safeMemDoc.status,
      note: data.note || defaultNote,
    });
    createNotification({
      recipientId: safeMemDoc.reporterId,
      type: 'status_changed',
      title: 'Incident Report Status Updated',
      body: `Your report [${safeMemDoc.trackingId}] status was updated to ${newStatus.toUpperCase()}: ${data.note || defaultNote}`,
      incidentId: safeMemDoc.id,
      link: `/citizen/reports/${safeMemDoc.id}`,
    }).catch(() => {});
  }
  if (safeMemDoc.status === 'verified') {
    broadcastPublic('map:incident_verified', {
      incidentId: safeMemDoc.id,
      trackingId: safeMemDoc.trackingId,
      title: safeMemDoc.title,
      location: safeMemDoc.location,
      categoryName: safeMemDoc.categoryName,
      incidentDate: safeMemDoc.incidentDate,
    });
  }

  return safeMemDoc;
}

export async function updateIncidentStatusDirect(
  incidentId: string,
  newStatus: IncidentStatus,
  note: string,
  officerUser: AuthUser
): Promise<void> {
  const now = new Date();
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(incidentId)) return;
    const doc = await Incident.findById(incidentId).exec();
    if (doc) {
      const previousStatus = doc.status;
      doc.status = newStatus;
      if (newStatus === 'resolved') {
        doc.resolutionSummary = note;
      }
      doc.updatedAt = now;
      await doc.save();

      await StatusHistory.create({
        incidentId: doc._id,
        previousStatus,
        newStatus,
        changedBy: new mongoose.Types.ObjectId(officerUser.id),
        changedByRole: officerUser.role,
        note,
        createdAt: now,
      });

      const safeDoc = toSafeIncident(doc);
      emitToRole('officer', 'incident:updated', safeDoc);
      if (safeDoc.reporterId) {
        emitToUser(safeDoc.reporterId, 'incident:status_changed', {
          incidentId: safeDoc.id,
          trackingId: safeDoc.trackingId,
          status: newStatus,
          note,
        });
        createNotification({
          recipientId: safeDoc.reporterId,
          type: 'status_changed',
          title: 'Incident Report Status Updated',
          body: `Your report [${safeDoc.trackingId}] status was updated to ${newStatus.toUpperCase()}: ${note}`,
          incidentId: safeDoc.id,
          link: `/citizen/reports/${safeDoc.id}`,
        }).catch(() => {});
      }
    }
    return;
  }

  // Memory Fallback
  seedInitialDemoIncidents();
  const inc = memoryIncidents.get(incidentId);
  if (inc) {
    const previousStatus = inc.status;
    inc.status = newStatus;
    if (newStatus === 'resolved') {
      inc.resolutionSummary = note;
    }
    inc.updatedAt = now;

    const hist = {
      id: `hist-${Date.now()}`,
      incidentId: inc.id,
      previousStatus,
      newStatus,
      changedBy: officerUser.id,
      changedByRole: officerUser.role,
      note,
      createdAt: now,
    };
    memoryStatusHistory.push(hist);

    const safeMemDoc = toSafeIncident(inc, memoryStatusHistory.filter((h) => h.incidentId === inc.id));
    emitToRole('officer', 'incident:updated', safeMemDoc);
    if (safeMemDoc.reporterId) {
      emitToUser(safeMemDoc.reporterId, 'incident:status_changed', {
        incidentId: safeMemDoc.id,
        trackingId: safeMemDoc.trackingId,
        status: newStatus,
        note,
      });
      createNotification({
        recipientId: safeMemDoc.reporterId,
        type: 'status_changed',
        title: 'Incident Report Status Updated',
        body: `Your report [${safeMemDoc.trackingId}] status was updated to ${newStatus.toUpperCase()}: ${note}`,
        incidentId: safeMemDoc.id,
        link: `/citizen/reports/${safeMemDoc.id}`,
      }).catch(() => {});
    }
  }
}




