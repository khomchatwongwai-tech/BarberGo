import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  MapPin,
  Sparkles,
  Tag,
  Scissors,
  ChevronRight,
  ShieldCheck,
  Star,
  RefreshCw,
  Zap,
  Calendar,
  CheckCircle2,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarberOffer } from '../../types';

interface BarberOffersFeedProps {
  onClaimOfferAndBook: (offer: BarberOffer) => void;
  onOpenBarberProfile?: (barberId: string) => void;
}

export const BarberOffersFeed: React.FC<BarberOffersFeedProps> = ({
  onClaimOfferAndBook,
  onOpenBarberProfile
}) => {
  const [offers, setOffers] = useState<BarberOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/offers');
      if (res.ok) {
        const data = await res.json();
        setOffers(data);
      }
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleClaim = async (offer: BarberOffer) => {
    try {
      setClaimingId(offer.id);
      const res = await fetch(`/api/offers/${offer.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        onClaimOfferAndBook(offer);
      } else {
        onClaimOfferAndBook(offer);
      }
    } catch (err) {
      console.error('Error claiming offer:', err);
      onClaimOfferAndBook(offer);
    } finally {
      setClaimingId(null);
    }
  };

  // Helper for time remaining countdown
  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expiring soon';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins} mins left`;
  };

  const filteredOffers = offers.filter((o) => {
    if (filterTag === 'all') return true;
    if (filterTag === 'flash') return o.tags.some((t) => t.toLowerCase().includes('flash'));
    if (filterTag === 'fades') return o.serviceCategory.toLowerCase().includes('fade');
    if (filterTag === 'beard') return o.serviceCategory.toLowerCase().includes('beard');
    if (filterTag === 'vip') return o.serviceCategory.toLowerCase().includes('vip');
    return true;
  });

  return (
    <div className="space-y-4" id="barber-offers-feed">
      {/* Feed Header & Filters */}
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/50 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <Flame className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Live Barber Offers & Flash Openings</h3>
                <span className="rounded-full bg-sky-500 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                  {offers.length} Live Today
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Exclusive broadcast deals from licensed mobile barbers available to come to you right now
              </p>
            </div>
          </div>

          <button
            onClick={fetchOffers}
            disabled={loading}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-sky-200 bg-white px-3.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 shadow-2xs transition-all active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 pb-1 no-scrollbar">
          {[
            { id: 'all', label: '🔥 All Active Offers' },
            { id: 'flash', label: '⚡ Flash Openings' },
            { id: 'fades', label: '✂️ Precision Fades' },
            { id: 'beard', label: '🧔 Beard & Shave' },
            { id: 'vip', label: '👑 Luxury Combos' }
          ].map((tag) => (
            <button
              key={tag.id}
              onClick={() => setFilterTag(tag.id)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                filterTag === tag.id
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Cards Grid */}
      {loading && offers.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Tag className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No broadcast offers in this category right now</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Barbers broadcast new limited-time openings throughout the day. Check back shortly or view the full barber directory!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOffers.map((offer) => {
            const savings = offer.originalPrice - offer.discountedPrice;
            const timeRemaining = getTimeRemaining(offer.expiresAt);

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-sky-300 hover:shadow-md transition-all"
              >
                {/* Card Top: Barber Info & Time Countdown */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => onOpenBarberProfile && onOpenBarberProfile(offer.barberId)}
                      className="flex items-center gap-3 cursor-pointer group-hover:opacity-90"
                    >
                      <div className="relative">
                        <img
                          src={offer.barberAvatar}
                          alt={offer.barberName}
                          className="h-12 w-12 rounded-2xl object-cover border-2 border-sky-200 shadow-2xs"
                        />
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                          <ShieldCheck className="h-2.5 w-2.5" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                            {offer.barberName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{offer.barberRating.toFixed(2)}</span>
                          <span className="text-slate-400 font-normal">• Licensed Pro</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                        <Clock className="h-3 w-3 animate-pulse" />
                        {timeRemaining}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-snug">{offer.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {offer.description}
                    </p>
                  </div>

                  {/* Location & Time Window */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span>{offer.availableTimeWindow}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{offer.locationArea}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {offer.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="rounded-lg bg-sky-50 border border-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Bottom: Price & Claim Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-slate-900">${offer.discountedPrice.toFixed(2)}</span>
                      <span className="text-xs font-semibold text-slate-400 line-through">
                        ${offer.originalPrice.toFixed(2)}
                      </span>
                    </div>
                    {savings > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 block">
                        Save ${savings.toFixed(2)} ({offer.discountPercentage || Math.round((savings / offer.originalPrice) * 100)}% off)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleClaim(offer)}
                    disabled={claimingId === offer.id}
                    className="flex items-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2.5 text-xs shadow-md shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Claim & Book Now</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
