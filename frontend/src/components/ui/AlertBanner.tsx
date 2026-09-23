import { useState, useEffect } from 'react';
import { AlertTriangle, Info, X, ChevronRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { initSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

interface PublicAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  geographicScope: { type: string; cityName?: string };
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  publishedByName: string;
  createdAt: string;
}

const SEVERITY_CONFIG = {
  info: {
    bg: 'bg-sky-900/70 border-sky-500/40',
    text: 'text-sky-300',
    icon: <Info className="w-4 h-4" />,
    badge: 'bg-sky-500/20 text-sky-300',
    label: 'INFO',
  },
  warning: {
    bg: 'bg-amber-900/70 border-amber-500/40',
    text: 'text-amber-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    badge: 'bg-amber-500/20 text-amber-300',
    label: 'WARNING',
  },
  danger: {
    bg: 'bg-rose-900/80 border-rose-500/50',
    text: 'text-rose-300',
    icon: <Shield className="w-4 h-4" />,
    badge: 'bg-rose-500/20 text-rose-300',
    label: 'DANGER',
  },
};

export function AlertBanner() {
  const { isAuthenticated } = useAuthStore();
  const [alerts, setAlerts] = useState<PublicAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch active alerts
    api
      .get('/alerts/active')
      .then((res) => {
        if (res.data.success) setAlerts(res.data.alerts || []);
      })
      .catch(() => {});

    // Real-time alert socket events
    const socket = initSocket();

    socket.on('alert:new', (alert: PublicAlert) => {
      setAlerts((prev) => {
        if (prev.find((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    });

    socket.on('alert:updated', (alert: PublicAlert) => {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
    });

    socket.on('alert:expired', ({ id }: { id: string }) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    });

    return () => {
      socket.off('alert:new');
      socket.off('alert:updated');
      socket.off('alert:expired');
    };
  }, [isAuthenticated]);

  const visibleAlerts = alerts.filter(
    (a) => !dismissed.has(a.id) && new Date(a.expiresAt) > new Date()
  );

  if (!isAuthenticated || visibleAlerts.length === 0) return null;

  // Show highest severity first
  const sorted = [...visibleAlerts].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const primary = sorted[0];
  const config = SEVERITY_CONFIG[primary.severity];

  return (
    <div
      className={`w-full border-b ${config.bg} backdrop-blur-sm transition-all`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 mt-0.5 ${config.text}`}>{config.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.badge}`}>
                {config.label}
              </span>
              <span className={`text-sm font-semibold ${config.text}`}>{primary.title}</span>
              {primary.geographicScope?.cityName && (
                <span className="text-[11px] text-slate-400">· {primary.geographicScope.cityName}</span>
              )}
            </div>

            {/* Expanded description */}
            {expandedId === primary.id ? (
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{primary.description}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{primary.description}</p>
            )}

            {/* More alerts */}
            {visibleAlerts.length > 1 && (
              <button
                onClick={() => navigate('/safety-alerts')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white mt-1 transition-colors"
              >
                +{visibleAlerts.length - 1} more alert{visibleAlerts.length > 2 ? 's' : ''}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpandedId(expandedId === primary.id ? null : primary.id)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              {expandedId === primary.id ? 'Less' : 'More'}
            </button>
            <button
              onClick={() => setDismissed((d) => new Set([...d, primary.id]))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
