import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Radio,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileText,
  Clock,
  Sparkles,
  Users,
  PhoneCall,
  Copy,
  Check,
  Phone,
  Flame,
  HeartPulse,
  Shield,
  UserCheck,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  useToast,
} from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

export function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const emergencyNumbers = [
    {
      number: '112',
      title: 'National Emergency Helpline',
      subtitle: 'All-in-One Emergency: Police, Fire, Ambulance & Disaster',
      category: 'Unified Hotline',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: <PhoneCall className="w-5 h-5 text-rose-400" />,
    },
    {
      number: '100',
      title: 'Police Control Room',
      subtitle: 'Immediate crime, distress, disturbance, or patrol assistance',
      category: 'Law Enforcement',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      icon: <Shield className="w-5 h-5 text-indigo-400" />,
    },
    {
      number: '108',
      title: 'Emergency Medical & Ambulance',
      subtitle: 'Critical medical transport, severe injuries, life support',
      category: 'Medical Service',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: <HeartPulse className="w-5 h-5 text-emerald-400" />,
    },
    {
      number: '1091',
      title: 'Women Helpline & Distress Safety',
      subtitle: '24/7 dedicated support for women in harassment or crisis',
      category: 'Women Protection',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: <UserCheck className="w-5 h-5 text-purple-400" />,
    },
    {
      number: '101',
      title: 'Fire & Rescue Service',
      subtitle: 'Fire emergencies, building collapse, hazardous gas leaks',
      category: 'Rescue & Fire',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: <Flame className="w-5 h-5 text-amber-400" />,
    },
    {
      number: '1098',
      title: 'Childline / Child Protection',
      subtitle: 'Emergency care, protection, and rescue for children in distress',
      category: 'Child Welfare',
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      icon: <Users className="w-5 h-5 text-sky-400" />,
    },
    {
      number: '1930',
      title: 'National Cyber Crime Reporting',
      subtitle: 'Online financial fraud, identity theft, cyber harassment',
      category: 'Cyber Defense',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      icon: <Lock className="w-5 h-5 text-cyan-400" />,
    },
  ];

  const handleCopyNumber = (num: string, label: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    showToast('success', `Copied emergency number ${num} (${label}) to clipboard.`, 'Number Copied');
    setTimeout(() => {
      setCopiedNumber(null);
    }, 2500);
  };

  return (
    <div className="space-y-12 py-4">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-12 border border-slate-800 bg-slate-900/90 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-3xl space-y-6">
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
              Trinetra provides direct, transparent public-safety reporting. Citizens report localized incidents anonymously or securely; law enforcement agencies verify and coordinate through automated rapid-response workflows.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="danger"
                size="lg"
                className="h-12 px-6 text-base font-semibold shadow-lg shadow-rose-950/40"
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/citizen/report');
                  } else {
                    showToast('info', 'Please sign in to file an incident report.', 'Authentication Required');
                    navigate('/login?redirect=/citizen/report');
                  }
                }}
                leftIcon={<ShieldAlert className="w-5 h-5" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Report an Incident
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
                <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Direct Police Dispatch</span>
              </div>
            </div>
          </div>

          {/* Right side hero logo emblem */}
          <div className="hidden lg:flex flex-col items-center justify-center shrink-0">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-brand-600/30 to-indigo-500/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-300" />
              <div className="relative w-56 h-56 rounded-3xl bg-slate-950/90 border border-slate-700/80 shadow-2xl p-6 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Trinetra Sacred Third Eye"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(255,255,255,0.7)] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Trinetra Vigilance Shield
            </span>
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
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100% Secure</div>
                <div className="text-xs text-slate-400">Citizen Privacy Shield</div>
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
                <div className="text-xs text-slate-400">Community Vigilance</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-white">How Trinetra Works</h2>
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
            <h3 className="text-base font-semibold text-white">AI Assistant & Classification</h3>
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
            <h3 className="text-base font-semibold text-white">Rapid Dispatch & Resolution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verified incidents initiate rapid officer dispatch, active case investigations, and neighborhood resolution.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Comprehensive Emergency Helplines Directory (Laptop & Mobile Accessible) */}
      <section className="space-y-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-rose-900/40 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <PhoneCall className="w-4 h-4 animate-bounce" />
              Immediate Danger & Critical Emergency Contacts
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Official Emergency Helplines
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              If accessing via laptop or desktop without cellular calling, copy or note down these numbers directly. For immediate life-threatening danger, reach out to verified dispatch services immediately.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              24/7 Toll-Free Dispatch
            </span>
          </div>
        </div>

        {/* Emergency Numbers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {emergencyNumbers.map((item) => (
            <div
              key={item.number}
              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.badgeColor}`}>
                    {item.category}
                  </span>
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
                    <span>{item.number}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mt-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{item.subtitle}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyNumber(item.number, item.title)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
                >
                  {copiedNumber === item.number ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Number</span>
                    </>
                  )}
                </button>

                <a
                  href={`tel:${item.number}`}
                  className="flex items-center justify-center p-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  title={`Dial ${item.number}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
