import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, PlusCircle, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const isOfficer = user?.role === 'officer' || user?.role === 'admin';

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Map', path: '/map', icon: MapPin },
    { label: 'Report', path: '/report', icon: PlusCircle, highlight: true },
    {
      label: isOfficer ? 'Console' : 'Dashboard',
      path: isOfficer ? '/officer' : '/citizen',
      icon: isOfficer ? ShieldCheck : User,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md px-3 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.highlight) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center -mt-5"
                aria-label="Report Crime"
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/60 ring-4 ring-slate-950 hover:scale-105 active:scale-95 transition-all">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-medium text-rose-400 mt-1">Report</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] mt-1">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
