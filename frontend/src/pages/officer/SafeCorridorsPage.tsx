import { useState, useEffect, Fragment } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Radio,
  CheckCircle2,
  Car,
  Navigation,
  Search,
  Phone,
} from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { TrinetraLogo } from '@/components/common/TrinetraLogo';
import { TACTICAL_DARK_TILE_CONFIG, MAP_TILE_CONFIG } from '@/lib/mapConfig';

export interface EscortSession {
  sessionId: string;
  socketId?: string;
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

export interface DangerZone {
  id: string;
  name: string;
  centerCoordinates: [number, number];
  radiusMeters: number;
  riskLevel: string;
  incidentCount: number;
  recentCrimes: string[];
  status?: string;
  isResolved?: boolean;
  activeDaysRemaining?: number;
  incidentDate?: string;
}

/**
 * Normalizes coordinates to Leaflet format: [lat, lng]
 */
function normalizeLatLng(coords: any): [number, number] | null {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [a, b] = coords.map(Number);
  if (isNaN(a) || isNaN(b)) return null;

  // In India: lat is 8-37, lng is 68-97
  // If a > 40 and b <= 40, a is lng and b is lat -> return [b, a] (Leaflet expects [lat, lng])
  if (Math.abs(a) > 40 && Math.abs(b) <= 40) {
    return [b, a];
  }
  return [a, b];
}

// Memoized Leaflet Icons for Escort Beacons
const beaconIconCache = new Map<string, L.DivIcon>();

const getBeaconIcon = (status: string) => {
  if (beaconIconCache.has(status)) {
    return beaconIconCache.get(status)!;
  }

  let colorClass = 'bg-cyan-500 border-cyan-300 shadow-cyan-500/50';
  let pingClass = 'bg-cyan-400';
  let iconLabel = '🚶';

  if (status === 'distress') {
    colorClass = 'bg-red-600 border-red-300 shadow-red-600/80 animate-pulse';
    pingClass = 'bg-red-500 animate-ping';
    iconLabel = '🚨';
  } else if (status === 'stoppage_warning') {
    colorClass = 'bg-amber-500 border-amber-200 shadow-amber-500/60';
    pingClass = 'bg-amber-400 animate-ping';
    iconLabel = '⚠️';
  }

  const html = `
    <div class="relative flex items-center justify-center w-9 h-9">
      <div class="absolute w-8 h-8 rounded-full opacity-75 ${pingClass}"></div>
      <div class="relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs shadow-lg ${colorClass} text-white font-bold">
        ${iconLabel}
      </div>
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: 'custom-escort-beacon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

  beaconIconCache.set(status, icon);
  return icon;
};

function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export function SafeCorridorsPage() {
  const { showToast } = useToast();

  const [escorts, setEscorts] = useState<EscortSession[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [selectedEscort, setSelectedEscort] = useState<EscortSession | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.0225, 72.5714]); // Ahmedabad default center
  const [mapStyle, setMapStyle] = useState<'tactical' | 'streets'>('tactical');
  const [searchFilter, setSearchFilter] = useState('');

  // Patrol dispatch modal state
  const [dispatchUnitModal, setDispatchUnitModal] = useState<EscortSession | null>(null);
  const [patrolUnitName, setPatrolUnitName] = useState('Patrol Unit PCR-42');
  const [officerNote, setOfficerNote] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // 1. Fetch initial active escorts and zones + optimized polling
  useEffect(() => {
    let isMounted = true;

    // Load danger zones once on mount, then refresh every 60s
    const fetchZones = async () => {
      try {
        const res = await api.get('/escorts/danger-zones');
        if (!isMounted) return;
        if (res.data?.success && Array.isArray(res.data.data)) {
          setDangerZones(res.data.data);
          if (res.data.data.length > 0) {
            const firstZonePos = normalizeLatLng(res.data.data[0].centerCoordinates);
            if (firstZonePos) setMapCenter(firstZonePos);
          }
        }
      } catch {}
    };

    // Fast active escorts sync (every 4s)
    const fetchEscorts = async (isBackground = false) => {
      try {
        const res = await api.get('/escorts/active');
        if (!isMounted) return;
        if (res.data?.success && Array.isArray(res.data.data)) {
          setEscorts(res.data.data);
          if (!isBackground && res.data.data.length > 0) {
            const first = res.data.data[0];
            const firstPos = normalizeLatLng(first.currentCoordinates);
            if (firstPos) setMapCenter(firstPos);
          }
        }
      } catch (err) {
        if (!isBackground) {
          showToast('error', 'Failed to load escort live data', 'Network Error');
        }
      }
    };

    fetchZones();
    fetchEscorts(false);

    const escortInterval = setInterval(() => fetchEscorts(true), 4000);
    const zonesInterval = setInterval(fetchZones, 60000);

    return () => {
      isMounted = false;
      clearInterval(escortInterval);
      clearInterval(zonesInterval);
    };
  }, [showToast]);

  // 2. Real-Time Socket.io Listeners for Officers
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    // Join live tactical radar room and request immediate sync
    socket.emit('officer:join_radar');

    const handleRadarSync = (syncedEscorts: EscortSession[]) => {
      if (Array.isArray(syncedEscorts)) {
        setEscorts(syncedEscorts);
        if (syncedEscorts.length > 0) {
          const first = syncedEscorts[0];
          const firstPos = normalizeLatLng(first.currentCoordinates);
          if (firstPos) setMapCenter(firstPos);
        }
      }
    };

    // A. New escort session started
    const handleNewEscort = (newSession: EscortSession) => {
      setEscorts((prev) => {
        const exists = prev.some((e) => e.sessionId === newSession.sessionId);
        if (exists) return prev;
        return [newSession, ...prev];
      });

      // Fly map to citizen location
      const newPos = normalizeLatLng(newSession.currentCoordinates);
      if (newPos) setMapCenter(newPos);

      showToast(
        'info',
        `New Safe Passage Escort started by ${newSession.citizenName} in ${newSession.zoneName}`,
        'Safe Corridor Activated'
      );
    };

    socket.on('escort:radar_sync', handleRadarSync);

    // B. Live movement update
    const handleMovement = (payload: {
      sessionId: string;
      currentCoordinates: [number, number];
      speed: number;
      heading?: number;
      lastMovementAt: string;
      status: 'monitoring' | 'stoppage_warning' | 'distress';
    }) => {
      setEscorts((prev) =>
        prev.map((e) => {
          if (e.sessionId === payload.sessionId) {
            const updatedBreadcrumbs = [
              ...e.breadcrumbs,
              {
                coordinates: payload.currentCoordinates,
                timestamp: payload.lastMovementAt,
                speed: payload.speed,
              },
            ];
            return {
              ...e,
              currentCoordinates: payload.currentCoordinates,
              speed: payload.speed,
              lastMovementAt: payload.lastMovementAt,
              status: payload.status,
              breadcrumbs: updatedBreadcrumbs.slice(-60),
            };
          }
          return e;
        })
      );
    };

    // C. Stoppage Warning (Dead-man countdown active)
    const handleStoppage = (payload: { sessionId: string; zoneName: string }) => {
      setEscorts((prev) =>
        prev.map((e) => (e.sessionId === payload.sessionId ? { ...e, status: 'stoppage_warning' } : e))
      );
      showToast(
        'warning',
        `⚠️ Citizen stoppage detected in ${payload.zoneName} (#${payload.sessionId}). Check-in pending.`,
        'Dead-Man Alert'
      );
    };

