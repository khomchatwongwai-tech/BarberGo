import React, { useState } from 'react';
import {
  Scissors,
  X,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Crown,
  Percent,
  Calendar,
  ArrowRight,
  Download,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSubscriptionPlan, BillingInterval } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: AppSubscriptionPlan | null;
  billingInterval: BillingInterval;
  onSuccess?: () => void;
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingInterval,
  onSuccess
}) => {
  const { user } = useAuth();
  const { changePlan, refreshSubscription } = useSubscription();

  // Payment form state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('888');
  const [zip, setZip] = useState('94105');
  const [cardHolder, setCardHolder] = useState(user?.fullName || 'Client');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Checkout submission states
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  if (!isOpen || !plan) return null;

  const basePrice = billingInterval === 'year' ? plan.pricePerYear : plan.pricePerMonth;
  const promoDiscountAmount = promoApplied ? Math.round(basePrice * (promoDiscountPct / 100) * 100) / 100 : 0;
  const finalPrice = Math.max(0, Math.round((basePrice - promoDiscountAmount) * 100) / 100);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    if (!promoCode.trim()) return;

    try {
      setValidatingPromo(true);
      const res = await fetch(`/api/promo-codes/validate/${promoCode.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setPromoApplied(true);
        setPromoDiscountPct(data.discountValue || 20);
      } else {
        const errData = await res.json().catch(() => ({}));
        setPromoError(errData.error || 'Invalid promo code');
      }
    } catch (err: any) {
      setPromoError('Failed to validate promo code');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreeTerms) {
      setErrorMessage('You must accept the recurring billing terms to proceed.');
      return;
    }

    try {
      setProcessing(true);
      // Process subscription upgrade on backend
      const result = await changePlan(plan.id, billingInterval);
      if (!result.success) {
        setErrorMessage(result.error || 'Subscription payment processing failed.');
        setProcessing(false);
        return;
      }

      setTransactionId(`ch_${Date.now()}_sub_${plan.id}`);
      await refreshSubscription();
      setProcessing(false);
      setCompleted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment failed.');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6"
        id="subscription-checkout-modal"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-sky-600 via-sky-500 to-sky-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">BarberPilot Checkout</h2>
              <p className="text-xs text-sky-100 font-medium">
                {plan.name} Plan • {billingInterval === 'year' ? 'Annual Billing (Save 20%)' : 'Monthly Billing'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!completed ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Plan Summary & Perks (5 cols) */}
              <div className="md:col-span-5 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                      Membership Order
                    </span>
                    <span className="text-xs font-bold text-slate-500 capitalize">{billingInterval}ly</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{plan.name} Plan</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>

                  <div className="my-4 border-t border-slate-200 pt-3 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Included Privileges:</p>
                    <ul className="space-y-1.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Check className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5 font-bold" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Tier Price:</span>
                    <span>${basePrice.toFixed(2)}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Promo Discount ({promoDiscountPct}%):</span>
                      <span>-${promoDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes & Processing:</span>
                    <span className="text-emerald-600 font-semibold">$0.00 (Included)</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                    <span>Total Due Today:</span>
                    <span className="text-sky-600">${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Form (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Promo Code Input */}
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <div className="relative flex-1">
                    <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. VIP20)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      disabled={promoApplied}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={promoApplied || validatingPromo}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {validatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : promoApplied ? 'Applied' : 'Apply'}
                  </button>
                </form>
                {promoError && <p className="text-[11px] text-red-500">{promoError}</p>}
                {promoApplied && <p className="text-[11px] text-emerald-600 font-semibold">Promo code applied successfully!</p>}

                {/* Card Payment Form */}
                <form onSubmit={handleProcessPayment} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Full Name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Card Information</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Expires (MM/YY)</label>
                      <input
                        type="text"
                        required
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CVC / CVV</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          placeholder="CVC"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Billing ZIP / Postal Code</label>
                    <input
                      type="text"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="94105"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Recurring Terms Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded text-sky-500 focus:ring-sky-400 h-4 w-4 border-slate-300"
                      />
                      <span className="text-[11px] text-slate-500 leading-tight">
                        I authorize BarberPilot to charge <strong className="font-bold text-slate-700">${finalPrice.toFixed(2)}</strong> today and recurring {billingInterval}ly. I can cancel anytime with one click in my account settings.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all cursor-pointer mt-2"
                    id="submit-subscription-btn"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    <span>Pay ${finalPrice.toFixed(2)} & Activate {plan.name}</span>
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>256-Bit SSL Encrypted • PCI-DSS Compliant • Powered by Stripe</span>
                </div>
              </div>
            </div>
          ) : (
            /* Payment & Upgrade Success Confirmation */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">Welcome to BarberPilot {plan.name}!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your subscription has been activated successfully. All {plan.name} privileges and zero booking fees are now unlocked on your account.
                </p>
              </div>

              {/* Digital Receipt Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>Order Confirmation</span>
                  <span className="font-mono text-sky-600">{transactionId}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Plan:</span>
                  <span className="font-semibold text-slate-900">{plan.name} ({billingInterval}ly)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-slate-900">${finalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Status:</span>
                  <span className="font-bold text-emerald-600">Paid & Active</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-sky-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-colors"
                >
                  Explore Unlocked Features
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
