/**
 * SafeMap Centralized Map Tile Configuration
 * 
 * Uses Esri World Street Map tiles by default:
 * - Completely free public service with high reliability
 * - Zero "API KEY REQUIRED" watermark
 * - No HTTP 403 access blocks
 * - Worldwide street-level resolution
 * 
 * Allows optional override via VITE_MAP_TILE_URL or VITE_CARTO_API_KEY.
 */

const cartoKey = import.meta.env.VITE_CARTO_API_KEY;

export const MAP_TILE_CONFIG = {
  url:
    import.meta.env.VITE_MAP_TILE_URL ||
    (cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'),
  attribution: cartoKey
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom',
  maxZoom: 19,
};
