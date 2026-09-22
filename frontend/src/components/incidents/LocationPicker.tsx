import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Search, Loader2, Sparkles } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';
import { MAP_TILE_CONFIG } from '@/lib/mapConfig';
import {
  getFastCurrentPosition,
  cachedReverseGeocode,
  DEMO_LOCATION_PRESETS,
  DEFAULT_COORDS,
} from '@/lib/geolocation';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon issue with bundlers
const customMarkerIcon = L.divIcon({
  html: `
    <div style="background-color: #4F46E5; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.5);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `,
  className: 'custom-leaflet-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  address: string;
  onChange: (lat: number, lng: number, address: string) => void;
}

// Map events handler to capture user clicks
function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sub-component to programmatically fly to updated center
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

export function LocationPicker({ latitude, longitude, address, onChange }: LocationPickerProps) {
  const { showToast } = useToast();
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Cached reverse geocode coordinates to street address
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const display = await cachedReverseGeocode(lat, lng);
      onChange(lat, lng, display);
    } catch {
      onChange(lat, lng, address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLocationNotice(null);
    reverseGeocode(lat, lng);
  };

  // Fast, non-blocking GPS detection with seamless fallback (never uses window.alert)
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationNotice(null);

    try {
      const result = await getFastCurrentPosition({ preferHighAccuracy: false, timeoutMs: 3500 });
      setIsLocating(false);

      reverseGeocode(result.coords.lat, result.coords.lng);

      if (result.isFallback) {
        const msg = result.message || 'Position resolved to approximate city area.';
        setLocationNotice(msg);
        showToast('info', `${msg} Click anywhere on the map to fine-tune.`, 'Location Positioned');
      } else {
        showToast('success', 'Current position acquired successfully.', 'GPS Locked');
      }
    } catch {
      setIsLocating(false);
      onChange(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, 'Ahmedabad, Gujarat, India');
      setLocationNotice('Location signal unavailable. Map centered on Ahmedabad city hub.');
      showToast('warning', 'Location signal unavailable. Center set to Ahmedabad.', 'Location Fallback');
    }
  };

  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchAddress = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    setIsGeocoding(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          onChange(lat, lng, first.display_name);
          setSearchError(null);
        } else {
          setSearchError('Location not found. Try entering a city or landmark, or click on the map.');
        }
      } else {
        setSearchError('Could not reach geocoding service. Click directly on the map to place a pin.');
      }
    } catch (err) {
      setSearchError('Network error searching location. Click directly on the map.');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search & GPS Tool Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search address or area (e.g. Connaught Place)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchError) setSearchError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSearchAddress();
              }
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={isGeocoding}
            onClick={() => handleSearchAddress()}
            className="shrink-0"
          >
            Find
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          isLoading={isLocating}
          leftIcon={<Navigation className="w-3.5 h-3.5 text-brand-400" />}
          className="shrink-0"
        >
          Use My GPS
        </Button>
      </div>

      {/* 1-Click Presentation & Demo Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-slate-400 font-semibold shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Demo Presets:
        </span>
        {DEMO_LOCATION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              setLocationNotice(null);
              setSearchError(null);
              onChange(preset.lat, preset.lng, preset.address);
              showToast('info', `Pinned to ${preset.name}`, 'Preset Selected');
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-[11px] text-slate-200 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>📍</span>
            <span>{preset.shortName}</span>
            {preset.badge && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                {preset.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {locationNotice && (
        <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-[11px] text-cyan-200 flex items-center justify-between">
          <span>ℹ️ {locationNotice}</span>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="text-cyan-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {searchError && (
        <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300">
          {searchError}
        </div>
      )}

      {/* Leaflet Interactive Map Container */}
      <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden border border-slate-700 shadow-inner relative z-0">
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution={MAP_TILE_CONFIG.attribution}
            url={MAP_TILE_CONFIG.url}
            maxZoom={MAP_TILE_CONFIG.maxZoom}
          />
          <Marker position={[latitude, longitude]} icon={customMarkerIcon} />
          <MapClickHandler onSelect={handleMapClick} />
          <MapFlyTo lat={latitude} lng={longitude} />
        </MapContainer>

        {isGeocoding && (
          <div className="absolute top-3 right-3 z-[1000] px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-brand-300 flex items-center gap-2 shadow-lg backdrop-blur">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Resolving address...</span>
          </div>
        )}
      </div>

      {/* Selected Address & Coordinates Indicator */}
      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-brand-400" />
            Selected Incident Coordinates:
          </span>
          <span className="font-mono text-[11px] text-brand-300">
            {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
          </span>
        </div>
        <Input
          label="Confirmed Street Address / Landmark Description"
          value={address}
          onChange={(e) => onChange(latitude, longitude, e.target.value)}
          placeholder="e.g. Near Metro Station Gate 3, Sector 4..."
          required
        />
        <p className="text-[10px] text-slate-500">
          Tip: Click anywhere on the map or drag the pin to refine the exact location.
        </p>
      </div>
    </div>
  );
}
