import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { MapFilters } from '@/components/map/MapFilters';
import { MarkerClusterGroup } from '@/components/map/MarkerClusterGroup';
import { MapLegend } from '@/components/map/MapLegend';
import { useToast, Button, Badge, Sheet } from '@/components/ui';
import type { SafeMapIncident, MapFilterState } from '@/types/map';
import type { IncidentCategory } from '@/types/incident';
import {
  Navigation,
  AlertCircle,
  List,
  Map as MapIcon,
  MapPin,
  Clock,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

// Default map center: New Delhi
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 13;

// Quick jump landmark coordinates
const QUICK_JUMPS = [
  { name: 'Connaught Place', coords: [28.6315, 77.2167] as [number, number], zoom: 14 },
  { name: 'India Gate', coords: [28.6129, 77.2295] as [number, number], zoom: 14 },
  { name: 'Nehru Park', coords: [28.5915, 77.2005] as [number, number], zoom: 14 },
  { name: 'Old Delhi', coords: [28.6562, 77.241] as [number, number], zoom: 14 },
];

function MapController({
  onBoundsChange,
  targetView,
  incidents,
}: {
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  targetView: { coords: [number, number]; zoom: number } | null;
  incidents?: SafeMapIncident[];
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const b = map.getBounds();
        onBoundsChange([
          b.getWest(),
          b.getSouth(),
          b.getEast(),
          b.getNorth(),
        ]);
      }
    },
  });

  useEffect(() => {
    if (targetView) {
      map.flyTo(targetView.coords, targetView.zoom, { duration: 1.2 });
    }
  }, [map, targetView]);

  useEffect(() => {
    if (incidents && incidents.length > 0 && !hasFittedRef.current && !targetView) {
      hasFittedRef.current = true;
      const validCoords = incidents
        .filter((inc) => inc.location && inc.location.coordinates && inc.location.coordinates.length === 2)
        .map((inc) => [inc.location.coordinates[1], inc.location.coordinates[0]] as [number, number]);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    }
  }, [map, incidents, targetView]);

  return null;
}

