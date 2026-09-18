import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Info, Clock, RefreshCw, CheckCircle2, MapPin, Calendar, User, X, AlertCircle, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { formatDistanceToNow, format } from 'date-fns';

interface PublicAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  alertType?: string;
  geographicScope: { type: string; cityName?: string };
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  publishedByName: string;
  createdAt: string;
}

const SEVERITY_CONFIG = {
  info: {
    border: 'border-sky-500/30',
    bg: 'bg-sky-900/20',
    icon: <Info className="w-5 h-5 text-sky-400" />,
    badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    title: 'text-sky-300',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-900/20',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    title: 'text-amber-300',
  },
  danger: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-900/25',
    icon: <Shield className="w-5 h-5 text-rose-400" />,
    badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    title: 'text-rose-300',
  },
};

const ALERT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  safety_warning: { label: 'Safety Warning', icon: '📢' },
  missing_person: { label: 'Missing Person', icon: '🔍' },
  major_incident: { label: 'Major Incident', icon: '🚨' },
  area_warning: { label: 'Area Warning', icon: '⚠️' },
  emergency_info: { label: 'Emergency Info', icon: 'ℹ️' },
};

export function SafetyAlertsPage() {
  const [alerts, setAlerts] = useState<PublicAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<PublicAlert | null>(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/alerts/active');
      if (res.data.success) setAlerts(res.data.alerts || []);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    const socket = initSocket();
    socket.on('alert:new', (a: PublicAlert) => {
      setAlerts((prev) => (prev.find((x) => x.id === a.id) ? prev : [a, ...prev]));
    });
    socket.on('alert:updated', (a: PublicAlert) => {
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? a : x)));
      if (selectedAlert && selectedAlert.id === a.id) setSelectedAlert(a);
    });
    socket.on('alert:expired', ({ id }: { id: string }) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      if (selectedAlert && selectedAlert.id === id) setSelectedAlert(null);
    });

    return () => {
      socket.off('alert:new');
      socket.off('alert:updated');
      socket.off('alert:expired');
    };
  }, [selectedAlert]);

  const sorted = [...alerts].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-400" />
            Public Safety Alerts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Active advisories issued by law enforcement — real-time emergency notifications
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:text-white transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px] text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading active safety alerts…
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
          <CheckCircle2 className="w-12 h-12 opacity-30 text-emerald-400" />
          <p className="text-sm font-medium text-slate-300">No active safety alerts</p>
          <p className="text-xs text-slate-500">All clear — public safety authorities will publish broadcast warnings here when necessary</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const typeInfo = ALERT_TYPE_LABELS[alert.alertType || 'safety_warning'] || ALERT_TYPE_LABELS.safety_warning;

            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`p-6 rounded-2xl border ${cfg.border} ${cfg.bg} backdrop-blur cursor-pointer transition-all hover:scale-[1.008] hover:shadow-lg hover:shadow-rose-900/10 group`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      <h2 className={`text-base font-semibold ${cfg.title} group-hover:underline`}>{alert.title}</h2>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400 flex-wrap">
                      {alert.geographicScope?.cityName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {alert.geographicScope.cityName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Expires {formatDistanceToNow(new Date(alert.expiresAt), { addSuffix: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {alert.publishedByName}
                      </span>
                      <span className="ml-auto text-brand-400 flex items-center gap-1 text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        View Advisory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${SEVERITY_CONFIG[selectedAlert.severity].badge}`}>
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    {(ALERT_TYPE_LABELS[selectedAlert.alertType || 'safety_warning'] || ALERT_TYPE_LABELS.safety_warning).icon}{' '}
                    {(ALERT_TYPE_LABELS[selectedAlert.alertType || 'safety_warning'] || ALERT_TYPE_LABELS.safety_warning).label}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{selectedAlert.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Official Advisory Details</h3>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {selectedAlert.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Target Area
                </div>
                <div className="font-medium text-white">{selectedAlert.geographicScope?.cityName || 'All Jurisdictions'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-brand-400" />
                  Issuing Authority
                </div>
                <div className="font-medium text-white">{selectedAlert.publishedByName}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Issued At
                </div>
                <div className="font-medium text-white">{format(new Date(selectedAlert.startsAt), 'PPp')}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Expiration Time
                </div>
                <div className="font-medium text-white">{format(new Date(selectedAlert.expiresAt), 'PPp')}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>For immediate assistance or updates, contact your local emergency response hotline.</span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
