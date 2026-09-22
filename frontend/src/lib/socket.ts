import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL =
  import.meta.env.PROD
    ? (typeof window !== 'undefined' ? window.location.origin : '')
    : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

let socket: Socket | null = null;

export function initSocket(): Socket {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const token = useAuthStore.getState().accessToken;

  socket = io(SOCKET_URL, {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function getSocket(): Socket {
  return initSocket();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinConversationRoom(conversationId: string): void {
  if (socket) {
    socket.emit('conversation:join', { conversationId });
  }
}

export function leaveConversationRoom(conversationId: string): void {
  if (socket) {
    socket.emit('conversation:leave', { conversationId });
  }
}
