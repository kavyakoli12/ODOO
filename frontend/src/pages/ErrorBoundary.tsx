import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SafeMap ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-4 shadow-xl shadow-rose-950/40">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Application Interface Error</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            An unexpected error occurred in this view. The system telemetry has recorded the event.
          </p>
          {this.state.error && (
            <div className="mb-6 p-3 rounded-lg bg-slate-900 border border-slate-800 text-left max-w-md w-full overflow-x-auto text-[11px] font-mono text-rose-300">
              {this.state.error.message}
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reload Trinetra
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
