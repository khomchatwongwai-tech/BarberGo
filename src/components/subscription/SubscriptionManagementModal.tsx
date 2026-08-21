import React, { useState } from 'react';
import {
  Scissors,
  X,
  CreditCard,
  Crown,
  Zap,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  FileText,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { BillingInvoice, SubscriptionPlanId } from '../../types';

interface SubscriptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlans: () => void;
}

export const SubscriptionManagementModal: React.FC<SubscriptionManagementModalProps> = ({
  isOpen,
  onClose,
  onOpenPlans
}) => {
  const { user } = useAuth();
  const {
    subscription,
    plan,
    invoices,
    loading,
    cancelSubscription,
    reactivateSubscription,
    openCustomerPortal,
    refreshSubscription
  } = useSubscription();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Found another alternative');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected invoice for quick preview
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);

  if (!isOpen) return null;

  const currentPlan = plan || {
    id: 'free' as SubscriptionPlanId,
    name: 'Free Starter',
    pricePerMonth: 0,
    pricePerYear: 0,
    description: 'Basic on-demand booking with standard platform fees.'
  };

  const isFree = currentPlan.id === 'free';
  const isCanceled = subscription?.cancelAtPeriodEnd || subscription?.status === 'canceled';

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      const res = await cancelSubscription(cancelReason);
      setActionLoading(false);
      setCancelModalOpen(false);
      if (res.success) {
        setFeedbackMessage({ type: 'success', text: res.message || 'Subscription set to cancel at period end.' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to cancel subscription.' });
      }
    } catch (err: any) {
      setActionLoading(false);
      setFeedbackMessage({ type: 'error', text: err.message || 'Error occurred.' });
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      const res = await reactivateSubscription();
      setActionLoading(false);
      if (res.success) {
        setFeedbackMessage({ type: 'success', text: 'Membership reactivated successfully!' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to reactivate.' });
      }
    } catch (err: any) {
      setActionLoading(false);
      setFeedbackMessage({ type: 'error', text: err.message || 'Error occurred.' });
    }
  };

  const handleDownloadInvoice = (inv: BillingInvoice) => {
    // Generate downloadable invoice HTML / print
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BarberPilot Receipt - ${inv.invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 600px; margin: auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 900; color: #0284c7; }
          .meta { margin-bottom: 20px; font-size: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          th { background: #f8fafc; font-weight: 700; }
          .total { font-size: 18px; font-weight: 900; text-align: right; margin-top: 30px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #dcfce7; color: #166534; }
          .footer { margin-top: 50px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">✂️ BarberPilot</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">On-Demand Mobile Barber Platform</div>
          </div>
          <div style="text-align: right;">
            <div class="status">${inv.status.toUpperCase()}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">${inv.invoiceNumber}</div>
          </div>
        </div>

        <div class="meta">
          <strong>Billed To:</strong> ${user?.fullName || 'Customer'}<br>
          <strong>Email:</strong> ${user?.email || 'N/A'}<br>
          <strong>Date:</strong> ${new Date(inv.date || (inv as any).createdAt || Date.now()).toLocaleDateString()}<br>
          <strong>Payment Method:</strong> Visa •••• ${inv.paymentMethod?.last4 || '4242'}
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Period</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>BarberPilot ${inv.planName} Subscription</td>
              <td>1 Month / Year</td>
              <td style="text-align: right;">$${inv.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="total">
          Total Paid: $${inv.amount.toFixed(2)} USD
        </div>

        <div class="footer">
          Thank you for choosing BarberPilot.<br>
          BarberPilot Inc. • San Francisco, CA • support@barberpilot.com
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6"
        id="subscription-management-modal"
      >
        {/* Top Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 px-6 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400 shadow-inner">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Membership & Billing Center</h2>
              <p className="text-xs text-slate-300 font-medium">Manage plan tiers, invoices, and payment preferences</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`mx-6 mt-4 flex items-center justify-between rounded-2xl p-3.5 text-xs ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Active Plan Card Banner */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50/50 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm text-sky-500">
                  {currentPlan.id === 'pro' ? (
                    <Crown className="h-6 w-6 text-amber-500" />
                  ) : currentPlan.id === 'premium' ? (
                    <Sparkles className="h-6 w-6 text-indigo-500" />
                  ) : (
                    <Scissors className="h-6 w-6 text-sky-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{currentPlan.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        isCanceled
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isCanceled ? 'Canceling' : subscription?.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{currentPlan.description}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {isFree
                        ? 'Free tier • No recurring fees'
                        : isCanceled
                        ? `Access ends on ${new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}`
                        : `Renews on ${new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()} for $${subscription?.amount || currentPlan.pricePerMonth}/mo`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Top Actions */}
              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() => {
                    onClose();
                    onOpenPlans();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-400 transition-colors"
                  id="upgrade-plan-btn"
                >
                  <span>{isFree ? 'Upgrade Membership' : 'Change Plan'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                {!isFree && (
                  <button
                    onClick={openCustomerPortal}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>Stripe Portal</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Cancelation status banner if set to cancel */}
            {isCanceled && (
              <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3 text-xs text-amber-800">
                <span>Your membership will not renew automatically. You can reactivate anytime.</span>
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="rounded-xl bg-amber-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-amber-500 shrink-0"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Keep My Plan'}
                </button>
              </div>
            )}
          </div>

          {/* Payment Method & Management Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Information */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-sky-500" />
                  <span>Default Payment Method</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400">Auto-Billed</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px] tracking-wider">
                    VISA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Visa ending in 4242</p>
                    <p className="text-[10px] text-slate-500">Expires 12/28 • Primary</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  Valid
                </span>
              </div>

              <button
                onClick={openCustomerPortal}
                className="w-full text-center text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline pt-1"
              >
                Update Card Details & Billing Address
              </button>
            </div>

            {/* Membership Controls */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-500" />
                  <span>Subscription Security & Cancellation</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  You can pause, change tiers, or cancel recurring renewals anytime without penalties.
                </p>
              </div>

              {!isFree && !isCanceled && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="w-full rounded-xl border border-red-200 bg-red-50/50 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Cancel Auto-Renewal
                </button>
              )}
            </div>
          </div>

          {/* Billing & Invoice History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-500" />
                <span>Invoices & Billing History ({invoices.length})</span>
              </h4>
              <button
                onClick={refreshSubscription}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                No past subscription invoices generated yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Plan / Description</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="p-3 text-slate-500">{new Date(inv.date || (inv as any).createdAt || Date.now()).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">{inv.planName} Membership</td>
                        <td className="p-3 font-bold text-slate-900">${inv.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold capitalize">
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                            title="Download PDF Invoice"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Confirmation Dialog Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cancel Auto-Renewal?</h3>
                  <p className="text-xs text-slate-500">Your perks remain active until the end of your billing cycle.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Help us improve — why are you canceling?
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800"
                >
                  <option value="Not booking frequently enough">Not booking frequently enough</option>
                  <option value="Price is too high">Price is too high</option>
                  <option value="Switching to a different grooming service">Switching to a different grooming service</option>
                  <option value="Temporary pause">Temporary pause / travel</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Keep Membership
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Confirm Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
