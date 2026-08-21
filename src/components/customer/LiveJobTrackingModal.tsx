import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  Clock,
  Car,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Share2,
  Receipt,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { LiveMap } from '../common/LiveMap';
import { Booking, BookingStatus } from '../../types';
import { ChatModal } from '../messaging/ChatModal';
import { audioAlerts } from '../../utils/audioAlerts';

interface LiveJobTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onOpenReceipt?: (booking: Booking) => void;
  onOpenSafetyModal?: (bookingId: string, barberId?: string) => void;
}

interface TrackingData {
  bookingId: string;
  status: BookingStatus;
  customer: {
    id: string;
    name: string;
    avatar?: string;
    phone?: string;
    address: { street: string; city: string; state: string; zip: string; lat?: number; lng?: number };
  };
  barber: {
    id: string;
    name: string;
    avatar: string;
    phone?: string;
    rating: number;
    reviewsCount: number;
    vehicle: {
      makeModel: string;
      color: string;
      licensePlate: string;
    };
  };
  currentLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
  estimatedMinutes: number;
  isEnRoute: boolean;
  hasArrived: boolean;
  service: { id: string; name: string; price: number; durationMinutes: number };
  pricing: { servicePrice: number; platformFee: number; travelFee: number; tax: number; tip: number; finalTotal: number };
}