    // D. Critical Distress Alert (No check-in or SOS)
    const handleDistress = (payload: {
      sessionId: string;
      citizenName: string;
      zoneName: string;
      currentCoordinates: [number, number];
      reason: string;
    }) => {
      setEscorts((prev) =>
        prev.map((e) =>
          e.sessionId === payload.sessionId
            ? { ...e, status: 'distress', currentCoordinates: payload.currentCoordinates }
            : e
        )
      );

      // Focus map to distress location
      setMapCenter([payload.currentCoordinates[1], payload.currentCoordinates[0]]);

      showToast(
        'error',
        `🚨 EMERGENCY: Distress alert from ${payload.citizenName} in ${payload.zoneName}!`,
        'IMMEDIATE POLICE DISPATCH REQUIRED'
      );
    };

    // E. Citizen Checked In Safe
    const handleStatusUpdate = (payload: { sessionId: string; status: 'monitoring' }) => {
      setEscorts((prev) =>
        prev.map((e) => (e.sessionId === payload.sessionId ? { ...e, status: payload.status } : e))
      );
    };

    // F. Safe Exit Completed
    const handleCleared = (payload: { sessionId: string; zoneName: string }) => {
      setEscorts((prev) => prev.filter((e) => e.sessionId !== payload.sessionId));
      showToast(
        'success',
        `Citizen successfully exited high-risk corridor ${payload.zoneName}. Safe session closed.`,
        'Escort Completed'
      );
    };

