import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { Footer } from './Footer';
import { ProximityAlertManager } from '@/components/common/ProximityAlertManager';
import { SafeCorridorBanner } from '@/components/common/SafeCorridorBanner';
import { FloatingChatbot } from '@/components/common/FloatingChatbot';

import { useAuthStore } from '@/store/authStore';

export interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  role?: 'citizen' | 'officer' | 'admin';
}

export function AppShell({ children, showSidebar = false, role = 'citizen' }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark text-slate-100 pb-16 lg:pb-0">
      {/* Real-Time Proximity Geofencing Alerts (Only shown when logged in) */}
      {isAuthenticated && <ProximityAlertManager />}

      {/* Trinetra Safe Passage Virtual Escort (Only active when logged in) */}
      {isAuthenticated && <SafeCorridorBanner />}

      <Navbar onToggleSidebar={showSidebar ? () => setIsSidebarOpen(!isSidebarOpen) : undefined} />

      <div className="flex-1 flex">
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            role={role}
          />
        )}

        <main className="flex-1 flex flex-col w-full min-w-0">
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>

          {/* Global About Us & Emergency Helplines Footer */}
          <Footer />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating 24/7 Trinetra AI Guide & Smart Redirection Assistant */}
      <FloatingChatbot />
    </div>
  );
}

