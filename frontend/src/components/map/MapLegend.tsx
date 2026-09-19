import { useState } from 'react';
import { Info, ChevronUp, ChevronDown, Shield, Clock } from 'lucide-react';

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-6 right-4 z-[1000] max-w-xs transition-all duration-200">
      <div className="rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800/90 shadow-2xl overflow-hidden">
        {/* Legend Header Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-brand-400" />
            <span>Map Legend</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Legend Content */}
        {isOpen && (
          <div className="p-3 border-t border-slate-800/80 space-y-3 text-[11px] text-slate-300">
            {/* Status Distinctions */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Verification Triage
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 shadow-sm shadow-emerald-500/50 flex items-center justify-center">
                  <Shield className="w-2 h-2 text-emerald-400" />
                </div>
                <span>
                  <strong>Official Verified:</strong> Authenticated by law enforcement
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-dashed border-amber-500 shadow-sm shadow-amber-500/50 flex items-center justify-center">
                  <Clock className="w-2 h-2 text-amber-400" />
                </div>
                <span>
                  <strong>Citizen Report:</strong> Unverified, pending officer triage
                </span>
              </div>
            </div>

            {/* Severity scale */}
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Severity Rating
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Low (1-2)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Moderate (3)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Critical (4-5)
                </span>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 leading-tight">
              Coordinates generalized. Trinetra enforces citizen anonymity on public maps.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
