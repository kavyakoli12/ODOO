import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Incident } from '@/types/incident';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  LoadingSpinner,
} from '@/components/ui';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export function CitizenDashboard() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: Incident[] }>('/incidents/mine');
      setIncidents(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your submitted reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Compute accurate metrics based on backend-supported statuses
  const totalReports = incidents.length;
  const submittedCount = incidents.filter((i) => i.status === 'submitted').length;
  const underReviewCount = incidents.filter((i) => i.status === 'under_review').length;
  const verifiedCount = incidents.filter((i) => i.status === 'verified').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  const recentIncidents = incidents.slice(0, 3);

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/30 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
              Citizen Reporting Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name || 'Citizen'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Submit unverified incident reports, track law enforcement verification status, and manage evidence securely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/citizen/report">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="shadow-lg shadow-brand-600/20"
            >
              Report an Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Official Disclaimer Alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-200">Official Notice regarding Citizen Submissions</p>
          <p className="text-amber-300/80 mt-0.5 leading-relaxed">
            All reports submitted through this portal are initially recorded as <strong>SUBMITTED</strong> (unverified citizen reports). Submissions undergo review by authorized law enforcement officers before any official classification or dispatch takes place.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Reports</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? '-' : totalReports}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Submitted by you</div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-amber-500/20">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Submitted</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {loading ? '-' : submittedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Awaiting review</div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-blue-500/20">
          <div className="flex items-center justify-between text-xs text-blue-400">
            <span>Under Review</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-2">
            {loading ? '-' : underReviewCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Officer triage</div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-emerald-500/20">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Verified</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {loading ? '-' : verifiedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Authority validated</div>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-purple-500/20 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-purple-400">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2">
            {loading ? '-' : resolvedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Closed cases</div>
        </Card>
      </div>

      {/* Recent Submissions Section */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-white">Recent Submitted Reports</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Only reports created by your account ({user?.email}) are listed.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIncidents}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh reports"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {incidents.length > 0 && (
              <Link to="/citizen/reports">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All ({totalReports})
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" label="Loading your reports..." />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">No Incident Reports Filed Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                You haven't submitted any incident reports. Click the button below to report an incident with location and evidence.
              </p>
              <Link to="/citizen/report">
                <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  File First Report
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentIncidents.map((incident) => (
                <IncidentCard key={incident.id || incident._id} incident={incident} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
