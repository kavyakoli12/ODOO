import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  Shield,
  Search,
  PlusCircle,
  AlertTriangle,
  Clock,
  User,
  FolderOpen,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
  LoadingSpinner,
  useToast,
  Modal,
} from '@/components/ui';

import type {
  Investigation,
  InvestigationStats,
  InvestigationStatus,
  InvestigationPriority,
} from '@/types/investigation';
import type { Incident } from '@/types/incident';

export function InvestigationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [stats, setStats] = useState<InvestigationStats>({
    totalCases: 0,
    openCases: 0,
    activeCases: 0,
    suspendedCases: 0,
    closedCases: 0,
    criticalCases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [verifiedIncidents, setVerifiedIncidents] = useState<Incident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formIncidentId, setFormIncidentId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<InvestigationPriority>('medium');
  const [formInitialNote, setFormInitialNote] = useState('');

  // Auto-open create modal if url has newFor=<incidentId>
  useEffect(() => {
    const newFor = searchParams.get('newFor');
    if (newFor) {
      setFormIncidentId(newFor);
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  // Load investigations
  const fetchInvestigations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchQuery.trim()) params.append('searchQuery', searchQuery.trim());

      const res = await api.get<{
        success: boolean;
        data: { stats: InvestigationStats; investigations: Investigation[] };
      }>(`/investigations?${params.toString()}`);

      setInvestigations(res.data.data.investigations || []);
      setStats(
        res.data.data.stats || {
          totalCases: 0,
          openCases: 0,
          activeCases: 0,
          suspendedCases: 0,
          closedCases: 0,
          criticalCases: 0,
        }
      );
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to load investigations.',
        'Error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [statusFilter, priorityFilter, searchQuery]);

  // Fetch verified incidents for creation modal
  const fetchVerifiedIncidents = async () => {
    try {
      setIsLoadingIncidents(true);
      const res = await api.get<{
        success: boolean;
        data: Incident[];
      }>('/incidents/officer/queue?status=verified');
      setVerifiedIncidents(res.data.data || []);
      if (res.data.data?.length > 0 && !formIncidentId) {
        setFormIncidentId(res.data.data[0].id);
      }
    } catch (err) {
      // Fallback
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  const handleOpenCreateModal = () => {
    fetchVerifiedIncidents();
    setIsCreateModalOpen(true);
  };

  const handleCreateInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIncidentId) {
      showToast('error', 'Please select a verified incident.', 'Validation Error');
      return;
    }
    if (!formTitle.trim() || !formDescription.trim()) {
      showToast('error', 'Title and description are required.', 'Validation Error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{
        success: boolean;
        message: string;
        data: Investigation;
      }>('/investigations', {
        incidentId: formIncidentId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        priority: formPriority,
        initialNote: formInitialNote.trim() || undefined,
      });

      showToast('success', res.data.message, 'Case Initiated');
      setIsCreateModalOpen(false);
      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormInitialNote('');
      fetchInvestigations();
      // Navigate to detail
      navigate(`/officer/investigations/${res.data.data.id}`);
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.error || 'Failed to initiate investigation.',
        'Creation Failed'
      );
    } finally {
      setIsSubmitting(false);
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Investigation
          </span>
        );
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Case Open
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Suspended
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved / Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Law Enforcement Investigation Division
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PHASE 6
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Active Investigations Dossier
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Formal authority case workflow for verified incidents. Manage suspect forensic clues, assign investigating officers, log classified internal notes, and document final case resolution.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="shadow-lg shadow-brand-500/25 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold"
          >
            Initiate Investigation
          </Button>
        </div>
      </div>

      {/* Metric Statistics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Cases</span>
            <FolderOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.totalCases}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Recorded in police dossier</div>
        </Card>

        <Card className="border-emerald-500/20 bg-slate-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Active Investigations</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{stats.activeCases}</div>
          <div className="text-[10px] text-emerald-400/70 mt-0.5">Under active detective inquiry</div>
        </Card>

        <Card className="border-rose-500/20 bg-slate-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300">Critical Priority</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{stats.criticalCases}</div>
          <div className="text-[10px] text-rose-400/70 mt-0.5">Immediate threat level</div>
        </Card>

        <Card className="border-purple-500/20 bg-slate-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-300">Resolved / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 mt-2">{stats.closedCases}</div>
          <div className="text-[10px] text-purple-400/70 mt-0.5">Concluded with formal findings</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-slate-800 bg-slate-900/50 p-3 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Cases' },
              { id: 'active', label: 'Active' },
              { id: 'open', label: 'Open' },
              { id: 'suspended', label: 'Suspended' },
              { id: 'closed', label: 'Closed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Priority Selector */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter investigations by priority"
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case #, title, detective..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Case Dossier Listing */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" label="Loading police case files..." />
        </div>
      ) : investigations.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/30 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Investigations Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'No investigations match your filter criteria. Try resetting filters.'
              : 'There are currently no active investigations. Click "Initiate Investigation" to create a new case from a verified incident.'}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investigations.map((c) => (
            <Card
              key={c.id}
              className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between group overflow-hidden"
            >
              <div className="p-5 space-y-3">
                {/* Header: Case #, Status, Priority */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {c.caseNumber}
                      </span>
                      {getPriorityBadge(c.priority)}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5 group-hover:text-brand-300 transition-colors">
                      {c.title}
                    </h3>
                  </div>
                  <div>{getStatusBadge(c.status)}</div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                {/* Linked Incident Box */}
                {c.incident && (
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Linked Incident:</span>
                      <span className="font-mono text-indigo-400 font-bold">{c.incident.trackingId}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                      {c.incident.categoryName} &bull; {c.incident.address}
                    </div>
                  </div>
                )}

                {/* Metadata & Officer Badge */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px] font-medium text-slate-300">
                      Lead: {c.leadOfficerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      {c.internalNotes?.length || 0} notes
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {c.timeline?.length || 0} events
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="px-5 py-3 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Updated: {new Date(c.updatedAt).toLocaleDateString()}
                </span>
                <Link to={`/officer/investigations/${c.id}`}>
                  <Button variant="secondary" size="sm" className="text-xs">
                    View Case Dossier &rarr;
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Initiate Investigation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initiate Formal Investigation Case"
        description="Launch an official law enforcement inquiry for an authentic, verified incident report."
      >

        <form onSubmit={handleCreateInvestigation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Select Verified Incident Report *
            </label>
            {isLoadingIncidents ? (
              <div className="py-2 text-xs text-slate-400">Loading verified incidents...</div>
            ) : verifiedIncidents.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                No verified incidents found in queue. You must verify an incident report first in the Incident Queue before launching a formal investigation.
              </div>
            ) : (
              <select
                value={formIncidentId}
                onChange={(e) => setFormIncidentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                required
              >
                {verifiedIncidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.reporterName || (inc.isAnonymous ? 'Anonymous' : 'Registered Citizen')} | [{inc.trackingId}] {inc.title} | {inc.address}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Investigation Title *
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Syndicated Commercial Burglary Ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Case Priority *
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as InvestigationPriority)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="critical">Critical Priority</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Case Scope & Objective *
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Outline investigative objectives, forensic requirements, and operational scope..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span>Confidential Initial Case Note (Optional)</span>
              <span className="text-[10px] text-rose-400 font-normal">Internal Eyes Only</span>
            </label>
            <textarea
              value={formInitialNote}
              onChange={(e) => setFormInitialNote(e.target.value)}
              placeholder="First confidential detective observation, witness contact details, or initial leads..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={verifiedIncidents.length === 0}
            >
              Create Case File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
