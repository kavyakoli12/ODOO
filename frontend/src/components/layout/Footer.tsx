import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Eye,
  Lock,
  HeartPulse,
  Phone,
  Flame,
  Users,
  Copy,
  Check,
  MapPin,
  FileText,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui';
import { TrinetraLogo } from '@/components/common/TrinetraLogo';

export function Footer() {
  const { showToast } = useToast();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const emergencyContacts = [
    { num: '112', label: 'All Emergency (Police/Fire/Med)', icon: <Phone className="w-3.5 h-3.5 text-rose-400" /> },
    { num: '100', label: 'Police Control Room', icon: <Shield className="w-3.5 h-3.5 text-indigo-400" /> },
    { num: '108', label: 'Ambulance & Medical', icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> },
    { num: '1091', label: 'Women Helpline', icon: <Users className="w-3.5 h-3.5 text-purple-400" /> },
    { num: '101', label: 'Fire & Rescue', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { num: '1930', label: 'Cyber Crime Helpline', icon: <Lock className="w-3.5 h-3.5 text-cyan-400" /> },
  ];

  const handleCopy = (num: string, label: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    showToast('success', `Copied ${num} (${label}) to clipboard.`, 'Number Copied');
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 text-xs mt-16">
      {/* 1. About Us & Core Motive Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main About Us & Motive Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <TrinetraLogo size="lg" variant="badge" />
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                  Trinetra
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400">
                    Public Safety
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  The Third Eye for Citizen Vigilance & Rapid Law Enforcement
                </span>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pt-1">
                <Eye className="w-4 h-4 text-brand-400" />
                About Us & Our Core Motive
              </h3>
              <p>
                Inspired by the profound symbolism of the <strong className="text-white">"Third Eye" (Trinetra)</strong>—representing unclouded perception, unwavering vigilance, and the protection of truth—the <strong className="text-white">Trinetra Platform</strong> was established to revolutionize public safety reporting for modern communities.
              </p>
              <p>
                Our core motive is to <strong className="text-brand-300">eliminate all barriers between citizens and law enforcement</strong>. Traditional reporting often poses obstacles—fear of disclosure, slow response times, and lack of transparency. Trinetra solves this by providing an instant, verified reporting channel where citizens can submit localized reports—either securely or 100% anonymously—with photo evidence, GPS coordinates, and automated categorization.
              </p>
              <p className="text-slate-400">
                Authorized officers triage, verify, and investigate incidents in real time, turning community awareness into decisive protection and ensuring faster emergency intervention for all neighborhoods.
              </p>
            </div>
          </div>

          {/* Quick Links & Platform Portals */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Platform Portals
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link to="/citizen/report" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Report an Incident
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-slate-500" />
                  Live Safety Alerts Feed
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Interactive Community Map
                </Link>
              </li>
              <li>
                <Link to="/citizen" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  Citizen Dashboard
                </Link>
              </li>
              <li>
                <Link to="/officer" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Officer Triage Console
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Motive Pillars */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Mission Guarantees
            </h4>
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-white block text-[11px]">100% Optional Anonymity</span>
                <span className="text-[10px] text-slate-400">Metadata stripped and identities protected at database level.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-white block text-[11px]">Verified Authority Triage</span>
                <span className="text-[10px] text-slate-400">Credentialed law enforcement review ensures genuine response.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-white block text-[11px]">Departmental Dispatch</span>
                <span className="text-[10px] text-slate-400">Traffic, cyber, and emergency units routed automatically.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Emergency Helplines Quick-Access Strip (Accessible for Laptops & Mobiles) */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Direct Emergency Helplines (Dial or One-Click Copy on Laptops)
            </span>
            <span className="text-[10px] text-slate-500">
              24x7 Toll-Free Immediate Emergency Dispatch Services
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {emergencyContacts.map((contact) => (
              <div
                key={contact.num}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="p-1 rounded bg-slate-800 shrink-0">
                    {contact.icon}
                  </div>
                  <div className="truncate">
                    <span className="font-mono font-bold text-white text-sm block leading-none">
                      {contact.num}
                    </span>
                    <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                      {contact.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(contact.num, contact.label)}
                    title={`Copy ${contact.num}`}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedNumber === contact.num ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <a
                    href={`tel:${contact.num}`}
                    title={`Call ${contact.num}`}
                    className="p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Sub-footer & Legal Notice */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            <strong>Trinetra Public Safety Network</strong> &copy; 2026. Empowering Communities Through Vigilance.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>The Third Eye for Citizen Safety</span>
            <span>&bull;</span>
            <span>Encrypted & Privacy Protected</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
