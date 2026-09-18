import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  ArrowLeft,
  FileText,
  AlertTriangle,
  User,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  LoadingSpinner,
  useToast,
  Modal,
} from '@/components/ui';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '@/types/incident';
import { ConversationPanel } from '@/components/incidents/ConversationPanel';
import { OdooStatusBadge } from '@/components/odoo/OdooStatusBadge';
import { AiAssistantCard } from '@/components/ai/AiAssistantCard';


export function IncidentReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Verification modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verificationNote, setVerificationNote] = useState('');

  // Fetch incident detail
  const fetchIncidentDetail = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const res = await api.get<{ success: boolean; data: Incident }>(
        `/incidents/officer/${id}`
      );
      setIncident(res.data.data);
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to load incident detail.',
        'Error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetail();
  }, [id]);

  // Execute review action
  const handleReviewAction = async (
    action: 'start_review' | 'verify' | 'reject',
    note?: string,
    reason?: string
  ) => {
    if (!id) return;

    try {
      setIsActionLoading(true);
      const res = await api.post<{
        success: boolean;
        message: string;
        data: Incident;
      }>(`/incidents/officer/${id}/review`, {
        action,
        note,
        reason,
      });

      setIncident(res.data.data);
      showToast('success', res.data.message, 'Review Action Completed');

      if (action === 'reject') {
        setIsRejectModalOpen(false);
        setRejectionReason('');
      } else if (action === 'verify') {
        setIsVerifyModalOpen(false);
        setVerificationNote('');
      }
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Action failed.',
        'Review Error'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading incident dossier..." />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Incident Record Not Found</h3>
        <p className="text-xs text-slate-400">
          The requested incident dossier could not be retrieved or has been removed.
        </p>
        <Link to="/officer">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Queue
          </Button>
        </Link>
      </div>
    );
  }

  const [lng, lat] = incident.location.coordinates;

  const mapIcon = L.divIcon({
    className: 'safemap-review-pin',
    html: `
      <div style="width: 24px; height: 24px; border-radius: 50%; background: #EF4444; border: 3px solid #FFF; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);"></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb / Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/officer')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-brand-400">
                {incident.trackingId}
              </span>
              <Badge status={incident.status} />
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">{incident.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OdooStatusBadge incidentId={incident.id} />
          <div className="text-xs text-slate-400">
            Reported:{' '}
            <strong className="text-slate-300">
              {new Date(incident.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>
          </div>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dossier Details (2 spans) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Phase 12: AI Assistant Intelligence Panel */}
          <AiAssistantCard
            incidentId={incident.id}
            description={incident.description}
            categoryName={incident.categoryName}
            address={incident.address}
            onSelectDuplicate={(dupId) => navigate(`/officer/incidents/${dupId}`)}
          />

          {/* Narrative & Category Card */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${incident.categoryColor || '#3B82F6'}20`,
                    color: incident.categoryColor || '#3B82F6',
                    border: `1px solid ${incident.categoryColor || '#3B82F6'}40`,
                  }}
                >
                  {incident.categoryName}
                </span>

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Severity Level:</span>
                  <span className="font-bold text-white px-1.5 py-0.5 rounded bg-slate-800">
                    {incident.severity} / 5
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Citizen Incident Description
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                  {incident.description}
                </p>
              </div>

              {/* Reporter Information */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Citizen Submitter Identity
                </div>
                {incident.isAnonymous ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <EyeOff className="w-4 h-4" />
                    <span>Submitted Anonymously by Citizen</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-200">
                    <User className="w-4 h-4 text-brand-400" />
                    <span>
                      <strong>{incident.reporterName || 'Registered Citizen'}</strong> (User ID: {incident.reporterId || 'Anonymous'})
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location & Interactive Mini Map */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400" />
                Geospatial Incident Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="font-medium text-white">{incident.address}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Coordinates: {lat.toFixed(6)}° N, {lng.toFixed(6)}° E (GeoJSON Point)
                </div>
              </div>

              <div className="h-56 w-full rounded-xl overflow-hidden border border-slate-800">
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  <Marker position={[lat, lng]} icon={mapIcon} />
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {/* Attached Evidence Section */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-400" />
                Submitted Evidence ({incident.evidence?.length || incident.evidenceCount || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!incident.evidence || incident.evidence.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No photographic or document evidence attached by citizen.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {incident.evidence.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-2 group"
                    >
                      <div className="h-28 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center">
                        {ev.mimeType?.startsWith('image/') ? (
                          <img
                            src={ev.fileUrl}
                            alt={ev.originalFilename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {ev.originalFilename}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Authority Review Action Panel & Audit Timeline */}
        <div className="space-y-5">
          {/* Review Action Card */}
          <Card className="border-indigo-500/30 bg-slate-900/90 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <CardTitle className="text-sm font-bold text-white">
                  Officer Review Controls
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Current Status Overview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Current Official Status
                </div>
                <div className="flex items-center justify-between">
                  <Badge status={incident.status} />
                  <span className="text-[11px] text-slate-400 font-mono">
                    {incident.status === 'verified'
                      ? 'Live on Public Map'
                      : incident.status === 'rejected'
                      ? 'Disqualified'
                      : 'Unverified Intake'}
                  </span>
                </div>
              </div>

              {/* Available State Transitions based on current status */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Review Actions
                </div>

                {incident.status === 'submitted' && (
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      isLoading={isActionLoading}
                      onClick={() => handleReviewAction('start_review')}
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      Start Official Review
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => setIsVerifyModalOpen(true)}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Fast-Track Verify
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      className="w-full"
                      onClick={() => setIsRejectModalOpen(true)}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Reject Report
                    </Button>
                  </div>
                )}

                {incident.status === 'under_review' && (
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => setIsVerifyModalOpen(true)}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Verify Incident
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      className="w-full"
                      onClick={() => setIsRejectModalOpen(true)}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Reject Report
                    </Button>
                  </div>
                )}

                {incident.status === 'verified' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Officially Verified Incident
                      </div>
                      <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                        This incident has been validated by law enforcement and is published on the interactive incident map.
                      </p>
                    </div>

                    <Link to={`/officer/investigations?newFor=${incident.id}`} className="block">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white font-semibold shadow-md"
                        leftIcon={<Shield className="w-4 h-4" />}
                      >
                        Initiate Formal Investigation
                      </Button>
                    </Link>
                  </div>
                )}

                {incident.status === 'investigation_ongoing' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                        <Shield className="w-4 h-4" />
                        Investigation Ongoing
                      </div>
                      <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                        A formal police inquiry is actively progressing for this verified incident.
                      </p>
                    </div>

                    <Link to="/officer/investigations" className="block">
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                        leftIcon={<FileText className="w-4 h-4" />}
                      >
                        Go to Investigations Dossier
                      </Button>
                    </Link>
                  </div>
                )}

                {incident.status === 'resolved' && (
                  <div className="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Incident Formally Resolved
                    </div>
                    <p className="text-[11px] text-purple-300/80 leading-relaxed">
                      Investigation concluded. Summary: {incident.resolutionSummary || 'Case findings recorded.'}
                    </p>
                  </div>
                )}


                {incident.status === 'rejected' && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-400">
                      <XCircle className="w-4 h-4" />
                      Report Disqualified / Rejected
                    </div>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      Reason: {incident.rejectionReason || 'Duplicate or insufficient evidence.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Audit History Timeline */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">
                  Status History Audit Trail
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {!incident.statusHistory || incident.statusHistory.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No status transitions recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-800">
                  {incident.statusHistory.map((h: any) => (
                    <div key={h.id} className="relative text-xs space-y-1">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-brand-500" />

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white capitalize">
                          {h.newStatus.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(h.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 capitalize">
                        Changed by: <strong>{h.changedByRole}</strong>
                      </div>

                      {(h.note || h.reason) && (
                        <p className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                          {h.note || h.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verify Modal with Official Note */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Confirm Official Incident Verification"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            You are about to verify incident <strong>{incident.trackingId}</strong> as an authentic crime occurrence. This will advance its status to <strong>VERIFIED</strong> and make it visible on the public safety map.
          </p>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Official Verification Note (Optional)
            </label>
            <textarea
              value={verificationNote}
              onChange={(e) => setVerificationNote(e.target.value)}
              placeholder="e.g. CCTV footage confirmed incident. Patrol unit completed initial assessment."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVerifyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isActionLoading}
              onClick={() => handleReviewAction('verify', verificationNote)}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Confirm Verification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rejection Modal with Required Reason */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Incident Report"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Please state the official rationale for rejecting report <strong>{incident.trackingId}</strong>. The reason will be recorded in the audit trail.
          </p>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              Rejection Rationale * (Required)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Duplicate report of INC-2026-00041 / Inconclusive evidence provided."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!rejectionReason.trim()}
              isLoading={isActionLoading}
              onClick={() => handleReviewAction('reject', undefined, rejectionReason)}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 8: Conversation panel between officer and citizen */}
      {incident && (
        <div className="mt-6">
          <ConversationPanel incidentId={incident.id} showInternalNoteToggle={true} />
        </div>
      )}
    </div>
  );
}
