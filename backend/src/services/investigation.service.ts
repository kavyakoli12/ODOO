import mongoose from 'mongoose';
import {
  Investigation,
  IInvestigation,
  InvestigationStatus,
  InvestigationPriority,
  IInternalNote,
  ITimelineEntry,
} from '../models/Investigation.js';
import { Incident, IncidentStatus } from '../models/Incident.js';
import { StatusHistory } from '../models/StatusHistory.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { findUserById, getOfficers, SafeUser } from './user.service.js';
import { getOfficerIncidentDetail, SafeIncident } from './incident.service.js';
import type { AuthUser } from '../middleware/auth.middleware.js';
import { emitToUser, emitToRole } from '../socket.js';
import { createNotification } from './notification.service.js';


export interface CreateInvestigationDTO {
  incidentId: string;
  title: string;
  description: string;
  priority?: InvestigationPriority;
  leadOfficerId?: string;
  initialNote?: string;
}

export interface AssignOfficerDTO {
  leadOfficerId: string;
  teamMemberIds?: string[];
}

export interface AddNoteDTO {
  content: string;
}

export interface UpdateStatusDTO {
  status: InvestigationStatus;
  resolutionNotes?: string;
}

export interface SafeInvestigation {
  id: string;
  caseNumber: string;
  incidentIds: string[];
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  leadOfficerId: string;
  leadOfficerName: string;
  teamMemberIds: string[];
  internalNotes: {
    id: string;
    authorId: string;
    authorName: string;
    authorBadge?: string;
    content: string;
    createdAt: string;
  }[];
  timeline: {
    id: string;
    action: string;
    description: string;
    officerId: string;
    officerName: string;
    createdAt: string;
  }[];
  resolutionNotes?: string;
  closedAt?: string;
  closedBy?: string;
  incident?: SafeIncident | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationStats {
  totalCases: number;
  openCases: number;
  activeCases: number;
  suspendedCases: number;
  closedCases: number;
  criticalCases: number;
}

export interface InvestigationFilters {
  status?: string;
  priority?: string;
  searchQuery?: string;
  officerId?: string;
}

// In-Memory Datastore Fallback
const memoryInvestigations = new Map<string, any>();
const memoryAuditLogs: any[] = [];
let caseCounter = 101;

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const num = caseCounter++;
  return `INV-${year}-${num.toString().padStart(5, '0')}`;
}

async function recordAudit(
  actor: AuthUser,
  action: string,
  entityId: string,
  summary: string
): Promise<void> {
  const now = new Date();
  if (isMongoConnected()) {
    try {
      await AuditLog.create({
        actorId: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        entityType: 'Investigation',
        entityId: mongoose.Types.ObjectId.isValid(entityId) ? new mongoose.Types.ObjectId(entityId) : undefined,
        summary,
        createdAt: now,
      });
      return;
    } catch (err) {
      console.warn('Failed to write Mongo AuditLog:', err);
    }
  }

  memoryAuditLogs.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entityType: 'Investigation',
    entityId,
    summary,
    createdAt: now,
  });
}

