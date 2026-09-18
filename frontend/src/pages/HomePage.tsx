import { useState, useEffect } from 'react';
import {
  Shield,
  MapPin,
  Radio,
  Activity,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Select,
  Modal,
  useToast,
  LoadingSpinner,
} from '@/components/ui';
import type { IncidentStatusType } from '@/components/ui/Badge';

interface SystemHealth {
  status: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    isConnected: boolean;
    state: string;
    host?: string;
  };
}

export function HomePage() {
  const { showToast } = useToast();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [sampleCategory, setSampleCategory] = useState('theft');

  // Check backend health on mount
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/health`);
        const data = await res.json();
        if (data.success) {
          setHealth(data);
        }
      } catch (err) {
        console.warn('Backend currently offline or starting up');
      } finally {
        setIsLoadingHealth(false);
      }
    };

    fetchHealth();
  }, []);

  const statuses: IncidentStatusType[] = [
    'submitted',
    'under_review',
    'verified',
    'assigned',
    'investigation_ongoing',
    'resolved',
    'rejected',
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl p-8 sm:p-12 glass-panel border border-brand-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            Phase 1 Foundation Operational
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Real-Time Community Safety <br />
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              & Incident Reporting
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            A state-of-the-art interactive map system bridging citizens and law enforcement.
            Every submission begins as a verified-gated <em>reported incident</em>, tracked
            through end-to-end investigation with Odoo Helpdesk synchronization.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                showToast(
                  'info',
                  'Authentication & multi-step reporting will be active in Phase 2 & 3!',
                  'Phase 1 Notice'
                )
              }
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Report an Incident
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
            >
              System Blueprint Overview
            </Button>
          </div>
        </div>

        {/* Decorative Grid & Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </section>

      {/* Backend & DB Health Telemetry */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-semibold text-white">System Architecture Status</h2>
          </div>
          <span className="text-xs text-slate-400">Endpoint: /api/v1/health</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand-950/50 border border-brand-800/40 text-brand-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Backend API (Express + TS)</div>
              <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                {isLoadingHealth ? (
                  <LoadingSpinner size="sm" />
                ) : health ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Active (Port 5000)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Connecting...</span>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Database Engine</div>
              <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                {health?.database.isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Connected ({health.database.state})</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Mongoose Ready ({health?.database.state || 'Local/Atlas'})</span>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/40 text-purple-400">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Socket.IO Real-Time Engine</div>
              <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>WebSockets Ready</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Interactive UI Component Foundation Showcase */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-400" />
          <h2 className="text-base font-semibold text-white">
            Foundation Design System & Interactive State Showcase
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: 7 Status Lifecycle Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Official Incident Status Pipeline</CardTitle>
              <CardDescription>
                SafeMap strictly distinguishes citizen submissions from verified crimes through a 7-stage auditable state machine.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2.5">
                {statuses.map((st) => (
                  <Badge key={st} status={st} />
                ))}
              </div>
            </CardContent>
            <CardFooter className="text-xs text-slate-400">
              Every status transition automatically creates an audit record and pushes real-time WebSocket notifications.
            </CardFooter>
          </Card>

          {/* Card 2: Interactive Controls & Toast Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Elements & Toast Feedback</CardTitle>
              <CardDescription>
                Try the foundation form controls and real-time toast feedback system below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Sample Search / Input"
                  placeholder="e.g. Sector 4 incident..."
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
                <Select
                  label="Incident Category Sample"
                  options={[
                    { value: 'theft', label: 'Theft / Burglary' },
                    { value: 'assault', label: 'Assault' },
                    { value: 'vandalism', label: 'Property Damage' },
                    { value: 'suspicious', label: 'Suspicious Activity' },
                  ]}
                  value={sampleCategory}
                  onChange={(e) => setSampleCategory(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => showToast('success', 'Incident report successfully acknowledged!', 'Submission Success')}
                >
                  Trigger Success Toast
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => showToast('error', 'Rate limit exceeded: 5 reports per hour allowed.', 'Security Alert')}
                >
                  Trigger Error Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => showToast('warning', 'Incident requires officer supervisor verification.', 'Warning')}
                >
                  Trigger Warning
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* System Overview Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="SafeMap — Hackathon Implementation Plan"
        description="Comprehensive 34-section blueprint summary"
        maxWidth="lg"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
            Close Overview
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>Role-Based Access:</strong> Guest (Public Map), Citizen (Submit & Track), Officer (Triage & Investigate), Admin (Management & Audit).
          </p>
          <p>
            <strong>Real-Time Pipeline:</strong> Socket.IO rooms for targeted events ('user:id', 'officers', 'public') ensuring instant updates without page refreshes.
          </p>
          <p>
            <strong>Geospatial Architecture:</strong> Leaflet + OpenStreetMap + Nominatim for zero-cost clustering, reverse geocoding, and privacy-shielded public mapping.
          </p>
          <p>
            <strong>Odoo XML-RPC Bridge:</strong> Verified incidents sync automatically to Odoo Helpdesk for back-office SLA escalation and administrative resolution.
          </p>
        </div>
      </Modal>
    </div>
  );
}
