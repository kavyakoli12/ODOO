import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  X,
  Radio,
  Clock,
} from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useSafePassageStore } from '@/store/safePassageStore';

export interface DangerZone {
  id: string;
  name: string;
  centerCoordinates: [number, number]; // [lng, lat]
  radiusMeters: number;
  riskLevel: string;
  incidentCount: number;
  recentCrimes: string[];
  status?: string;
  isResolved?: boolean;
  activeDaysRemaining?: number;
  incidentDate?: string;
}

export interface ActiveEscortState {
  sessionId: string;
  zoneId: string;
  zoneName: string;
  centerCoordinates: [number, number];
  radiusMeters: number;
  startedAt: number;
  status: 'monitoring' | 'stoppage_warning' | 'distress';
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Audio synthesis for Stoppage Alert / Siren using Web Audio API
 */
function playDistressChime(isUrgent = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isUrgent ? 'sawtooth' : 'sine';
    if (isUrgent) {
      // Urgent oscillating siren: 880Hz to 1200Hz
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.4);
    } else {
      // Pleasant double-chime prompt
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5
    }

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isUrgent ? 0.6 : 0.4));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (isUrgent ? 0.6 : 0.4));
  } catch {}
}

export function SafeCorridorBanner() {
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useToast();
  const {
    activeEscort,
    setActiveEscort,
    isManualModalOpen,
    setManualModalOpen,
    stopEscort,
  } = useSafePassageStore();

  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Prompt state when entering a zone
  const [detectedZonePrompt, setDetectedZonePrompt] = useState<DangerZone | null>(null);
  const [dismissedZoneIds, setDismissedZoneIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('safe_passage_dismissed_zones');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Dead-Man's Timer & Stoppage states
  const [isStoppageModalOpen, setIsStoppageModalOpen] = useState(false);
  const [checkinSecondsLeft, setCheckinSecondsLeft] = useState(60);
  const [isDistressActive, setIsDistressActive] = useState(false);

  // Last movement tracking for 4-minute dead-man trigger
  const lastMovementPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastStationaryAlertTimeRef = useRef<number>(0);
  const lastRestLocationTickRef = useRef<number>(0);

  // 1. Fetch Danger Zones on mount and refresh periodically (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchZones = async () => {
      try {
        const res = await api.get('/escorts/danger-zones');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setDangerZones(res.data.data);
        }
      } catch {}
    };
    fetchZones();
    const interval = setInterval(fetchZones, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 2. Real-Time Geolocation Watcher (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        const heading = pos.coords.heading || 0;
        const now = Date.now();

        setCurrentCoords({ lat, lng });

        // Update movement reference if moved more than 8 meters
        if (!lastMovementPosRef.current) {
          lastMovementPosRef.current = { lat, lng, time: now };
        } else {
          const movedDist = calculateDistanceMeters(
            lastMovementPosRef.current.lat,
            lastMovementPosRef.current.lng,
            lat,
            lng
          );
          if (movedDist > 8) {
            lastMovementPosRef.current = { lat, lng, time: now };
          }
        }

        // If Escort is active, transmit live coordinates to Officer Tactical Console
        if (activeEscort) {
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit('escort:location', {
              sessionId: activeEscort.sessionId,
              currentCoordinates: [lng, lat],
              speed,
              heading,
            });
          }

          // Periodic REST fallback every 5s so location updates reach backend even if socket reconnects
          if (now - lastRestLocationTickRef.current > 5000) {
            lastRestLocationTickRef.current = now;
            api.post(`/escorts/${activeEscort.sessionId}/location`, {
              currentCoordinates: [lng, lat],
              speed,
              heading,
            }).catch(() => {});
          }

          // Check Boundary Exit: Distance from zone center > zoneRadiusMeters
          const distToCenter = calculateDistanceMeters(
            lat,
            lng,
            activeEscort.centerCoordinates[1],
            activeEscort.centerCoordinates[0]
          );

          if (distToCenter > activeEscort.radiusMeters + 30) {
            // AUTOMATIC BOUNDARY EXIT HANDSHAKE
            handleAutoExitZone(activeEscort);
          }
        } else if (dangerZones.length > 0) {
          // Check if snoozed (5-minute cooldown after clicking 'Not Now')
          try {
            const snoozeUntil = Number(sessionStorage.getItem('safe_escort_snooze_until') || 0);
            if (now < snoozeUntil) {
              return;
            }
          } catch {}

          // Check if citizen entered any danger zone
          for (const zone of dangerZones) {
            if (dismissedZoneIds.has(zone.id)) continue;

            const dist = calculateDistanceMeters(
              lat,
              lng,
              zone.centerCoordinates[1],
              zone.centerCoordinates[0]
            );

            if (dist <= zone.radiusMeters) {
              setDetectedZonePrompt(zone);
              break;
            }
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [dangerZones, activeEscort, dismissedZoneIds]);

  // 3. Dead-Man's Timer Monitor: Check if stationary for > 4 minutes while in active escort
  useEffect(() => {
    if (!activeEscort || isStoppageModalOpen || isDistressActive) return;

    const interval = setInterval(() => {
      if (!lastMovementPosRef.current) return;
      const now = Date.now();
      const stillTimeMs = now - lastMovementPosRef.current.time;

      // 4 minutes stillness threshold (240,000 ms)
      if (stillTimeMs >= 240000 && now - lastStationaryAlertTimeRef.current > 300000) {
        lastStationaryAlertTimeRef.current = now;
        triggerStoppageCheckin();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeEscort, isStoppageModalOpen, isDistressActive]);

  // 4. Stoppage Modal 60-second Countdown Timer
  useEffect(() => {
    if (!isStoppageModalOpen) return;

    if (checkinSecondsLeft <= 0) {
      // Timer Expired: Trigger Distress Alert to Officers
      triggerDistressAlert("Dead-Man's Timer expired without citizen check-in");
      setIsStoppageModalOpen(false);
      return;
    }

    const timer = setInterval(() => {
      setCheckinSecondsLeft((prev) => prev - 1);
      if (checkinSecondsLeft % 10 === 0) {
        playDistressChime(false);
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isStoppageModalOpen, checkinSecondsLeft]);

  // Trigger Stoppage Check-in Alert
  const triggerStoppageCheckin = () => {
    setIsStoppageModalOpen(true);
    setCheckinSecondsLeft(60);
    playDistressChime(false);
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300]);
    }

    if (activeEscort) {
      const socket = getSocket();
      if (socket) {
        socket.emit('escort:stoppage_warning', { sessionId: activeEscort.sessionId });
      }
      api.post(`/escorts/${activeEscort.sessionId}/status`, { status: 'stoppage_warning' }).catch(() => {});
    }
  };

  // Citizen confirms "I Am Safe"
  const handleCheckinSafe = () => {
    setIsStoppageModalOpen(false);
    setCheckinSecondsLeft(60);
    if (lastMovementPosRef.current) {
      lastMovementPosRef.current.time = Date.now();
    }

    if (activeEscort) {
      const socket = getSocket();
      if (socket) {
        socket.emit('escort:checkin_safe', { sessionId: activeEscort.sessionId });
      }
      api.post(`/escorts/${activeEscort.sessionId}/status`, {
        status: 'monitoring',
        reason: 'Citizen confirmed safe check-in',
      }).catch(() => {});
    }

    showToast(
      'success',
      'Safety check-in recorded. Officer console updated: Safe monitoring resumed.',
      'Check-in Confirmed'
    );
  };

  // Trigger Immediate Distress
  const triggerDistressAlert = (reason = 'Citizen manual SOS') => {
    setIsDistressActive(true);
    playDistressChime(true);
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    if (activeEscort) {
      const socket = getSocket();
      if (socket) {
        socket.emit('escort:distress', {
          sessionId: activeEscort.sessionId,
          reason,
        });
      }
      api.post(`/escorts/${activeEscort.sessionId}/status`, {
        status: 'distress',
        reason,
      }).catch(() => {});
    }

    showToast(
      'error',
      '🚨 CRITICAL ALERT SENT! Nearest patrol units alerted with your exact live coordinates.',
      'Distress Beacon Active'
    );
  };

  // Start Safe Passage Escort
  const handleStartEscort = (zone: DangerZone) => {
    const sessionId = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const lng = currentCoords?.lng || zone.centerCoordinates[0];
    const lat = currentCoords?.lat || zone.centerCoordinates[1];

    const newEscort: ActiveEscortState = {
      sessionId,
      zoneId: zone.id,
      zoneName: zone.name,
      centerCoordinates: zone.centerCoordinates,
      radiusMeters: zone.radiusMeters,
      startedAt: Date.now(),
      status: 'monitoring',
    };

    setActiveEscort(newEscort);
    setDetectedZonePrompt(null);
    lastMovementPosRef.current = { lat, lng, time: Date.now() };

    const payload = {
      sessionId,
      zoneId: zone.id,
      zoneName: zone.name,
      centerCoordinates: zone.centerCoordinates,
      zoneRadiusMeters: zone.radiusMeters,
      currentCoordinates: [lng, lat],
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

    showToast(
      'info',
      `Safe Passage Escort activated for ${zone.name}. Officers are monitoring your corridor until exit.`,
      'Escort Activated'
    );
  };

  // Automatic Boundary Exit Handshake
  const handleAutoExitZone = (escort: ActiveEscortState) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('escort:exit_zone', { sessionId: escort.sessionId });
    }
    api.post(`/escorts/${escort.sessionId}/stop`).catch(() => {});

    stopEscort();
    setIsStoppageModalOpen(false);
    setIsDistressActive(false);

    showToast(
      'success',
      `You have safely cleared ${escort.zoneName}. Safe corridor tracking automatically stopped.`,
      'Safe Corridor Cleared'
    );
  };

  // Dismiss Prompt & Snooze all notifications for 5 minutes
  const handleDismissPrompt = (zoneId?: string) => {
    // 5-minute snooze (300,000 ms) so citizen is never spammed
    const snoozeUntil = Date.now() + 5 * 60 * 1000;
    try {
      sessionStorage.setItem('safe_escort_snooze_until', String(snoozeUntil));
    } catch {}

    if (zoneId) {
      setDismissedZoneIds((prev) => {
        const next = new Set(prev).add(zoneId);
        try {
          sessionStorage.setItem('safe_passage_dismissed_zones', JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
    }
    setDetectedZonePrompt(null);
  };

  // Cancel Escort Early
  const handleCancelEscort = () => {
    if (activeEscort) {
      const socket = getSocket();
      if (socket) {
        socket.emit('escort:exit_zone', { sessionId: activeEscort.sessionId });
      }
      api.post(`/escorts/${activeEscort.sessionId}/stop`).catch(() => {});
    }
    stopEscort();
    setIsStoppageModalOpen(false);
    setIsDistressActive(false);
    showToast('info', 'Safe Passage Escort ended by citizen.', 'Escort Deactivated');
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      {/* 1. Zone Entry Slide-up Prompt (Automatic Boundary Detection) */}
      {detectedZonePrompt && !activeEscort && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
          <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-red-500/80 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <Shield className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      {detectedZonePrompt.isResolved ? 'Resolved Hazard Spot' : 'Red Zone Detected'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mt-0.5 line-clamp-1">
                    {detectedZonePrompt.name}
                  </h4>
                </div>
              </div>
              <button
                onClick={() => handleDismissPrompt(detectedZonePrompt.id)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              You have entered a high-incident danger zone ({detectedZonePrompt.incidentCount} recent reports). Would you like to activate <strong>Safe Passage Escort</strong>? Officers will monitor your live path until you exit safely.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismissPrompt(detectedZonePrompt.id)}
                className="text-xs text-slate-400"
              >
                Not Now
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />}
                onClick={() => handleStartEscort(detectedZonePrompt)}
                className="bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30"
              >
                Activate Safe Escort
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Safe Corridor Floating HUD (Always visible while escort is on) */}
      {activeEscort && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-lg z-50 animate-in fade-in duration-200">
          <div
            className={`p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl border-2 transition-all ${
              isDistressActive
                ? 'bg-red-950/95 border-red-500 shadow-red-600/50 animate-pulse'
                : 'bg-slate-900/95 border-cyan-500/70 shadow-cyan-500/20'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isDistressActive ? 'bg-red-500' : 'bg-cyan-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isDistressActive ? 'bg-red-600' : 'bg-cyan-500'
                    }`}
                  />
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {isDistressActive ? 'DISTRESS BEACON BROADCASTING' : 'SAFE PASSAGE ESCORT ACTIVE'}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      #{activeEscort.sessionId.slice(-7)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    Corridor: {activeEscort.zoneName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Demo trigger button for stoppage test */}
                <button
                  type="button"
                  onClick={triggerStoppageCheckin}
                  title="Simulate Stoppage to test 60s Dead-Man Check-in"
                  className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                >
                  Test Stoppage
                </button>

                {!isDistressActive ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => triggerDistressAlert('Immediate citizen panic button pressed')}
                    className="text-xs font-bold px-2.5 bg-red-600 hover:bg-red-500"
                  >
                    SOS
                  </Button>
                ) : (
                  <span className="text-[10px] font-bold text-red-300 px-2 py-1 bg-red-900/60 rounded">
                    POLICE ALERTED
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCancelEscort}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  title="End Escort"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-bar showing auto-exit info */}
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                Auto-ends upon crossing perimeter ({activeEscort.radiusMeters}m)
              </span>
              <span className="text-cyan-400 font-medium">Police live radar connected</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dead-Man's Stoppage Modal: "Are you safe? Check in within 60 seconds" */}
      {isStoppageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border-2 border-amber-500 shadow-2xl p-5 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Stoppage Detected</h3>
              <p className="text-xs text-amber-300 font-medium mt-1">
                You have been stationary inside a High-Risk Zone for over 4 minutes.
              </p>
            </div>

            {/* Countdown Ring */}
            <div className="py-2">
              <div className="text-4xl font-extrabold text-white font-mono tracking-tight animate-pulse">
                00:{checkinSecondsLeft < 10 ? `0${checkinSecondsLeft}` : checkinSecondsLeft}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                If no response, an immediate Police Distress Alert will trigger.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                onClick={handleCheckinSafe}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 py-3"
              >
                I Am Safe (Check In)
              </Button>

              <Button
                variant="danger"
                size="md"
                leftIcon={<AlertTriangle className="w-4 h-4" />}
                onClick={() => {
                  triggerDistressAlert('Citizen pressed Distress in Stoppage Modal');
                  setIsStoppageModalOpen(false);
                }}
                className="w-full text-xs font-bold"
              >
                Trigger Immediate SOS Assistance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. On-Demand / Manual Safe Passage Modal (Triggered from Sidebar) */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-950 border border-cyan-500/40 p-5 sm:p-6 shadow-2xl text-white space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Safe Passage Virtual Escort</h3>
                    {activeEscort ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950 animate-pulse">
                        LIVE ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        STANDBY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stream live GPS and Dead-Man's Timer directly to Police Radar Consoles.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If currently active */}
            {activeEscort ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">
                      Active Escort Corridor
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      Elapsed: {Math.max(1, Math.floor((Date.now() - activeEscort.startedAt) / 60000))}m
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">{activeEscort.zoneName}</p>
                  <p className="text-xs text-slate-300">
                    Police tactical radar is receiving your real-time breadcrumbs. If you stop for more than 4 minutes, an audio alarm and check-in prompt will appear.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-700 hover:bg-slate-800 text-xs"
                    onClick={() => {
                      setManualModalOpen(false);
                      triggerStoppageCheckin();
                    }}
                  >
                    Test Stoppage Alert (Demo)
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 text-xs font-bold"
                    onClick={() => {
                      handleCancelEscort();
                      setManualModalOpen(false);
                    }}
                  >
                    End Safe Passage
                  </Button>
                </div>
              </div>
            ) : (
              /* If idle, allow 1-click start */
              <div className="space-y-4">
                {/* GPS Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-200">Current Position</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {currentCoords
                          ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
                          : 'Detecting GPS coordinates...'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-semibold',
                      currentCoords
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    )}
                  >
                    {currentCoords ? 'GPS Locked' : 'Acquiring...'}
                  </span>
                </div>

                {/* Nearby Known Hazards in Database */}
                {dangerZones.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Nearby Danger Zones & Reported Hazards:
                    </label>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {dangerZones.slice(0, 6).map((zone) => {
                        const dist = currentCoords
                          ? calculateDistanceMeters(
                              currentCoords.lat,
                              currentCoords.lng,
                              zone.centerCoordinates[1],
                              zone.centerCoordinates[0]
                            )
                          : null;
                        return (
                          <div
                            key={zone.id}
                            onClick={() => {
                              handleStartEscort(zone);
                              setManualModalOpen(false);
                            }}
                            className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                                {zone.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {dist !== null ? `${dist}m away` : 'In database'} • {zone.riskLevel.toUpperCase()}
                              </p>
                            </div>
                            <span className="text-[11px] text-cyan-400 font-bold shrink-0">
                              Start &rarr;
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Start Button */}
                <Button
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 text-sm shadow-xl shadow-cyan-500/25 cursor-pointer"
                  disabled={!currentCoords}
                  onClick={() => {
                    if (currentCoords) {
                      handleStartEscort({
                        id: `custom-${Date.now()}`,
                        name: 'Immediate Citizen Safe Corridor',
                        centerCoordinates: [currentCoords.lng, currentCoords.lat],
                        radiusMeters: 750,
                        riskLevel: 'high',
                        incidentCount: 1,
                        recentCrimes: ['Citizen On-Demand Escort'],
                      });
                      setManualModalOpen(false);
                    }
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  <span>Activate Safe Passage at My Location</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
