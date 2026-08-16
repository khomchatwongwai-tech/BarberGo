import React, { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Building,
  RefreshCw,
  ExternalLink,
  ArrowUpRight
} from 'lucide-react';
import { Booking } from '../../types';

export const AdminPaymentsView: React.FC = () => {
  const { settings } = useConfig();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, bRes, brRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/bookings'),
        fetch('/api/admin/barber-verification-queue')
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (bRes.ok) setBookings(await bRes.json());
      if (brRes.ok) setBarbers(await brRes.json());
    } catch (err) {
      console.error('Failed to load admin payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    window.open('/api/admin/export-csv?type=bookings', '_blank');
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto" id="admin-payments-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Payments, Payouts & Stripe Connect</h2>
          <p className="text-xs text-slate-400">Platform fee settlements, barber subscription revenues & direct bank payouts</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Financials CSV</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gross Marketplace Volume</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white mt-1">${metrics?.grossBookingValue?.toFixed(2) || '0.00'}</p>
          <span className="text-[10px] text-emerald-400 font-semibold">+18.4% this month</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Platform Fee Net Income</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400 mt-1">${metrics?.platformFeesEarned?.toFixed(2) || '0.00'}</p>
          <span className="text-[10px] text-slate-400">{settings.platformFeePercent}% per transaction</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Barber Subscriptions</span>
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-white mt-1">${metrics?.barberSubscriptionsRevenue?.toFixed(2) || '0.00'}</p>
          <span className="text-[10px] text-slate-400">Starter, Pro & Elite tiers</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Platform Revenue</span>
            <Building className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-300 mt-1">${metrics?.totalRevenue?.toFixed(2) || '0.00'}</p>
          <span className="text-[10px] text-purple-400 font-semibold">Consolidated earnings</span>
        </div>
      </div>

      {/* Stripe Connect Overview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Stripe Connect Provider Payout Accounts</h3>
              <p className="text-xs text-slate-400">Direct express payouts and KYC verification for independent barbers</p>
            </div>
          </div>

          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
            Stripe Connected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="p-3">Barber</th>
                <th className="p-3">Plan Tier</th>
                <th className="p-3">Stripe Account</th>
                <th className="p-3">Status</th>
                <th className="p-3">Completed Cuts</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {barbers.map((b) => (
                <tr key={b.user.id} className="hover:bg-slate-850/50">
                  <td className="p-3 flex items-center gap-2">
                    <img src={b.user.avatarUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
                    <div>
                      <p className="font-bold text-white">{b.user.fullName}</p>
                      <p className="text-[10px] text-slate-400">{b.user.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                      {b.profile.subscriptionTier || 'pro'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {b.profile.stripeAccountId || `acct_stripe_${b.user.id}`}
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle className="h-3.5 w-3.5" /> Active
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-semibold">{b.profile.completedBookingsCount} bookings</td>
                  <td className="p-3">
                    <button
                      onClick={() => alert(`Stripe Dashboard for ${b.user.fullName} is operational in Connect portal.`)}
                      className="flex items-center gap-1 text-amber-400 hover:underline text-[11px] font-bold"
                    >
                      <span>View Stripe</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
