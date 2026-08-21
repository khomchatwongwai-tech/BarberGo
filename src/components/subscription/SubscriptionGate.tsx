import React, { useState } from 'react';
import { Lock, Crown, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { SubscriptionPlanId } from '../../types';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionGateProps {
  requiredTier: SubscriptionPlanId;
  featureName: string;
  featureDescription?: string;
  children: React.ReactNode;
  fallbackType?: 'banner' | 'card' | 'hide';
  onUpgradeClick?: () => void;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  requiredTier,
  featureName,
  featureDescription,
  children,
  fallbackType = 'banner',
  onUpgradeClick
}) => {
  const { isTierAtLeast, subscription } = useSubscription();
  const hasAccess = isTierAtLeast(requiredTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallbackType === 'hide') {
    return null;
  }

  const getTierBadge = () => {
    switch (requiredTier) {
      case 'pro':
      case 'growth':
        return { label: 'BarberPilot Growth Tier', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'premium':
      case 'professional':
        return { label: 'BarberPilot Professional VIP Tier', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      default:
        return { label: 'Barber Business Tier Feature', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    }
  };

  const badge = getTierBadge();

  return (
    <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/50 p-6 text-center shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20 mb-3">
        <Lock className="h-5 w-5" />
      </div>

      <span className={`inline-block rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.color}`}>
        {badge.label}
      </span>

      <h3 className="text-base font-bold text-slate-900 mt-2">{featureName}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
        {featureDescription || `Unlock ${featureName} and exclusive perks by upgrading your BarberPilot subscription tier.`}
      </p>

      {onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-all cursor-pointer"
        >
          <Crown className="h-4 w-4" />
          <span>Upgrade to Unlock</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
