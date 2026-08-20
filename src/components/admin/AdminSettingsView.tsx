import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import {
  Settings,
  DollarSign,
  Shield,
  Palette,
  MapPin,
  Building2,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Phone,
  Percent,
  Clock,
  Loader2
} from 'lucide-react';
import { PlatformSettings } from '../../types';

export const AdminSettingsView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { settings, updateSettings } = useConfig();

  const [formData, setFormData] = useState<PlatformSettings>(settings);
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const success = await updateSettings(formData);
      if (success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCity = () => {
    if (!newCity.trim()) return;
    setFormData({
      ...formData,
      supportedCities: [...formData.supportedCities, newCity.trim()]
    });
    setNewCity('');
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setFormData({
      ...formData,
      supportedCities: formData.supportedCities.filter((c) => c !== cityToRemove)
    });
  };

  const handleUpdatePlanPrice = (planId: string, newPrice: number) => {
    setFormData({
      ...formData,
      subscriptionPlans: formData.subscriptionPlans.map((p) =>
        p.id === planId ? { ...p, pricePerMonth: newPrice } : p
      )
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-12" id="admin-settings-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Platform Rules & Configurator</h1>
          <p className="text-xs text-slate-400">
            Control marketplace branding, fee matrices, cancellation penalties, and subscription tiers
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50"
          id="save-platform-settings-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Platform Updated!' : 'Save All Platform Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding & Visual Identity */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Palette className="h-4 w-4 text-amber-400" />
            Brand Identity & Meta
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Application Name</label>
            <input
              type="text"
              value={formData.appName}
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline & Value Proposition</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency Helpline</label>
              <input
                type="text"
                value={formData.emergencyHelpline}
                onChange={(e) => setFormData({ ...formData, emergencyHelpline: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Theme Color</label>
              <input
                type="text"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Pricing Engine & Platform Fee Engine */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Percent className="h-4 w-4 text-emerald-400" />
            Marketplace Fees & Tax Rates
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.platformFeePercent}
                onChange={(e) => setFormData({ ...formData, platformFeePercent: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sales Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.taxRatePercent}
                onChange={(e) => setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Min Platform Fee ($)</label>
              <input
                type="number"
                step="0.5"
                value={formData.minPlatformFee}
                onChange={(e) => setFormData({ ...formData, minPlatformFee: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Platform Fee Cap ($)</label>
              <input
                type="number"
                step="0.5"
                value={formData.maxPlatformFee}
                onChange={(e) => setFormData({ ...formData, maxPlatformFee: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cancellation Cutoff (Hrs)</label>
              <input
                type="number"
                value={formData.cancellationCutoffHours}
                onChange={(e) => setFormData({ ...formData, cancellationCutoffHours: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Late Cancel Penalty (%)</label>
              <input
                type="number"
                value={formData.lateCancellationFeePercent}
                onChange={(e) => setFormData({ ...formData, lateCancellationFeePercent: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Subscription Tier Monthly Prices */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            Freelance Barber Subscription SaaS Tiers
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {formData.subscriptionPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">{plan.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {plan.bookingLimit ? `Max ${plan.bookingLimit} cuts/mo` : 'Unlimited'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    step="1"
                    value={plan.pricePerMonth}
                    onChange={(e) => handleUpdatePlanPrice(plan.id, parseFloat(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white font-bold"
                  />
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{plan.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Metro Cities */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            Supported Metro Markets ({formData.supportedCities.length})
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="e.g. Seattle, WA"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white"
            />
            <button
              onClick={handleAddCity}
              className="flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Metro Market</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.supportedCities.map((city) => (
              <span
                key={city}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              >
                <span>{city}</span>
                <button
                  onClick={() => handleRemoveCity(city)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
