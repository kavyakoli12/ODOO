import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { SafeMapIncident } from '@/types/map';

interface MarkerClusterGroupProps {
  incidents: SafeMapIncident[];
  onSelectIncident?: (incident: SafeMapIncident) => void;
  renderMarkerContent?: (incident: SafeMapIncident) => string;
}

export function MarkerClusterGroup({
  incidents,
  onSelectIncident,
}: MarkerClusterGroupProps) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Create Leaflet MarkerClusterGroup with dark styling
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let sizeClass = 'w-9 h-9 text-xs';
        let bgStyle = 'background: rgba(59, 130, 246, 0.85); border: 2px solid #60A5FA; box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);';

        if (count > 20) {
          sizeClass = 'w-12 h-12 text-sm';
          bgStyle = 'background: rgba(239, 68, 68, 0.85); border: 2px solid #F87171; box-shadow: 0 0 16px rgba(239, 68, 68, 0.6);';
        } else if (count > 8) {
          sizeClass = 'w-10 h-10 text-xs';
          bgStyle = 'background: rgba(245, 158, 11, 0.85); border: 2px solid #FBBF24; box-shadow: 0 0 14px rgba(245, 158, 11, 0.6);';
        }

        return L.divIcon({
          html: `
            <div style="${bgStyle}" class="${sizeClass} rounded-full flex items-center justify-center font-bold text-white tracking-wider cursor-pointer transform hover:scale-105 transition-transform duration-150">
              <span>${count}</span>
            </div>
          `,
          className: 'safemap-marker-cluster',
          iconSize: L.point(40, 40),
        });
      },
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    // Populate markers
    incidents.forEach((incident) => {
      const [lng, lat] = incident.location.coordinates;
      const isVerified = incident.isVerified;
      const color = incident.categoryColor || '#3B82F6';

      const ringStyle = isVerified
        ? 'border: 2px solid #10B981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);'
        : 'border: 2px dashed #F59E0B; box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);';

      const badgeIcon = isVerified
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="#10B981" stroke="#000" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B" stroke="#000" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

      const markerHtml = `
        <div style="position: relative; width: 34px; height: 34px; cursor: pointer;">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #0F172A;
            ${ringStyle}
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${color};
          ">
            <span style="font-size: 15px;">●</span>
          </div>
          <div style="
            position: absolute;
            top: -2px;
            right: -2px;
            background: #020617;
            border-radius: 50%;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${badgeIcon}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'safemap-custom-marker',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Build safe popup HTML
      const statusBanner = isVerified
        ? `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34D399;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            OFFICIAL VERIFIED INCIDENT
           </div>`
        : `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);color:#FBBF24;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            UNVERIFIED CITIZEN REPORT
           </div>`;

      const dateStr = new Date(incident.incidentDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const popupHtml = `
        <div style="padding:10px;background:#020617;color:#F1F5F9;font-family:inherit;min-width:240px;max-width:280px;border-radius:10px;">
          ${statusBanner}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="background:${incident.categoryColor}25;color:${incident.categoryColor};border:1px solid ${incident.categoryColor}40;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;">
              ${incident.categoryName}
            </span>
            <span style="font-family:monospace;font-size:10px;color:#94A3B8;">${incident.trackingId}</span>
          </div>
          <h4 style="font-size:13px;font-weight:700;color:#FFFFFF;margin:0 0 6px 0;line-height:1.3;">
            ${incident.title}
          </h4>
          <p style="font-size:11px;color:#CBD5E1;margin:0 0 8px 0;line-height:1.4;background:#0F172A;padding:6px 8px;border-radius:6px;border:1px solid #1E293B;">
            ${incident.shortDescription || 'No narrative provided.'}
          </p>
          <div style="font-size:11px;color:#94A3B8;border-top:1px solid #1E293B;padding-top:6px;display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="color:#60A5FA;">📍</span>
              <span style="color:#E2E8F0;">${incident.approximateAddress}</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span>🕒</span>
              <span>${dateStr}</span>
            </div>
          </div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(30,41,59,0.8);font-size:9px;color:#64748B;">
            🔒 Exact residential details generalized for citizen privacy.
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectIncident) {
          onSelectIncident(incident);
        }
      });

      clusterGroup.addLayer(marker);
    });

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, incidents, onSelectIncident]);

  return null;
}
