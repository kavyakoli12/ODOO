import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Camera } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import type { Incident } from '@/types/incident';

export function IncidentCard({ incident }: { incident: Incident }) {
  const formattedDate = new Date(incident.incidentDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="hover:border-slate-700 transition-all duration-200 group flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700 shrink-0">
              {incident.trackingId}
            </span>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium truncate max-w-[160px]"
              style={{
                backgroundColor: `${incident.categoryColor}20`,
                color: incident.categoryColor,
                border: `1px solid ${incident.categoryColor}40`,
              }}
            >
              {incident.categoryName}
            </span>
          </div>

          <div className="shrink-0">
            <Badge status={incident.status} />
          </div>
        </div>

        <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-1 mb-1.5">
          {incident.title}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {incident.description}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate" title={incident.address}>{incident.address}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
            {incident.evidenceCount > 0 && (
              <span className="flex items-center gap-1 text-brand-400 shrink-0">
                <Camera className="w-3 h-3" />
                {incident.evidenceCount} {incident.evidenceCount === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
        </div>

        <Link to={`/citizen/reports/${incident.id || incident._id}`} className="shrink-0">
          <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}
