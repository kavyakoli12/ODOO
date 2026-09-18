import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  ToastProvider,
  LoadingSpinner,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@/components/ui';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { AppShell } from '@/components/layout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ErrorBoundary } from '@/pages/ErrorBoundary';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { CitizenDashboard } from '@/pages/citizen/CitizenDashboard';
import { ReportIncidentPage } from '@/pages/citizen/ReportIncidentPage';
import { MyReportsPage } from '@/pages/citizen/MyReportsPage';
import { ReportDetailPage } from '@/pages/citizen/ReportDetailPage';
import { PublicMapPage } from '@/pages/public/PublicMapPage';
import { SafetyAlertsPage } from '@/pages/public/SafetyAlertsPage';
import { OfficerDashboard } from '@/pages/officer/OfficerDashboard';
import { IncidentReviewPage } from '@/pages/officer/IncidentReviewPage';
import { InvestigationsPage } from '@/pages/officer/InvestigationsPage';
import { InvestigationDetailPage } from '@/pages/officer/InvestigationDetailPage';
import { AnalyticsDashboard } from '@/pages/officer/AnalyticsDashboard';
import { AlertManagementPage } from '@/pages/officer/AlertManagementPage';
import { OdooIntegrationDashboard } from '@/pages/officer/OdooIntegrationDashboard';
import { ShieldCheck } from 'lucide-react';
import { initSocket, disconnectSocket } from '@/lib/socket';


function AdminPortalPlaceholder() {
  const { user } = useAuthStore();

  return (
    <Card className="max-w-3xl mx-auto my-8 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <CardTitle>System Administration Console</CardTitle>
          </div>
          <Badge variant="danger">ADMIN PRIVILEGED</Badge>
        </div>
        <CardDescription>
          Master administrator: <strong>{user?.name}</strong> ({user?.email}). Full access to user management, officer provisioning, and audit logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Officer Provisioning</div>
            <div className="text-sm font-semibold text-emerald-400 mt-0.5">Active</div>
            <div className="text-[10px] text-slate-400">POST /api/v1/auth/officers</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">System Monitoring</div>
            <div className="text-sm font-semibold text-brand-300 mt-0.5">Active</div>
            <div className="text-[10px] text-slate-400">Telemetry & Health API</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">RBAC Enforcement</div>
            <div className="text-sm font-semibold text-purple-400 mt-0.5">Enforced</div>
            <div className="text-[10px] text-slate-400">Non-admins return 403</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppContent() {
  const location = useLocation();
  const { initAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Init/disconnect socket on auth state change
  useEffect(() => {
    if (isAuthenticated) {
      initSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  // Determine if sidebar should be shown and which role perspective to render
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const isOfficerRoute = location.pathname.startsWith('/officer');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const showSidebar = isCitizenRoute || isOfficerRoute || isAdminRoute;

  const currentRole = isAdminRoute ? 'admin' : isOfficerRoute ? 'officer' : 'citizen';

  return (
    <>
      {/* Phase 10: Global alert banner — always visible at the top */}
      <AlertBanner />

      <AppShell showSidebar={showSidebar} role={currentRole}>
        <Suspense fallback={<LoadingSpinner size="lg" label="Loading SafeMap..." className="min-h-[60vh]" />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/map" element={<PublicMapPage />} />
            <Route path="/safety" element={<PublicMapPage />} />
            <Route path="/safety-alerts" element={<SafetyAlertsPage />} />

            {/* Citizen Protected Routes */}
            <Route
              path="/citizen"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/report"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                  <ReportIncidentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/reports"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                  <MyReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/reports/:id"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
                  <ReportDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Officer Protected Routes */}
            <Route
              path="/officer"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <OfficerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/incidents/:id"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <IncidentReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/investigations"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <InvestigationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/investigations/:id"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <InvestigationDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Phase 9: Analytics */}
            <Route
              path="/officer/analytics"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />
            {/* Phase 10: Alert Management */}
            <Route
              path="/officer/alerts"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <AlertManagementPage />
                </ProtectedRoute>
              }
            />
            {/* Phase 11: Odoo ERP Integration Console */}
            <Route
              path="/officer/odoo"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <OdooIntegrationDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPortalPlaceholder />
                </ProtectedRoute>
              }
            />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppShell>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