function UserLocationMarker({ position }: { position: [number, number] }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'safemap-user-location-marker',
        html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: #3B82F6; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; inset: 3px; border-radius: 50%; background: #2563EB; border: 2px solid #FFFFFF; box-shadow: 0 0 10px rgba(37,99,235,0.8);"></div>
        </div>
      `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  return (
    <>
      <Marker position={position} icon={icon}>
        <Popup className="safemap-incident-popup">
          <div className="p-2 text-xs text-white bg-slate-950 rounded-lg">
            <p className="font-bold text-brand-400">Your Approximate Location</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Determined via browser GPS</p>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={position}
        radius={250}
        pathOptions={{
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          color: '#3B82F6',
          weight: 1,
          dashArray: '3, 6',
        }}
      />
    </>
  );
}

export function PublicMapPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [incidents, setIncidents] = useState<SafeMapIncident[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetView, setTargetView] = useState<{ coords: [number, number]; zoom: number } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Mobile View Toggle: 'map' vs 'list'
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  // Selected incident details panel / bottom sheet state
  const [selectedIncident, setSelectedIncident] = useState<SafeMapIncident | null>(null);

  // Filter state
  const [filters, setFilters] = useState<MapFilterState>({
    category: 'all',
    status: 'all',
    timeRange: 'all',
    searchQuery: '',
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get<{ data: IncidentCategory[] }>('/incidents/categories');
        setCategories(res.data.data || []);
      } catch (err) {
        // Fallback default
      }
    };
    fetchCategories();
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};

      if (filters.category !== 'all') params.category = filters.category;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.timeRange !== 'all') params.timeRange = filters.timeRange;

      const res = await api.get<{ data: SafeMapIncident[]; count: number }>(
        '/incidents/map',
        { params }
      );

      setIncidents(res.data.data || []);
    } catch (err: any) {
      showToast('error', 'Failed to update map incidents. Please check connection.', 'Map Error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const visibleIncidents = useMemo(() => {
    if (!filters.searchQuery.trim()) return incidents;
    const query = filters.searchQuery.toLowerCase().trim();
    return incidents.filter(
      (inc) =>
        inc.title.toLowerCase().includes(query) ||
        inc.trackingId.toLowerCase().includes(query) ||
        inc.approximateAddress.toLowerCase().includes(query) ||
        inc.categoryName.toLowerCase().includes(query)
    );
  }, [incidents, filters.searchQuery]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('warning', 'Geolocation is not supported by your browser.', 'Location Unavailable');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setTargetView({ coords, zoom: 15 });
        setIsLocating(false);
        showToast('info', 'Centered map on your current location.', 'Location Updated');
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can navigate manually.';
        }
        showToast('warning', msg, 'Location Notice');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] bg-slate-950 overflow-hidden select-none flex flex-col">
      {/* Floating Filter Controls Bar */}
      <MapFilters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        totalCount={visibleIncidents.length}
        isLoading={isLoading}
      />

      {/* Floating View Switcher Button (Mobile view: Map vs List) */}
      <div className="lg:hidden absolute top-24 right-4 z-[1000]">
        <button
          onClick={() => setMobileView(mobileView === 'map' ? 'list' : 'map')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xl border border-indigo-500 hover:bg-indigo-500 transition-all active:scale-95"
        >
          {mobileView === 'map' ? (
            <>
              <List className="w-4 h-4" />
              <span>List View ({visibleIncidents.length})</span>
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4" />
              <span>Map Canvas</span>
            </>
          )}
        </button>
      </div>

      {/* Main Map View or Mobile Card List */}
      <div className="relative flex-1 w-full h-full">
        {/* Mobile List View Overlay */}
        {mobileView === 'list' && (
          <div className="lg:hidden absolute inset-0 z-20 bg-slate-950 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Incident Reports ({visibleIncidents.length})
              </span>
              <button
                onClick={() => setMobileView('map')}
                className="text-xs text-indigo-400 font-semibold flex items-center gap-1"
              >
                <MapIcon className="w-3.5 h-3.5" /> Back to Map
              </button>
            </div>

            {visibleIncidents.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold">No incidents matching filter criteria.</p>
              </div>
            ) : (
              visibleIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-600 cursor-pointer space-y-2 transition-all active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: `${inc.categoryColor}20`,
                        color: inc.categoryColor,
                        border: `1px solid ${inc.categoryColor}40`,
                      }}
                    >
                      {inc.categoryName}
                    </span>
                    <Badge status={inc.status} />
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1">{inc.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{inc.shortDescription}</p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin className="w-3 h-3 text-indigo-400 shrink-0" /> {inc.approximateAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(inc.incidentDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Floating Action Controls (Locate Me & Quick Landmark Jumps) */}
        <div className="absolute top-24 md:top-36 left-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Locate Me (Current GPS)"
            className="p-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 shadow-xl transition-colors flex items-center justify-center group"
          >
            <Navigation
              className={`w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform ${
                isLocating ? 'animate-spin' : ''
              }`}
            />
          </button>

          <div className="hidden lg:flex flex-col gap-1 p-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-xl text-[10px]">
            <span className="px-2 py-0.5 text-slate-500 font-semibold uppercase tracking-wider">
              Quick Views
            </span>
            {QUICK_JUMPS.map((jump) => (
              <button
                key={jump.name}
                onClick={() => setTargetView({ coords: jump.coords, zoom: jump.zoom })}
                className="text-left px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors truncate"
              >
                {jump.name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Legend Overlay */}
        <MapLegend />

        {/* Leaflet Map Canvas */}
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          <MapController targetView={targetView} incidents={visibleIncidents} />
          {userLocation && <UserLocationMarker position={userLocation} />}
          <MarkerClusterGroup
            incidents={visibleIncidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        </MapContainer>
      </div>

      {/* Incident Details Drawer / Bottom Sheet */}
      <Sheet
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident?.title || 'Incident Details'}
        description={`Reference ID: ${selectedIncident?.trackingId || ''}`}
        side="bottom"
        className="max-w-2xl mx-auto"
      >
        {selectedIncident && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `${selectedIncident.categoryColor}25`,
                  color: selectedIncident.categoryColor,
                  border: `1px solid ${selectedIncident.categoryColor}50`,
                }}
              >
                {selectedIncident.categoryName}
              </span>
              <Badge status={selectedIncident.status} />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-slate-200">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-semibold">{selectedIncident.approximateAddress}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Occurred on:{' '}
                  {new Date(selectedIncident.incidentDate).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Incident Description
              </h5>
              <p className="text-sm text-slate-200 leading-relaxed p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                {selectedIncident.shortDescription || 'No detailed narrative recorded.'}
              </p>
            </div>

            {selectedIncident.isVerified ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-3 text-xs text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Official Verified Incident: Law enforcement has reviewed this report and initiated official response.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center gap-3 text-xs text-amber-300">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  Unverified Citizen Submission: Pending verification by police officers.
                </span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIncident(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const id = selectedIncident.id;
                  setSelectedIncident(null);
                  navigate(`/incidents/${id}`);
                }}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Full Dossier & Chat
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
