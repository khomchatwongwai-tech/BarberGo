import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Booking } from '../../types';
import {
  Inbox,
  Check,
  X,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Scissors,
  MessageSquare,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ChatModal } from '../messaging/ChatModal';

export const BarberRequestsView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { user } = useAuth();
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);

  // Reschedule proposal modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('02:00 PM');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.filter((b: Booking) => b.status === 'requested'));
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (bookingId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (err) {
      console.error('Accept error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!confirm('Decline this booking request? Client will be notified immediately.')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Barber declined appointment' })
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (err) {
      console.error('Decline error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeReschedule = async () => {
    if (!rescheduleBooking) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate, newTime })
      });
      if (res.ok) {
        setRescheduleBooking(null);
        await fetchRequests();
      }
    } catch (err) {
      console.error('Reschedule error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="barber-requests-view">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Incoming Booking Requests</h1>
          <p className="text-xs text-slate-400">Review client appointment requests within your travel area</p>
        </div>
        <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold">
          {requests.length} Pending
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          <Inbox className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No Pending Requests</h3>
          <p className="text-xs mt-1 text-slate-400">
            You're all caught up! New mobile appointment requests will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4"
              id={`request-card-${req.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src={req.customerAvatar}
                    alt={req.customerName}
                    className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-500/40"
                  />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">{req.customerName}</h3>
                    <p className="text-xs text-amber-300 font-semibold">{req.service.name} ({req.service.durationMinutes} min)</p>
                    <p className="text-xs text-slate-300 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {req.address.street}, {req.address.city}
                    </p>
                  </div>
                </div>

                {/* Earnings & Date */}
                <div className="sm:text-right border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Estimated Payout</span>
                  <span className="text-xl font-black text-emerald-400">
                    ${(req.pricing.servicePrice + req.pricing.travelFee + req.pricing.tip).toFixed(2)}
                  </span>
                  <p className="text-xs text-slate-300 flex items-center sm:justify-end gap-1 mt-0.5">
                    <Calendar className="h-3 w-3 text-amber-400" />
                    {req.date} at {req.time}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {req.haircutNotes && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  <span className="font-bold text-amber-400 block mb-0.5">Customer Haircut Notes:</span>
                  <p>{req.haircutNotes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => setActiveChatBooking(req)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Message Client</span>
                </button>
                <button
                  onClick={() => {
                    setRescheduleBooking(req);
                    setNewDate(req.date);
                  }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                >
                  Propose Reschedule
                </button>
                <button
                  onClick={() => handleDecline(req.id)}
                  disabled={actionLoading}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(req.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400"
                  id={`accept-request-${req.id}`}
                >
                  <Check className="h-4 w-4" />
                  <span>Accept Booking</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Propose New Time to {rescheduleBooking.customerName}</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">New Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">New Time Window</label>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="e.g. 02:30 PM"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRescheduleBooking(null)}
                className="flex-1 rounded-xl border border-slate-700 p-2.5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleProposeReschedule}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-amber-500 p-2.5 text-xs font-bold text-slate-950"
              >
                Send Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      {activeChatBooking && (
        <ChatModal
          booking={activeChatBooking}
          isOpen={true}
          onClose={() => setActiveChatBooking(null)}
        />
      )}
    </div>
  );
};
