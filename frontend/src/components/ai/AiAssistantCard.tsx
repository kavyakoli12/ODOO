import { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, ChevronRight, CopyCheck, Info, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface AiAssistantCardProps {
  incidentId?: string;
  description: string;
  categoryName?: string;
  address?: string;
  onSelectDuplicate?: (duplicateId: string) => void;
}

export function AiAssistantCard({
  incidentId,
  description,
  categoryName = '',
  address = '',
  onSelectDuplicate,
}: AiAssistantCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [priority, setPriority] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);

  useEffect(() => {
    if (!description || description.trim().length < 10) return;

    let isMounted = true;
    setIsLoading(true);

    const runAiAnalysis = async () => {
      try {
        const [sumRes, dupRes] = await Promise.all([
          api.post('/ai/summarize-priority', { description, categoryName }),
          api.post('/ai/duplicates', { incidentId, description, address, categoryName }),
        ]);

        if (isMounted) {
          if (sumRes.data.success) {
            setSummary(sumRes.data.summary);
            setPriority(sumRes.data.priority);
          }
          if (dupRes.data.success) {
            setDuplicates(dupRes.data.matches || []);
          }
        }
      } catch {}
      if (isMounted) setIsLoading(false);
    };

    runAiAnalysis();

    return () => {
      isMounted = false;
    };
  }, [description, categoryName, address, incidentId]);

  if (!description || description.trim().length < 10) {
    return null;
  }

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur space-y-4 relative overflow-hidden">
      {/* Decorative Gradient Flare */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header & Mandatory AI Disclaimer */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>SafeMap AI Assistant Intelligence</span>
        </div>
        <span className="text-[10px] font-semibold text-amber-400/90 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
          <Info className="w-3 h-3" />
          AI Suggestion — requires human review
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-indigo-300 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          Analyzing semantic context, priority risk, and duplicate patterns…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Executive Summary & Priority Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Priority Suggestion */}
            {priority && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Suggested Priority</span>
                  <span className="text-[10px] text-indigo-400 font-bold">{priority.confidence}% match</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border uppercase ${getPriorityBadge(priority.priority)}`}>
                    {priority.priority}
                  </span>
                </div>
                {priority.riskFactors && priority.riskFactors.length > 0 && (
                  <p className="text-[11px] text-slate-300 leading-tight pt-1">
                    {priority.riskFactors[0]}
                  </p>
                )}
              </div>
            )}

            {/* Executive Summary */}
            {summary && (
              <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Executive Summary</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {summary.bullets?.map((b: string, idx: number) => (
                    <li key={idx} className="truncate">{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Smart Duplicate Detector */}
          {duplicates.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                <div className="flex items-center gap-1.5">
                  <CopyCheck className="w-4 h-4 text-rose-400" />
                  <span>Potentially Similar Reports ({duplicates.length})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Identified by spatial & semantic AI match</span>
              </div>

              <div className="space-y-2 pt-1">
                {duplicates.slice(0, 2).map((dup) => (
                  <div
                    key={dup.id}
                    onClick={() => onSelectDuplicate && onSelectDuplicate(dup.id)}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <span className="text-rose-400 font-mono">[{dup.trackingId}]</span>
                        <span className="truncate max-w-[220px]">{dup.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>📍 {dup.address}</span>
                        <span>·</span>
                        <span className="text-emerald-400 capitalize">{dup.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                        {dup.similarityScore}% Match
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