    socket.on('escort:officer_new', handleNewEscort);
    socket.on('escort:officer_movement', handleMovement);
    socket.on('escort:officer_stoppage_warning', handleStoppage);
    socket.on('escort:officer_distress_alert', handleDistress);
    socket.on('escort:officer_status_update', handleStatusUpdate);
    socket.on('escort:officer_cleared', handleCleared);

    return () => {
      socket.off('escort:officer_new', handleNewEscort);
      socket.off('escort:officer_movement', handleMovement);
      socket.off('escort:officer_stoppage_warning', handleStoppage);
      socket.off('escort:officer_distress_alert', handleDistress);
      socket.off('escort:officer_status_update', handleStatusUpdate);
      socket.off('escort:officer_cleared', handleCleared);
    };
  }, [showToast]);

  // Handle Dispatch Patrol
  const handleConfirmDispatch = async () => {
    if (!dispatchUnitModal) return;
    setIsDispatching(true);

    try {
      await api.post(`/escorts/${dispatchUnitModal.sessionId}/dispatch`, {
        unitId: patrolUnitName,
        notes: officerNote,
      });

      setEscorts((prev) =>
        prev.map((e) =>
          e.sessionId === dispatchUnitModal.sessionId
            ? { ...e, dispatchedUnit: patrolUnitName, officerNotes: officerNote }
            : e
        )
      );

      showToast(
        'success',
        `Dispatched ${patrolUnitName} to escort session ${dispatchUnitModal.sessionId}`,
        'Patrol Dispatched'
      );
      setDispatchUnitModal(null);
      setOfficerNote('');
    } catch (err: any) {
      showToast('error', 'Failed to dispatch patrol', 'Error');
    } finally {
      setIsDispatching(false);
    }
  };

  // Filtered escorts
  const filteredEscorts = escorts.filter((e) => {
    const q = searchFilter.toLowerCase();
    return (
      e.sessionId.toLowerCase().includes(q) ||
      e.citizenName.toLowerCase().includes(q) ||
      e.zoneName.toLowerCase().includes(q)
    );
  });

  const distressCount = escorts.filter((e) => e.status === 'distress').length;
  const stoppageCount = escorts.filter((e) => e.status === 'stoppage_warning').length;
  const monitoringCount = escorts.filter((e) => e.status === 'monitoring').length;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Triage Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <TrinetraLogo size="md" variant="badge" />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Safe Passage Tactical Escorts
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  LIVE RADAR
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time citizen safe corridor tracking in high-incident Red Zones with dead-man stoppage detection
              </p>
            </div>
          </div>
        </div>

        {/* Quick Triage Counters */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Monitoring</div>
            <div className="text-base font-bold text-cyan-400">{monitoringCount}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Stoppage Warnings</div>
            <div className="text-base font-bold text-amber-400">{stoppageCount}</div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl border text-center ${
              distressCount > 0
                ? 'bg-red-950/60 border-red-500 text-red-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="text-[10px] uppercase font-semibold">Distress Alarms</div>
            <div className="text-base font-bold text-red-400">{distressCount}</div>
          </div>
        </div>
      </div>

      {/* Main Tactical Grid: Map (2/3) + Escort Queue (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tactical Leaflet Map */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col h-[640px] relative">
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-10">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-white">Geofenced Danger Corridors</span>
              <span className="text-[11px] text-slate-400">({dangerZones.length} Red Zones)</span>

              {/* Map Layer Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 ml-2">
                <button
                  type="button"
                  onClick={() => setMapStyle('tactical')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                    mapStyle === 'tactical'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  Tactical Dark
                </button>
                <button
                  type="button"
                  onClick={() => setMapStyle('streets')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                    mapStyle === 'streets'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  Street Map
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                Normal Monitoring
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Stoppage Check-in
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-ping" />
                Distress Alarm
              </span>
            </div>
          </div>

          <div className="flex-1 relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <ChangeMapView center={mapCenter} />
              <TileLayer
                attribution={
                  mapStyle === 'tactical'
                    ? TACTICAL_DARK_TILE_CONFIG.attribution
                    : MAP_TILE_CONFIG.attribution
                }
                url={
                  mapStyle === 'tactical'
                    ? TACTICAL_DARK_TILE_CONFIG.url
                    : MAP_TILE_CONFIG.url
                }
                maxZoom={
                  mapStyle === 'tactical'
                    ? TACTICAL_DARK_TILE_CONFIG.maxZoom
                    : MAP_TILE_CONFIG.maxZoom
                }
                maxNativeZoom={
                  mapStyle === 'tactical'
                    ? TACTICAL_DARK_TILE_CONFIG.maxNativeZoom
                    : undefined
                }
              />

              {/* Danger Red Zones */}
              {dangerZones.map((zone) => {
                const zonePos = normalizeLatLng(zone.centerCoordinates);
                if (!zonePos) return null;

                return (
                  <Circle
                    key={zone.id}
                    center={zonePos}
                    radius={zone.radiusMeters}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: '6, 6',
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                            {zone.isResolved ? 'Resolved (7-Day Watch)' : 'Active Red Zone'}
                          </span>
                          {zone.activeDaysRemaining !== undefined && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              {zone.activeDaysRemaining}d remaining
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-slate-900">{zone.name}</div>
                        <div className="text-xs text-slate-600">
                          Radius: {zone.radiusMeters}m • {zone.isResolved ? 'Resolved Incident (Monitored for 7 days)' : 'Active Incident Corridor'}
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {/* Active Escort Citizen Markers & Breadcrumb Trails */}
              {escorts.map((escort) => {
                const pos = normalizeLatLng(escort.currentCoordinates);
                if (!pos) return null;

                // Convert breadcrumbs to polyline positions
                const breadcrumbPoints: [number, number][] = (escort.breadcrumbs || [])
                  .map((b) => normalizeLatLng(b?.coordinates))
                  .filter((p): p is [number, number] => p !== null);

                return (
                  <Fragment key={escort.sessionId}>
                    {/* Breadcrumb path trail */}
                    {breadcrumbPoints.length > 1 && (
                      <Polyline
                        positions={breadcrumbPoints}
                        pathOptions={{
                          color: escort.status === 'distress' ? '#ef4444' : '#06b6d4',
                          weight: 3,
                          opacity: 0.8,
                          dashArray: escort.status === 'distress' ? '4, 4' : undefined,
                        }}
                      />
                    )}

                    <Marker position={pos} icon={getBeaconIcon(escort.status)}>
                      <Popup className="custom-popup">
                        <div className="p-1.5 space-y-2 max-w-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-cyan-600 uppercase">
                              #{escort.sessionId}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                escort.status === 'distress'
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : escort.status === 'stoppage_warning'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-cyan-600 text-white'
                              }`}
                            >
                              {escort.status.toUpperCase()}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {escort.citizenName}
                            </div>
                            <div className="text-xs text-slate-600">
                              Zone: {escort.zoneName}
                            </div>
                            {escort.contactPhone && (
                              <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                {escort.contactPhone}
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            Speed: {escort.speed} km/h • Updated:{' '}
                            {new Date(escort.lastMovementAt).toLocaleTimeString()}
                          </div>

                          {escort.dispatchedUnit ? (
                            <div className="p-1.5 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold">
                              🚓 Unit Assigned: {escort.dispatchedUnit}
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<Car className="w-3.5 h-3.5" />}
                              onClick={() => setDispatchUnitModal(escort)}
                              className="w-full text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white"
                            >
                              Dispatch Patrol Unit
                            </Button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Right 1 Col: Active Escort Feed & Dispatch Controls */}
        <div className="space-y-4 flex flex-col h-[640px]">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search session ID, citizen, corridor..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Active Escort Cards List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredEscorts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
                <div className="font-bold text-white">No Active Escort Sessions</div>
                <p>All high-risk corridors are currently clear of active citizen escorts.</p>
              </div>
            ) : (
              filteredEscorts.map((escort) => {
                const isDistress = escort.status === 'distress';
                const isWarning = escort.status === 'stoppage_warning';

                return (
                  <div
                    key={escort.sessionId}
                    onClick={() => {
                      setSelectedEscort(escort);
                      setMapCenter([escort.currentCoordinates[1], escort.currentCoordinates[0]]);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isDistress
                        ? 'bg-red-950/70 border-red-500/80 shadow-lg shadow-red-600/30 animate-pulse'
                        : isWarning
                        ? 'bg-amber-950/40 border-amber-500/60 shadow-md'
                        : selectedEscort?.sessionId === escort.sessionId
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isDistress
                              ? 'bg-red-500 animate-ping'
                              : isWarning
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-cyan-400'
                          }`}
                        />
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {escort.citizenName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDistress
                            ? 'bg-red-600 text-white font-mono'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {isDistress ? 'DISTRESS' : isWarning ? 'STOPPAGE' : 'MONITORING'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 line-clamp-1">
                      📍 {escort.zoneName}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                      <span>Speed: {escort.speed} km/h</span>
                      <span>#{escort.sessionId.slice(-7)}</span>
                    </div>

                    {/* Dispatch unit status or action */}
                    <div className="flex items-center justify-between pt-1">
                      {escort.dispatchedUnit ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          {escort.dispatchedUnit}
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Car className="w-3.5 h-3.5 text-cyan-400" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDispatchUnitModal(escort);
                          }}
                          className="text-[11px] h-7 px-2 text-cyan-300 hover:bg-cyan-950/40"
                        >
                          Dispatch Patrol
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Navigation className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapCenter([escort.currentCoordinates[1], escort.currentCoordinates[0]]);
                        }}
                        className="text-[11px] h-7 px-2 text-slate-400 hover:text-white"
                      >
                        Locate
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Patrol Unit Dispatch Modal */}
      {dispatchUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Dispatch Patrol Unit</h3>
              </div>
              <button
                onClick={() => setDispatchUnitModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400">Citizen: <strong className="text-white">{dispatchUnitModal.citizenName}</strong></div>
                <div className="text-slate-400">Zone: <strong className="text-cyan-300">{dispatchUnitModal.zoneName}</strong></div>
                <div className="text-slate-400">Status: <strong className={dispatchUnitModal.status === 'distress' ? 'text-red-400' : 'text-cyan-400'}>{dispatchUnitModal.status.toUpperCase()}</strong></div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Patrol Vehicle / Officer Call Sign</label>
                <input
                  type="text"
                  value={patrolUnitName}
                  onChange={(e) => setPatrolUnitName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dispatch Instructions & Standoff Notes</label>
                <textarea
                  rows={3}
                  value={officerNote}
                  onChange={(e) => setOfficerNote(e.target.value)}
                  placeholder="e.g., Rendezvous at Metro Exit 2, assess citizen safety, confirm safe passage."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDispatchUnitModal(null)}
                disabled={isDispatching}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isDispatching}
                leftIcon={<Car className="w-4 h-4" />}
                onClick={handleConfirmDispatch}
                className="bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold"
              >
                Confirm Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
