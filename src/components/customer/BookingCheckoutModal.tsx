import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Scissors,
  CheckCircle,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Service, ServiceAddon } from '../../types';

interface BookingCheckoutModalProps {
  barberId: string | null;
  initialServiceId?: string;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: (bookingId: string) => void;
}

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  barberId,
  initialServiceId,
  isOpen,
  onClose,
  onBookingComplete
}) => {
  const { user, customerProfile, userCoords, refreshAuth } = useAuth();
  const { settings } = useConfig();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [barberData, setBarberData] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<ServiceAddon[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState<string>('10:00 AM');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Address
  const [addressLine, setAddressLine] = useState(customerProfile?.savedAddresses?.[0]?.street || '101 California St, Suite 400');
  const [city, setCity] = useState(customerProfile?.savedAddresses?.[0]?.city || 'San Francisco');
  const [state, setState] = useState(customerProfile?.savedAddresses?.[0]?.state || 'CA');
  const [zip, setZip] = useState(customerProfile?.savedAddresses?.[0]?.zip || '94111');
  const [accessNotes, setAccessNotes] = useState('Concierge front desk, take elevator to 4th floor');

  // Haircut Notes
  const [haircutNotes, setHaircutNotes] = useState(customerProfile?.haircutPreferences?.notes || 'Mid-skin taper fade with #2 on top, natural hairline');
  const [referencePhoto, setReferencePhoto] = useState('');

  // Promo & Tips & Breakdown
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number>(15);
  const [customTip, setCustomTip] = useState<string>('');

  // Payment Breakdown
  const [pricingBreakdown, setPricingBreakdown] = useState<any | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [newBookingId, setNewBookingId] = useState('');

  // Fetch Barber Info
  useEffect(() => {
    if (barberId && isOpen) {
      const fetchBarber = async () => {
        try {
          const res = await fetch(`/api/barbers/${barberId}`);
          if (res.ok) {
            const b = await res.json();
            setBarberData(b);
            const foundService = initialServiceId
              ? b.services.find((s: Service) => s.id === initialServiceId)
              : b.services[0];
            setSelectedService(foundService || b.services[0]);
          }
        } catch (err) {
          console.error('Failed to load barber in checkout:', err);
        }
      };
      fetchBarber();
    }
  }, [barberId, initialServiceId, isOpen]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (barberId && date) {
      const fetchSlots = async () => {
        try {
          setSlotsLoading(true);
          const res = await fetch(`/api/barbers/${barberId}/availability-slots?date=${date}`);
          if (res.ok) {
            const data = await res.json();
            setAvailableSlots(data.slots || []);
            if (data.slots && data.slots.length > 0) {
              setTimeSlot(data.slots[0]);
            }
          }
        } catch (err) {
          console.error('Failed to load slots:', err);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchSlots();
    }
  }, [barberId, date]);

  // Recalculate price whenever selections change
  useEffect(() => {
    if (selectedService && barberData) {
      const calculatePrice = async () => {
        try {
          setCalculatingPrice(true);
          const tipAmount = customTip ? parseFloat(customTip) || 0 : selectedTip;
          const res = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barberId: barberData.user.id,
              serviceId: selectedService.id,
              addons: selectedAddons,
              customerLat: userCoords.lat,
              customerLng: userCoords.lng,
              tip: tipAmount,
              promoCode: appliedPromo?.code || (promoCode ? promoCode : undefined)
            })
          });
          if (res.ok) {
            const data = await res.json();
            setPricingBreakdown(data);
          }
        } catch (err) {
          console.error('Failed to calculate price:', err);
        } finally {
          setCalculatingPrice(false);
        }
      };
      calculatePrice();
    }
  }, [selectedService, selectedAddons, selectedTip, customTip, appliedPromo, barberData, userCoords]);

  // Validate Promo Code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      setPromoLoading(true);
      setPromoError('');
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), subtotal: selectedService?.price || 50 })
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo(data.promo);
      } else {
        setPromoError(data.error || 'Invalid promotion code');
        setAppliedPromo(null);
      }
    } catch (err) {
      setPromoError('Failed to apply promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  // Submit Booking
  const handleConfirmBooking = async () => {
    if (!selectedService || !barberData) return;
    try {
      setSubmitting(true);
      const tipAmount = customTip ? parseFloat(customTip) || 0 : selectedTip;

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: barberData.user.id,
          serviceId: selectedService.id,
          selectedAddons,
          date,
          time: timeSlot,
          address: {
            street: addressLine,
            city,
            state,
            zip,
            notes: accessNotes,
            coordinates: { lat: userCoords.lat, lng: userCoords.lng }
          },
          haircutNotes,
          referencePhotoUrl: referencePhoto,
          tip: tipAmount,
          promoCode: appliedPromo?.code
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNewBookingId(data.booking.id);
        setBookingSuccess(true);
        await refreshAuth();
      }
    } catch (err) {
      console.error('Booking submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !barberData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-md" id="booking-checkout-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={barberData.user.avatarUrl}
              alt={barberData.user.fullName}
              className="h-10 w-10 rounded-xl object-cover border border-amber-400"
            />
            <div>
              <h3 className="text-sm font-bold text-white">
                Book Mobile Service with {barberData.user.fullName}
              </h3>
              <p className="text-[11px] text-amber-400">Step {step} of 4 • Guaranteed Arrival</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/60 text-center text-[11px] font-semibold">
          {[
            { num: 1, label: 'Service & Add-ons' },
            { num: 2, label: 'Date & Time' },
            { num: 3, label: 'Location & Style' },
            { num: 4, label: 'Payment & Confirm' }
          ].map((s) => (
            <div
              key={s.num}
              className={`py-2 border-b-2 transition-colors ${
                step === s.num
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : step > s.num
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500'
              }`}
            >
              <span className="hidden sm:inline">{s.num}. </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: SERVICE & ADD-ONS */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Primary Service
                </h4>
                <div className="space-y-2.5">
                  {barberData.services.map((srv: Service) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/10 shadow-md ring-1 ring-amber-400'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-white">{srv.name}</h5>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                              {srv.durationMinutes} mins
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{srv.description}</p>
                        </div>
                        <span className="text-base font-extrabold text-white">${srv.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Add-ons (e.g., Beard oil treatment, Black mask, Design) */}
              {selectedService?.addons && selectedService.addons.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Optional Enhancements & Treatments
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedService.addons.map((addon) => {
                      const isAdded = selectedAddons.some((a) => a.id === addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => {
                            if (isAdded) {
                              setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
                            } else {
                              setSelectedAddons([...selectedAddons, addon]);
                            }
                          }}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                            isAdded
                              ? 'border-amber-400 bg-amber-500/10 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-bold">{addon.name}</p>
                            <span className="text-[10px] text-slate-400">+{addon.durationMinutes} min</span>
                          </div>
                          <span className="font-bold text-amber-400">+${addon.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DATE & TIME */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Service Date
                </label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  id="checkout-date-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Select Time Window
                  </label>
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Barber Travel Buffer Included
                  </span>
                </div>

                {slotsLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Checking live calendar & drive-time availability...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-400">
                    No available mobile appointment windows for this date. Please pick another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = timeSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => setTimeSlot(slot)}
                          className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                          id={`time-slot-${slot.replace(/[^a-zA-Z0-9]/g, '')}`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION & STYLE NOTES */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Service Delivery Location
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="e.g. 101 California St, Apt 4B"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Zip Code</label>
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Building Access / Parking Notes for Barber
                    </label>
                    <input
                      type="text"
                      value={accessNotes}
                      onChange={(e) => setAccessNotes(e.target.value)}
                      placeholder="e.g. Call box code #1402, visitor parking available in driveway"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Haircut & Beard Preferences
                </h4>
                <textarea
                  rows={3}
                  value={haircutNotes}
                  onChange={(e) => setHaircutNotes(e.target.value)}
                  placeholder="Detail preferred guards, fade heights, neckline finish, or sensitive skin notes..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT & CONFIRMATION BREAKDOWN */}
          {step === 4 && (
            <div className="space-y-5">
              {bookingSuccess ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">Mobile Booking Confirmed!</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Your appointment has been sent to {barberData.user.fullName}. You can track their arrival live once they head out!
                  </p>
                  <button
                    onClick={() => {
                      onBookingComplete(newBookingId);
                      onClose();
                    }}
                    className="mt-4 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400"
                  >
                    Go to Live Bookings & Tracking
                  </button>
                </div>
              ) : (
                <>
                  {/* Tip Selector */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Add Barber Tip (100% goes to Barber)</span>
                      <span className="text-[11px] text-amber-400">Direct Freelancer Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0, 10, 15, 20, 25].map((tipVal) => (
                        <button
                          key={tipVal}
                          onClick={() => {
                            setSelectedTip(tipVal);
                            setCustomTip('');
                          }}
                          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                            selectedTip === tipVal && !customTip
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {tipVal === 0 ? 'No Tip' : `$${tipVal}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Promo Code Box */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-400" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter Promo (e.g. FRESHFADE)"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white uppercase focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        {promoLoading ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {appliedPromo && (
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        ✓ {appliedPromo.code} applied (-${appliedPromo.discountPercent}%)
                      </p>
                    )}
                    {promoError && (
                      <p className="text-[11px] text-red-400">{promoError}</p>
                    )}
                  </div>

                  {/* Itemized Price Breakdown */}
                  {pricingBreakdown && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs space-y-2">
                      <h4 className="font-bold text-white uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                        Transparent Price Breakdown
                      </h4>
                      <div className="flex justify-between text-slate-300">
                        <span>{selectedService.name}</span>
                        <span>${pricingBreakdown.servicePrice.toFixed(2)}</span>
                      </div>
                      {pricingBreakdown.addonsTotal > 0 && (
                        <div className="flex justify-between text-slate-300">
                          <span>Enhancements & Add-ons</span>
                          <span>+${pricingBreakdown.addonsTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-300">
                        <span>Travel & Mobile Setup Fee ({pricingBreakdown.distanceMiles} mi)</span>
                        <span>+${pricingBreakdown.travelFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Platform Technology & Safety Fee ({settings.platformFeePercent}%)</span>
                        <span>+${pricingBreakdown.platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Estimated Tax ({settings.taxRatePercent}%)</span>
                        <span>+${pricingBreakdown.tax.toFixed(2)}</span>
                      </div>
                      {pricingBreakdown.discount > 0 && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Promo Discount ({pricingBreakdown.promoCode})</span>
                          <span>-${pricingBreakdown.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingBreakdown.tip > 0 && (
                        <div className="flex justify-between text-amber-400 font-bold">
                          <span>Barber Tip</span>
                          <span>+${pricingBreakdown.tip.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-black text-white">
                        <span>Total Authorization</span>
                        <span className="text-amber-400">${pricingBreakdown.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment Card Simulation */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300 font-bold">
                        <CreditCard className="h-4 w-4 text-amber-400" />
                        <span>Stripe Test Mode Payment (Secure)</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <Lock className="h-3 w-3" /> Encrypted
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">VISA</span>
                        <span>•••• •••• •••• 4242</span>
                      </div>
                      <span className="text-slate-500">Exp 12/28</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!bookingSuccess && (
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={!selectedService}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-50"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleConfirmBooking}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 disabled:opacity-50"
                id="authorize-booking-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing with Stripe...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Authorize & Request Booking (${pricingBreakdown?.total?.toFixed(2) || '0.00'})</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