function toSafeInvestigation(doc: any, linkedIncident?: SafeIncident | null): SafeInvestigation {
  const id = doc._id ? doc._id.toString() : doc.id;
  const incidentIds = (doc.incidentIds || []).map((inc: any) =>
    inc._id ? inc._id.toString() : typeof inc === 'string' ? inc : inc.toString()
  );

  return {
    id,
    caseNumber: doc.caseNumber || `INV-2026-${id.slice(-5).toUpperCase()}`,
    incidentIds,
    title: doc.title,
    description: doc.description,
    status: doc.status || 'open',
    priority: doc.priority || 'medium',
    leadOfficerId: doc.leadOfficerId ? (doc.leadOfficerId._id ? doc.leadOfficerId._id.toString() : doc.leadOfficerId.toString()) : '',
    leadOfficerName: doc.leadOfficerName || (doc.leadOfficerId && doc.leadOfficerId.name ? doc.leadOfficerId.name : 'Unassigned'),
    teamMemberIds: (doc.teamMemberIds || []).map((m: any) => (m._id ? m._id.toString() : m.toString())),
    internalNotes: (doc.internalNotes || []).map((n: any) => ({
      id: n._id ? n._id.toString() : n.id || `note-${Date.now()}`,
      authorId: n.authorId ? (n.authorId._id ? n.authorId._id.toString() : n.authorId.toString()) : '',
      authorName: n.authorName || 'Officer',
      authorBadge: n.authorBadge,
      content: n.content,
      createdAt: new Date(n.createdAt || Date.now()).toISOString(),
    })),
    timeline: (doc.timeline || []).map((t: any) => ({
      id: t._id ? t._id.toString() : t.id || `timeline-${Date.now()}`,
      action: t.action,
      description: t.description,
      officerId: t.officerId ? (t.officerId._id ? t.officerId._id.toString() : t.officerId.toString()) : '',
      officerName: t.officerName || 'Officer',
      createdAt: new Date(t.createdAt || Date.now()).toISOString(),
    })),
    resolutionNotes: doc.resolutionNotes,
    closedAt: doc.closedAt ? new Date(doc.closedAt).toISOString() : undefined,
    closedBy: doc.closedBy ? (doc.closedBy._id ? doc.closedBy._id.toString() : doc.closedBy.toString()) : undefined,
    incident: linkedIncident || null,
    createdAt: new Date(doc.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(doc.updatedAt || Date.now()).toISOString(),
  };
}

let hasSeededDemoInvestigations = false;

export async function seedInitialDemoInvestigations(): Promise<void> {
  if (hasSeededDemoInvestigations && memoryInvestigations.size > 0) return;
  hasSeededDemoInvestigations = true;

  const officers = await getOfficers();
  const primaryOfficer = officers.find((o) => o.role === 'officer') || officers[0] || {
    id: 'off-demo-1',
    name: 'Officer Alex Miller',
    badgeNumber: 'LE-9042',
  };

  const initialCases = [
    {
      id: 'inv-case-001',
      caseNumber: 'INV-2026-00101',
      incidentIds: ['inc-demo-2'], // Commercial Burglary
      title: 'Commercial Burglary Syndicated Forensics',
      description: 'Systematic inventory theft at CP Inner Circle electronics store. Tracing security perimeter breach and illicit resale network.',
      status: 'active' as InvestigationStatus,
      priority: 'high' as InvestigationPriority,
      leadOfficerId: primaryOfficer.id,
      leadOfficerName: primaryOfficer.name,
      teamMemberIds: [],
      internalNotes: [
        {
          id: 'note-001',
          authorId: primaryOfficer.id,
          authorName: primaryOfficer.name,
          authorBadge: 'LE-9042',
          content: 'Surveillance tape retrieved from adjacent retail cameras. Two individuals in dark hoodies observed at 03:15 AM.',
          createdAt: new Date(Date.now() - 14 * 3600 * 1000),
        },
        {
          id: 'note-002',
          authorId: primaryOfficer.id,
          authorName: primaryOfficer.name,
          authorBadge: 'LE-9042',
          content: 'Fingerprint lifts taken from display counter B. Transmitted to state forensic laboratory for matching.',
          createdAt: new Date(Date.now() - 6 * 3600 * 1000),
        },
      ],
      timeline: [
        {
          id: 't-001',
          action: 'CASE_OPENED',
          description: 'Formal investigation initiated based on verified commercial burglary report.',
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 15 * 3600 * 1000),
        },
        {
          id: 't-002',
          action: 'OFFICER_ASSIGNED',
          description: `${primaryOfficer.name} assigned as Lead Investigating Officer.`,
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 15 * 3600 * 1000),
        },
        {
          id: 't-003',
          action: 'EVIDENCE_CATALOGED',
          description: 'CCTV footage and latent fingerprints entered into internal forensics locker.',
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 6 * 3600 * 1000),
        },
      ],
      createdAt: new Date(Date.now() - 15 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 6 * 3600 * 1000),
    },
    {
      id: 'inv-case-002',
      caseNumber: 'INV-2026-00102',
      incidentIds: ['inc-demo-6'], // ATM Skimming
      title: 'Financial Skimming Syndicate Ring Tracking',
      description: 'Physical skimmer and pinhole camera intercepted on Baba Kharak Singh Marg ATM vestibule. Multi-jurisdictional card cloning inquiry.',
      status: 'active' as InvestigationStatus,
      priority: 'critical' as InvestigationPriority,
      leadOfficerId: primaryOfficer.id,
      leadOfficerName: primaryOfficer.name,
      teamMemberIds: [],
      internalNotes: [
        {
          id: 'note-101',
          authorId: primaryOfficer.id,
          authorName: primaryOfficer.name,
          authorBadge: 'LE-9042',
          content: 'Hardware analyzer confirms skimmer possessed Bluetooth transmit functionality. Cyber unit isolating MAC broadcasts.',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000),
        },
      ],
      timeline: [
        {
          id: 't-101',
          action: 'CASE_OPENED',
          description: 'Critical cyber-forensics case initiated.',
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        },
        {
          id: 't-102',
          action: 'CYBER_FORENSICS_DISPATCH',
          description: 'Hardware transferred to cyber-crime unit for memory dump.',
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 24 * 3600 * 1000),
        },
      ],
      createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 24 * 3600 * 1000),
    },
    {
      id: 'inv-case-003',
      caseNumber: 'INV-2026-00103',
      incidentIds: ['inc-demo-7'], // Physical Altercation
      title: 'Mandi House Dining District Altercation Inquiry',
      description: 'Physical confrontation outside cultural hub premises. All parties interviewed and matter concluded.',
      status: 'closed' as InvestigationStatus,
      priority: 'medium' as InvestigationPriority,
      leadOfficerId: primaryOfficer.id,
      leadOfficerName: primaryOfficer.name,
      teamMemberIds: [],
      internalNotes: [
        {
          id: 'note-201',
          authorId: primaryOfficer.id,
          authorName: primaryOfficer.name,
          authorBadge: 'LE-9042',
          content: 'Both parties agreed to formal mediation. No ongoing threat to public safety.',
          createdAt: new Date(Date.now() - 80 * 3600 * 1000),
        },
      ],
      timeline: [
        {
          id: 't-201',
          action: 'CASE_OPENED',
          description: 'Investigation initiated from field officer report.',
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 88 * 3600 * 1000),
        },
        {
          id: 't-202',
          action: 'CASE_RESOLVED',
          description: 'Case formally closed. Mutual non-aggression pact recorded.',
          officerId: primaryOfficer.id,
          officerName: primaryOfficer.name,
          createdAt: new Date(Date.now() - 72 * 3600 * 1000),
        },
      ],
      resolutionNotes: 'Dispute mediated successfully by patrol officers. No injuries requiring hospitalization. Incident closed.',
      closedAt: new Date(Date.now() - 72 * 3600 * 1000),
      closedBy: primaryOfficer.id,
      createdAt: new Date(Date.now() - 88 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 72 * 3600 * 1000),
    },
  ];

  for (const c of initialCases) {
    memoryInvestigations.set(c.id, c);
  }
}

