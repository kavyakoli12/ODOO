import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { MapFilters } from '@/components/map/MapFilters';
import { MarkerClusterGroup } from '@/components/map/MarkerClusterGroup';
import { MapLegend } from '@/components/map/MapLegend';
import { useToast, LoadingSpinner, Button } from '@/components/ui';
import type { SafeMapIncident, MapFilterState } from '@/types/map';
import type { IncidentCategory } from '@/types/incident';
import {
  Navigation,
  RotateCcw,
  AlertCircle,
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

// Helper component to bind map events and flyTo actions
function MapController({
  onBoundsChange,
  targetView,
}: {
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  targetView: { coords: [number, number]; zoom: number } | null;
}) {
  const map = useMap();

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

  return null;
}

// User current location pulsing pin
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
  const { showToast } = useToast();

  const [incidents, setIncidents] = useState<SafeMapIncident[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetView, setTargetView] = useState<{ coords: [number, number]; zoom: number } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<MapFilterState>({
    category: 'all',
    status: 'all',
    timeRange: 'all',
    searchQuery: '',
  });

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get<{ data: IncidentCategory[] }>('/incidents/categories');
        setCategories(res.data.data || []);
      } catch (err) {
        // Fallback default categories if offline
      }
    };
    fetchCategories();
  }, []);

  // Fetch incidents based on filters
  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};

      if (filters.category !== 'all') {
        params.category = filters.category;
      }
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.timeRange !== 'all') {
        params.timeRange = filters.timeRange;
      }

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

  // Client-side text search filtering
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

  // Handle "Locate Me"
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
          msg = 'Location permission was denied. You can still navigate the map manually.';
        }
        showToast('warning', msg, 'Location Notice');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden select-none">
      {/* Floating Filter Controls */}
      <MapFilters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        totalCount={visibleIncidents.length}
        isLoading={isLoading}
      />

      {/* Floating Action Controls (Locate Me & Quick Landmark Jumps) */}
      <div className="absolute top-24 md:top-36 left-4 z-[1000] flex flex-col gap-2">
        {/* Locate Me Button */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Locate Me (Current GPS)"
          className="p-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 shadow-xl transition-colors flex items-center justify-center group"
        >
          <Navigation
            className={`w-4 h-4 text-brand-400 group-hover:scale-110 transition-transform ${
              isLocating ? 'animate-spin' : ''
            }`}
          />
        </button>

        {/* Quick Jumps Dropdown/Pills */}
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

      {/* Empty State Banner when no incidents match */}
      {!isLoading && visibleIncidents.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] p-4 max-w-sm w-full mx-auto rounded-2xl bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl text-center space-y-2 animate-in fade-in zoom-in-95">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Incidents Found</h4>
          <p className="text-xs text-slate-400">
            No incident reports match your current category, status, or date range filter.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setFilters({
                category: 'all',
                status: 'all',
                timeRange: 'all',
                searchQuery: '',
              })
            }
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="mt-2"
          >
            Reset All Filters
          </Button>
        </div>
      )}

      {/* Loading Overlay Spinner */}
      {isLoading && (
        <div className="absolute bottom-6 left-6 z-[1000] px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs text-slate-300 shadow-xl flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Synchronizing incident coordinates...</span>
        </div>
      )}

      {/* Map Legend */}
      <MapLegend />

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* CartoDB Dark Matter Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Map Controller for Bounds & FlyTo */}
        <MapController targetView={targetView} />

        {/* User GPS location if allowed */}
        {userLocation && <UserLocationMarker position={userLocation} />}

        {/* Clustered Incident Markers */}
        <MarkerClusterGroup incidents={visibleIncidents} />
      </MapContainer>
    </div>
  );
}
