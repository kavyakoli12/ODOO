import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { MAP_TILE_CONFIG } from '@/lib/mapConfig';
import { getFastCurrentPosition } from '@/lib/geolocation';
import { MapFilters } from '@/components/map/MapFilters';
import { MarkerClusterGroup } from '@/components/map/MarkerClusterGroup';
import { MapLegend } from '@/components/map/MapLegend';
import { useToast, Button, Badge, Sheet } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
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

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function SearchedLocationMarker({ position, label }: { position: [number, number]; label: string }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'trinetra-searched-marker',
        html: `
        <div style="position: relative; width: 30px; height: 30px;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: #F59E0B; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; inset: 3px; border-radius: 50%; background: #D97706; border: 2px solid #FFFFFF; box-shadow: 0 0 12px rgba(217,119,6,0.9); display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
      `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    []
  );

  return (
    <>
      <Marker position={position} icon={icon}>
        <Popup className="safemap-incident-popup">
          <div className="p-2.5 text-xs text-white bg-slate-950 rounded-xl space-y-1">
            <p className="font-bold text-amber-400">📍 Searched Location</p>
            <p className="text-[11px] text-slate-300 leading-snug">{label}</p>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={position}
        radius={2000}
        pathOptions={{
          fillColor: '#F59E0B',
          fillOpacity: 0.08,
          color: '#F59E0B',
          weight: 1.5,
          dashArray: '4, 8',
        }}
      />
    </>
  );
}

export function PublicMapPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuthStore();

  const [incidents, setIncidents] = useState<SafeMapIncident[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetView, setTargetView] = useState<{ coords: [number, number]; zoom: number } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<{ coords: [number, number]; label: string } | null>(null);
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
    const matching = incidents.filter(
      (inc) =>
        inc.title.toLowerCase().includes(query) ||
        inc.trackingId.toLowerCase().includes(query) ||
        inc.approximateAddress.toLowerCase().includes(query) ||
        inc.categoryName.toLowerCase().includes(query)
    );
    // If text query matches specific incidents, show matching; if place name search matched 0 text fields, keep incidents visible!
    return matching.length > 0 ? matching : incidents;
  }, [incidents, filters.searchQuery]);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const result = await getFastCurrentPosition({ preferHighAccuracy: false, timeoutMs: 3500 });
      const coords: [number, number] = [result.coords.lat, result.coords.lng];
      setUserLocation(coords);
      setTargetView({ coords, zoom: 15 });
      setIsLocating(false);

      if (result.isFallback) {
        showToast('info', result.message || 'Centered map on approximate area.', 'Location Positioned');
      } else {
        showToast('info', 'Centered map on your current location.', 'Location Updated');
      }
    } catch {
      setIsLocating(false);
      showToast('warning', 'Location signal unavailable. You can pan and zoom the map manually.', 'Location Notice');
    }
  };

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const handleLocationSearch = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSearchedLocation(null);
      return;
    }

    // 1. Check if an incident matches title, trackingId, category, or approximateAddress
    const matchingInc = incidents.find(
      (inc) =>
        inc.title.toLowerCase().includes(q.toLowerCase()) ||
        inc.trackingId.toLowerCase().includes(q.toLowerCase()) ||
        inc.approximateAddress.toLowerCase().includes(q.toLowerCase()) ||
        inc.categoryName.toLowerCase().includes(q.toLowerCase())
    );

    if (matchingInc) {
      const [lng, lat] = matchingInc.location.coordinates;
      setTargetView({ coords: [lat, lng], zoom: 16 });
      setSelectedIncident(matchingInc);
      showToast('info', `Found incident: [${matchingInc.trackingId}] ${matchingInc.title}`, 'Incident Found');
      return;
    }

    // 2. Geocode location via OpenStreetMap Nominatim
    setIsSearchingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          const placeLabel = results[0].display_name;
          const shortName = placeLabel.split(',')[0];

          setSearchedLocation({ coords: [lat, lon], label: placeLabel });
          setTargetView({ coords: [lat, lon], zoom: 14 });

          // Calculate nearby incidents within 30km
          const nearby = incidents.filter((inc) => {
            if (!inc.location?.coordinates || inc.location.coordinates.length < 2) return false;
            const [iLon, iLat] = inc.location.coordinates;
            return getDistanceKm(lat, lon, iLat, iLon) <= 30;
          });

          if (nearby.length > 0) {
            showToast('success', `Moved to ${shortName}. ${nearby.length} incident(s) found in this sector.`, 'Location & Incidents Found');
          } else {
            showToast('info', `Moved to ${shortName}. Displaying all active incidents on map canvas.`, 'Location Found');
          }
        } else {
          showToast('warning', `No place or incident found matching "${q}". Try another location.`, 'Search Results');
        }
      } else {
        showToast('error', 'Geocoding service unavailable.', 'Search Error');
      }
    } catch (err) {
      showToast('error', 'Failed to search location.', 'Search Error');
    } finally {
      setIsSearchingLocation(false);
    }
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
        onSearchLocation={handleLocationSearch}
        isSearchingLocation={isSearchingLocation}
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

        {/* Floating Action Controls (Locate Me / GPS) */}
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
            attribution={MAP_TILE_CONFIG.attribution}
            url={MAP_TILE_CONFIG.url}
            maxZoom={MAP_TILE_CONFIG.maxZoom}
          />
          <MapController targetView={targetView} incidents={visibleIncidents} />
          {userLocation && <UserLocationMarker position={userLocation} />}
          {searchedLocation && <SearchedLocationMarker position={searchedLocation.coords} label={searchedLocation.label} />}
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
                  if (!isAuthenticated) {
                    showToast('info', 'Please sign in to view the full incident dossier and chat.', 'Login Required');
                    navigate(`/login?redirect=/citizen/reports/${id}`);
                    return;
                  }
                  if (user?.role === 'officer' || user?.role === 'admin') {
                    navigate(`/officer/incidents/${id}`);
                  } else {
                    navigate(`/citizen/reports/${id}`);
                  }
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
