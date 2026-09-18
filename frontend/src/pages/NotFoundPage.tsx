import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/30">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-2">
        404
      </h1>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Location Coordinates Not Found
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        The incident page, resource, or map sector you are looking for has been moved, closed, or does not exist in the SafeMap system.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Return to Headquarters
          </Button>
        </Link>
        <Button variant="outline" onClick={() => window.history.back()} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
