import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { UserRole } from '../../types';
import { User, Scissors, ShieldAlert, Headphones, RefreshCw } from 'lucide-react';

export const RoleSwitcherBar: React.FC = () => {
  const { user, switchRole, loading, refreshAuth } = useAuth();
  const { settings } = useConfig();

  const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string; sampleName: string }[] = [
    {
      role: 'customer',
      label: 'Customer',
      icon: <User className="h-3.5 w-3.5" />,
      desc: 'Book, Track, Pay, Tip, Review',
      sampleName: 'Marcus Vance'
    },
    {
      role: 'barber',
      label: 'Barber (Freelancer)',
      icon: <Scissors className="h-3.5 w-3.5" />,
      desc: 'Accept Bookings, GPS En-Route, Earnings',
      sampleName: 'Devon Blade'
    },
    {
      role: 'admin',
      label: 'Administrator',
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      desc: 'Branding, Fees, Verifications, Disputes',
      sampleName: 'Alexandra Chen'
    },
    {
      role: 'support',
      label: 'Support Agent',
      icon: <Headphones className="h-3.5 w-3.5" />,
      desc: 'Disputes, Live Inquiries, AI Copilot',
      sampleName: 'Jordan Rivera'
    }
  ];

  return (
    <aside aria-label="Environment Role Switcher" className="border-b border-sky-100 bg-sky-50/70 px-3 py-1.5 text-xs text-slate-600" id="role-switcher-banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-[10px] text-sky-800">
            {settings.appName} Sandbox
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-slate-600">
            Logged in as: <strong className="text-slate-900">{user?.fullName}</strong> ({user?.role})
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] text-slate-500 mr-1 hidden md:inline font-medium">Switch Role:</span>
          {roles.map((r) => {
            const isActive = user?.role === r.role;
            return (
              <button
                key={r.role}
                onClick={() => switchRole(r.role)}
                disabled={loading}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={`${r.label} mode (${r.desc})`}
                id={`switch-role-btn-${r.role}`}
              >
                {r.icon}
                <span>{r.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => refreshAuth()}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            title="Refresh Data"
            id="refresh-auth-btn"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
