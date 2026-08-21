import React, { useState } from 'react';
import {
  X,
  Flame,
  Zap,
  Tag,
  Clock,
  MapPin,
  DollarSign,
  Sparkles,
  Scissors,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferCreated: () => void;
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  isOpen,
  onClose,
  onOfferCreated
}) => {
  const { user, barberProfile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Fade');
  const [serviceName, setServiceName] = useState('Signature Precision Skin & Taper Fade');
  const [originalPrice, setOriginalPrice] = useState('75');
  const [discountedPrice, setDiscountedPrice] = useState('55');
  const [availableTimeWindow, setAvailableTimeWindow] = useState('Today • 2:00 PM – 6:00 PM');
  const [locationArea, setLocationArea] = useState(
    barberProfile?.serviceAreaCities?.[0]
      ? `${barberProfile.serviceAreaCities[0]} & nearby (within ${barberProfile.travelRadiusMiles || 15} miles)`
      : 'Downtown & Metro Area (within 10 miles)'
  );
  const [expiresInHours, setExpiresInHours] = useState(4);
  const [selectedTags, setSelectedTags] = useState<string[]>(['⚡ Flash Deal', '🚗 Free Travel Included']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const quickTemplates = [
    {
      label: '⚡ Flash $20 Off Skin Fade',
      title: '⚡ Flash Opening: $20 OFF Signature Skin Fade',
      category: 'Fade',
      service: 'Signature Precision Skin & Taper Fade',
      orig: '75',
      disc: '55',
      window: 'Today • Within next 2 hours',
      desc: 'Mobile van is sanitized and ready. Available for immediate dispatch directly to your door!'
    },
    {
      label: '🧔 Hair + Beard Combo Deal',
      title: '🔥 Executive Hair + Beard Sculpting Special $65',
      category: 'Hair + Beard',
      service: 'Master Haircut + Beard Sculpting',
      orig: '95',
      disc: '65',
      window: 'Today • 3:00 PM – 7:30 PM',
      desc: 'Includes hot steam towels, razor cheek line-up, and organic beard butter treatment.'
    },
    {
      label: '🚗 Free Travel Night Slot',
      title: '🌙 Evening Flash: Haircut with 100% Free Travel Fee',
      category: 'Haircut',
      service: 'Classic Mobile Taper & Lineup',
      orig: '65',
      disc: '50',
      window: 'Tonight • 6:00 PM – 9:30 PM',
      desc: 'Lock in your fresh look before tomorrow. Zero travel fee applied!'
    }
  ];

  const availableTagsList = [
    '⚡ Flash Deal',
    '🚗 Free Travel Included',
    '🧴 Free Tea Tree Scalp Rinse',
    '🪒 Straight Razor Lineup',
    '👑 VIP Experience',
    '🌙 Late Evening Slot'
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleApplyTemplate = (tpl: typeof quickTemplates[0]) => {
    setTitle(tpl.title);
    setServiceCategory(tpl.category);
    setServiceName(tpl.service);
    setOriginalPrice(tpl.orig);
    setDiscountedPrice(tpl.disc);
    setAvailableTimeWindow(tpl.window);
    setDescription(tpl.desc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !discountedPrice) {
      setError('Please provide a title and discounted price');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          serviceCategory,
          serviceName,
          originalPrice: parseFloat(originalPrice) || 0,
          discountedPrice: parseFloat(discountedPrice),
          availableTimeWindow,
          locationArea,
          expiresInHours,
          tags: selectedTags
        })
      });

      if (res.ok) {
        onOfferCreated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to broadcast offer');
      }
    } catch (err: any) {
      setError('Network error while broadcasting offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      id="create-offer-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-sky-50/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Broadcast Live Offer to Customer Feed</h3>
              <p className="text-xs text-slate-500 font-medium">Post open slots or limited-time deals for nearby clients to claim instantly</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Templates */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              1-Click Quick Fill Templates
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickTemplates.map((tpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="whitespace-nowrap rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-800 transition-all active:scale-95 shadow-2xs"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Offer Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Offer Headline / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ⚡ Flash Opening: $20 OFF Skin Fade in Downtown SF"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Service & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              >
                <option value="Fade">Precision Fade</option>
                <option value="Haircut">Classic Haircut</option>
                <option value="Hair + Beard">Hair + Beard Sculpting</option>
                <option value="Shave">Hot Towel Shave</option>
                <option value="VIP Combo">VIP Luxe Experience</option>
                <option value="Kids Cut">Young Gentleman Cut</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Service Name</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              >
              </input>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Regular Price ($)</label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-900 mb-1">Offer Price ($) *</label>
              <input
                type="number"
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value)}
                required
                className="w-full rounded-2xl border border-sky-300 bg-sky-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Time Window & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Available Time Window</label>
              <input
                type="text"
                value={availableTimeWindow}
                onChange={(e) => setAvailableTimeWindow(e.target.value)}
                placeholder="e.g. Today • 2:30 PM – 5:30 PM"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Feed Active For</label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              >
                <option value={2}>2 Hours (Urgent Flash)</option>
                <option value={4}>4 Hours (Standard Afternoon)</option>
                <option value={8}>8 Hours (Full Day)</option>
                <option value={24}>24 Hours</option>
              </select>
            </div>
          </div>

          {/* Location Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Service Area / City</label>
            <input
              type="text"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              placeholder="e.g. Downtown SF, SOMA & FiDi (within 8 miles)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Description Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Offer Details & Highlights</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Mobile van sanitized and ready. Premium Dyson drying & organic aftershave included."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Highlight Badges
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTagsList.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-xl px-3 py-1 text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 text-xs shadow-md shadow-sky-500/20 transition-all active:scale-95"
            >
              <Flame className="h-4 w-4 fill-current" />
              <span>{submitting ? 'Broadcasting...' : 'Publish to Feed'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
