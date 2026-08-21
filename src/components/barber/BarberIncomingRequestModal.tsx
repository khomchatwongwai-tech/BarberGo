import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Clock,
  MapPin,
  Check,
  X,
  DollarSign,
  User,
  Scissors,
  Navigation,
  ShieldCheck,
  Flame,
  AlertCircle
} from 'lucide-react';
import { Booking } from '../../types';
import { audioAlerts } from '../../utils/audioAlerts';

interface BarberIncomingRequestModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onAccept: (bookingId: string) => void;
  onDecline: (bookingId: string) => void;
  onClose: () => void;
}

export const BarberIncomingRequestModal: React.FC<BarberIncomingRequestModalProps> = ({
  isOpen,
  booking,
  onAccept,
  onDecline,
  onClose
}) => {
  const [timeLeft, setTimeLeft] = useState(45);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !booking) return;

    // Reset countdown
    setTimeLeft(45);

    // Play alert sound chime
    audioAlerts.playNewRequestAlert();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline(booking.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const distanceEstMiles = 3.2;
  const driveEstMins = Math.round(distanceEstMiles * 2.5 + 4);
  const estimatedPayout = booking.pricing?.barberEarnings?.netPayout || booking.pricing?.servicePrice || 45;

  const handleAcceptClick = async () => {
    setActionLoading(true);
    await onAccept(booking.id);
    setActionLoading(false);
  };

  const handleDeclineClick = async () => {
    setActionLoading(true);
    await onDecline(booking.id);
    setActionLoading(false);
  };

  const progressPct = (timeLeft / 45) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border-2 border-amber-500/80 shadow-2xl text-white flex flex-col"
        id="barber-incoming-request-modal"
      >
        {/* Top Glowing Header with Live Countdown Ring */}
        <div className="relative bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-amber-500/20 p-6 border-b border-slate-800 text-center">
          {/* Animated Countdown Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft < 15 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300 uppercase tracking-wider mb-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>New BarberPilot Request</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            {booking.service.name}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Customer requested immediate mobile dispatch to their address
          </p>

          {/* Large Countdown Timer display */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950/80 border border-slate-800 px-4 py-2 text-sm font-black">
            <Clock className={`h-4 w-4 ${timeLeft < 15 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={timeLeft < 15 ? 'text-rose-400 font-black' : 'text-amber-300'}>
              Auto-declines in {timeLeft}s
            </span>
          </div>
        </div>

        {/* Request Details Body */}
        <div className="p-6 space-y-5">
          {/* Customer & Location */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <img
                src={booking.customerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt={booking.customerName}
                className="h-12 w-12 rounded-xl object-cover border border-slate-600"
              />
              <div>
                <p className="text-sm font-bold text-white">{booking.customerName}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="truncate max-w-[200px]">{booking.address.street}, {booking.address.city}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 text-[11px] font-bold">
                {distanceEstMiles} mi away
              </span>
              <p className="text-[11px] text-slate-400 mt-1">~{driveEstMins} min drive</p>
            </div>
          </div>

          {/* Key Job Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-800/50 border border-slate-800 p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Est. Drive</p>
              <p className="text-base font-black text-white mt-0.5">~{driveEstMins}m</p>
            </div>
            <div className="rounded-2xl bg-slate-800/50 border border-slate-800 p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Service Time</p>
              <p className="text-base font-black text-white mt-0.5">~{booking.durationMinutes || 40}m</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-center">
              <p className="text-[10px] font-bold text-emerald-400 uppercase">Your Payout</p>
              <p className="text-base font-black text-emerald-300 mt-0.5">${estimatedPayout.toFixed(2)}</p>
            </div>
          </div>

          {/* Notes if any */}
          {booking.haircutNotes && (
            <div className="rounded-2xl bg-slate-800/40 border border-slate-800 p-3 text-xs text-slate-300">
              <strong className="text-white block mb-0.5">Client Style Notes:</strong>
              "{booking.haircutNotes}"
            </div>
          )}

          {/* Actions: Accept vs Decline */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDeclineClick}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3.5 px-4 text-sm font-bold text-slate-300 transition-colors shadow-md disabled:opacity-50"
            >
              <X className="h-5 w-5 text-rose-400" />
              <span>Decline</span>
            </button>

            <button
              onClick={handleAcceptClick}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 py-3.5 px-4 text-sm font-black text-slate-950 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              <span>{actionLoading ? 'Accepting...' : 'ACCEPT JOB'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
