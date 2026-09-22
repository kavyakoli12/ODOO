import { create } from 'zustand';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';

export interface ActiveEscortState {
  sessionId: string;
  zoneId: string;
  zoneName: string;
  centerCoordinates: [number, number]; // [lng, lat]
  radiusMeters: number;
  startedAt: number;
  status: 'monitoring' | 'stoppage_warning' | 'distress';
}

interface SafePassageStoreState {
  activeEscort: ActiveEscortState | null;
  isManualModalOpen: boolean;
  setManualModalOpen: (open: boolean) => void;
  setActiveEscort: (escort: ActiveEscortState | null) => void;
  startEscort: (params: {
    zoneId: string;
    zoneName: string;
    centerCoordinates: [number, number];
    radiusMeters?: number;
    user?: { id?: string; name?: string; email?: string } | null;
    currentCoords?: { lat: number; lng: number } | null;
  }) => ActiveEscortState;
  stopEscort: () => void;
  updateStatus: (status: 'monitoring' | 'stoppage_warning' | 'distress') => void;
}

export const useSafePassageStore = create<SafePassageStoreState>((set, get) => ({
  activeEscort: null,
  isManualModalOpen: false,

  setManualModalOpen: (open) => set({ isManualModalOpen: open }),

  setActiveEscort: (escort) => set({ activeEscort: escort }),

  startEscort: ({ zoneId, zoneName, centerCoordinates, radiusMeters = 750, user, currentCoords }) => {
    const sessionId = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = Date.now();

    const newEscort: ActiveEscortState = {
      sessionId,
      zoneId,
      zoneName,
      centerCoordinates,
      radiusMeters,
      startedAt: now,
      status: 'monitoring',
    };

    set({ activeEscort: newEscort, isManualModalOpen: false });

    const coords: [number, number] = currentCoords
      ? [currentCoords.lng, currentCoords.lat]
      : centerCoordinates;

    const payload = {
      sessionId,
      zoneId,
      zoneName,
      centerCoordinates,
      zoneRadiusMeters: radiusMeters,
      currentCoordinates: coords,
      citizenName: user?.name || 'Jane Citizen',
      user: {
        id: user?.id || 'citizen-guest',
        name: user?.name || 'Jane Citizen',
        email: user?.email || 'citizen@safemap.local',
      },
    };

    // 1. Dual-layer: WebSocket emission
    const socket = getSocket();
    if (socket) {
      if (socket.connected) {
        socket.emit('escort:start', payload);
      } else {
        socket.once('connect', () => socket.emit('escort:start', payload));
      }
    }

    // 2. Dual-layer: REST HTTP POST persistence
    api.post('/escorts/start', payload).catch(() => {});

    return newEscort;
  },

  stopEscort: () => {
    const current = get().activeEscort;
    if (current) {
      const socket = getSocket();
      if (socket) {
        socket.emit('escort:exit_zone', {
          sessionId: current.sessionId,
          zoneId: current.zoneId,
          timestamp: new Date().toISOString(),
        });
      }
      api.post(`/escorts/${current.sessionId}/stop`).catch(() => {});
    }
    set({ activeEscort: null });
  },

  updateStatus: (status) => {
    const current = get().activeEscort;
    if (current) {
      set({ activeEscort: { ...current, status } });
      const socket = getSocket();
      if (socket) {
        if (status === 'stoppage_warning') {
          socket.emit('escort:stoppage_warning', { sessionId: current.sessionId });
        } else if (status === 'distress') {
          socket.emit('escort:distress', { sessionId: current.sessionId });
        } else {
          socket.emit('escort:checkin_safe', { sessionId: current.sessionId });
        }
      }
      api.post(`/escorts/${current.sessionId}/status`, { status }).catch(() => {});
    }
  },
}));
