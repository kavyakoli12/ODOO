import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button, LoadingSpinner, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui';
import type { UserRole } from '@/types/auth';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="Validating security clearance..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const portalPath = user.role === 'officer' ? '/officer' : user.role === 'admin' ? '/admin' : '/citizen';

    return (
      <div className="max-w-md mx-auto my-12">
        <Card className="border-rose-800/40 bg-slate-950/80 text-center">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 mx-auto mb-3 shadow-lg shadow-rose-950/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-white">Security Clearance Denied</CardTitle>
            <CardDescription>
              Your active account role is not authorized to access this restricted section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>Your Role:</span>
              <Badge status={user.role === 'officer' ? 'assigned' : 'submitted'}>
                {user.role.toUpperCase()}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Required Role(s):</span>
              <span className="font-semibold text-brand-300">
                {allowedRoles.map((r) => r.toUpperCase()).join(' or ')}
              </span>
            </div>
            <Link to={portalPath} className="block w-full pt-2">
              <Button variant="primary" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Return to {user.role.toUpperCase()} Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
