import React, { useState } from 'react';
import {
  Scissors,
  X,
  CheckCircle,
  Download,
  Mail,
  Printer,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { Booking } from '../../types';

interface DigitalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  isOpen,
  onClose,
  booking
}) => {
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReceipt = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  };

  const pricing = booking.pricing;
  const paymentIntentId = booking.paymentIntentId || `pi_test_${booking.id.replace('bk-', '')}`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Sky Blue Header Bar */}
        <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">BarberPilot Official Receipt</h3>
              <p className="text-[11px] text-sky-100">Verified Electronic Payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800" id="printable-receipt">
          {/* Top Status */}
          <div className="text-center pb-3 border-b border-slate-100">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-2">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Payment Completed</h4>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Ref: {booking.id.toUpperCase()}</p>
            <p className="text-[11px] text-slate-400 font-mono">Stripe ID: {paymentIntentId}</p>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-xs">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Service Booked</p>
              <p className="font-bold text-slate-900 mt-0.5">{booking.serviceName}</p>
              <p className="text-slate-500">{booking.serviceCategory} • {booking.serviceDuration} min</p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Pro Barber</p>
              <p className="font-bold text-slate-900 mt-0.5">{booking.barberName}</p>
              <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="h-3 w-3 text-sky-500" /> Verified Partner
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Date & Time</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {new Date(booking.scheduledDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-slate-500">{booking.scheduledTime}</p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Service Location</p>
              <p className="font-semibold text-slate-900 mt-0.5 line-clamp-1">{booking.address}</p>
              <p className="text-slate-500 capitalize">{booking.serviceType.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Itemized Pricing Breakdown */}
          <div className="space-y-2.5 pt-1">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pricing Breakdown</h5>
            
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Service Fee ({booking.serviceName})</span>
              <span className="font-medium text-slate-900">${pricing?.servicePrice?.toFixed(2) || '45.00'}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Travel & Mobile Dispatch</span>
              <span className="font-medium text-slate-900">${pricing?.travelFee?.toFixed(2) || '10.00'}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>BarberPilot Platform & Safety Fee</span>
              <span className="font-medium text-slate-900">${pricing?.platformFee?.toFixed(2) || '4.00'}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Taxes & Processing</span>
              <span className="font-medium text-slate-900">${pricing?.taxes?.toFixed(2) || '4.50'}</span>
            </div>

            {pricing?.tipAmount && pricing.tipAmount > 0 ? (
              <div className="flex items-center justify-between text-xs text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
                <span className="font-medium">Barber Tip (100% direct to {booking.barberName.split(' ')[0]})</span>
                <span className="font-bold">${pricing.tipAmount.toFixed(2)}</span>
              </div>
            ) : null}

            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Total Charged</p>
                <p className="text-[10px] text-slate-400">Processed via Stripe Marketplace Connect</p>
              </div>
              <span className="text-lg font-black text-sky-600">
                ${(pricing?.total || 63.50).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Badge */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-800">Payment Method</p>
                <p className="text-[11px] text-slate-500">Stripe Card •••• 4242</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              Captured
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={handleEmailReceipt}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Mail className="h-3.5 w-3.5 text-sky-500" />
            <span>{emailSent ? 'Email Sent!' : 'Email Receipt'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
