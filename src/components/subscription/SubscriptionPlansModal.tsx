import React, { useState } from 'react';
import {
  Scissors,
  X,
  Check,
  Zap,
  Crown,
  Sparkles,
  ShieldCheck,
  Star,
  ArrowRight,
  CreditCard,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSubscriptionPlan, SubscriptionPlanId, BillingInterval } from '../../types';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../context/AuthContext';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: AppSubscriptionPlan, interval: BillingInterval) => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan
}) => {
  const { user, openAuthModal } = useAuth();
  const { availablePlans, subscription, loading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('year');

  if (!isOpen) return null;

  const currentPlanId = subscription?.planId || 'free';

  const getTierIcon = (planId: SubscriptionPlanId) => {
    switch (planId) {
      case 'free':
        return <Scissors className="h-5 w-5 text-slate-500" />;
      case 'basic':
        return <Zap className="h-5 w-5 text-sky-500" />;
      case 'pro':
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 'premium':
        return <Sparkles className="h-5 w-5 text-indigo-500" />;
    }
  };

  const handlePlanClick = (plan: AppSubscriptionPlan) => {
    if (!user) {
      onClose();
      openAuthModal('login');
      return;
    }
    onSelectPlan(plan, billingInterval);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8"
        id="subscription-plans-modal"
      >
        {/* Header with gradient badge */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-6 py-8 text-center text-white sm:px-12">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            id="close-plans-modal-btn"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 border border-sky-400/30 px-3.5 py-1 text-xs font-bold text-sky-300 mb-3 shadow-inner">
            <Crown className="h-3.5 w-3.5 text-sky-400" />
            <span>BarberPilot Pro Barber Business Tiers</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-serif">
            Grow Your Mobile Barber Business
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Expand your clientele with smart dispatch matching, verified master barber status, priority ranking, and Stripe Direct Payouts.
          </p>

          {/* Billing Interval Toggle Switch */}
          <div className="mt-6 inline-flex items-center rounded-2xl bg-white/10 p-1 border border-white/15 backdrop-blur-md">
            <button
              onClick={() => setBillingInterval('month')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                billingInterval === 'month'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                billingInterval === 'year'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="p-6 sm:p-8 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {availablePlans.map((p) => {
              const isCurrent = currentPlanId === p.id;
              const isPopular = p.isPopular;
              const price = billingInterval === 'year' ? Math.round(p.pricePerYear / 12) : p.pricePerMonth;
              const billingTotalNotice =
                billingInterval === 'year' && p.pricePerYear > 0
                  ? `$${p.pricePerYear} billed annually`
                  : 'Billed monthly';

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-3xl bg-white p-5 transition-all shadow-sm ${
                    isPopular
                      ? 'border-2 border-sky-500 shadow-sky-100 shadow-lg ring-4 ring-sky-500/10'
                      : 'border border-slate-200 hover:border-slate-300'
                  }`}
                  id={`plan-card-${p.id}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500 to-sky-400 px-3 py-0.5 text-[11px] font-black tracking-wide text-white uppercase shadow-sm">
                      Most Popular
                    </div>
                  )}

                  {/* Plan Top Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 shadow-inner">
                      {getTierIcon(p.id)}
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{p.description}</p>
                  </div>

                  {/* Pricing Display */}
                  <div className="mt-4 border-y border-slate-100 py-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        ${price}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ month</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{billingTotalNotice}</p>
                  </div>

                  {/* Feature Checklist */}
                  <div className="mt-4 flex-1 space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Included Perks:</p>
                    <ul className="space-y-2">
                      {p.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="h-3.5 w-3.5 shrink-0 text-sky-500 mt-0.5 font-bold" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan Action CTA */}
                  <div className="mt-6 pt-2">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                      >
                        Active Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlanClick(p)}
                        className={`w-full flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          isPopular
                            ? 'bg-sky-500 text-white shadow-sky-500/25 hover:bg-sky-400'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                        id={`select-plan-btn-${p.id}`}
                      >
                        <span>{p.pricePerMonth === 0 ? 'Downgrade to Free' : 'Select Plan'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guarantee Footer */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>30-Day Money-Back Guarantee • Cancel anytime with one click in your account portal</span>
            </div>
            <div className="flex items-center gap-2 font-medium text-slate-600">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <span>Powered by Stripe • 256-Bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
