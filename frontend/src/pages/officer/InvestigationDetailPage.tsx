import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  Building,
  MapPin,
  Calendar,
  Send,
  UserCheck,
  ChevronRight,
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
import type {
  Investigation,
  InvestigationStatus,
  InvestigationPriority,
  OfficerUser,
} from '@/types/investigation';

export function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Officers list for assignment
  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Add Note State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Status Change / Resolution Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchInvestigationDetail = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const res = await api.get<{ success: boolean; data: Investigation }>(
        `/investigations/${id}`
      );
      setInvestigation(res.data.data);
      setSelectedOfficerId(res.data.data.leadOfficerId);
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to load investigation dossier.',
        'Error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const res = await api.get<{ success: boolean; data: OfficerUser[] }>(
        '/investigations/officers'
      );
      setOfficers(res.data.data || []);
    } catch (err) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchInvestigationDetail();
    fetchOfficers();
  }, [id]);

  // Handle Officer Assignment
  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedOfficerId) return;

    try {
      setIsAssigning(true);
      const res = await api.patch<{
        success: boolean;
        message: string;
        data: Investigation;
      }>(`/investigations/${id}/assign`, {
        leadOfficerId: selectedOfficerId,
      });

      setInvestigation(res.data.data);
      showToast('success', res.data.message, 'Officer Assigned');
      setIsAssignModalOpen(false);
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to assign officer.',
        'Assignment Error'
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Add Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNoteContent.trim()) return;

    try {
      setIsAddingNote(true);
      const res = await api.post<{
        success: boolean;
        message: string;
        data: Investigation;
      }>(`/investigations/${id}/notes`, {
        content: newNoteContent.trim(),
      });

      setInvestigation(res.data.data);
      setNewNoteContent('');
      showToast('success', res.data.message, 'Confidential Note Logged');
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to record internal note.',
        'Note Error'
      );
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (status: InvestigationStatus, notes?: string) => {
    if (!id) return;

    try {
      setIsUpdatingStatus(true);
      const res = await api.patch<{
        success: boolean;
        message: string;
        data: Investigation;
      }>(`/investigations/${id}/status`, {
        status,
        resolutionNotes: notes,
      });

      setInvestigation(res.data.data);
      showToast('success', res.data.message, 'Status Updated');
      if (status === 'closed') {
        setIsResolveModalOpen(false);
        setResolutionNotes('');
      }
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to update status.',
        'Status Error'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getPriorityBadge = (priority: InvestigationPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="danger">CRITICAL PRIORITY</Badge>;
      case 'high':
        return <Badge variant="warning">HIGH PRIORITY</Badge>;
      case 'medium':
        return <Badge variant="info">MEDIUM PRIORITY</Badge>;
      case 'low':
        return <Badge variant="default">LOW PRIORITY</Badge>;
    }
  };

  const getStatusBadge = (status: InvestigationStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Investigation
          </span>
        );
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Case Open
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Suspended
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved / Closed
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="Retrieving police investigation dossier..." />
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Case File Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested investigation file does not exist or has been archived.
        </p>
        <Button variant="primary" size="sm" onClick={() => navigate('/officer/investigations')}>
          Back to Investigations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/officer/investigations"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Active Investigations
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Case Reference:</span>
          <span className="font-mono text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {investigation.caseNumber}
          </span>
        </div>
      </div>

      {/* Case Header Card */}
      <Card className="border-indigo-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded border border-indigo-500/30">
                {investigation.caseNumber}
              </span>
              {getPriorityBadge(investigation.priority)}
              {getStatusBadge(investigation.status)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {investigation.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Initiated: {new Date(investigation.createdAt).toLocaleDateString()} at{' '}
                {new Date(investigation.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Lead Officer: <strong>{investigation.leadOfficerName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            {investigation.status !== 'closed' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsResolveModalOpen(true)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md"
              >
                Resolve / Close Case
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Overview, Linked Incident, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resolution Findings Banner if Closed */}
          {investigation.status === 'closed' && (
            <Card className="border-purple-500/30 bg-purple-950/20 p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                      Formal Case Resolution Findings
                    </h3>
                    <span className="text-[10px] text-purple-400 font-mono">
                      Closed {investigation.closedAt ? new Date(investigation.closedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    {investigation.resolutionNotes || 'Investigation concluded with verified findings.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Case Scope & Objective */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                  Investigative Scope & Objectives
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {investigation.description}
              </p>
            </CardContent>
          </Card>

          {/* Linked Incident Dossier Card */}
          {investigation.incident && (
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                    Linked Citizen Incident Report
                  </CardTitle>
                </div>
                <Link
                  to={`/officer/incidents/${investigation.incident.id}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  View Incident Review <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {investigation.incident.trackingId}
                    </span>
                    <Badge variant="info">{investigation.incident.categoryName}</Badge>
                    <span className="text-xs text-slate-400">
                      Severity: Level {investigation.incident.severity} / 5
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Incident Date: {new Date(investigation.incident.incidentDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-xs font-medium text-white">
                  {investigation.incident.title}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {investigation.incident.description}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                  <span className="truncate">{investigation.incident.address}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity & Forensics Timeline */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                    Investigation & Forensics Timeline
                  </CardTitle>
                </div>
                <span className="text-[10px] text-slate-400">
                  {investigation.timeline?.length || 0} Total Events Logged
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {investigation.timeline?.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">
                  No timeline events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {investigation.timeline?.map((event, idx) => (
                    <div key={event.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-950" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                            {event.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(event.createdAt).toLocaleDateString()} &bull;{' '}
                            {new Date(event.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {event.description}
                        </p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Logged by: {event.officerName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Officer Assignment, Status Controls, Confidential Notes */}
        <div className="space-y-6">
          {/* Officer Assignment Box */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">
                  Lead Detective
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-[11px] h-7 px-2"
              >
                Reassign
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  {investigation.leadOfficerName ? investigation.leadOfficerName.slice(0, 2).toUpperCase() : 'LE'}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {investigation.leadOfficerName}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Lead Investigating Officer
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    ID: {investigation.leadOfficerId.slice(-6)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confidential Internal Notes Feed */}
          <Card className="border-rose-500/20 bg-slate-900/60 shadow-lg">
            <CardHeader className="pb-3 border-b border-rose-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <CardTitle className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    Confidential Notes
                  </CardTitle>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  INTERNAL ONLY
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Protected by authority clearance. Never exposed to ordinary citizens.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record confidential detective findings, witness debriefs, suspect vehicles..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                  required
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    isLoading={isAddingNote}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Add Confidential Note
                  </Button>
                </div>
              </form>

              {/* Notes Feed */}
              <div className="space-y-3 pt-2 max-h-96 overflow-y-auto pr-1">
                {investigation.internalNotes?.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">
                    No confidential notes recorded yet.
                  </div>
                ) : (
                  investigation.internalNotes
                    ?.slice()
                    .reverse()
                    .map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-300 flex items-center gap-1">
                            <User className="w-3 h-3 text-rose-400" />
                            {note.authorName} {note.authorBadge ? `(${note.authorBadge})` : ''}
                          </span>
                          <span>
                            {new Date(note.createdAt).toLocaleDateString()} at{' '}
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[11px]">
                          {note.content}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reassign Officer Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Reassign Lead Investigating Officer"
        description="Transfer case leadership and investigative authority to another verified officer."
      >
        <form onSubmit={handleAssignOfficer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Select Available Officer
            </label>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
              required
            >
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name} ({officer.badgeNumber || 'Officer'} &bull; {officer.department || officer.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isAssigning}
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Resolve / Close Case Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Resolve & Close Investigation"
        description="Document final investigative findings. This will officially resolve the case and update the linked incident."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Resolution Findings & Case Concluding Summary *
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Suspect apprehended, property recovered, matter referred to judicial prosecutor. Public safety hazard eliminated."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Incident Status Synchronization
            </div>
            <p className="text-[11px] text-emerald-400/80">
              Closing this investigation will synchronize the linked incident report status to <strong>RESOLVED</strong>. Citizens tracking their report will see that their incident was officially resolved.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResolveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isUpdatingStatus}
              onClick={() => handleUpdateStatus('closed', resolutionNotes)}
              disabled={!resolutionNotes.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Sign-Off & Close Case
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
