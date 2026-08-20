import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { Booking, BookingStatus } from '../../types';
import { LiveMap } from '../common/LiveMap';
import { ChatModal } from '../messaging/ChatModal';
import {
  Scissors,
  DollarSign,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  Navigation,
  MessageSquare,
  Power,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  User,
  Star
} from 'lucide-react';
import { motion } from 'motion/react';

interface BarberDashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenBioGenerator?: () => void;
}

export const BarberDashboardView: React.FC<BarberDashboardViewProps> = ({
  onNavigateTab,
  onOpenBioGenerator
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { user, barberProfile, updateBarberProfile, refreshAuth } = useAuth();
  const { settings } = useConfig();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(barberProfile?.isAcceptingBookings ?? true);
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to load barber bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAccepting = async () => {
    const nextState = !isAccepting;
    setIsAccepting(nextState);
    await updateBarberProfile({ isAcceptingBookings: nextState });
  };

  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: BookingStatus) => {
    try {
      setStatusLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await fetchBookings();
        await refreshAuth();
      }
    } catch (err) {
      console.error('Status transition error:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Find active job if any
  const activeJob = bookings.find((b) =>
    ['confirmed', 'en_route', 'arrived', 'in_progress'].includes(b.status)
  );

  const pendingRequests = bookings.filter((b) => b.status === 'requested');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  const totalGrossThisMonth = completedBookings.reduce((sum, b) => sum + b.pricing.servicePrice + b.pricing.travelFee, 0);
  const totalTips = completedBookings.reduce((sum, b) => sum + b.pricing.tip, 0);

  const currentPlan = settings.subscriptionPlans.find((p) => p.id === barberProfile?.subscriptionPlanId) || settings.subscriptionPlans[1];

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="barber-dashboard-view">
      {/* Top Banner: Status Toggle & Subscription Plan Meter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'}
              alt={user?.fullName}
              className="h-16 w-16 rounded-2xl object-cover border-2 border-amber-400"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user?.fullName}</h1>
              <span className="rounded-full bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 border border-amber-500/30 font-semibold">
                Pro Master Barber
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Plan: <strong className="text-white">{currentPlan.name}</strong> (${currentPlan.pricePerMonth}/mo)</span>
              <span>•</span>
              <span className="text-emerald-400">Stripe Connect: Active</span>
            </p>
          </div>
        </div>

        {/* Live Availability Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAccepting}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-md ${
              isAccepting
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
            }`}
            id="barber-accepting-toggle"
          >
            <Power className="h-4 w-4" />
            <span>{isAccepting ? 'Accepting Mobile Cuts' : 'Paused / Offline'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-400" /> Gross Cut Earnings
          </span>
          <p className="text-2xl font-black text-white">${totalGrossThisMonth.toFixed(2)}</p>
          <span className="text-[10px] text-emerald-400 block font-semibold">+18% this month</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-amber-400" /> 100% Tips Kept
          </span>
          <p className="text-2xl font-black text-amber-400">${totalTips.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400 block">Direct customer appreciation</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-400" /> Completed Bookings
          </span>
          <p className="text-2xl font-black text-white">{completedBookings.length}</p>
          <span className="text-[10px] text-slate-400 block">
            {currentPlan.bookingLimit ? `${completedBookings.length}/${currentPlan.bookingLimit} Plan limit` : 'Unlimited Plan'}
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-400 fill-current" /> Client Rating
          </span>
          <p className="text-2xl font-black text-white">{barberProfile?.rating?.toFixed(2) || '4.98'}</p>
          <span className="text-[10px] text-slate-400 block">From {barberProfile?.reviewCount || 128} verified reviews</span>
        </div>
      </div>

      {/* ACTIVE JOB STEERING WHEEL (If Barber has a confirmed/in-progress appointment) */}
      {activeJob && (
        <div className="rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-6 shadow-2xl space-y-4" id="barber-active-job-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping"></span>
              <h3 className="text-base font-bold text-white">Active Mobile Service In Progress</h3>
            </div>
            <span className="rounded-full bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 uppercase">
              Current Status: {activeJob.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-start gap-3">
                <img
                  src={activeJob.customerAvatar}
                  alt={activeJob.customerName}
                  className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-400"
                />
                <div>
                  <h4 className="text-base font-bold text-white">{activeJob.customerName}</h4>
                  <p className="text-xs text-amber-300 font-semibold">{activeJob.service.name}</p>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    {activeJob.address.street}, {activeJob.address.city}
                  </p>
                  {activeJob.address.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      Client Note: "{activeJob.address.notes}"
                    </p>
                  )}
                </div>
              </div>

              {activeJob.haircutNotes && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  <span className="font-bold text-amber-400 block mb-0.5">Style Preferences:</span>
                  <p>{activeJob.haircutNotes}</p>
                </div>
              )}
            </div>

            {/* Stepper Steering Wheel */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Workflow Action Controller
              </span>

              {activeJob.status === 'confirmed' && (
                <button
                  onClick={() => handleUpdateBookingStatus(activeJob.id, 'en_route')}
                  disabled={statusLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-all"
                  id="start-travel-btn"
                >
                  <Navigation className="h-4 w-4 fill-current" />
                  <span>Start Travel (Share Live GPS with Client)</span>
                </button>
              )}

              {activeJob.status === 'en_route' && (
                <button
                  onClick={() => handleUpdateBookingStatus(activeJob.id, 'arrived')}
                  disabled={statusLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all"
                  id="mark-arrived-btn"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I Have Arrived (Safety Check-In)</span>
                </button>
              )}

              {activeJob.status === 'arrived' && (
                <button
                  onClick={() => handleUpdateBookingStatus(activeJob.id, 'in_progress')}
                  disabled={statusLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 transition-all"
                  id="start-service-btn"
                >
                  <Scissors className="h-4 w-4" />
                  <span>Start Haircut / Grooming Session</span>
                </button>
              )}

              {activeJob.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateBookingStatus(activeJob.id, 'completed')}
                  disabled={statusLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all"
                  id="complete-service-btn"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Complete Service & Request Tip (${activeJob.pricing.total.toFixed(2)})</span>
                </button>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveChatBooking(activeJob)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  <span>Chat Client</span>
                </button>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeJob.address.street + ' ' + activeJob.address.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  <span>Turn-by-Turn</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Quick Callout */}
      {pendingRequests.length > 0 && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
              {pendingRequests.length}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">New Booking Requests Waiting</h4>
              <p className="text-xs text-amber-300">Clients have requested appointment slots within your travel zone</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('requests')}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
          >
            <span>Review & Accept Requests</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('calendar')}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer hover:border-slate-700 transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <Clock className="h-5 w-5 text-amber-400" />
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
          <h4 className="text-sm font-bold text-white">Schedule & Buffer Time</h4>
          <p className="text-xs text-slate-400">Configure weekly hours, break intervals, and drive-time buffers</p>
        </div>

        <div
          onClick={() => onNavigateTab('earnings')}
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer hover:border-slate-700 transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
          <h4 className="text-sm font-bold text-white">Stripe Connect & Payouts</h4>
          <p className="text-xs text-slate-400">View direct deposits, subscription plan invoices, and instant payouts</p>
        </div>

        <div
          onClick={onOpenBioGenerator}
          className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-5 cursor-pointer hover:border-amber-400 transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="text-[10px] rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 font-bold">Gemini AI</span>
          </div>
          <h4 className="text-sm font-bold text-white">AI Bio & Menu Enhancer</h4>
          <p className="text-xs text-slate-400">Generate high-converting biography copy and signature service descriptions</p>
        </div>
      </div>

      {/* Chat Modal */}
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
