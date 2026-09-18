import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Shield, Map, Inbox, BarChart2, Bell, X, PlusCircle, Users, LogOut, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, useToast } from '@/components/ui';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'citizen' | 'officer' | 'admin';
}

export function Sidebar({ isOpen, onClose, role }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { showToast } = useToast();

  const effectiveRole = role || user?.role || 'citizen';

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    clearAuth();
    showToast('info', 'Logged out successfully.', 'Session Closed');
    navigate('/login');
  };

  const citizenLinks = [
    { label: 'Citizen Dashboard', path: '/citizen', icon: <Inbox className="w-4 h-4" /> },
    { label: 'Submit New Report', path: '/citizen/report', icon: <PlusCircle className="w-4 h-4" /> },
    { label: 'My Reports', path: '/citizen/reports', icon: <Shield className="w-4 h-4" /> },
    { label: 'Community Map', path: '/map', icon: <Map className="w-4 h-4" /> },
    { label: 'Safety Alerts', path: '/safety-alerts', icon: <Bell className="w-4 h-4" /> },
  ];


  const officerLinks = [
    { label: 'Incident Triage Queue', path: '/officer', icon: <Inbox className="w-4 h-4" /> },
    { label: 'Tactical Crime Map', path: '/officer/map', icon: <Map className="w-4 h-4" /> },
    { label: 'Active Investigations', path: '/officer/investigations', icon: <Shield className="w-4 h-4" /> },
    { label: 'Crime Trend Analytics', path: '/officer/analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'Emergency Alerts', path: '/officer/alerts', icon: <Bell className="w-4 h-4" /> },
    { label: 'Odoo ERP Bridge', path: '/officer/odoo', icon: <Layers className="w-4 h-4" /> },
  ];

  const adminLinks = [
    { label: 'System Overview', path: '/admin', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'User & Officer Management', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { label: 'Incident Categories', path: '/admin/categories', icon: <Inbox className="w-4 h-4" /> },
    { label: 'System Audit Logs', path: '/admin/audit', icon: <Shield className="w-4 h-4" /> },
  ];

  const links =
    effectiveRole === 'admin'
      ? adminLinks
      : effectiveRole === 'officer'
      ? officerLinks
      : citizenLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-950/90 border-r border-slate-800/80 p-4 transition-transform duration-200 lg:translate-x-0 overflow-y-auto flex flex-col justify-between',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between lg:hidden pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {effectiveRole} Navigation
            </span>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Signed in User
            </div>
            <div className="text-xs font-bold text-white mt-0.5 truncate">
              {user ? user.name : 'Guest User'}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400 capitalize">{effectiveRole} Portal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-medium">
                Active
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/30 text-[11px] text-indigo-300">
            <div className="font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Odoo XML-RPC Sync
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Verified incidents queue ready for Odoo Helpdesk dispatch.
            </p>
          </div>

          {user && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-slate-300 hover:text-rose-300 hover:border-rose-700/50"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Log Out
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
