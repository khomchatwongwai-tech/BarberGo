import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Booking, BookingStatus } from '../../types';
import { LiveMap } from '../common/LiveMap';
import { ChatModal } from '../messaging/ChatModal';
import {
  Calendar,
  Clock,
  MapPin,
  Scissors,
  CheckCircle2,
  Navigation,
  MessageSquare,
  Star,
  AlertCircle,
  FileText,
  DollarSign,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface CustomerBookingsViewProps {
  onOpenConsultation?: () => void;
  onBookAgain?: (barberId: string, serviceId: string) => void;
}

export const CustomerBookingsView: React.FC<CustomerBookingsViewProps> = ({ onOpenConsultation, onBookAgain }) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');

  // Modals & Actions
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [tipBookingId, setTipBookingId] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState('15');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState('Devon was on time, super professional, and gave me the sharpest skin fade in SF!');
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [disputeReason, setDisputeReason] = useState('Barber arrived 45 mins late');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to load customer bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 5000); // Polling for live status updates
    return () => clearInterval(interval);
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Cancellation rules apply.')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Customer requested cancellation' })
      });
      if (res.ok) {
        await fetchBookings();
      }
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTip = async (bookingId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipAmount: parseFloat(tipAmount) || 0 })
      });
      if (res.ok) {
        setTipBookingId(null);
        await fetchBookings();
      }
    } catch (err) {
      console.error('Add tip error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewBooking) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewBooking.id,
          barberId: reviewBooking.barberId,
          rating: ratingVal,
          comment: reviewText
        })
      });
      if (res.ok) {
        setReviewBooking(null);
        await fetchBookings();
      }
    } catch (err) {
      console.error('Review submit error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputeBooking) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: disputeBooking.id,
          reason: disputeReason,
          notes: 'Customer raised issue via app portal'
        })
      });
      if (res.ok) {
        setDisputeBooking(null);
        alert('Dispute submitted. Our safety & arbitration team will review within 24 hours.');
        await fetchBookings();
      }
    } catch (err) {
      console.error('Dispute submit error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'active') {
      return ['requested', 'accepted', 'confirmed', 'en_route', 'arrived', 'in_progress'].includes(b.status);
    }
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'en_route':
        return <span className="rounded-full bg-amber-500 text-slate-950 px-2.5 py-1 text-xs font-black animate-pulse flex items-center gap-1"><Navigation className="h-3 w-3" /> Barber En Route (Live GPS)</span>;
      case 'arrived':
        return <span className="rounded-full bg-emerald-500 text-slate-950 px-2.5 py-1 text-xs font-black flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Barber Has Arrived</span>;
      case 'in_progress':
        return <span className="rounded-full bg-blue-500 text-white px-2.5 py-1 text-xs font-bold flex items-center gap-1"><Scissors className="h-3 w-3" /> Haircut In Progress</span>;
      case 'completed':
        return <span className="rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold">✓ Completed</span>;
      case 'confirmed':
        return <span className="rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2.5 py-0.5 text-xs font-bold">Confirmed</span>;
      case 'accepted':
        return <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold">Accepted</span>;
      case 'cancelled':
        return <span className="rounded-full bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-0.5 text-xs font-bold">Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-800 text-slate-300 px-2.5 py-0.5 text-xs font-bold">Requested</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="customer-bookings-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">My Mobile Appointments</h1>
          <p className="text-xs text-slate-400">Track live mobile arrivals, communicate with your barber, and manage bookings</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900 p-1">
          {(['active', 'completed', 'cancelled', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading && bookings.length === 0 ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-48 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          <Calendar className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No {filter} bookings found</h3>
          <p className="text-xs mt-1 text-slate-400">
            Explore our curated roster of mobile master barbers and schedule an appointment at your home or office.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredBookings.map((b) => {
            const isEnRoute = b.status === 'en_route';
            return (
              <div
                key={b.id}
                className={`rounded-3xl border transition-all overflow-hidden ${
                  isEnRoute
                    ? 'border-amber-400 bg-slate-900 shadow-2xl shadow-amber-500/10'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
                id={`booking-card-${b.id}`}
              >
                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 font-bold">#{b.id.slice(-6)}</span>
                    {getStatusBadge(b.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-white">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                      {b.date} at {b.time}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-amber-400">${b.pricing.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Barber Info & Address */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={b.barberAvatar}
                        alt={b.barberName}
                        className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-500/40"
                      />
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white">{b.barberName}</h3>
                        <p className="text-xs text-amber-300 font-semibold">{b.service.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          {b.address.street}, {b.address.city}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setActiveChatBooking(b)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700 hover:border-amber-400"
                        id={`chat-booking-btn-${b.id}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                        <span>Message Barber</span>
                      </button>

                      {['requested', 'accepted', 'confirmed'].includes(b.status) && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                          id={`cancel-booking-btn-${b.id}`}
                        >
                          Cancel
                        </button>
                      )}

                      {b.status === 'completed' && (
                        <>
                          {onBookAgain && (
                            <button
                              onClick={() => onBookAgain(b.barberId, b.service.id)}
                              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 shadow hover:brightness-110"
                            >
                              <Scissors className="h-3.5 w-3.5" />
                              <span>Book Again</span>
                            </button>
                          )}
                          <button
                            onClick={() => setTipBookingId(b.id)}
                            className="flex items-center gap-1 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>{b.pricing.tip > 0 ? `Tip Added ($${b.pricing.tip})` : 'Add Tip'}</span>
                          </button>
                          <button
                            onClick={() => setReviewBooking(b)}
                            className="flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                          >
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                            <span>{b.review ? 'Reviewed' : 'Review'}</span>
                          </button>
                          <button
                            onClick={() => setDisputeBooking(b)}
                            className="rounded-xl border border-slate-800 px-2.5 py-2 text-xs text-slate-400 hover:text-red-400"
                            title="Report an issue or dispute"
                          >
                            Dispute
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* LIVE GPS MAP ROUTE (When En Route) */}
                  {isEnRoute && (
                    <div className="rounded-2xl border border-amber-500/40 bg-slate-950 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-amber-400 font-bold px-1">
                        <span className="flex items-center gap-1.5">
                          <Navigation className="h-4 w-4 fill-current animate-pulse" />
                          Live Mobile Tracking (Barber is in transit)
                        </span>
                        <span className="text-white bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                          ETA: ~12 Mins
                        </span>
                      </div>
                      <LiveMap
                        userLocation={{
                          lat: b.address.coordinates?.lat || 37.7903,
                          lng: b.address.coordinates?.lng || -122.3995,
                          label: 'Service Location'
                        }}
                        activeRoute={{
                          barberLocation: {
                            lat: (b.address.coordinates?.lat || 37.7903) + 0.015,
                            lng: (b.address.coordinates?.lng || -122.3995) + 0.012
                          },
                          customerLocation: {
                            lat: b.address.coordinates?.lat || 37.7903,
                            lng: b.address.coordinates?.lng || -122.3995
                          },
                          barberName: b.barberName,
                          barberAvatar: b.barberAvatar,
                          estimatedArrival: '12 mins away'
                        }}
                        className="h-64 sm:h-72"
                      />
                    </div>
                  )}

                  {/* Haircut Notes & Reference info */}
                  {b.haircutNotes && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                      <span className="font-bold text-slate-400 block mb-1">Haircut Preferences for Barber:</span>
                      <p>{b.haircutNotes}</p>
                    </div>
                  )}

                  {/* Safety & Dispute Footer Link */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                    <span>Payment Status: <strong className="text-emerald-400 uppercase">{b.paymentStatus}</strong></span>
                    <button
                      onClick={() => setDisputeBooking(b)}
                      className="text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      <span>Report Issue / Request Arbitration</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chat Modal */}
      {activeChatBooking && (
        <ChatModal
          booking={activeChatBooking}
          isOpen={true}
          onClose={() => setActiveChatBooking(null)}
        />
      )}

      {/* Tip Modal */}
      {tipBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Add Tip for Barber</h3>
            <p className="text-xs text-slate-400">100% of your tip goes directly to the mobile barber.</p>
            <div className="flex gap-2">
              {['10', '15', '20', '25'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(amt)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold ${
                    tipAmount === amt ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              placeholder="Custom tip amount"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setTipBookingId(null)}
                className="flex-1 rounded-xl border border-slate-700 p-2 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddTip(tipBookingId)}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-amber-500 p-2 text-xs font-bold text-slate-950"
              >
                {actionLoading ? 'Processing...' : `Send $${tipAmount} Tip`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Review {reviewBooking.barberName}</h3>
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRatingVal(star)}>
                  <Star
                    className={`h-7 w-7 ${
                      ratingVal >= star ? 'text-amber-400 fill-current' : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share feedback on punctuality, sanitation, precision fade, equipment..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReviewBooking(null)}
                className="flex-1 rounded-xl border border-slate-700 p-2.5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-amber-500 p-2.5 text-xs font-bold text-slate-950"
              >
                {actionLoading ? 'Submitting...' : 'Post Verified Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              Open Dispute / Arbitration
            </h3>
            <p className="text-xs text-slate-400">
              Our safety and arbitration team will examine this request, coordinate with both parties, and issue refunds if standards were breached.
            </p>
            <textarea
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setDisputeBooking(null)}
                className="flex-1 rounded-xl border border-slate-700 p-2.5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDispute}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-red-600 p-2.5 text-xs font-bold text-white hover:bg-red-500"
              >
                {actionLoading ? 'Submitting...' : 'Submit to Safety Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
