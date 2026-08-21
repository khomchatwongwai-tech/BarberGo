import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AppSubscriptionPlan,
  UserSubscription,
  BillingInvoice,
  SubscriptionPlanId,
  BillingInterval
} from '../types';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<AppSubscriptionPlan | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [availablePlans, setAvailablePlans] = useState<AppSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/subscription/my?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        setPlan(data.plan);
        setInvoices(data.invoices || []);
        setAvailablePlans(data.availablePlans || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to load subscription data');
      }
    } catch (err: any) {
      console.error('[useSubscription] Error fetching subscription:', err);
      setError(err.message || 'Network error fetching subscription data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Actions
  const createCheckout = async (planId: SubscriptionPlanId, billingInterval: BillingInterval = 'month') => {
    if (!user) throw new Error('User must be logged in to create a checkout session');
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId,
          billingInterval
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to start checkout' };
      }
      return { success: true, url: data.url, sessionId: data.sessionId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Checkout request failed' };
    }
  };

  const openCustomerPortal = async () => {
    if (!user) throw new Error('User must be logged in');
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to open billing portal' };
      }
      if (data.url) {
        window.location.href = data.url;
      }
      return { success: true, url: data.url };
    } catch (err: any) {
      return { success: false, error: err.message || 'Portal request failed' };
    }
  };

  const cancelSubscription = async (reason?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, reason })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to cancel' };
      await fetchSubscriptionData();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reactivateSubscription = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to reactivate' };
      await fetchSubscriptionData();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const changePlan = async (planId: SubscriptionPlanId, billingInterval?: BillingInterval) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, planId, billingInterval })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to change plan' };
      await fetchSubscriptionData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Feature gates
  const currentPlanId = subscription?.planId || 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  const isTierAtLeast = (targetTier: SubscriptionPlanId): boolean => {
    if (!isActive && targetTier !== 'free') return false;
    const tierWeight: Record<SubscriptionPlanId, number> = {
      free: 0,
      starter: 1,
      basic: 1,
      pro: 2,
      elite: 3,
      premium: 3,
      ultra: 4
    };
    return (tierWeight[currentPlanId] ?? 0) >= (tierWeight[targetTier] ?? 0);
  };

  const hasUnlimitedAI = isTierAtLeast('basic');
  const isZeroPlatformFee = isTierAtLeast('pro');
  const hasVIPBadge = isTierAtLeast('pro');
  const hasDedicatedStylist = isTierAtLeast('premium');
  const hasPriorityDispatch = isTierAtLeast('basic');

  return {
    subscription,
    plan,
    invoices,
    availablePlans,
    loading,
    error,
    refreshSubscription: fetchSubscriptionData,
    createCheckout,
    openCustomerPortal,
    cancelSubscription,
    reactivateSubscription,
    changePlan,
    isTierAtLeast,
    hasUnlimitedAI,
    isZeroPlatformFee,
    hasVIPBadge,
    hasDedicatedStylist,
    hasPriorityDispatch,
    isActive
  };
}