// ---------------------------------------------------------------------------
// 1. Create Investigation
// ---------------------------------------------------------------------------
export async function createInvestigation(
  data: CreateInvestigationDTO,
  officer: AuthUser
): Promise<SafeInvestigation> {
  const now = new Date();
  const caseNumber = generateCaseNumber();

  // Find lead officer details
  let leadOfficerId = data.leadOfficerId || officer.id;
  let leadOfficerName = officer.name;
  let leadBadge = officer.role === 'officer' ? 'LE-9042' : 'ADMIN';

  if (data.leadOfficerId && data.leadOfficerId !== officer.id) {
    const specifiedOfficer = await findUserById(data.leadOfficerId);
    if (specifiedOfficer) {
      leadOfficerName = specifiedOfficer.name;
      leadBadge = specifiedOfficer.badgeNumber || leadBadge;
    }
  }

  const initialTimeline: ITimelineEntry = {
    action: 'CASE_CREATED',
    description: `Investigation initiated by ${officer.name} (${officer.role.toUpperCase()})`,
    officerId: new mongoose.Types.ObjectId(officer.id.length === 24 ? officer.id : undefined) as any,
    officerName: officer.name,
    createdAt: now,
  };

  const initialNotes: IInternalNote[] = [];
  if (data.initialNote && data.initialNote.trim()) {
    initialNotes.push({
      authorId: new mongoose.Types.ObjectId(officer.id.length === 24 ? officer.id : undefined) as any,
      authorName: officer.name,
      authorBadge: leadBadge,
      content: data.initialNote.trim(),
      createdAt: now,
    });
  }

  const priority: InvestigationPriority = data.priority || 'medium';
  const status: InvestigationStatus = 'active';

  // MongoDB Implementation
  if (isMongoConnected()) {
    const newInvestigation = await Investigation.create({
      caseNumber,
      incidentIds: [new mongoose.Types.ObjectId(data.incidentId)],
      title: data.title.trim(),
      description: data.description.trim(),
      status,
      priority,
      leadOfficerId: new mongoose.Types.ObjectId(leadOfficerId),
      leadOfficerName,
      teamMemberIds: [],
      internalNotes: initialNotes,
      timeline: [initialTimeline],
    });

    // Update the linked Incident status and investigation link
    if (mongoose.Types.ObjectId.isValid(data.incidentId)) {
      const incident = await Incident.findById(data.incidentId).exec();
      if (incident) {
        const previousStatus = incident.status;
        incident.status = 'investigation_ongoing';
        incident.investigationId = newInvestigation._id;
        incident.assignedOfficerId = new mongoose.Types.ObjectId(leadOfficerId);
        incident.updatedAt = now;
        await incident.save();

        // Record status history on incident
        await StatusHistory.create({
          incidentId: incident._id,
          previousStatus,
          newStatus: 'investigation_ongoing',
          changedBy: new mongoose.Types.ObjectId(officer.id),
          changedByRole: officer.role,
          note: `Investigation opened: Case ${caseNumber} assigned to ${leadOfficerName}`,
          createdAt: now,
        });
      }
    }

    await recordAudit(
      officer,
      'INVESTIGATION_CREATED',
      newInvestigation._id.toString(),
      `Created case ${caseNumber} for incident ${data.incidentId}`
    );

    const linkedIncident = await getOfficerIncidentDetail(data.incidentId);
    const safeInv = toSafeInvestigation(newInvestigation, linkedIncident);

    // Real-Time Socket Event & Notification
    emitToRole('officer', 'investigation:new', safeInv);
    if (leadOfficerId) {
      createNotification({
        recipientId: leadOfficerId,
        type: 'investigation_assigned',
        title: 'Assigned to Investigation Case',
        body: `You were assigned as Lead Detective on Case ${safeInv.caseNumber}: ${safeInv.title}`,
        investigationId: safeInv.id,
        link: `/officer/investigations/${safeInv.id}`,
      }).catch(() => {});
    }

    return safeInv;
  }

  // Memory Fallback
  await seedInitialDemoInvestigations();

  const id = `inv-${Date.now()}`;
  const memoryRecord = {
    id,
    caseNumber,
    incidentIds: [data.incidentId],
    title: data.title.trim(),
    description: data.description.trim(),
    status,
    priority,
    leadOfficerId,
    leadOfficerName,
    teamMemberIds: [],
    internalNotes: initialNotes.map((n, i) => ({
      id: `note-${Date.now()}-${i}`,
      authorId: officer.id,
      authorName: n.authorName,
      authorBadge: n.authorBadge,
      content: n.content,
      createdAt: n.createdAt,
    })),
    timeline: [
      {
        id: `time-${Date.now()}`,
        action: initialTimeline.action,
        description: initialTimeline.description,
        officerId: officer.id,
        officerName: initialTimeline.officerName,
        createdAt: initialTimeline.createdAt,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  memoryInvestigations.set(id, memoryRecord);

  // Synchronize memory incident if present
  const linkedIncident = await getOfficerIncidentDetail(data.incidentId);
  if (linkedIncident) {
    linkedIncident.status = 'investigation_ongoing';
  }

  await recordAudit(
    officer,
    'INVESTIGATION_CREATED',
    id,
    `Created case ${caseNumber} for incident ${data.incidentId}`
  );

  const safeMemInv = toSafeInvestigation(memoryRecord, linkedIncident);

  // Real-Time Socket Event & Notification
  emitToRole('officer', 'investigation:new', safeMemInv);
  if (leadOfficerId) {
    createNotification({
      recipientId: leadOfficerId,
      type: 'investigation_assigned',
      title: 'Assigned to Investigation Case',
      body: `You were assigned as Lead Detective on Case ${safeMemInv.caseNumber}: ${safeMemInv.title}`,
      investigationId: safeMemInv.id,
      link: `/officer/investigations/${safeMemInv.id}`,
    }).catch(() => {});
  }

  return safeMemInv;
}


// ---------------------------------------------------------------------------
// 2. Get Investigations with Filters and Stats
// ---------------------------------------------------------------------------
export async function getInvestigations(filters: InvestigationFilters = {}): Promise<{
  stats: InvestigationStats;
  investigations: SafeInvestigation[];
}> {
  if (isMongoConnected()) {
    // Aggregation for global metrics
    const [statsResult] = await Investigation.aggregate([
      {
        $group: {
          _id: null,
          totalCases: { $sum: 1 },
          openCases: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          activeCases: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          suspendedCases: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          closedCases: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          criticalCases: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
        },
      },
    ]);

    const stats: InvestigationStats = statsResult
      ? {
          totalCases: statsResult.totalCases || 0,
          openCases: statsResult.openCases || 0,
          activeCases: statsResult.activeCases || 0,
          suspendedCases: statsResult.suspendedCases || 0,
          closedCases: statsResult.closedCases || 0,
          criticalCases: statsResult.criticalCases || 0,
        }
      : {
          totalCases: 0,
          openCases: 0,
          activeCases: 0,
          suspendedCases: 0,
          closedCases: 0,
          criticalCases: 0,
        };

    // Build filter query
    const query: any = {};
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }
    if (filters.officerId && mongoose.Types.ObjectId.isValid(filters.officerId)) {
      query.leadOfficerId = new mongoose.Types.ObjectId(filters.officerId);
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      query.$or = [
        { caseNumber: new RegExp(q, 'i') },
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { leadOfficerName: new RegExp(q, 'i') },
      ];
    }

    const docs = await Investigation.find(query)
      .sort({ updatedAt: -1 })
      .limit(100)
      .exec();

    // Map each to SafeInvestigation with light linked incident preview
    const investigations = await Promise.all(
      docs.map(async (doc) => {
        let linkedIncident: SafeIncident | null = null;
        if (doc.incidentIds && doc.incidentIds.length > 0) {
          const incId = doc.incidentIds[0].toString();
          linkedIncident = await getOfficerIncidentDetail(incId);
        }
        return toSafeInvestigation(doc, linkedIncident);
      })
    );

    return { stats, investigations };
  }

  // Memory Fallback
  await seedInitialDemoInvestigations();

  const allCases = Array.from(memoryInvestigations.values());

  const stats: InvestigationStats = {
    totalCases: allCases.length,
    openCases: allCases.filter((c) => c.status === 'open').length,
    activeCases: allCases.filter((c) => c.status === 'active').length,
    suspendedCases: allCases.filter((c) => c.status === 'suspended').length,
    closedCases: allCases.filter((c) => c.status === 'closed').length,
    criticalCases: allCases.filter((c) => c.priority === 'critical').length,
  };

  let filtered = [...allCases];

  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((c) => c.status === filters.status);
  }
  if (filters.priority && filters.priority !== 'all') {
    filtered = filtered.filter((c) => c.priority === filters.priority);
  }
  if (filters.officerId) {
    filtered = filtered.filter((c) => c.leadOfficerId === filters.officerId);
  }
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (c) =>
        (c.caseNumber && c.caseNumber.toLowerCase().includes(q)) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.leadOfficerName && c.leadOfficerName.toLowerCase().includes(q))
    );
  }

  filtered.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const investigations = await Promise.all(
    filtered.map(async (c) => {
      let linkedIncident: SafeIncident | null = null;
      if (c.incidentIds && c.incidentIds.length > 0) {
        linkedIncident = await getOfficerIncidentDetail(c.incidentIds[0]);
      }
      return toSafeInvestigation(c, linkedIncident);
    })
  );

  return { stats, investigations };
}

