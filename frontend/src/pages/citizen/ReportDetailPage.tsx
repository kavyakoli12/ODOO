import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  Shield,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Eye,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '@/types/incident';
import { ConversationPanel } from '@/components/incidents/ConversationPanel';


const miniPinIcon = L.divIcon({
  html: `
    <div style="background-color: #4F46E5; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.5);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `,
  className: 'custom-leaflet-pin-mini',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/incidents/${id}`);
        if (res.data.success && res.data.data) {
          setIncident(res.data.data);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
            'Incident report not found or you do not have permission to view it.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchIncident();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" label="Loading incident report details..." />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-md mx-auto my-16 text-center">
        <Card className="border-rose-800/40 bg-slate-950/80 p-6">
          <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 mx-auto mb-3">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Access Denied / Not Found</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {error || 'The requested incident report could not be found or you do not have permission to access it.'}
          </p>
          <Link to="/citizen/reports">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to My Reports
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const [lng, lat] = incident.location.coordinates;
  const formattedOccurred = new Date(incident.incidentDate).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const formattedSubmitted = new Date(incident.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between">
        <Link to="/citizen/reports" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to My Reports
        </Link>
        <span className="font-mono text-xs text-slate-500 font-semibold">
          REF: {incident.trackingId}
        </span>
      </div>

      {/* Official Unverified Incident Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-xs text-amber-200 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-semibold text-white">Unverified Citizen Report Status:</span>
          <p className="text-slate-300 text-[11px]">
            This submission is currently marked as <strong className="text-amber-300 uppercase">SUBMITTED</strong>. It represents citizen-reported information and has not yet been verified or classified as a confirmed crime by law enforcement authorities.
          </p>
        </div>
      </div>

      {/* Incident Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-brand-300 border border-slate-700">
                {incident.trackingId}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${incident.categoryColor}20`,
                  color: incident.categoryColor,
                  border: `1px solid ${incident.categoryColor}40`,
                }}
              >
                {incident.categoryName}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Severity Level {incident.severity} / 5
              </span>
            </div>

            <Badge status={incident.status} />
          </div>

          <CardTitle className="text-xl sm:text-2xl text-white font-bold tracking-tight">
            {incident.title}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Occurred: <strong className="text-slate-200">{formattedOccurred}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Submitted: <span className="text-slate-300">{formattedSubmitted}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 border-t border-slate-800">
          {/* Narrative Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-400" />
              Incident Narrative
            </h4>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {incident.description}
            </div>
          </div>

          {/* Location & Mini Map Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-400" />
              Location Details
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-slate-300 font-medium">
                  {incident.address}
                </div>
                <div className="font-mono text-[11px] text-brand-300 shrink-0">
                  {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
                </div>
              </div>

              {/* Leaflet Mini Map Display */}
              <div className="h-48 w-full rounded-lg overflow-hidden border border-slate-800 relative z-0">
                <MapContainer
                  center={[lat, lng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  dragging={false}
                  zoomControl={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]} icon={miniPinIcon} />
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Photo Evidence Gallery */}
          {incident.evidence && incident.evidence.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-400" />
                Attached Evidence ({incident.evidence.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {incident.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setActivePhoto(ev.fileUrl)}
                    className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer aspect-video"
                  >
                    <img
                      src={ev.fileUrl}
                      alt={ev.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status History Timeline */}
          {incident.statusHistory && incident.statusHistory.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                Report Lifecycle History
              </h4>
              <div className="space-y-2">
                {incident.statusHistory.map((hist, idx) => (
                  <div
                    key={hist.id || idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white uppercase tracking-wide text-[11px]">
                          Status set to {hist.newStatus}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(hist.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {hist.note || 'Status recorded'} by {hist.changedByRole}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 8: Citizen ↔ Authority Conversation */}
      {incident && (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <ConversationPanel incidentId={incident.id} showInternalNoteToggle={false} />
          </CardContent>
        </Card>
      )}


      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-xl">
            <img src={activePhoto} alt="Evidence view" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
