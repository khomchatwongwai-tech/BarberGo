import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  CheckCircle,
  ArrowUpRight,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  Download,
  Loader2
} from 'lucide-react';
import { Booking } from '../../types';

export const BarberEarningsView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { user, barberProfile, updateBarberProfile, refreshAuth } = useAuth();
  const { settings } = useConfig();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(barberProfile?.subscriptionPlanId || 'growth');
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          setBookings(data.filter((b: Booking) => b.status === 'completed'));
        }
      } catch (err) {
        console.error('Failed to load earnings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const totalServiceEarnings = bookings.reduce((sum, b) => sum + b.pricing.servicePrice, 0);
  const totalTravelEarnings = bookings.reduce((sum, b) => sum + b.pricing.travelFee, 0);
  const totalTips = bookings.reduce((sum, b) => sum + b.pricing.tip, 0);
  const grossTotal = totalServiceEarnings + totalTravelEarnings + totalTips;

  const handleInstantPayout = () => {
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      setPayoutSuccess(true);
      setTimeout(() => setPayoutSuccess(false), 4000);
    }, 1500);
  };

  const handleSelectPlan = async (planId: string) => {
    try {
      setPlanLoading(true);
      setSelectedPlanId(planId);
      await updateBarberProfile({ subscriptionPlanId: planId });
      await refreshAuth();
    } catch (err) {
      console.error('Plan upgrade error:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  const currentPlan = settings.subscriptionPlans.find((p) => p.id === selectedPlanId) || settings.subscriptionPlans[1];

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="barber-earnings-view">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Freelance Earnings & Stripe Payouts</h1>
        <p className="text-xs text-slate-400">Direct deposits, 100% tip preservation, and platform subscription tiers</p>
      </div>

      {/* Primary Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <span className="text-xs text-slate-400">Available for Payout</span>
          <p className="text-3xl font-black text-emerald-400">${grossTotal.toFixed(2)}</p>
          <button
            onClick={handleInstantPayout}
            disabled={payoutLoading || grossTotal === 0}
            className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 shadow hover:bg-emerald-400 disabled:opacity-50"
          >
            {payoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
            <span>{payoutSuccess ? 'Transfer Initiated!' : 'Instant Transfer (1% fee)'}</span>
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Direct Client Tips (100% Kept)</span>
          <p className="text-2xl font-black text-amber-400">${totalTips.toFixed(2)}</p>
          <span className="text-[10px] text-slate-500 block">No platform commission deducted</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Travel Surcharges Earned</span>
          <p className="text-2xl font-black text-white">${totalTravelEarnings.toFixed(2)}</p>
          <span className="text-[10px] text-slate-500 block">Covers mileage and mobile setup</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Stripe Connect Status</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm pt-1">
            <CheckCircle className="h-4 w-4" />
            <span>Active Direct Deposit</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Routing to Chase Bank (•••• 4912)</span>
        </div>
      </div>

      {/* Subscription Tier Management */}
      <div className="rounded-3xl border border-amber-500/20 bg-slate-900/90 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-400" />
              BarberGo Monthly Volume Tier
            </h3>
            <p className="text-xs text-slate-400">
              Transparent monthly flat software subscriptions. No percentage cut taken from your cuts or tips!
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 font-bold border border-emerald-500/30">
            Active: {currentPlan.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {settings.subscriptionPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                    <span className="text-lg font-black text-amber-400">${plan.pricePerMonth}<span className="text-xs text-slate-400">/mo</span></span>
                  </div>
                  <p className="text-xs text-slate-400">{plan.description}</p>

                  <ul className="space-y-1.5 pt-2 text-xs text-slate-300">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={planLoading || isSelected}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-amber-400 cursor-default'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow'
                  }`}
                >
                  {isSelected ? 'Current Active Plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Bookings Ledger */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Completed Jobs Ledger</h3>
          <span className="text-xs text-slate-400">{bookings.length} Completed Bookings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
              <tr>
                <th className="py-2.5">Booking ID</th>
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Client</th>
                <th className="py-2.5">Service</th>
                <th className="py-2.5">Cut Fee</th>
                <th className="py-2.5">Travel</th>
                <th className="py-2.5">Tip</th>
                <th className="py-2.5 font-bold text-white">Your Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="py-3 font-mono text-slate-400">#{b.id.slice(-6)}</td>
                  <td className="py-3">{b.date}</td>
                  <td className="py-3 font-bold text-white">{b.customerName}</td>
                  <td className="py-3">{b.service.name}</td>
                  <td className="py-3">${b.pricing.servicePrice.toFixed(2)}</td>
                  <td className="py-3">+${b.pricing.travelFee.toFixed(2)}</td>
                  <td className="py-3 text-amber-400 font-bold">+${b.pricing.tip.toFixed(2)}</td>
                  <td className="py-3 font-extrabold text-emerald-400">
                    ${(b.pricing.servicePrice + b.pricing.travelFee + b.pricing.tip).toFixed(2)}
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