// ---------------------------------------------------------------------------
// 3. Get Single Investigation Detail
// ---------------------------------------------------------------------------
export async function getInvestigationById(id: string): Promise<SafeInvestigation | null> {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await Investigation.findById(id).exec();
    if (!doc) return null;

    let linkedIncident: SafeIncident | null = null;
    if (doc.incidentIds && doc.incidentIds.length > 0) {
      linkedIncident = await getOfficerIncidentDetail(doc.incidentIds[0].toString());
    }

    return toSafeInvestigation(doc, linkedIncident);
  }

  // Memory Fallback
  await seedInitialDemoInvestigations();
  const c = memoryInvestigations.get(id);
  if (!c) return null;

  let linkedIncident: SafeIncident | null = null;
  if (c.incidentIds && c.incidentIds.length > 0) {
    linkedIncident = await getOfficerIncidentDetail(c.incidentIds[0]);
  }

  return toSafeInvestigation(c, linkedIncident);
}

// ---------------------------------------------------------------------------
// 4. Assign Officer to Investigation
// ---------------------------------------------------------------------------
export async function assignOfficer(
  id: string,
  data: AssignOfficerDTO,
  officerUser: AuthUser
): Promise<SafeInvestigation | null> {
  const now = new Date();

  // Find target officer details
  const targetOfficer = await findUserById(data.leadOfficerId);
  const targetName = targetOfficer ? targetOfficer.name : 'Officer';
  const targetBadge = targetOfficer?.badgeNumber || 'LE-UNKNOWN';

  const timelineEntry: ITimelineEntry = {
    action: 'OFFICER_REASSIGNED',
    description: `Lead officer assigned to ${targetName} (Badge: ${targetBadge}) by ${officerUser.name}`,
    officerId: new mongoose.Types.ObjectId(officerUser.id.length === 24 ? officerUser.id : undefined) as any,
    officerName: officerUser.name,
    createdAt: now,
  };

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await Investigation.findById(id).exec();
    if (!doc) return null;

    doc.leadOfficerId = new mongoose.Types.ObjectId(data.leadOfficerId);
    doc.leadOfficerName = targetName;
    if (data.teamMemberIds) {
      doc.teamMemberIds = data.teamMemberIds
        .filter((mid) => mongoose.Types.ObjectId.isValid(mid))
        .map((mid) => new mongoose.Types.ObjectId(mid));
    }
    doc.timeline.push(timelineEntry);
    doc.updatedAt = now;
    await doc.save();

    // Also update linked incident's assignedOfficerId
    if (doc.incidentIds && doc.incidentIds.length > 0) {
      await Incident.updateMany(
        { _id: { $in: doc.incidentIds } },
        { $set: { assignedOfficerId: doc.leadOfficerId, updatedAt: now } }
      );
    }

    await recordAudit(
      officerUser,
      'OFFICER_ASSIGNED',
      doc._id.toString(),
      `Assigned ${targetName} to case ${doc.caseNumber}`
    );

    let linkedIncident: SafeIncident | null = null;
    if (doc.incidentIds && doc.incidentIds.length > 0) {
      linkedIncident = await getOfficerIncidentDetail(doc.incidentIds[0].toString());
    }

    const safeDoc = toSafeInvestigation(doc, linkedIncident);
    emitToRole('officer', 'investigation:updated', safeDoc);
    createNotification({
      recipientId: data.leadOfficerId,
      type: 'investigation_assigned',
      title: 'Assigned to Investigation Case',
      body: `You were assigned as Lead Detective on Case ${safeDoc.caseNumber}: ${safeDoc.title}`,
      investigationId: safeDoc.id,
      link: `/officer/investigations/${safeDoc.id}`,
    }).catch(() => {});

    return safeDoc;
  }

  // Memory Fallback
  await seedInitialDemoInvestigations();
  const c = memoryInvestigations.get(id);
  if (!c) return null;

  c.leadOfficerId = data.leadOfficerId;
  c.leadOfficerName = targetName;
  if (data.teamMemberIds) {
    c.teamMemberIds = data.teamMemberIds;
  }
  c.timeline.push({
    id: `time-${Date.now()}`,
    action: timelineEntry.action,
    description: timelineEntry.description,
    officerId: officerUser.id,
    officerName: officerUser.name,
    createdAt: now,
  });
  c.updatedAt = now;

  await recordAudit(
    officerUser,
    'OFFICER_ASSIGNED',
    id,
    `Assigned ${targetName} to case ${c.caseNumber}`
  );

  let linkedIncident: SafeIncident | null = null;
  if (c.incidentIds && c.incidentIds.length > 0) {
    linkedIncident = await getOfficerIncidentDetail(c.incidentIds[0]);
  }

  const safeMem = toSafeInvestigation(c, linkedIncident);
  emitToRole('officer', 'investigation:updated', safeMem);
  createNotification({
    recipientId: data.leadOfficerId,
    type: 'investigation_assigned',
    title: 'Assigned to Investigation Case',
    body: `You were assigned as Lead Detective on Case ${safeMem.caseNumber}: ${safeMem.title}`,
    investigationId: safeMem.id,
    link: `/officer/investigations/${safeMem.id}`,
  }).catch(() => {});

  return safeMem;
}


