import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
}

let ioInstance: SocketIOServer | null = null;

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
