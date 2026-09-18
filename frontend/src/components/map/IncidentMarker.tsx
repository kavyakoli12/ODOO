import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { SafeMapIncident } from '@/types/map';
import {
  Shield,
  Clock,
  MapPin,
  Calendar,
  Lock,
} from 'lucide-react';

interface IncidentMarkerProps {
  incident: SafeMapIncident;
  onSelect?: (incident: SafeMapIncident) => void;
}

export function IncidentMarker({ incident, onSelect }: IncidentMarkerProps) {
  const [lng, lat] = incident.location.coordinates;

  const customIcon = useMemo(() => {
    const isVerified = incident.isVerified;
    const color = incident.categoryColor || '#3B82F6';

    const ringStyle = isVerified
      ? 'border: 2px solid #10B981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);'
      : 'border: 2px dashed #F59E0B; box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);';

    const badgeIcon = isVerified
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="#10B981" stroke="#000" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B" stroke="#000" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    const html = `
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

    return L.divIcon({
      className: 'safemap-custom-marker',
      html,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });
  }, [incident]);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(incident.incidentDate);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return incident.incidentDate;
    }
  }, [incident.incidentDate]);

  return (
    <Marker
      position={[lat, lng]}
      icon={customIcon}
      eventHandlers={{
        click: () => onSelect && onSelect(incident),
      }}
    >
      <Popup className="safemap-incident-popup" maxWidth={320} minWidth={260}>
        <div className="p-3 text-slate-100 bg-slate-950 rounded-xl border border-slate-800/80 font-sans shadow-2xl">
          {/* Verification Status Banner */}
          <div className="mb-2">
            {incident.isVerified ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Shield className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>Official Verified Incident</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span>Unverified Citizen Report</span>
              </div>
            )}
          </div>

          {/* Category & Tracking ID */}
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{
                backgroundColor: `${incident.categoryColor}20`,
                color: incident.categoryColor,
                border: `1px solid ${incident.categoryColor}40`,
              }}
            >
              {incident.categoryName}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {incident.trackingId}
            </span>
          </div>

          {/* Incident Title */}
          <h4 className="text-sm font-bold text-white mb-1.5 leading-snug line-clamp-2">
            {incident.title}
          </h4>

          {/* Severity Dots */}
          <div className="flex items-center gap-1 mb-2 text-[10px] text-slate-400">
            <span>Severity:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <span
                  key={lvl}
                  className={`w-2 h-2 rounded-full ${
                    lvl <= incident.severity
                      ? incident.severity >= 4
                        ? 'bg-rose-500'
                        : incident.severity >= 3
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 ml-1">
              (Level {incident.severity})
            </span>
          </div>

          {/* Description Snippet */}
          <p className="text-xs text-slate-300 leading-relaxed mb-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
            {incident.shortDescription || 'No narrative provided.'}
          </p>

          {/* Location & Time metadata */}
          <div className="space-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 leading-tight">
                {incident.approximateAddress}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[9px] text-slate-500">
            <Lock className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
            <span>Exact location generalized to protect citizen privacy.</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
