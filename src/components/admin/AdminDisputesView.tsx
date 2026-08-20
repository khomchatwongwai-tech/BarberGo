import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  X,
  DollarSign,
  User,
  Clock,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Dispute } from '../../types';

export const AdminDisputesView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/disputes');
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolveDispute = async (
    disputeId: string,
    resolution: 'customer_refunded' | 'barber_payout_upheld' | 'split_resolution',
    refundAmount?: number
  ) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, refundAmount })
      });
      if (res.ok) {
        await fetchDisputes();
      }
    } catch (err) {
      console.error('Dispute resolution error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="admin-disputes-view">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Dispute Arbitration & Refund Center</h1>
          <p className="text-xs text-slate-400">Mediate customer quality complaints, late arrival claims, and fee disputes</p>
        </div>
        <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 text-xs font-bold">
          {disputes.filter((d) => d.status === 'open').length} Active Disputes
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-36 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
          <h3 className="text-base font-bold text-white">No Active Disputes</h3>
          <p className="text-xs mt-1 text-slate-400">All customer appointments are proceeding with high satisfaction.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((disp) => (
            <div
              key={disp.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4"
              id={`dispute-card-${disp.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                  <h3 className="text-sm font-bold text-white">Claim #{disp.id.slice(-6)}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      disp.status === 'open'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {disp.status}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Booking #{disp.bookingId.slice(-6)} • Reported on {new Date(disp.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 space-y-1 text-xs">
                <span className="font-bold text-amber-400">Customer Claim Statement:</span>
                <p className="text-slate-200">{disp.reason}</p>
                {disp.notes && <p className="text-slate-400 italic text-[11px]">Audit log: {disp.notes}</p>}
              </div>

              {/* Action Buttons */}
              {disp.status === 'open' ? (
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleResolveDispute(disp.id, 'barber_payout_upheld')}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Dismiss & Uphold Barber
                  </button>
                  <button
                    onClick={() => handleResolveDispute(disp.id, 'split_resolution', 45.0)}
                    disabled={actionLoading}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                  >
                    Issue 50% Courtesy Credit
                  </button>
                  <button
                    onClick={() => handleResolveDispute(disp.id, 'customer_refunded', 90.0)}
                    disabled={actionLoading}
                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 shadow"
                  >
                    Issue Full 100% Refund
                  </button>
                </div>
              ) : (
                <div className="text-right text-xs font-semibold text-emerald-400">
                  ✓ Resolved: {disp.resolution?.replace(/_/g, ' ').toUpperCase()} {disp.refundAmount ? `($${disp.refundAmount.toFixed(2)} refunded)` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
