/**
 * SafeMap Centralized Map Tile Configuration
 * 
 * Uses high-reliability public GIS tile services:
 * - Completely free service with 99.9% uptime
 * - Zero "API KEY REQUIRED" watermarks
 * - No HTTP 403 access rate-limiting blocks
 * - Worldwide street-level & tactical dark canvas resolution
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

export const TACTICAL_DARK_TILE_CONFIG = {
  url:
    import.meta.env.VITE_DARK_MAP_TILE_URL ||
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong)',
  maxZoom: 19,
  maxNativeZoom: 16,
};
