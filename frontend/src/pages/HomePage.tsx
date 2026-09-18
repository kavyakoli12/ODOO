import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Radio,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  FileText,
  Clock,
  Sparkles,
  BarChart3,
  Users,
  PhoneCall,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Modal,
  useToast,
} from '@/components/ui';

export function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);

  return (
    <div className="space-y-12 py-4">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-12 border border-slate-800 bg-slate-900/90 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Community Safety & Real-Time Incident Intelligence Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Report incidents faster. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              Protect your community together.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            SafeMap provides direct, transparent public-safety reporting. Citizens report localized incidents anonymously or securely; law enforcement agencies verify and coordinate through automated Odoo ERP workflows.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="danger"
              size="lg"
              className="h-12 px-6 text-base font-semibold shadow-lg shadow-rose-950/40"
              onClick={() => navigate('/report')}
              leftIcon={<ShieldAlert className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Report an Incident
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base font-semibold border-slate-700 hover:bg-slate-800"
              onClick={() => navigate('/map')}
              leftIcon={<MapPin className="w-5 h-5 text-indigo-400" />}
            >
              View Interactive Crime Map
            </Button>
          </div>

          {/* Quick trust metrics */}
          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Officer Triage</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Optional Anonymous Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>AI Category Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Odoo ERP Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Platform Telemetry & Safety Statistics */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Platform Telemetry & Safety Metrics
            </h2>
            <p className="text-xs text-slate-400">Live operational data and system connection status</p>
          </div>
          <Badge status="verified" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-slate-400">Auditable Reports</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">&lt; 15 mins</div>
                <div className="text-xs text-slate-400">Average Triage Time</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-950 border border-amber-800 text-amber-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Odoo ERP</div>
                <div className="text-xs text-slate-400">Helpdesk Bridge</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-sky-950 border border-sky-800 text-sky-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-xs text-slate-400">Community Safety</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-white">How SafeMap Works</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            A transparent 4-stage pipeline that ensures reported issues receive swift authority review while protecting reporter privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center text-lg">
              1
            </div>
            <h3 className="text-base font-semibold text-white">Citizen Report Submission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit location pin, category, time, narrative, and photos. Option to remain 100% anonymous.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 font-bold flex items-center justify-center text-lg">
              2
            </div>
            <h3 className="text-base font-semibold text-white">AI Assistant & Triage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated AI analyzes category, risk score, and duplicate reports to streamline police review.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/40 text-sky-400 font-bold flex items-center justify-center text-lg">
              3
            </div>
            <h3 className="text-base font-semibold text-white">Authority Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verified law enforcement officers review details, update status, and post public advisories.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-lg">
              4
            </div>
            <h3 className="text-base font-semibold text-white">Odoo ERP Back-Office</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verified incidents create official tickets in Odoo Helpdesk for resource allocation and tracking.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Emergency Contact Banner */}
      <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-900/40 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <PhoneCall className="w-4 h-4 animate-bounce" /> Immediate Danger Warning
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white">Is someone in immediate danger?</h3>
          <p className="text-xs text-slate-300 max-w-xl">
            SafeMap is a community reporting platform and is not a substitute for emergency services. In case of life-threatening emergencies, call emergency hotline 911 or 112 immediately.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="danger"
            size="lg"
            onClick={() => showToast('warning', 'Dialing emergency dispatch: 911 / 112', 'Emergency Services')}
            className="font-bold shadow-lg"
          >
            Emergency 911 / 112
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsBlueprintOpen(true)}
          >
            Platform Info
          </Button>
        </div>
      </section>

      {/* Technical Overview Modal */}
      <Modal
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
        title="SafeMap Public Safety Platform Architecture"
        description="Core technical capabilities & specifications"
        maxWidth="lg"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsBlueprintOpen(false)}>
            Close Window
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>Role Gating:</strong> Citizen submissions remain in 'submitted' state until verified by authorized police personnel.
          </p>
          <p>
            <strong>WebSockets & Socket.IO:</strong> Real-time map pins and status updates emit directly to active maps without page polling.
          </p>
          <p>
            <strong>Odoo Helpdesk Integration:</strong> JSON-RPC integration automatically queues and creates official Odoo tickets with full two-way status sync.
          </p>
        </div>
      </Modal>
    </div>
  );
}
