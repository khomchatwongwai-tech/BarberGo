import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import {
  DollarSign,
  Users,
  Scissors,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  Activity
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalCustomers: number;
  totalBarbers: number;
  totalBookings: number;
  completedBookings: number;
  grossBookingValue: number;
  platformFeeRevenue: number;
  subscriptionRevenue: number;
  openDisputes: number;
  pendingVerifications: number;
}

export const AdminOverview: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { settings } = useConfig();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="admin-overview-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Executive Marketplace Analytics</h1>
          <p className="text-xs text-slate-400">
            Real-time Gross Merchandise Value (GMV), platform fee net, barber subscriptions, and compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-emerald-400 font-bold">Live Production Telemetry</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-amber-400" /> Gross Booking Volume
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white">
            ${stats?.grossBookingValue?.toFixed(2) || '0.00'}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold block">+24.5% vs last month</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Platform Fee Net ({settings.platformFeePercent}%)
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">
            ${stats?.platformFeeRevenue?.toFixed(2) || '0.00'}
          </p>
          <span className="text-[10px] text-slate-400 block">Automated split via Stripe</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-blue-400" /> Barber SaaS MRR
          </span>
          <p className="text-2xl sm:text-3xl font-black text-blue-400">
            ${stats?.subscriptionRevenue?.toFixed(2) || '0.00'}
          </p>
          <span className="text-[10px] text-slate-400 block">From monthly barber tiers</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-purple-400" /> Total Active Accounts
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {stats?.totalUsers || 0}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {stats?.totalBarbers || 0} Barbers • {stats?.totalCustomers || 0} Clients
          </span>
        </div>
      </div>

      {/* Action Banners for Review Queue and Disputes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate('verifications')}
          className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-slate-900 p-5 cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black">
              {stats?.pendingVerifications || 0}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Barber License Verification Queue</h4>
              <p className="text-xs text-slate-400">State licenses and liability insurance awaiting audit</p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-amber-400" />
        </div>

        <div
          onClick={() => onNavigate('disputes')}
          className="rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-slate-900 p-5 cursor-pointer hover:border-red-400 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white font-black">
              {stats?.openDisputes || 0}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Customer Disputes & Claims</h4>
              <p className="text-xs text-slate-400">Mediation and refund decision center</p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-red-400" />
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('settings')}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer hover:border-slate-700 transition-all space-y-1.5"
        >
          <h4 className="text-sm font-bold text-white">Marketplace Fees & Branding</h4>
          <p className="text-xs text-slate-400">
            Configure transaction fee % ({settings.platformFeePercent}%), minimum caps, tax rate, and brand identity
          </p>
        </div>

        <div
          onClick={() => onNavigate('promo_codes')}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer hover:border-slate-700 transition-all space-y-1.5"
        >
          <h4 className="text-sm font-bold text-white">Promo Codes & Discounts</h4>
          <p className="text-xs text-slate-400">
            Generate promotional discount vouchers (e.g. FRESHFADE, FIRSTCUT)
          </p>
        </div>

        <div
          onClick={() => onNavigate('bookings')}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer hover:border-slate-700 transition-all space-y-1.5"
        >
          <h4 className="text-sm font-bold text-white">Global Booking Log & CSV</h4>
          <p className="text-xs text-slate-400">
            Inspect all appointment lifecycles, force refunds, and export audit trails
          </p>
        </div>
      </div>
    </div>
  );
};
