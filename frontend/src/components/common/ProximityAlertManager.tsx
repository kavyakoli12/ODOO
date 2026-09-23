import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui';

interface ProximityIncident {
  id: string;
  trackingId: string;
  title: string;
  shortDescription?: string;
  categoryName: string;
  categoryColor?: string;
  categoryIcon?: string;
  severity: number;
  status: string;
  approximateAddress: string;
  distanceMeters: number;
  distanceKm: number;
  location: {
    coordinates: [number, number];
  };
}

/**
 * Synthesizes a crisp, non-jarring audio alert using Web Audio API
 */
function playSafetyChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant two-tone chime (F#5 to A5)
    osc.frequency.setValueAtTime(739.99, ctx.currentTime);
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Silent fail if browser restricts audio prior to gesture
  }
}

export function ProximityAlertManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [activeAlert, setActiveAlert] = useState<ProximityIncident | null>(null);

  // Store dismissed incident IDs for this session to completely prevent alert spam
  const dismissedIncidentsRef = useRef<Set<string>>(
    (() => {
      try {
        const stored = sessionStorage.getItem('proximity_dismissed_incidents');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    })()
  );

  const handleDismissAlert = (incidentId?: string) => {
    if (incidentId) {
      dismissedIncidentsRef.current.add(incidentId);
      try {
        sessionStorage.setItem(
          'proximity_dismissed_incidents',
          JSON.stringify(Array.from(dismissedIncidentsRef.current))
        );
      } catch {}
    }
    setActiveAlert(null);
  };

  // Store alerted incident IDs with timestamp to prevent duplicate notifications
  const alertedIncidentsRef = useRef<Map<string, number>>(new Map());
  const lastCheckCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isCheckingRef = useRef(false);

  // Check proximity to incidents for given coordinates
  const checkProximity = useCallback(
    async (lat: number, lng: number) => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const res = await api.get('/incidents/proximity', {
          params: { lat, lng, radiusKm: 1.0 }, // 1km alert radius
        });

        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const incidents: ProximityIncident[] = res.data.data;
          const now = Date.now();

          // Find closest incident that has NOT been dismissed or alerted recently
          for (const inc of incidents) {
            if (dismissedIncidentsRef.current.has(inc.id)) {
              continue; // Permanently skip dismissed alert for this session
            }

            const lastAlerted = alertedIncidentsRef.current.get(inc.id);
            const cooldownMs = 30 * 60 * 1000; // 30 mins

            if (!lastAlerted || now - lastAlerted > cooldownMs) {
              alertedIncidentsRef.current.set(inc.id, now);

              // 1. Play audio warning
              playSafetyChime();

              // 2. Add real-time in-app notification without page refresh
              addNotification({
                id: `prox-${inc.id}-${now}`,
                recipientId: 'current',
                type: 'danger_zone',
                title: `⚠️ Proximity Warning: ${inc.categoryName}`,
                body: `You are ${inc.distanceMeters}m from an incident: "${inc.title}" near ${inc.approximateAddress}.`,
                incidentId: inc.id,
                link: `/map`,
                isRead: false,
                createdAt: new Date().toISOString(),
              });

              // 3. Show high-priority Toast
              showToast(
                'warning',
                `You entered a caution zone: ${inc.title} (${inc.distanceMeters}m away)`,
                'Proximity Danger Alert'
              );

              // 4. Set visual sticky banner
              setActiveAlert(inc);
              break;
            }
          }
        }
      } catch (err) {
        // Non-blocking background error
      } finally {
        isCheckingRef.current = false;
      }
    },
    [addNotification, showToast]
  );

  // Watch position in real-time (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated || !('geolocation' in navigator)) return;

    let watchId: number | null = null;

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Only re-check if position changed by more than ~50 meters or first time
          const prev = lastCheckCoordsRef.current;
          if (!prev) {
            lastCheckCoordsRef.current = { lat, lng };
            checkProximity(lat, lng);
          } else {
            const dLat = Math.abs(lat - prev.lat);
            const dLng = Math.abs(lng - prev.lng);
            // ~0.0005 deg is roughly 50m
            if (dLat > 0.0005 || dLng > 0.0005) {
              lastCheckCoordsRef.current = { lat, lng };
              checkProximity(lat, lng);
            }
          }
        },
        (_err) => {
          // Geolocation permission denied or unavailable
        },
        {
          enableHighAccuracy: true,
          maximumAge: 15000,
          timeout: 20000,
        }
      );
    } catch {
      // Fallback
    }

    // Periodic safety check every 45 seconds while page is open
    const interval = setInterval(() => {
      if (lastCheckCoordsRef.current) {
        checkProximity(lastCheckCoordsRef.current.lat, lastCheckCoordsRef.current.lng);
      }
    }, 45000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
    };
  }, [checkProximity]);

  // If on map page, dismiss modal banner so map canvas isn't obscured
  useEffect(() => {
    if (location.pathname === '/map' && activeAlert) {
      // Keep notification in store, dismiss overlay
      setActiveAlert(null);
    }
  }, [location.pathname, activeAlert]);

  if (!isAuthenticated || !activeAlert) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md w-[calc(100vw-2rem)] animate-in slide-in-from-top-4 duration-300">
      <div className="rounded-2xl bg-gradient-to-b from-amber-950/95 to-slate-950/95 border-2 border-amber-500/80 p-4 shadow-2xl shadow-amber-950/60 backdrop-blur-xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  ⚠️ Danger Zone Alert
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeAlert.distanceMeters}m away
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5 line-clamp-1">
                {activeAlert.title}
              </h4>
            </div>
          </div>

          <button
            onClick={() => handleDismissAlert(activeAlert.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          You have entered the proximity of an active reported hazard near{' '}
          <strong className="text-amber-200">{activeAlert.approximateAddress}</strong>. Please stay vigilant and exercise caution.
        </p>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-amber-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="capitalize">{activeAlert.categoryName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDismissAlert(activeAlert.id)}
              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                handleDismissAlert(activeAlert.id);
                navigate('/map');
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <span>View Map</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
