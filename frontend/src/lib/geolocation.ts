/**
 * Trinetra High-Resilience Geolocation & Mapping Utility
 * - Two-tier resolution (Fast low-accuracy first, then optional high-accuracy)
 * - Zero blocking alert() modals
 * - Automatic persistence to localStorage
 * - Safe default city fallback (Ahmedabad: [23.0225, 72.5714])
 * - Reverse-geocoding in-memory cache to prevent Nominatim rate-limits
 */

export interface FastCoords {
  lat: number;
  lng: number;
}

export interface GeolocationResult {
  coords: FastCoords;
  source: 'gps' | 'wifi_ip' | 'cached' | 'preset' | 'default';
  isFallback: boolean;
  message?: string;
}

// Default anchor: Ahmedabad, Gujarat (central hub for current active incidents)
export const DEFAULT_COORDS: FastCoords = {
  lat: 23.0225,
  lng: 72.5714,
};

// Popular Presentation & Demo Presets for 1-click live showcase
export const DEMO_LOCATION_PRESETS: Array<{
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  address: string;
  badge?: string;
}> = [
  {
    id: 'asarva',
    name: 'Asarva Taluka, Ahmedabad',
    shortName: 'Asarva (Red Zone)',
    lat: 23.0456,
    lng: 72.6078,
    address: 'Asarva Taluka, Ahmedabad, Gujarat, 382424, India',
    badge: 'Red Zone Demo',
  },
  {
    id: 'motera',
    name: 'Narendra Modi Stadium, Motera',
    shortName: 'Motera Stadium',
    lat: 23.0924,
    lng: 72.5976,
    address: 'Stadium Rd, Motera, Ahmedabad, Gujarat 380005, India',
  },
  {
    id: 'navrangpura',
    name: 'Navrangpura / CG Road',
    shortName: 'CG Road Central',
    lat: 23.0373,
    lng: 72.5524,
    address: 'CG Road, Navrangpura, Ahmedabad, Gujarat 380009, India',
  },
  {
    id: 'connaught',
    name: 'Connaught Place, New Delhi',
    shortName: 'CP Inner Circle',
    lat: 28.6315,
    lng: 77.2195,
    address: 'Block A, Connaught Place, New Delhi, Delhi 110001, India',
  },
];

// In-memory Reverse Geocode Cache: Key = "lat_round,lng_round" (~100m grid)
const reverseGeocodeCache = new Map<string, string>();

/**
 * Returns the last known coordinates stored in localStorage if available
 */
export function getSavedLastKnownLocation(): FastCoords | null {
  try {
    const raw = localStorage.getItem('safemap_last_coords');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {}
  return null;
}

/**
 * Persists known good coordinates to localStorage
 */
export function saveLastKnownLocation(coords: FastCoords): void {
  try {
    localStorage.setItem('safemap_last_coords', JSON.stringify(coords));
  } catch {}
}

/**
 * Resolves user coordinates using a fast two-tier approach:
 * 1. Low accuracy (Wi-Fi/IP database) with a short 3.5-second timeout (avoids hardware GPS spin-up).
 * 2. If it times out or fails, gracefully falls back to last-known or default anchor without blocking.
 */
export async function getFastCurrentPosition(options?: {
  preferHighAccuracy?: boolean;
  timeoutMs?: number;
}): Promise<GeolocationResult> {
  // If browser doesn't support geolocation
  if (!navigator.geolocation) {
    const saved = getSavedLastKnownLocation() || DEFAULT_COORDS;
    return {
      coords: saved,
      source: saved === DEFAULT_COORDS ? 'default' : 'cached',
      isFallback: true,
      message: 'Geolocation is not supported by your browser.',
    };
  }

  const timeoutMs = options?.timeoutMs || 4000;

  // Try fast low-accuracy first
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: options?.preferHighAccuracy || false,
        timeout: timeoutMs,
        maximumAge: 120000, // Accept cached position up to 2 mins
      });
    });

    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    saveLastKnownLocation(coords);

    return {
      coords,
      source: options?.preferHighAccuracy ? 'gps' : 'wifi_ip',
      isFallback: false,
    };
  } catch (err: any) {
    // If fast resolution timed out or failed, try cached or default location gracefully
    const saved = getSavedLastKnownLocation();
    if (saved) {
      return {
        coords: saved,
        source: 'cached',
        isFallback: true,
        message: 'GPS signal slow. Loaded your last known location.',
      };
    }

    return {
      coords: DEFAULT_COORDS,
      source: 'default',
      isFallback: true,
      message: 'Location unavailable. Map centered on Ahmedabad city hub.',
    };
  }
}

/**
 * Cached reverse geocoding with OpenStreetMap Nominatim
 */
export async function cachedReverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        reverseGeocodeCache.set(cacheKey, data.display_name);
        return data.display_name;
      }
    }
  } catch {}

  const fallback = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
  reverseGeocodeCache.set(cacheKey, fallback);
  return fallback;
}
