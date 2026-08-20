import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { Tag, Plus, Check, Trash2, Calendar, Percent, Sparkles, Loader2 } from 'lucide-react';
import { PromoCode } from '../../types';

export const AdminPromoCodesView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(20);
  const [newMaxUses, setNewMaxUses] = useState(100);
  const [newExpiry, setNewExpiry] = useState('2027-12-31');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/promos');
      if (res.ok) {
        const data = await res.json();
        setPromos(data);
      }
    } catch (err) {
      console.error('Failed to load promos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async () => {
    if (!newCode.trim()) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          discountPercent: newDiscount,
          maxUses: newMaxUses,
          expiryDate: newExpiry
        })
      });
      if (res.ok) {
        await fetchPromos();
        setShowAdd(false);
        setNewCode('');
      }
    } catch (err) {
      console.error('Create promo error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="admin-promo-codes-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Promotions & Marketing Vouchers</h1>
          <p className="text-xs text-slate-400">Create customer acquisition codes and seasonal discount campaigns</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Promo Code</span>
        </button>
      </div>

      {/* Add Promo Modal / Form */}
      {showAdd && (
        <div className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-400" />
            New Discount Campaign
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Coupon Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMERFADE"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Discount %</label>
              <input
                type="number"
                value={newDiscount}
                onChange={(e) => setNewDiscount(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Redemptions</label>
              <input
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expiration Date</label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePromo}
              disabled={actionLoading || !newCode.trim()}
              className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
            >
              Save Campaign
            </button>
          </div>
        </div>
      )}

      {/* Promos Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
              <tr>
                <th className="py-2.5">Code</th>
                <th className="py-2.5">Discount</th>
                <th className="py-2.5">Uses</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {promos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="py-3 font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {p.code}
                  </td>
                  <td className="py-3 font-bold text-white">{p.discountPercent}% OFF</td>
                  <td className="py-3">{p.usedCount} / {p.maxUses}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.active ? 'ACTIVE' : 'EXPIRED'}
                    </span>
                  </td>
                  <td className="py-3">{p.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
