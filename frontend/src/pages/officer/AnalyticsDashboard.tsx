import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Target,
  BarChart3,
  Loader2,
  RefreshCw,
  Filter,
  MapPin,
  Flame,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MAP_TILE_CONFIG } from '@/lib/mapConfig';

interface AnalyticsData {
  summary: {
    totalReports: number;
    verifiedReports: number;
    rejectedReports: number;
    pendingReports: number;
    underReviewReports: number;
    openInvestigations: number;
    resolvedInvestigations: number;
    closedInvestigations: number;
  };
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
  timeOfDay?: Array<{ slot: string; count: number }>;
  resolutionTrends?: Array<{ period: string; resolvedCount: number }>;
  topAreas: Array<{ area: string; count: number }>;
  mapPoints?: Array<{
    id: string;
    lat: number;
    lng: number;
    type: 'citizen_report' | 'verified_incident';
    title: string;
    category: string;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: '#60a5fa',
  under_review: '#fbbf24',
  verified: '#34d399',
  rejected: '#f87171',
};

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

const GRADIENT_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#7c3aed', '#4f46e5',
  '#3b82f6', '#06b6d4', '#10b981',
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(99,102,241,0.25)',
  borderRadius: '12px',
  color: '#e2e8f0',
  fontSize: '12px',
  padding: '8px 12px',
};

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="relative p-5 rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur overflow-hidden group hover:border-slate-600/60 transition-all">
      <div className={`absolute inset-0 opacity-[0.03] bg-gradient-to-br ${color}`} />
      <div className={`inline-flex p-2 rounded-xl mb-3 ${color} bg-opacity-10`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white tabular-nums">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

// Leaflet map controller helper
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  return null;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [area, setArea] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Map analytics filter toggle: 'all' | 'citizen' | 'verified'
  const [mapLayerFilter, setMapLayerFilter] = useState<'all' | 'citizen' | 'verified'>('all');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { groupBy };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (category !== 'all') params.category = category;
      if (status !== 'all') params.status = status;
      if (area.trim()) params.area = area.trim();

      const res = await api.get('/analytics', { params });
      if (res.data.success) {
        setData(res.data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to load analytics');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, category, status, area, groupBy]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('all');
    setStatus('all');
    setArea('');
    setGroupBy('day');
  };

  const filteredMapPoints = useMemo(() => {
    if (!data?.mapPoints) return [];
    if (mapLayerFilter === 'citizen') {
      return data.mapPoints.filter((p) => p.type === 'citizen_report');
    }
    if (mapLayerFilter === 'verified') {
      return data.mapPoints.filter((p) => p.type === 'verified_incident');
    }
    return data.mapPoints;
  }, [data?.mapPoints, mapLayerFilter]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        <span>Computing incident analytics & trends…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 opacity-60" />
        <p className="text-slate-400 text-sm">{error || 'No data available'}</p>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const { summary, byCategory, byStatus, trend, timeOfDay = [], resolutionTrends = [], topAreas, mapPoints = [] } = data;

  const pieData = byStatus.map((s) => ({
    name: STATUS_LABEL[s.status] || s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] || '#94a3b8',
  }));

  const mapCenter: [number, number] = mapPoints.length > 0 ? [mapPoints[0].lat, mapPoints[0].lng] : [28.6139, 77.209];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-400" />
            Authority Incident & Trend Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time statistical intelligence & spatial concentration analysis for law enforcement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs transition-all hover:border-brand-500/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-brand-400" />
            Analytics Query Filters
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-white underline transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Time Granularity */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 truncate"
            >
              <option value="all">All Categories</option>
              {byCategory.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Area Search Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Geographic Area</label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Connaught Place"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-blue-400" />}
          label="Total Reports"
          value={summary.totalReports}
          color="from-blue-600 to-indigo-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          label="Verified Reports"
          value={summary.verifiedReports}
          color="from-emerald-600 to-teal-600"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          label="Pending / Review"
          value={summary.pendingReports + summary.underReviewReports}
          color="from-amber-600 to-orange-600"
        />
        <StatCard
          icon={<XCircle className="w-4 h-4 text-rose-400" />}
          label="Rejected Reports"
          value={summary.rejectedReports}
          color="from-rose-600 to-pink-600"
        />
        <StatCard
          icon={<Search className="w-4 h-4 text-violet-400" />}
          label="Open Investigations"
          value={summary.openInvestigations}
          color="from-violet-600 to-purple-600"
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-cyan-400" />}
          label="Resolved Investigations"
          value={summary.resolvedInvestigations}
          color="from-cyan-600 to-sky-600"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
          label="Under Active Review"
          value={summary.underReviewReports}
          color="from-indigo-600 to-blue-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-teal-400" />}
          label="Closed Cases"
          value={summary.closedInvestigations}
          color="from-teal-600 to-emerald-600"
        />
      </div>

      {/* Interactive Map Analytics & Heatmap Section */}
      <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Geographic Concentration & Spatial Density
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clear distinction between unverified citizen reports and officer-verified incidents
            </p>
          </div>

          {/* Map Layer Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <button
              onClick={() => setMapLayerFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                mapLayerFilter === 'all'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Layers ({data.mapPoints?.length || 0})
            </button>
            <button
              onClick={() => setMapLayerFilter('citizen')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                mapLayerFilter === 'citizen'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              Citizen Reports ({data.mapPoints?.filter((p) => p.type === 'citizen_report').length || 0})
            </button>
            <button
              onClick={() => setMapLayerFilter('verified')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                mapLayerFilter === 'verified'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Verified Incidents ({data.mapPoints?.filter((p) => p.type === 'verified_incident').length || 0})
            </button>
          </div>
        </div>

        {/* Leaflet Analytics Map View */}
        <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution={MAP_TILE_CONFIG.attribution}
              url={MAP_TILE_CONFIG.url}
              maxZoom={MAP_TILE_CONFIG.maxZoom}
            />
            <MapCenterController center={mapCenter} />

            {filteredMapPoints.map((pt) => {
              const isVerified = pt.type === 'verified_incident';
              const color = isVerified ? '#34d399' : '#60a5fa';

              return (
                <CircleMarker
                  key={pt.id}
                  center={[pt.lat, pt.lng]}
                  radius={isVerified ? 12 : 9}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: isVerified ? 0.6 : 0.4,
                    weight: isVerified ? 2.5 : 1.5,
                  }}
                >
                  <Popup className="safemap-incident-popup">
                    <div className="p-2 text-xs text-white bg-slate-900 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isVerified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {isVerified ? 'VERIFIED INCIDENT' : 'CITIZEN REPORT'}
                        </span>
                        <span className="text-[10px] text-slate-400">· {pt.category}</span>
                      </div>
                      <div className="font-semibold text-white">{pt.title}</div>
                      <div className="text-[10px] text-slate-400 capitalize">Status: {pt.status}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] backdrop-blur space-y-1.5 shadow-xl">
            <div className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider">Map Legend</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-white/40" />
              <span className="text-slate-300">Citizen Reports (Unverified/Review)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 border border-white/40" />
              <span className="text-slate-300">Verified Incidents (Authority Verified)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Trend + Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              Incidents Over Time ({groupBy === 'month' ? 'Monthly' : groupBy === 'week' ? 'Weekly' : 'Daily'})
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
                name="Incident Reports"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-400" />
            Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[11px]">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                <span className="text-slate-400 truncate">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Category Bar + Time of Day Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            Incidents by Category
          </h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byCategory} margin={{ top: 4, right: 8, left: -20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 9, fill: '#64748b' }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Reports">
                {byCategory.map((_, index) => (
                  <Cell key={index} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time of Day Distribution */}
        <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Time-of-Day Distribution
          </h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={timeOfDay} margin={{ top: 4, right: 8, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="slot"
                tick={{ fontSize: 9, fill: '#64748b' }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3: Resolution Trends + Top Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Trends */}
        <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Investigation Resolution Velocity
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resolutionTrends} margin={{ top: 4, right: 8, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Bar dataKey="resolvedCount" fill="#10b981" radius={[6, 6, 0, 0]} name="Cases Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Areas Concentration */}
        <div className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/60">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-400" />
            Top Incident Concentration Areas
          </h2>
          <div className="space-y-3">
            {topAreas.map((areaItem, i) => {
              const max = topAreas[0]?.count || 1;
              const pct = Math.round((areaItem.count / max) * 100);
              return (
                <div key={areaItem.area}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 w-4">#{i + 1}</span>
                      <span className="text-xs text-slate-300 truncate max-w-[200px]">{areaItem.area}</span>
                    </div>
                    <span className="text-xs font-semibold text-white tabular-nums">{areaItem.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
