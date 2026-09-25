import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  Layers,
  FileText,
  MapPin,
  Radio,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  LoadingSpinner,
  useToast,
} from '@/components/ui';
import type { Incident, IncidentCategory } from '@/types/incident';
import type { OfficerQueueStats, OfficerQueueFilters } from '@/types/officer';

export function OfficerDashboard() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [stats, setStats] = useState<OfficerQueueStats>({
    newSubmitted: 0,
    underReview: 0,
    verified: 0,
    rejected: 0,
    totalActive: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<OfficerQueueFilters>({
    status: 'all',
    category: 'all',
    severity: 0,
    searchQuery: '',
    sortBy: 'date_desc',
  });

  // Fetch categories once
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get<{ data: IncidentCategory[] }>('/incidents/categories');
        setCategories(res.data.data || []);
      } catch (err) {
        // Continue with defaults
      }
    };
    fetchCats();
  }, []);

  // Fetch incident queue from backend
  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};

      if (filters.status !== 'all') params.status = filters.status;
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.severity > 0) params.severity = filters.severity.toString();
      if (filters.searchQuery.trim()) params.searchQuery = filters.searchQuery.trim();
      if (filters.sortBy) params.sortBy = filters.sortBy;

      const res = await api.get<{
        success: boolean;
        stats: OfficerQueueStats;
        count: number;
        data: Incident[];
      }>('/incidents/officer/queue', { params });

      setIncidents(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      showToast('error', 'Failed to load officer incident queue.', 'Queue Error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Officer Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Law Enforcement Command Console
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {user?.name ? (user.name.startsWith('Officer ') ? user.name : `Officer ${user.name}`) : 'Officer Miller'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Department: <strong>{user?.department || 'Metropolitan Police Dept'}</strong> • Badge: <strong>{user?.badgeNumber || 'LE-9042'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueue}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh incident queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Safe Passage Real-Time Radar Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Safe Passage Live Radar
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                VIRTUAL ESCORTS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live tracking for citizens traversing high-incident Red Zones with dead-man stoppage detection.
            </p>
          </div>
        </div>

        <Link to="/officer/escorts">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Radio className="w-3.5 h-3.5" />}
            className="bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 shrink-0"
          >
            Launch Radar Console
          </Button>
        </Link>
      </div>

      {/* Verified Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Pending Submitted */}
        <Card
          onClick={() => setFilters({ ...filters, status: 'submitted' })}
          className={`p-4 cursor-pointer transition-all border ${
            filters.status === 'submitted'
              ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/10'
              : 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Pending Triage</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {stats.newSubmitted}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Awaiting first review</div>
        </Card>

        {/* Under Review */}
        <Card
          onClick={() => setFilters({ ...filters, status: 'under_review' })}
          className={`p-4 cursor-pointer transition-all border ${
            filters.status === 'under_review'
              ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/10'
              : 'bg-slate-900/60 border-blue-500/20 hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400">
            <span>Under Review</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-2">
            {stats.underReview}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Investigation ongoing</div>
        </Card>

        {/* Verified */}
        <Card
          onClick={() => setFilters({ ...filters, status: 'verified' })}
          className={`p-4 cursor-pointer transition-all border ${
            filters.status === 'verified'
              ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/10'
              : 'bg-slate-900/60 border-emerald-500/20 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Verified Cases</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {stats.verified}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Confirmed authentic</div>
        </Card>

        {/* Rejected */}
        <Card
          onClick={() => setFilters({ ...filters, status: 'rejected' })}
          className={`p-4 cursor-pointer transition-all border ${
            filters.status === 'rejected'
              ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-500/10'
              : 'bg-slate-900/60 border-rose-500/20 hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">
            {stats.rejected}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Disqualified reports</div>
        </Card>

        {/* Total Active Queue */}
        <Card
          onClick={() => setFilters({ ...filters, status: 'all' })}
          className={`p-4 cursor-pointer transition-all col-span-2 md:col-span-1 border ${
            filters.status === 'all'
              ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Active Queue</span>
            <Layers className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats.totalActive}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Open officer workload</div>
        </Card>
      </div>

      {/* Incident Triage Queue Card */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Incident Triage Queue
                {user?.department && !['all', 'all departments', 'general patrol', 'general operations'].includes(user.department.toLowerCase()) && (
                  <Badge variant="warning" className="text-[10px] font-normal">
                    {user.department} Scope
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Authorized law enforcement triage, incident verification, and status advancement.
              </CardDescription>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-300">
                {incidents.length} incidents in view
              </span>
            </div>
          </div>

          {/* Queue Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Search tracking ID, title, address..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full appearance-none px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer pr-8"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted (New)</option>
                <option value="under_review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full appearance-none px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer pr-8"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id || cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full appearance-none px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer pr-8"
              >
                <option value="date_desc">Newest Incident Date</option>
                <option value="date_asc">Oldest Incident Date</option>
                <option value="severity_desc">Highest Severity First</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner size="lg" label="Synchronizing officer triage queue..." />
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Incidents Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No incidents match your current status, category, or search filters.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters({
                    status: 'all',
                    category: 'all',
                    severity: 0,
                    searchQuery: '',
                    sortBy: 'date_desc',
                  })
                }
              >
                Clear Queue Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Queue Table */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Tracking ID</th>
                      <th className="py-3 px-4">Incident Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {incidents.map((incident) => (
                      <tr
                        key={incident.id || incident._id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] font-semibold text-brand-300">
                          {incident.trackingId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white max-w-xs truncate">
                          {incident.title}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${incident.categoryColor || '#3B82F6'}20`,
                              color: incident.categoryColor || '#3B82F6',
                              border: `1px solid ${incident.categoryColor || '#3B82F6'}40`,
                            }}
                          >
                            {incident.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span
                                key={s}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  s <= incident.severity
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
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[180px] truncate">
                          {incident.address}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(incident.incidentDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={incident.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link to={`/officer/incidents/${incident.id || incident._id}`}>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-[11px] py-1 px-2.5 group-hover:border-brand-500 transition-colors"
                              rightIcon={<Eye className="w-3 h-3" />}
                            >
                              Review
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Queue Cards */}
              <div className="lg:hidden space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id || incident._id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-brand-300">
                        {incident.trackingId}
                      </span>
                      <Badge status={incident.status} />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {incident.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {incident.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{incident.address}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${incident.categoryColor || '#3B82F6'}20`,
                          color: incident.categoryColor || '#3B82F6',
                          border: `1px solid ${incident.categoryColor || '#3B82F6'}40`,
                        }}
                      >
                        {incident.categoryName}
                      </span>

                      <Link to={`/officer/incidents/${incident.id || incident._id}`}>
                        <Button
                          size="sm"
                          variant="primary"
                          className="text-xs"
                          rightIcon={<Eye className="w-3 h-3" />}
                        >
                          Review Incident
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
