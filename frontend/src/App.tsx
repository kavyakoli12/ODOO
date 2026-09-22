import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  ToastProvider,
  LoadingSpinner,
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
import { SafeCorridorsPage } from '@/pages/officer/SafeCorridorsPage';
import { initSocket } from '@/lib/socket';


import { AdminDashboard } from '@/pages/admin/AdminDashboard';

function IncidentRedirect() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=/citizen/reports/${id}`} replace />;
  }
  if (user?.role === 'officer' || user?.role === 'admin') {
    return <Navigate to={`/officer/incidents/${id}`} replace />;
  }
  return <Navigate to={`/citizen/reports/${id}`} replace />;
}

function ReportRedirect() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/citizen/report" replace />;
  }
  return <Navigate to="/citizen/report" replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const { initAuth, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Init socket on mount and refresh with auth token on auth state change
  useEffect(() => {
    initSocket();
  }, [isAuthenticated]);

  // Enable slide-out navigation for all authenticated users or portal routes
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const isOfficerRoute = location.pathname.startsWith('/officer');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const showSidebar = isAuthenticated || isCitizenRoute || isOfficerRoute || isAdminRoute;

  const currentRole = user?.role || (isAdminRoute ? 'admin' : isOfficerRoute ? 'officer' : 'citizen');

  return (
    <>
      {/* Ensures every route starts cleanly at top header */}
      <ScrollToTop />

      {/* Phase 10: Global alert banner — always visible at the top */}
      <AlertBanner />

      <AppShell showSidebar={showSidebar} role={currentRole}>
        <Suspense fallback={<LoadingSpinner size="lg" label="Loading Trinetra..." className="min-h-[60vh]" />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/map" element={<PublicMapPage />} />
            <Route path="/safety" element={<PublicMapPage />} />
            <Route path="/safety-alerts" element={<SafetyAlertsPage />} />
            <Route path="/report" element={<ReportRedirect />} />
            <Route path="/incidents/:id" element={<IncidentRedirect />} />

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
              path="/officer/map"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <PublicMapPage />
                </ProtectedRoute>
              }
            />
            {/* Phase 13: Trinetra Safe Passage (Virtual Escorts in Red Zones) */}
            <Route
              path="/officer/escorts"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <SafeCorridorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
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
