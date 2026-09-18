import mongoose from 'mongoose';
import { Message, IMessage } from '../models/Message.js';
import { Incident } from '../models/Incident.js';
import { emitToUser, broadcastPublic } from '../socket.js';
import { createNotification } from './notification.service.js';
import { getOfficers } from './user.service.js';

export interface SendMessageDTO {
  incidentId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  isInternalNote?: boolean;
}

export interface SafeMessage {
  id: string;
  incidentId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  isInternalNote: boolean;
  readAt?: string;
  createdAt: string;
}

// In-memory fallback
const memMessages: Map<string, any> = new Map();

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function toSafeMessage(m: any): SafeMessage {
  return {
    id: m._id ? m._id.toString() : m.id,
    incidentId: m.incidentId ? m.incidentId.toString() : '',
    senderId: m.senderId ? m.senderId.toString() : '',
    senderRole: m.senderRole,
    senderName: m.senderName,
    content: m.content,
    isInternalNote: !!m.isInternalNote,
    readAt: m.readAt ? new Date(m.readAt).toISOString() : undefined,
    createdAt: new Date(m.createdAt || Date.now()).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Get conversation messages for an incident
// citizenId = null means officer/admin — sees all public messages
// ---------------------------------------------------------------------------
export async function getConversation(
  incidentId: string,
  requesterId: string,
  requesterRole: string
): Promise<{ messages: SafeMessage[]; incidentId: string }> {
  const isAuthority = requesterRole === 'officer' || requesterRole === 'admin';

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(incidentId)) {
      return { messages: [], incidentId };
    }
    const incObjId = new mongoose.Types.ObjectId(incidentId);

    // Security: citizens can only see their own incident conversation
    if (!isAuthority) {
      const incident = await Incident.findById(incObjId).select('reporterId').lean();
      if (!incident || !incident.reporterId || incident.reporterId.toString() !== requesterId) {
        throw new Error('Access denied');
      }
    }

    const query: any = { incidentId: incObjId };
    // Citizens never see internal notes
    if (!isAuthority) {
      query.isInternalNote = false;
    }

    const docs = await Message.find(query).sort({ createdAt: 1 }).lean();
    return { messages: docs.map(toSafeMessage), incidentId };
  }

  // Memory fallback
  const msgs = Array.from(memMessages.values()).filter((m) => {
    if (m.incidentId !== incidentId) return false;
    if (!isAuthority && m.isInternalNote) return false;
    if (!isAuthority && m.incidentReporterId !== requesterId) return false;
    return true;
  });

  msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return { messages: msgs.map(toSafeMessage), incidentId };
}

// ---------------------------------------------------------------------------
// Send a message
// ---------------------------------------------------------------------------
export async function sendMessage(dto: SendMessageDTO): Promise<SafeMessage> {
  const now = new Date();

  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(dto.incidentId)) {
      throw new Error('Invalid incidentId');
    }

    const incObjId = new mongoose.Types.ObjectId(dto.incidentId);

    // Security: citizen can only message their own incident
    if (dto.senderRole === 'citizen') {
      const incident = await Incident.findById(incObjId).select('reporterId').lean();
      if (!incident || !incident.reporterId || incident.reporterId.toString() !== dto.senderId) {
        throw new Error('Access denied');
      }
    }

    const doc = await Message.create({
      incidentId: incObjId,
      senderId: new mongoose.Types.ObjectId(dto.senderId),
      senderRole: dto.senderRole,
      senderName: dto.senderName,
      content: dto.content.trim(),
      isInternalNote: !!dto.isInternalNote,
      createdAt: now,
    });

    const safe = toSafeMessage(doc);

    // Real-time push
    await notifyMessageParticipants(dto, safe, incObjId.toString());

    return safe;
  }

  // Memory fallback
  const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const memRecord = {
    id,
    incidentId: dto.incidentId,
    incidentReporterId: dto.senderId,
    senderId: dto.senderId,
    senderRole: dto.senderRole,
    senderName: dto.senderName,
    content: dto.content.trim(),
    isInternalNote: !!dto.isInternalNote,
    createdAt: now,
  };
  memMessages.set(id, memRecord);

  const safe = toSafeMessage(memRecord);
  await notifyMessageParticipants(dto, safe, dto.incidentId);
  return safe;
}

async function notifyMessageParticipants(
  dto: SendMessageDTO,
  safe: SafeMessage,
  incidentId: string
): Promise<void> {
  const isInternal = !!dto.isInternalNote;

  if (dto.senderRole === 'citizen') {
    // Notify all officers
    const officers = await getOfficers();
    for (const officer of officers) {
      emitToUser(officer.id, 'message:new', { ...safe, incidentId });
      if (!isInternal) {
        await createNotification({
          recipientId: officer.id,
          type: 'message_received',
          title: `New Message from Citizen`,
          body: `${dto.senderName}: "${dto.content.slice(0, 80)}${dto.content.length > 80 ? '…' : ''}"`,
          incidentId,
          link: `/officer/incidents/${incidentId}`,
        });
      }
    }
  } else {
    // Authority replied — notify the citizen (find incident owner)
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(incidentId)) {
      const incident = await Incident.findById(incidentId).select('reporterId reporterName').lean();
      if (incident && incident.reporterId && !isInternal) {
        const citizenId = incident.reporterId.toString();
        emitToUser(citizenId, 'message:new', { ...safe, incidentId });
        await createNotification({
          recipientId: citizenId,
          type: 'message_received',
          title: `Authority Response`,
          body: `${dto.senderName}: "${dto.content.slice(0, 80)}${dto.content.length > 80 ? '…' : ''}"`,
          incidentId,
          link: `/citizen/reports/${incidentId}`,
        });
      }
    }
  }
}
