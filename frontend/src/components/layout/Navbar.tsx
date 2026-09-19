import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Shield, MapPin, AlertTriangle, Menu, X, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Button, Badge, useToast } from '@/components/ui';
import { NotificationBell } from '@/components/ui/NotificationBell';

export function Navbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { showToast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Continue clearing local state regardless
    }
    clearAuth();
    showToast('info', 'You have been logged out successfully.', 'Session Closed');
    navigate('/login');
  };

  const navLinks = [
    { label: 'Public Map', path: '/map', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Safety Feed', path: '/safety', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  if (isAuthenticated && user) {
    if (user.role === 'citizen') {
      navLinks.push({ label: 'Dashboard', path: '/citizen', icon: <User className="w-4 h-4" /> });
      navLinks.push({ label: 'Report Incident', path: '/citizen/report', icon: <AlertTriangle className="w-4 h-4" /> });
      navLinks.push({ label: 'My Reports', path: '/citizen/reports', icon: <Shield className="w-4 h-4" /> });
    } else if (user.role === 'officer') {
      navLinks.push({ label: 'Officer Dashboard', path: '/officer', icon: <Shield className="w-4 h-4" /> });
    } else if (user.role === 'admin') {
      navLinks.push({ label: 'Admin Console', path: '/admin', icon: <Shield className="w-4 h-4" /> });
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Slide-out Menu Trigger */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label="Toggle Navigation Drawer"
                className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-bold text-lg tracking-tight text-white leading-tight">
                  Safe<span className="text-brand-400">Map</span>
                </span>
                <span className="text-[10px] text-slate-400 leading-tight hidden sm:inline">
                  Real-Time Incident Reporting
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs / User Auth Info */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-300 text-xs font-bold flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize mt-0.5">{user.role}</div>
                  </div>
                  <Badge status={user.role === 'officer' ? 'assigned' : 'verified'} className="text-[10px] ml-1">
                    {user.role.toUpperCase()}
                  </Badge>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400" />}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button size="sm" variant="ghost" leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-900"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-800">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-300 px-3">
                  Signed in as <strong>{user.name}</strong> ({user.role})
                </div>
                <Button size="sm" variant="danger" className="w-full" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" variant="primary" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