// ---------------------------------------------------------------------------
// 5. Add Internal Confidential Note
// ---------------------------------------------------------------------------
export async function addInternalNote(
  id: string,
  data: AddNoteDTO,
  officerUser: AuthUser
): Promise<SafeInvestigation | null> {
  const now = new Date();
  const authorBadge = officerUser.role === 'officer' ? 'LE-9042' : 'ADMIN';

  const noteEntry = {
    authorId: new mongoose.Types.ObjectId(officerUser.id.length === 24 ? officerUser.id : undefined) as any,
    authorName: officerUser.name,
    authorBadge,
    content: data.content.trim(),
    createdAt: now,
  };

  const timelineEntry: ITimelineEntry = {
    action: 'NOTE_RECORDED',
    description: `Confidential internal note logged by ${officerUser.name}`,
    officerId: new mongoose.Types.ObjectId(officerUser.id.length === 24 ? officerUser.id : undefined) as any,
    officerName: officerUser.name,
    createdAt: now,
  };

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await Investigation.findById(id).exec();
    if (!doc) return null;

    doc.internalNotes.push(noteEntry as any);
    doc.timeline.push(timelineEntry);
    doc.updatedAt = now;
    await doc.save();

    await recordAudit(
      officerUser,
      'NOTE_ADDED',
      doc._id.toString(),
      `Added internal case note to ${doc.caseNumber}`
    );

    let linkedIncident: SafeIncident | null = null;
    if (doc.incidentIds && doc.incidentIds.length > 0) {
      linkedIncident = await getOfficerIncidentDetail(doc.incidentIds[0].toString());
    }

    return toSafeInvestigation(doc, linkedIncident);
  }

  // Memory Fallback
  await seedInitialDemoInvestigations();
  const c = memoryInvestigations.get(id);
  if (!c) return null;

  c.internalNotes.push({
    id: `note-${Date.now()}`,
    authorId: officerUser.id,
    authorName: officerUser.name,
    authorBadge,
    content: data.content.trim(),
    createdAt: now,
  });
  c.timeline.push({
    id: `time-${Date.now()}`,
    action: timelineEntry.action,
    description: timelineEntry.description,
    officerId: officerUser.id,
    officerName: officerUser.name,
    createdAt: now,
  });
  c.updatedAt = now;

  await recordAudit(
    officerUser,
    'NOTE_ADDED',
    id,
    `Added internal case note to ${c.caseNumber}`
  );

  let linkedIncident: SafeIncident | null = null;
  if (c.incidentIds && c.incidentIds.length > 0) {
    linkedIncident = await getOfficerIncidentDetail(c.incidentIds[0]);
  }

  return toSafeInvestigation(c, linkedIncident);
}

