import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface OdooStatusBadgeProps {
  incidentId: string;
  odooTicketId?: number;
  odooTicketRef?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | string;
  onSyncComplete?: (result: any) => void;
}

export function OdooStatusBadge({
  incidentId,
  odooTicketId,
  odooTicketRef,
  syncStatus = 'synced',
  onSyncComplete,
}: OdooStatusBadgeProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(syncStatus);
  const [ticketRef, setTicketRef] = useState(odooTicketRef || (odooTicketId ? `TICK-${odooTicketId}` : undefined));

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post(`/odoo/sync/${incidentId}`);
      if (res.data.success) {
        setCurrentStatus('synced');
        if (res.data.odooTicketRef) setTicketRef(res.data.odooTicketRef);
        if (onSyncComplete) onSyncComplete(res.data);
      }
    } catch {
      setCurrentStatus('failed');
    } finally {
      setIsSyncing(false);
    }
  };

  if (currentStatus === 'synced' && ticketRef) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs font-semibold text-purple-300 backdrop-blur">
        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span>Odoo Ticket: <strong className="text-white">{ticketRef}</strong></span>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          title="Resync to Odoo ERP"
          className="ml-1 text-purple-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  if (currentStatus === 'failed') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 backdrop-blur">
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Odoo Sync Failed</span>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-2 py-0.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-white font-medium text-[11px] transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 backdrop-blur">
      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
      <span>Odoo Sync Pending</span>
      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        className="text-amber-400 hover:text-white transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
