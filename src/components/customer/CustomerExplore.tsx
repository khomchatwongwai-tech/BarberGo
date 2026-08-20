import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { LiveMap } from '../common/LiveMap';
import {
  Search,
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  Sparkles,
  Scissors,
  Zap,
  ChevronRight,
  Filter,
  CheckCircle,
  Home,
  Store,
  Layers,
  Award,
  Navigation
} from 'lucide-react';
import { motion } from 'motion/react';

interface BarberItem {
  user: {
    id: string;
    fullName: string;
    avatarUrl: string;
  };
  profile: {
    userId: string;
    bio: string;
    experienceYears: number;
    rating: number;
    reviewCount: number;
    completedBookingsCount: number;
    travelRadiusMiles: number;
    baseTravelFee: number;
    travelFeePerMile: number;
    serviceAreaCities: string[];
    portfolioImages: string[];
    idVerified: boolean;
    licenseStatus: string;
    coordinates: { lat: number; lng: number };
  };
  services: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
    category: string;
  }[];
  distanceMiles: number;
  isWithinRadius: boolean;
  matchScore?: number;
  matchReasons?: string[];
  estimatedArrivalMinutes?: number;
  isBestMatch?: boolean;
}

interface CustomerExploreProps {
  onSelectBarber: (barberId: string) => void;
  onOpenBookingFlow: (barberId?: string, serviceId?: string, category?: string) => void;
  onOpenAskAI: () => void;
}

export const CustomerExplore: React.FC<CustomerExploreProps> = ({
  onSelectBarber,
  onOpenBookingFlow,
  onOpenAskAI
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { userCoords, customerProfile } = useAuth();
  const { settings } = useConfig();

  const [barbers, setBarbers] = useState<BarberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [highlightedBarberId, setHighlightedBarberId] = useState<string | null>(null);

  const categories = [
    { id: 'All', label: 'All Services' },
    { id: 'Haircut', label: 'Haircut' },
    { id: 'Fade', label: 'Fade' },
    { id: 'Beard', label: 'Beard' },
    { id: 'Kids Cut', label: 'Kids Cut' },
    { id: 'Hair + Beard', label: 'Hair + Beard' }
  ];

  const fetchBarbers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      params.append('lat', userCoords.lat.toString());
      params.append('lng', userCoords.lng.toString());

      const res = await fetch(`/api/barbers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBarbers(data);
      }
    } catch (err) {
      console.error('Failed to fetch barbers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBarbers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, userCoords.lat, userCoords.lng]);

  const mapMarkers = barbers.map((b) => ({
    id: b.user.id,
    lat: b.profile.coordinates.lat,
    lng: b.profile.coordinates.lng,
    title: b.user.fullName,
    role: 'barber' as const,
    rating: b.profile.rating,
    etaMinutes: b.estimatedArrivalMinutes || Math.round(b.distanceMiles * 2.5 + 4),
    price: b.services[0]?.price || 40,
    avatarUrl: b.user.avatarUrl
  }));

  const userAddressLabel = customerProfile?.savedAddresses?.[0]?.street || 'Market St, San Francisco, CA';

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto" id="customer-home-view">
      {/* 1. Location Bar & Ask AI Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Location</p>
            <p className="text-xs font-bold text-white truncate max-w-[260px] sm:max-w-xs">
              {userAddressLabel}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAskAI}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/10 border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all shadow-sm shadow-amber-500/10"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Ask BarberGo AI Stylist</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search "fade near me", "beard trim under $30", or barber name...'
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3.5 pl-11 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Need A Cut Now? - Instant Smart Match Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Barbers Active Now
              </span>
              <span className="text-xs text-amber-400/90 font-medium">Average 12m arrival</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Need a haircut right now?
            </h2>
            <p className="text-xs text-slate-300">
              One-tap Smart Match dispatches the closest top-rated barber directly to your doorstep.
            </p>
          </div>

          <button
            onClick={() => onOpenBookingFlow(undefined, undefined, selectedCategory === 'All' ? 'Fade' : selectedCategory)}
            className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-amber-500/30 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
            id="instant-smart-match-btn"
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Instant Dispatch</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4. Toggle View Controls (Map vs List) */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-sm font-extrabold text-white">
            Available Barbers Near You
          </h3>
          <p className="text-[11px] text-slate-400">
            {barbers.length} licensed & identity-verified professionals
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'both' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Both
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'map' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* 5. Live Interactive Map */}
      {(viewMode === 'both' || viewMode === 'map') && (
        <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-lg relative">
          <LiveMap
            center={userCoords}
            zoom={13}
            markers={mapMarkers}
            selectedMarkerId={highlightedBarberId || undefined}
            onSelectMarker={(id) => {
              setHighlightedBarberId(id);
              onSelectBarber(id);
            }}
          />
        </div>
      )}

      {/* 6. Barber Cards Grid */}
      {(viewMode === 'both' || viewMode === 'list') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))
          ) : barbers.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
              <Scissors className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm font-bold text-white">No barbers found matching criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting filters or expanding distance.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-3 text-xs font-bold text-amber-400 hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            barbers.map((barber) => {
              const lowestPrice = barber.services.length > 0
                ? Math.min(...barber.services.map((s) => s.price))
                : 40;

              return (
                <div
                  key={barber.user.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-slate-900/90 p-4 transition-all duration-200 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 ${
                    barber.isBestMatch
                      ? 'border-amber-500/60 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Best Match Badge */}
                  {barber.isBestMatch && (
                    <div className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-3 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
                      <Sparkles className="h-3 w-3" />
                      <span>Best Smart Match</span>
                    </div>
                  )}

                  {/* Top info */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={barber.user.avatarUrl}
                      alt={barber.user.fullName}
                      className="h-16 w-16 rounded-2xl object-cover border border-slate-700 shadow-md cursor-pointer hover:opacity-90"
                      onClick={() => onSelectBarber(barber.user.id)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4
                          onClick={() => onSelectBarber(barber.user.id)}
                          className="text-sm font-bold text-white hover:text-amber-400 cursor-pointer truncate"
                        >
                          {barber.user.fullName}
                        </h4>
                        {barber.profile.idVerified && (
                          <span title="ID & License Verified">
                            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                        <span className="flex items-center gap-0.5 font-bold text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {barber.profile.rating.toFixed(1)}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{barber.profile.reviewCount} reviews</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-medium">{barber.distanceMiles.toFixed(1)} mi</span>
                      </div>

                      {/* Travel info */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-amber-300 font-medium">
                          <Home className="h-3 w-3" /> Mobile Barber
                        </span>
                        <span>•</span>
                        <span>{barber.estimatedArrivalMinutes || 15}m ETA</span>
                      </div>
                    </div>
                  </div>

                  {/* Highlights / Reasons */}
                  {barber.matchReasons && barber.matchReasons.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {barber.matchReasons.map((r, i) => (
                        <span key={i} className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Services preview & Book Button */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Starting from</p>
                      <p className="text-sm font-extrabold text-amber-400">${lowestPrice}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectBarber(barber.user.id)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => onOpenBookingFlow(barber.user.id, barber.services[0]?.id)}
                        className="flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition-all"
                      >
                        <span>Book</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
