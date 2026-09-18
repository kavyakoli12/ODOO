import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  role?: 'citizen' | 'officer' | 'admin';
}

export function AppShell({ children, showSidebar = false, role = 'citizen' }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark text-slate-100">
      <Navbar onToggleSidebar={showSidebar ? () => setIsSidebarOpen(!isSidebarOpen) : undefined} />

      <div className="flex-1 flex">
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            role={role}
          />
        )}

        <main className={`flex-1 flex flex-col transition-all duration-200 ${showSidebar ? 'lg:pl-64' : ''}`}>
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>

          {/* Clean footer */}
          <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <div>SafeMap Platform &copy; 2026 — Built for Odoo Hackathon</div>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Real-Time WebSocket Engine</span>
                <span>•</span>
                <span>Role-Based Triage</span>
                <span>•</span>
                <span>Odoo Helpdesk Bridge</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