// ---------------------------------------------------------------------------
// 6. Update Investigation Status & Resolution
// ---------------------------------------------------------------------------
export async function updateInvestigationStatus(
  id: string,
  data: UpdateStatusDTO,
  officerUser: AuthUser
): Promise<SafeInvestigation | null> {
  const now = new Date();
  const isClosing = data.status === 'closed';

  const timelineEntry: ITimelineEntry = {
    action: isClosing ? 'CASE_RESOLVED' : 'STATUS_CHANGED',
    description: isClosing
      ? `Case marked closed/resolved by ${officerUser.name}. Resolution: ${data.resolutionNotes || 'Findings concluded.'}`
      : `Status changed to ${data.status.toUpperCase()} by ${officerUser.name}`,
    officerId: new mongoose.Types.ObjectId(officerUser.id.length === 24 ? officerUser.id : undefined) as any,
    officerName: officerUser.name,
    createdAt: now,
  };

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await Investigation.findById(id).exec();
    if (!doc) return null;

    const previousStatus = doc.status;
    doc.status = data.status;
    doc.timeline.push(timelineEntry);
    doc.updatedAt = now;

    if (isClosing) {
      doc.closedAt = now;
      doc.closedBy = new mongoose.Types.ObjectId(officerUser.id);
      doc.resolutionNotes = data.resolutionNotes || 'Investigation formally concluded.';

      // Synchronize linked incident status to 'resolved'
      if (doc.incidentIds && doc.incidentIds.length > 0) {
        for (const incId of doc.incidentIds) {
          const inc = await Incident.findById(incId).exec();
          if (inc) {
            const incPrevStatus = inc.status;
            inc.status = 'resolved';
            inc.resolutionSummary = doc.resolutionNotes;
            inc.updatedAt = now;
            await inc.save();

            // StatusHistory entry
            await StatusHistory.create({
              incidentId: inc._id,
              previousStatus: incPrevStatus,
              newStatus: 'resolved',
              changedBy: new mongoose.Types.ObjectId(officerUser.id),
              changedByRole: officerUser.role,
              note: `Case ${doc.caseNumber} resolved: ${doc.resolutionNotes}`,
              createdAt: now,
            });
          }
        }
      }
    }

    await doc.save();

    await recordAudit(
      officerUser,
      isClosing ? 'INVESTIGATION_RESOLVED' : 'STATUS_CHANGED',
      doc._id.toString(),
      `Investigation ${doc.caseNumber} status changed from ${previousStatus} to ${data.status}`
    );

    let linkedIncident: SafeIncident | null = null;
    if (doc.incidentIds && doc.incidentIds.length > 0) {
      linkedIncident = await getOfficerIncidentDetail(doc.incidentIds[0].toString());
    }

    return toSafeInvestigation(doc, linkedIncident);
  }

  // Memory Fallback
  await seedInitialDemoInvestigations();
  const c = memoryInvestigations.get(id);
  if (!c) return null;

  const previousStatus = c.status;
  c.status = data.status;
  c.timeline.push({
    id: `time-${Date.now()}`,
    action: timelineEntry.action,
    description: timelineEntry.description,
    officerId: officerUser.id,
    officerName: officerUser.name,
    createdAt: now,
  });
  c.updatedAt = now;

  if (isClosing) {
    c.closedAt = now;
    c.closedBy = officerUser.id;
    c.resolutionNotes = data.resolutionNotes || 'Investigation formally concluded.';

    // Synchronize memory incident
    if (c.incidentIds && c.incidentIds.length > 0) {
      const linkedIncident = await getOfficerIncidentDetail(c.incidentIds[0]);
      if (linkedIncident) {
        linkedIncident.status = 'resolved';
      }
    }
  }

  await recordAudit(
    officerUser,
    isClosing ? 'INVESTIGATION_RESOLVED' : 'STATUS_CHANGED',
    id,
    `Investigation ${c.caseNumber} status changed from ${previousStatus} to ${data.status}`
  );

  let linkedIncident: SafeIncident | null = null;
  if (c.incidentIds && c.incidentIds.length > 0) {
    linkedIncident = await getOfficerIncidentDetail(c.incidentIds[0]);
  }

  return toSafeInvestigation(c, linkedIncident);
}
