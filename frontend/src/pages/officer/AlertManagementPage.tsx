import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Info,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  X,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toLocalDateTimeString } from '@/lib/utils';

interface Alert {
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

const SEVERITY_ICONS = {
  info: <Info className="w-4 h-4 text-sky-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  danger: <Shield className="w-4 h-4 text-rose-400" />,
};

const SEVERITY_BADGE: Record<string, string> = {
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const ALERT_TYPES = [
  { id: 'safety_warning', label: '📢 Safety Warning' },
  { id: 'missing_person', label: '🔍 Missing Person' },
  { id: 'major_incident', label: '🚨 Major Incident' },
  { id: 'area_warning', label: '⚠️ Area Warning' },
  { id: 'emergency_info', label: 'ℹ️ Emergency Info' },
];

interface AlertFormData {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  alertType: string;
  cityName: string;
  expiresAt: string;
}

const createEmptyForm = (): AlertFormData => ({
  title: '',
  description: '',
  severity: 'warning',
  alertType: 'safety_warning',
  cityName: '',
  expiresAt: toLocalDateTimeString(new Date(Date.now() + 24 * 60 * 60 * 1000)),
});

export function AlertManagementPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState<AlertFormData>(createEmptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/alerts');
      if (res.data.success) setAlerts(res.data.alerts || []);
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title.trim() || !formData.description.trim() || !formData.expiresAt) {
      setFormError('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingAlert) {
        // Update existing alert
        const res = await api.put(`/alerts/${editingAlert.id}`, {
          ...formData,
          expiresAt: new Date(formData.expiresAt).toISOString(),
        });
        if (res.data.success) {
          setAlerts((prev) => prev.map((a) => (a.id === editingAlert.id ? res.data.alert : a)));
          setEditingAlert(null);
          setShowForm(false);
          setFormData(createEmptyForm());
        }
      } else {
        // Create new alert
        const res = await api.post('/alerts', {
          ...formData,
          expiresAt: new Date(formData.expiresAt).toISOString(),
        });
        if (res.data.success) {
          setAlerts((prev) => [res.data.alert, ...prev]);
          setShowForm(false);
          setFormData(createEmptyForm());
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (alert: Alert) => {
    setEditingAlert(alert);
    const expDate = alert.expiresAt ? toLocalDateTimeString(new Date(alert.expiresAt)) : '';
    setFormData({
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      alertType: alert.alertType || 'safety_warning',
      cityName: alert.geographicScope?.cityName || '',
      expiresAt: expDate,
    });
    setShowForm(true);
  };

  const handleExpire = async (id: string) => {
    try {
      const res = await api.patch(`/alerts/${id}/expire`);
      if (res.data.success) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: false } : a)));
      }
    } catch {}
  };

  const isExpired = (alert: Alert) => new Date(alert.expiresAt) < new Date();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-400" />
            Safety Alert Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Publish and manage broadcast public safety advisories</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            id="create-alert-btn"
            onClick={() => {
              setEditingAlert(null);
              setFormData(createEmptyForm());
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-all shadow-lg shadow-rose-600/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>
      </div>

      {/* Create / Edit Alert Form */}
      {showForm && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-900/10 backdrop-blur relative">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <h2 className="text-base font-semibold text-white">
              {editingAlert ? 'Edit Safety Alert' : 'Create Public Safety Alert'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingAlert(null);
                setFormData(createEmptyForm());
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-rose-400 text-sm mb-4 p-3 rounded-xl bg-rose-900/20 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Alert Category *</label>
                <select
                  value={formData.alertType}
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  {ALERT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Severity *</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="danger">🚨 Danger</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Major Highway Closure"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Advisory Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide complete public guidance and warnings…"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Geographic Target Area</label>
                <input
                  type="text"
                  value={formData.cityName}
                  onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                  placeholder="e.g. Connaught Place, All Sectors"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Expiration Time *</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAlert(null);
                  setFormData(createEmptyForm());
                  setFormError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {editingAlert ? 'Update Alert' : 'Publish Alert'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px] gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading authority alerts…
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No alerts published yet</div>
          )}
          {alerts.map((alert) => {
            const expired = isExpired(alert);
            const active = alert.isActive && !expired;
            const typeLabel = ALERT_TYPES.find((t) => t.id === alert.alertType)?.label || '📢 Safety Warning';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all ${
                  active
                    ? 'border-rose-500/25 bg-rose-900/10'
                    : 'border-slate-700/50 bg-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{SEVERITY_ICONS[alert.severity]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[alert.severity]}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        {typeLabel}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
                      {active ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />ACTIVE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <XCircle className="w-3 h-3" />{expired ? 'EXPIRED' : 'INACTIVE'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400 flex-wrap">
                      {alert.geographicScope?.cityName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {alert.geographicScope.cityName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Expires {formatDistanceToNow(new Date(alert.expiresAt), { addSuffix: true })}
                      </span>
                      <span>By: {alert.publishedByName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartEdit(alert)}
                      className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                      title="Edit Alert"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {active && (
                      <button
                        onClick={() => handleExpire(alert.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 text-xs transition-colors"
                      >
                        Expire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
