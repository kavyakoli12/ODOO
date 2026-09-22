import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { SafeEscortSession } from './models/SafeEscortSession.js';

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
}

export interface ActiveEscortData {
  sessionId: string;
  socketId: string;
  userId?: string;
  citizenName: string;
  contactPhone?: string;
  zoneId: string;
  zoneName: string;
  centerCoordinates: [number, number]; // [lng, lat]
  zoneRadiusMeters: number;
  currentCoordinates: [number, number]; // [lng, lat]
  status: 'monitoring' | 'stoppage_warning' | 'distress' | 'completed' | 'cancelled';
  lastMovementAt: string;
  startedAt: string;
  speed: number;
  breadcrumbs: Array<{ coordinates: [number, number]; timestamp: string; speed?: number }>;
  officerNotes?: string;
  dispatchedUnit?: string;
}

const activeEscorts = new Map<string, ActiveEscortData>();

export function getActiveEscorts(): ActiveEscortData[] {
  return Array.from(activeEscorts.values()).filter((e) => e.status !== 'completed' && e.status !== 'cancelled');
}

let ioInstance: SocketIOServer | null = null;

/**
 * Normalizes coordinates to GeoJSON format: [lng, lat]
 */
export function normalizeGeoJsonCoords(coords: any): [number, number] {
  if (Array.isArray(coords) && coords.length === 2) {
    const [a, b] = coords.map(Number);
    if (!isNaN(a) && !isNaN(b)) {
      // In India: lat is 8-37, lng is 68-97
      if (Math.abs(a) <= 40 && Math.abs(b) > 40) {
        return [b, a]; // a was lat, b was lng -> return [lng, lat]
      }
      return [a, b];
    }
  }
  return [72.5714, 23.0225]; // Ahmedabad default [lng, lat]
}

