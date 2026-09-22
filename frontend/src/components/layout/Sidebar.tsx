import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSafePassageStore } from '@/store/safePassageStore';
import { api } from '@/lib/api';
import {
  Shield,
  Map,
  Inbox,
  BarChart2,
  Bell,
  X,
  PlusCircle,
  Users,
  LogOut,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, useToast } from '@/components/ui';
import { TrinetraLogo } from '@/components/common/TrinetraLogo';

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
  const { setManualModalOpen, activeEscort } = useSafePassageStore();

  const effectiveRole = role || user?.role || 'citizen';

  // Automatically close sidebar when navigating to a new path
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scrolling when sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    {
      label: 'Safe Passage Escort',
      path: '#safe-passage',
      isAction: true,
      onClick: () => setManualModalOpen(true),
      icon: <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />,
      badge: activeEscort ? 'ACTIVE' : 'ACTIVATE',
    },
    { label: 'Submit New Report', path: '/citizen/report', icon: <PlusCircle className="w-4 h-4" /> },
    { label: 'My Reports', path: '/citizen/reports', icon: <Shield className="w-4 h-4" /> },
    { label: 'Community Map', path: '/map', icon: <Map className="w-4 h-4" /> },
    { label: 'Safety Alerts', path: '/safety-alerts', icon: <Bell className="w-4 h-4" /> },
  ];

  const officerLinks = [
    { label: 'Incident Triage Queue', path: '/officer', icon: <Inbox className="w-4 h-4" /> },
    { label: 'Safe Passage Escorts', path: '/officer/escorts', icon: <Radio className="w-4 h-4 text-cyan-400" /> },
    { label: 'Tactical Crime Map', path: '/map', icon: <Map className="w-4 h-4" /> },
    { label: 'Active Investigations', path: '/officer/investigations', icon: <Shield className="w-4 h-4" /> },
    { label: 'Crime Trend Analytics', path: '/officer/analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'Emergency Alerts', path: '/officer/alerts', icon: <Bell className="w-4 h-4" /> },
  ];

  const adminLinks = [
    { label: 'System Overview', path: '/admin', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'Officer Management', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { label: 'Citizen Management', path: '/admin/citizens', icon: <Shield className="w-4 h-4" /> },
    { label: 'Incident Categories', path: '/admin/categories', icon: <Inbox className="w-4 h-4" /> },
  ];

  const links =
    effectiveRole === 'admin'
      ? adminLinks
      : effectiveRole === 'officer'
      ? officerLinks
      : citizenLinks;

  return (
    <>
      {/* Backdrop overlay (applies on both desktop and mobile) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-slate-950/95 border-r border-slate-800/80 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out flex flex-col justify-between overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        <div className="space-y-5">
          {/* Top Branding & Close Button */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
              <TrinetraLogo
                size="md"
                variant="badge"
                showText={true}
                subtitle="Citizen Safety & Vigilance"
              />
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Status Card */}
          <div className="px-3.5 py-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Signed in User
            </div>
            <div className="text-sm font-bold text-white mt-0.5 truncate">
              {user ? user.name : 'Guest User'}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-slate-400 capitalize">{effectiveRole} Portal</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Active
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {links.map((link: any) => {
              if (link.isAction) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      onClose();
                      link.onClick?.();
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-left cursor-pointer group',
                      activeEscort
                        ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 shadow-lg shadow-cyan-950/40'
                        : 'text-cyan-300 hover:text-white hover:bg-cyan-950/40 border border-cyan-500/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 group-hover:scale-110 transition-transform">
                        {link.icon}
                      </span>
                      <span className="font-semibold">{link.label}</span>
                    </div>
                    {link.badge && (
                      <span
                        className={cn(
                          'text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase',
                          activeEscort
                            ? 'bg-cyan-500 text-slate-950 animate-pulse'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        )}
                      >
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              }

              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                  )}
                >
                  <span className={cn(isActive ? 'text-white' : 'text-slate-400')}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Logout Only (Unwanted Odoo promotional card removed) */}
        <div className="pt-4 border-t border-slate-800/80">
          {user && (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center text-slate-300 hover:text-rose-300 hover:border-rose-700/50 hover:bg-rose-950/20"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4 text-slate-400" />}
            >
              Log Out
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