export const LiveJobTrackingModal: React.FC<LiveJobTrackingModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  onOpenReceipt,
  onOpenSafetyModal
}) => {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [tipSelected, setTipSelected] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [tipSubmitted, setTipSubmitted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/live-tracking`);
      if (res.ok) {
        const trackingData = await res.json();
        setData((prev) => {
          if (prev && prev.status !== trackingData.status) {
            audioAlerts.playStatusUpdateAlert();
          }
          return trackingData;
        });
      }
    } catch (err) {
      console.error('Failed to load tracking info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !bookingId) return;
    fetchTracking();
    const interval = setInterval(fetchTracking, 3000);
    return () => clearInterval(interval);
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const statusSteps: { key: string; label: string; desc: string }[] = [
    { key: 'requested', label: 'Requested', desc: 'Matching closest barber' },
    { key: 'confirmed', label: 'Accepted', desc: 'Barber accepted request' },
    { key: 'en_route', label: 'En Route', desc: 'Driving to your location' },
    { key: 'arrived', label: 'Arrived', desc: 'Barber is at your door' },
    { key: 'in_progress', label: 'Cutting', desc: 'Haircut in progress' },
    { key: 'completed', label: 'Completed', desc: 'Fresh cut finished' }
  ];

  const getActiveStepIndex = (status?: string) => {
    if (!status) return 0;
    const s = status.toLowerCase();
    if (s.includes('request') || s.includes('search')) return 0;
    if (s.includes('confirm') || s.includes('match') || s.includes('accept') || s.includes('prep')) return 1;
    if (s.includes('en_route') || s.includes('route') || s.includes('nearby')) return 2;
    if (s.includes('arrived')) return 3;
    if (s.includes('in_progress') || s.includes('service_started')) return 4;
    if (s.includes('completed') || s.includes('payment_completed')) return 5;
    return 1;
  };

  const activeIndex = getActiveStepIndex(data?.status);

  const handleToggleFavorite = async () => {
    if (!data) return;
    try {
      const res = await fetch('/api/customer/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId: data.barber.id })
      });
      if (res.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch {
      // Ignore
    }
  };

  const handleShareTrip = () => {
    navigator.clipboard.writeText(
      `Track my BarberPilot appointment with ${data?.barber.name || 'my barber'}: https://barberpilot.com/track/${bookingId}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendTip = async (amount: number) => {
    try {
      await fetch(`/api/bookings/${bookingId}/add-tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipAmount: amount })
      });
      setTipSubmitted(true);
      fetchTracking();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
        id="live-job-tracking-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Car className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Live BarberPilot Tracking</h3>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs text-slate-400">
                {data?.status === 'completed'
                  ? 'Service Completed • Receipt ready'
                  : data?.isEnRoute
                  ? `Barber en route • Est. arrival ~${data.estimatedMinutes} min`
                  : data?.hasArrived
                  ? 'Barber has arrived at your door!'
                  : 'Live mobile appointment status'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareTrip}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
              title="Share live tracking with trusted contact"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copiedLink ? 'Copied Link!' : 'Share Trip'}</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && !data ? (
            <div className="py-20 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              <p className="mt-3 text-xs font-bold text-slate-500">Connecting to live barber GPS...</p>
            </div>
          ) : data ? (
            <>
              {/* 1. Live Interactive Map with Vehicle Marker */}
              <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                <LiveMap
                  center={data.currentLocation}
                  zoom={14}
                  markers={[
                    {
                      id: 'barber-car',
                      lat: data.currentLocation.lat,
                      lng: data.currentLocation.lng,
                      title: `${data.barber.name} (${data.barber.vehicle.makeModel})`,
                      role: 'barber',
                      rating: data.barber.rating,
                      etaMinutes: data.estimatedMinutes,
                      avatarUrl: data.barber.avatar
                    },
                    {
                      id: 'customer-home',
                      lat: data.customerLocation.lat,
                      lng: data.customerLocation.lng,
                      title: 'Your Location',
                      role: 'customer'
                    }
                  ]}
                />

                {/* Floating ETA Card on Map */}
                <div className="absolute top-3 left-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Estimated Arrival</p>
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {data.hasArrived ? 'Barber Arrived' : `~${data.estimatedMinutes} Minutes`}
                  </p>
                </div>
              </div>

              {/* 2. 11-Stage Status Stepper */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Job Status</span>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                    {data.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1 relative">
                  {statusSteps.map((step, idx) => {
                    const isDone = idx < activeIndex;
                    const isCurrent = idx === activeIndex;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isCurrent
                              ? 'bg-sky-500 text-white ring-4 ring-sky-100 shadow-sm animate-pulse'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        <p className={`text-[10px] font-bold mt-1.5 truncate max-w-full ${isCurrent ? 'text-sky-600' : 'text-slate-600'}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Barber & Vehicle Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={data.barber.avatar}
                    alt={data.barber.name}
                    className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-bold text-slate-900">{data.barber.name}</h4>
                      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        <Star className="h-3 w-3 fill-current" />
                        {data.barber.rating.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      <Car className="h-3.5 w-3.5 text-sky-600" />
                      <span className="font-semibold text-slate-800">{data.barber.vehicle.makeModel}</span>
                      <span>•</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                        {data.barber.vehicle.licensePlate}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {data.customer.address.street}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowChat(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors shadow-2xs"
                  >
                    <MessageSquare className="h-4 w-4 text-sky-600" />
                    <span>Message</span>
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center justify-center p-2.5 rounded-xl border transition-colors ${
                      isFavorite
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-rose-600'
                    }`}
                    title="Add to Favorite Barbers"
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => onOpenSafetyModal?.(bookingId, data.barber.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                    title="Open Safety Center"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Safety</span>
                  </button>
                </div>
              </div>

              {/* 4. Tipping Section (if completed or service started) */}
              {(data.status === 'completed' || activeIndex >= 4) && (
                <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-amber-50/30 to-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        Tip Your Barber (100% Goes To Barber)
                      </h4>
                    </div>
                    {tipSubmitted && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Tip Added!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[15, 20, 25].map((pct) => {
                      const tipValue = Math.round((data.service.price * (pct / 100)) * 100) / 100;
                      return (
                        <button
                          key={pct}
                          onClick={() => {
                            setTipSelected(pct);
                            handleSendTip(tipValue);
                          }}
                          className={`rounded-xl border py-2 text-center transition-all ${
                            tipSelected === pct
                              ? 'bg-amber-500 text-white font-black shadow-xs border-amber-500'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-amber-300 font-bold text-xs'
                          }`}
                        >
                          <div>{pct}%</div>
                          <div className="text-[10px] opacity-80">${tipValue.toFixed(2)}</div>
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        const val = parseFloat(customTip) || 10;
                        handleSendTip(val);
                      }}
                      className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:border-amber-300 text-center"
                    >
                      Custom
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Summary & Receipt */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{data.service.name}</span>
                  <span className="font-bold text-slate-900">${data.pricing.servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>BarberPilot Service Fee (5%)</span>
                  <span className="font-semibold text-slate-700">${data.pricing.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Travel & Equipment Fee</span>
                  <span className="font-semibold text-slate-700">${data.pricing.travelFee.toFixed(2)}</span>
                </div>
                {data.pricing.tip > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Barber Tip</span>
                    <span>+${data.pricing.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Total Amount</span>
                  <span>${data.pricing.finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Privacy disclaimer */}
              <p className="text-[10px] text-center text-slate-400">
                🔒 Privacy Protected: Live location tracking automatically ceases as soon as the appointment is completed.
              </p>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Close Tracking
          </button>

          {data && (
            <button
              onClick={() => {
                onClose();
                onOpenReceipt?.(data as any);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Receipt className="h-4 w-4" />
              <span>Digital Receipt</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* In-app Chat Modal */}
      {showChat && (
        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          bookingId={bookingId}
          recipientName={data?.barber.name || 'Barber'}
          recipientRole="barber"
        />
      )}
    </div>
  );
};