export async function registerActiveEscort(payload: any, socketId: string = ''): Promise<ActiveEscortData> {
  const sessionId = payload.sessionId || `ESC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const citizenName = payload.citizenName || payload.user?.name || 'Jane Citizen';

  const rawCoords = payload.currentCoordinates || payload.currentLocation?.coordinates || payload.centerCoordinates;
  const coords = normalizeGeoJsonCoords(rawCoords);
  const centerCoords = normalizeGeoJsonCoords(payload.centerCoordinates || coords);
  const zoneRadius = Number(payload.zoneRadiusMeters || payload.radiusMeters) || 1000;

  const sessionData: ActiveEscortData = {
    sessionId,
    socketId,
    userId: payload.user?.id || payload.userId,
    citizenName,
    contactPhone: payload.contactPhone || '',
    zoneId: payload.zoneId || `zone-${Date.now()}`,
    zoneName: payload.zoneName || 'Safe Corridor',
    centerCoordinates: centerCoords,
    zoneRadiusMeters: zoneRadius,
    currentCoordinates: coords,
    status: 'monitoring',
    lastMovementAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    speed: 0,
    breadcrumbs: [{ coordinates: coords, timestamp: new Date().toISOString(), speed: 0 }],
  };

  activeEscorts.set(sessionId, sessionData);

  // Broadcast to all active patrol officers & control room
  emitToRole('officer', 'escort:officer_new', sessionData);
  if (ioInstance) {
    ioInstance.emit('escort:officer_new', sessionData);
  }
  console.log(`🛡️ [SafeEscort] Session registered: ${sessionId} for ${citizenName} in ${sessionData.zoneName}`);

  try {
    await SafeEscortSession.create({
      sessionId,
      userId: sessionData.userId,
      citizenName,
      contactPhone: payload.contactPhone,
      zoneId: sessionData.zoneId,
      zoneName: sessionData.zoneName,
      centerCoordinates: sessionData.centerCoordinates,
      zoneRadiusMeters: sessionData.zoneRadiusMeters,
      currentCoordinates: coords,
      status: 'monitoring',
      breadcrumbs: [{ coordinates: coords, timestamp: new Date(), speed: 0 }],
    });
  } catch {}

  return sessionData;
}

export function recordActiveEscortMovement(
  sessionId: string,
  rawCoords: any,
  speed: number = 0,
  heading?: number
): ActiveEscortData | null {
  const session = activeEscorts.get(sessionId);
  if (!session) return null;

  const coords = normalizeGeoJsonCoords(rawCoords);
  const now = new Date().toISOString();
  session.currentCoordinates = coords;
  session.speed = speed;
  session.lastMovementAt = now;

  session.breadcrumbs.push({
    coordinates: coords,
    timestamp: now,
    speed,
  });
  if (session.breadcrumbs.length > 60) {
    session.breadcrumbs.shift();
  }

  if (session.status === 'stoppage_warning') {
    session.status = 'monitoring';
  }

  const payload = {
    sessionId: session.sessionId,
    currentCoordinates: session.currentCoordinates,
    speed: session.speed,
    heading,
    lastMovementAt: session.lastMovementAt,
    status: session.status,
  };

  emitToRole('officer', 'escort:officer_movement', payload);
  if (ioInstance) {
    ioInstance.emit('escort:officer_movement', payload);
  }

  SafeEscortSession.updateOne(
    { sessionId },
    {
      $set: {
        currentCoordinates: coords,
        speed,
        lastMovementAt: new Date(),
        status: session.status,
      },
      $push: {
        breadcrumbs: {
          $each: [{ coordinates: coords, timestamp: new Date(), speed }],
          $slice: -60,
        },
      },
    }
  ).catch(() => {});

  return session;
}

export function recordActiveEscortStatus(
  sessionId: string,
  status: 'monitoring' | 'stoppage_warning' | 'distress',
  reason?: string
): ActiveEscortData | null {
  const session = activeEscorts.get(sessionId);
  if (!session) return null;

  session.status = status;
  if (status === 'monitoring') {
    session.lastMovementAt = new Date().toISOString();
  }

  const payload = {
    sessionId,
    citizenName: session.citizenName,
    contactPhone: session.contactPhone,
    zoneName: session.zoneName,
    currentCoordinates: session.currentCoordinates,
    status,
    reason: reason || '',
    timestamp: new Date().toISOString(),
  };

  if (status === 'stoppage_warning') {
    emitToRole('officer', 'escort:officer_stoppage_warning', payload);
    if (ioInstance) ioInstance.emit('escort:officer_stoppage_warning', payload);
    console.warn(`⚠️ [SafeEscort] Citizen stoppage alert: ${sessionId} in ${session.zoneName}`);
  } else if (status === 'distress') {
    emitToRole('officer', 'escort:officer_distress_alert', payload);
    if (ioInstance) ioInstance.emit('escort:officer_distress_alert', payload);
    broadcastPublic('emergency:alarm', {
      title: 'Safe Corridor Distress Alert',
      message: `Distress beacon triggered in ${session.zoneName}. Patrol response dispatched.`,
    });
    console.error(`🚨 [SafeEscort] CRITICAL DISTRESS: ${sessionId} in ${session.zoneName}!`);
  } else {
    emitToRole('officer', 'escort:officer_status_update', payload);
    if (ioInstance) ioInstance.emit('escort:officer_status_update', payload);
    console.log(`✅ [SafeEscort] Citizen checked in safe: ${sessionId}`);
  }

  SafeEscortSession.updateOne(
    { sessionId },
    { $set: { status, officerNotes: reason ? `[${status}] ${reason}` : undefined } }
  ).catch(() => {});

  return session;
}

export function endActiveEscort(sessionId: string): boolean {
  const session = activeEscorts.get(sessionId);
  if (!session) return false;

  const endedAt = new Date().toISOString();
  const payload = {
    sessionId,
    zoneName: session.zoneName,
    status: 'completed',
    endedAt,
  };

  emitToRole('officer', 'escort:officer_cleared', payload);
  if (ioInstance) ioInstance.emit('escort:officer_cleared', payload);

  console.log(`🏁 [SafeEscort] Session cleared: ${sessionId} exited ${session.zoneName}`);
  activeEscorts.delete(sessionId);

  SafeEscortSession.updateOne(
    { sessionId },
    { $set: { status: 'completed', endedAt: new Date() } }
  ).catch(() => {});

  return true;
}

export function initSocketServer(io: SocketIOServer): void {
  ioInstance = io;

  // JWT Authentication Middleware for WebSockets
  io.use((socket: Socket, next) => {
    let token: string | undefined;

    // 1. Try auth object
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    // 2. Try Authorization header
    else if (socket.handshake.headers.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        token = parts[1];
      }
    }
    // 3. Try query string
    else if (socket.handshake.query && typeof socket.handshake.query.token === 'string') {
      token = socket.handshake.query.token;
    }

    if (!token) {
      // Allow unauthenticated guest connections to public channel only
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      socket.data.user = {
        id: decoded.id || decoded.userId || decoded.sub,
        email: decoded.email,
        name: decoded.name || 'User',
        role: decoded.role || 'citizen',
      } as AuthenticatedSocketUser;

      return next();
    } catch (err: any) {
      console.warn(`🔌 [Socket.IO] Auth verification warning for socket ${socket.id}:`, err.message);
      // Still proceed as guest on token expiry/invalidity without crashing connection
      return next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: AuthenticatedSocketUser | undefined = socket.data.user;

    // Join public community alerts room
    socket.join('public:alerts');

    if (user) {
      // Secure private user room (isolated to this user ID)
      socket.join(`user:${user.id}`);
      console.log(`🔌 [Socket.IO] Authenticated user joined: ${user.name} (${user.role}) -> user:${user.id}`);

      // Authority rooms
      if (user.role === 'officer' || user.role === 'admin') {
        socket.join('role:officer');
        if (user.role === 'admin') {
          socket.join('role:admin');
        }
      }
    } else {
      console.log(`🔌 [Socket.IO] Guest connection established: ${socket.id}`);
    }

    // Ping / Heartbeat event
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Phase 8: Join/leave per-incident conversation rooms
    socket.on('conversation:join', ({ conversationId }: { conversationId: string }) => {
      if (user && conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('conversation:leave', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // -------------------------------------------------------------------------
    // Phase 11: Trinetra Safe Passage (Virtual Escort & Dead-Man's Timer in Red Zones)
    // -------------------------------------------------------------------------

    // Officer on /officer/escorts joins live radar room and receives sync
    socket.on('officer:join_radar', () => {
      socket.join('role:officer');
      const active = getActiveEscorts();
      socket.emit('escort:radar_sync', active);
      console.log(`📡 [SafeEscort] Socket ${socket.id} joined live radar room (active: ${active.length})`);
    });

    // 1. Citizen starts escort when entering red zone
    socket.on('escort:start', async (payload: any) => {
      const sessionData = await registerActiveEscort(payload, socket.id);
      socket.join(`escort:${sessionData.sessionId}`);
      // Notify citizen of confirmed session ID
      socket.emit('escort:session_started', sessionData);
    });

    // 2. Citizen transmits live location updates while moving
    socket.on('escort:location', (payload: {
      sessionId: string;
      currentCoordinates: [number, number];
      speed?: number;
      heading?: number;
    }) => {
      recordActiveEscortMovement(payload.sessionId, payload.currentCoordinates, payload.speed, payload.heading);
    });

    // 3. Dead-Man's Timer: Stoppage warning triggered (still in zone for > 4 mins)
    socket.on('escort:stoppage_warning', (payload: { sessionId: string }) => {
      recordActiveEscortStatus(payload.sessionId, 'stoppage_warning');
    });

    // 4. Dead-Man's Timer: Citizen confirms "I Am Safe"
    socket.on('escort:checkin_safe', (payload: { sessionId: string }) => {
      recordActiveEscortStatus(payload.sessionId, 'monitoring', 'Citizen confirmed safe check-in');
    });

    // 5. Dead-Man's Timer: No response within 60s OR manual SOS pressed
    socket.on('escort:distress', (payload: { sessionId: string; reason?: string }) => {
      recordActiveEscortStatus(
        payload.sessionId,
        'distress',
        payload.reason || "Dead-Man's timer expired without check-in"
      );
    });

    // 6. Citizen exits red zone perimeter -> Auto-stop tracking
    socket.on('escort:exit_zone', (payload: { sessionId: string }) => {
      endActiveEscort(payload.sessionId);
      socket.emit('escort:session_completed', {
        sessionId: payload.sessionId,
        message: 'You have safely cleared the high-risk zone. Safe corridor escort ended.',
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected (${socket.id}): ${reason}`);
    });

  });
}

/**
 * Emit event to a specific authenticated user's private channel
 */
export function emitToUser(userId: string, event: string, payload: any): void {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

/**
 * Emit event to all connected users with a given role (e.g. 'officer', 'admin')
 */
export function emitToRole(role: string, event: string, payload: any): void {
  if (!ioInstance) return;
  ioInstance.to(`role:${role}`).emit(event, payload);
}

/**
 * Broadcast event to public room (e.g. public map alerts, emergency broadcasts)
 */
export function broadcastPublic(event: string, payload: any): void {
  if (!ioInstance) return;
  ioInstance.to('public:alerts').emit(event, payload);
}

/**
 * Emit event to all participants in a conversation room
 */
export function emitToConversation(conversationId: string, event: string, payload: any): void {
  if (!ioInstance) return;
  ioInstance.to(`conversation:${conversationId}`).emit(event, payload);
}

/**
 * Global broadcast to all connected clients
 */
export function broadcastGlobal(event: string, payload: any): void {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
}
