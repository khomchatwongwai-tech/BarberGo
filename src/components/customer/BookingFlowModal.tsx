import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import {
  X,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Scissors,
  Home,
  Store,
  Zap,
  Tag,
  Star,
  Loader2,
  Navigation,
  Lock,
  UserCheck,
  Check,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Service, ServiceAddon, Booking } from '../../types';

interface BookingFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarberId?: string | null;
  initialServiceId?: string | null;
  initialCategory?: string | null;
  onBookingCreated?: (bookingId: string) => void;
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  isOpen,
  onClose,
  initialBarberId,
  initialServiceId,
  initialCategory,
  onBookingCreated
}) => {
  const { user, customerProfile, userCoords } = useAuth();
  const { settings } = useConfig();

  // 6 Steps: 1: Service, 2: Location Mode, 3: Timing, 4: Barber, 5: Review, 6: Pay/Status
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Available Barbers & Services list
  const [allBarbers, setAllBarbers] = useState<any[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(false);

  // Selections
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'Fade');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<ServiceAddon[]>([]);
  const [locationType, setLocationType] = useState<'mobile_come_to_me' | 'studio_go_to_barber'>('mobile_come_to_me');
  const [timingMode, setTimingMode] = useState<'asap_now' | 'scheduled'>('asap_now');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('11:00 AM');
  
  // Barber Choice: 'smart_match' vs specific barber object
  const [barberSelectionMode, setBarberSelectionMode] = useState<'smart_match' | 'manual'>('smart_match');
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null);
  const [smartMatchResult, setSmartMatchResult] = useState<any | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Address
  const [addressLine, setAddressLine] = useState(customerProfile?.savedAddresses?.[0]?.street || '101 California St, Suite 400');
  const [city, setCity] = useState(customerProfile?.savedAddresses?.[0]?.city || 'San Francisco');
  const [state, setState] = useState(customerProfile?.savedAddresses?.[0]?.state || 'CA');
  const [zip, setZip] = useState(customerProfile?.savedAddresses?.[0]?.zip || '94111');
  const [haircutNotes, setHaircutNotes] = useState(customerProfile?.haircutPreferences?.notes || 'Skin taper fade, trim 1/2 inch on top');

  // Promo & Tip
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoError, setPromoError] = useState('');
  const [tipPercentage, setTipPercentage] = useState<number>(20);
  const [customTip, setCustomTip] = useState<string>('');

  // Payment & Creation State
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('apple_pay');

  // Load barbers and auto-select initial barber/service
  useEffect(() => {
    if (!isOpen) return;

    const fetchBarbers = async () => {
      try {
        setLoadingBarbers(true);
        const res = await fetch(`/api/barbers?lat=${userCoords.lat}&lng=${userCoords.lng}`);
        if (res.ok) {
          const list = await res.json();
          setAllBarbers(list);

          // If initialBarberId specified
          if (initialBarberId) {
            const match = list.find((b: any) => b.user.id === initialBarberId);
            if (match) {
              setSelectedBarber(match);
              setBarberSelectionMode('manual');
              const srv = initialServiceId
                ? match.services.find((s: Service) => s.id === initialServiceId)
                : match.services[0];
              if (srv) {
                setSelectedService(srv);
                setSelectedCategory(srv.category || 'Haircut');
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load barbers:', err);
      } finally {
        setLoadingBarbers(false);
      }
    };

    fetchBarbers();
  }, [isOpen, initialBarberId, initialServiceId, userCoords.lat, userCoords.lng]);

  // Trigger Smart Match when category or timing changes
  useEffect(() => {
    if (!isOpen) return;

    const runSmartMatch = async () => {
      try {
        setMatchingLoading(true);
        const res = await fetch('/api/barbers/smart-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: selectedCategory,
            timing: timingMode,
            locationType,
            lat: userCoords.lat,
            lng: userCoords.lng
          })
        });
        if (res.ok) {
          const data = await res.json();
          setSmartMatchResult(data.bestMatch);
          if (barberSelectionMode === 'smart_match' && data.bestMatch) {
            setSelectedBarber(data.bestMatch);
            // Default service from best match
            const srv = data.bestMatch.services.find((s: Service) =>
              s.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
              s.name.toLowerCase().includes(selectedCategory.toLowerCase())
            ) || data.bestMatch.services[0];
            if (srv && !selectedService) {
              setSelectedService(srv);
            }
          }
        }
      } catch (err) {
        console.error('Smart match error:', err);
      } finally {
        setMatchingLoading(false);
      }
    };

    runSmartMatch();
  }, [isOpen, selectedCategory, timingMode, locationType, barberSelectionMode, userCoords.lat, userCoords.lng]);

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    try {
      const res = await fetch(`/api/promo-codes/validate/${promoCode.trim()}`);
      if (res.ok) {
        const promo = await res.json();
        setAppliedPromo(promo);
      } else {
        const err = await res.json();
        setPromoError(err.error || 'Invalid promo code');
      }
    } catch (e) {
      setPromoError('Unable to validate promo code');
    }
  };

  // Pricing calculation
  const servicePrice = selectedService?.price || (selectedCategory === 'Fade' ? 45 : selectedCategory === 'Beard' ? 30 : selectedCategory === 'Kids Cut' ? 30 : selectedCategory === 'Hair + Beard' ? 65 : 40);
  const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const travelFee = locationType === 'mobile_come_to_me' ? (selectedBarber?.profile?.baseTravelFee ?? 12) : 0;
  const subtotalBeforeDiscount = servicePrice + addonsPrice + travelFee;
  
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      discountAmount = (subtotalBeforeDiscount * (appliedPromo.discountValue || 15)) / 100;
      if (appliedPromo.maxDiscount && discountAmount > appliedPromo.maxDiscount) {
        discountAmount = appliedPromo.maxDiscount;
      }
    } else {
      discountAmount = appliedPromo.discountValue || 10;
    }
  }

  const taxableAmount = Math.max(0, subtotalBeforeDiscount - discountAmount);
  const platformFee = Math.min(settings.maxPlatformFee, Math.max(settings.minPlatformFee, (taxableAmount * settings.platformFeePercent) / 100));
  const estimatedTax = (taxableAmount * settings.taxRatePercent) / 100;
  
  const effectiveTip = customTip !== '' ? Math.max(0, parseFloat(customTip) || 0) : (servicePrice * tipPercentage) / 100;
  const totalAmount = Math.max(0, taxableAmount + platformFee + estimatedTax + effectiveTip);

  // Submit Booking (Step 6)
  const handleConfirmAndPay = async () => {
    if (!user) return;
    const effectiveBarber = selectedBarber || smartMatchResult || allBarbers[0];
    if (!effectiveBarber) return;

    try {
      setSubmittingBooking(true);
      const payload = {
        barberId: effectiveBarber.user?.id || effectiveBarber.profile?.userId,
        serviceId: selectedService?.id || 'srv-fade-master',
        serviceName: selectedService?.name || `${selectedCategory} Service`,
        servicePrice,
        selectedAddOnIds: selectedAddons.map((a) => a.id),
        date: timingMode === 'asap_now' ? new Date().toISOString().split('T')[0] : selectedDate,
        time: timingMode === 'asap_now' ? 'ASAP (Next 15m)' : selectedTime,
        locationType,
        timingMode,
        address: {
          street: addressLine,
          city,
          state,
          zip,
          notes: haircutNotes
        },
        haircutNotes,
        tipAmount: effectiveTip,
        promoCode: appliedPromo?.code
      };

      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedBooking(data.booking);
        setCurrentStep(6);
        if (onBookingCreated) {
          onBookingCreated(data.booking.id);
        }
      }
    } catch (err) {
      console.error('Failed to create booking:', err);
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'Haircut', label: 'Haircut', desc: 'Classic haircut & styling', price: '$40' },
    { id: 'Fade', label: 'Fade', desc: 'Skin, drop, or taper fade', price: '$45' },
    { id: 'Beard', label: 'Beard', desc: 'Sculpt, razor line & oil', price: '$30' },
    { id: 'Kids Cut', label: 'Kids Cut', desc: 'Patient scissor & clipper cut', price: '$30' },
    { id: 'Hair + Beard', label: 'Hair + Beard', desc: 'Full combo with hot towel', price: '$65' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" id="booking-flow-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {currentStep === 6 ? 'Live Booking Tracker' : `Book a Master Barber (Step ${currentStep} of 5)`}
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentStep === 1 && 'Select signature service category'}
                {currentStep === 2 && 'Choose service location'}
                {currentStep === 3 && 'Choose timing & availability'}
                {currentStep === 4 && 'Choose barber or Smart Match'}
                {currentStep === 5 && 'Review and confirm appointment'}
                {currentStep === 6 && 'Real-time status updates'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progress Dots */}
        {currentStep <= 5 && (
          <div className="flex items-center gap-1.5 px-6 pt-3 bg-slate-900">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s === currentStep
                    ? 'bg-amber-400 shadow-sm shadow-amber-500/50'
                    : s < currentStep
                    ? 'bg-amber-500/50'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step Contents */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: CHOOSE SERVICE */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Step 1: Choose Your Service</h3>
                <p className="text-xs text-slate-400">Select what you'd like done today. Master barbers come fully equipped.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (selectedBarber) {
                          const s = selectedBarber.services.find((item: Service) =>
                            item.category?.toLowerCase().includes(cat.id.toLowerCase()) ||
                            item.name.toLowerCase().includes(cat.id.toLowerCase())
                          );
                          if (s) setSelectedService(s);
                        }
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          <Scissors className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{cat.label}</p>
                          <p className="text-xs text-slate-400">{cat.desc}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-amber-400">{cat.price}</span>
                        <p className="text-[10px] text-slate-500">est. 45 min</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Consultation Notes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Style Preference or Barber Notes (Optional)
                </label>
                <input
                  type="text"
                  value={haircutNotes}
                  onChange={(e) => setHaircutNotes(e.target.value)}
                  placeholder="e.g. Skin taper fade with #2 on top, keep natural hairline"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION MODE */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Step 2: Service Location</h3>
                <p className="text-xs text-slate-400">Where would you like your grooming service to happen?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Come to me (Mobile Barber) */}
                <button
                  onClick={() => setLocationType('mobile_come_to_me')}
                  className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
                    locationType === 'mobile_come_to_me'
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                      <Home className="h-5 w-5" />
                    </div>
                    {locationType === 'mobile_come_to_me' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">Come to Me (Mobile)</h4>
                  <p className="text-xs text-slate-400 mt-1">Barber travels directly to your home, office, hotel, or private space.</p>
                  <span className="mt-3 text-[11px] font-semibold text-amber-400/90">Includes travel kit & sanitization</span>
                </button>

                {/* Go to barber */}
                <button
                  onClick={() => setLocationType('studio_go_to_barber')}
                  className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
                    locationType === 'studio_go_to_barber'
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                      <Store className="h-5 w-5" />
                    </div>
                    {locationType === 'studio_go_to_barber' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">Go to Barber Studio</h4>
                  <p className="text-xs text-slate-400 mt-1">Visit the barber's dedicated private studio chair or shop.</p>
                  <span className="mt-3 text-[11px] font-semibold text-slate-400">$0 mobile travel surcharge</span>
                </button>
              </div>

              {/* Address details */}
              {locationType === 'mobile_come_to_me' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <MapPin className="h-4 w-4" />
                    <span>Your Location for Barber Dispatch</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Zip Code</label>
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TIMING */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Step 3: Choose Timing</h3>
                <p className="text-xs text-slate-400">Request an immediate on-demand barber or schedule in advance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Now (ASAP) */}
                <button
                  onClick={() => setTimingMode('asap_now')}
                  className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
                    timingMode === 'asap_now'
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                      <Zap className="h-5 w-5" />
                    </div>
                    {timingMode === 'asap_now' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">Now (On-Demand)</h4>
                  <p className="text-xs text-slate-400 mt-1">Dispatches the nearest available barber immediately (~10-20 min arrival).</p>
                  <span className="mt-3 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Barbers active right now
                  </span>
                </button>

                {/* Schedule Later */}
                <button
                  onClick={() => setTimingMode('scheduled')}
                  className={`flex flex-col p-4 rounded-2xl border text-left transition-all ${
                    timingMode === 'scheduled'
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                      <Calendar className="h-5 w-5" />
                    </div>
                    {timingMode === 'scheduled' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">Schedule for Later</h4>
                  <p className="text-xs text-slate-400 mt-1">Pick a specific day and time slot that fits your personal schedule.</p>
                  <span className="mt-3 text-[11px] font-semibold text-slate-400">Lock in your exact calendar slot</span>
                </button>
              </div>

              {/* Date & Time Picker if Scheduled */}
              {timingMode === 'scheduled' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Select Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Time Slot</label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      >
                        {['09:00 AM', '10:00 AM', '11:00 AM', '12:30 PM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM', '08:00 PM'].map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CHOOSE BARBER (SMART MATCH OR MANUAL) */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Step 4: Select Your Barber</h3>
                <p className="text-xs text-slate-400">Use BarberGo Smart Match or select a specific vetted provider.</p>
              </div>

              {/* Smart Match Banner Option */}
              <div
                onClick={() => {
                  setBarberSelectionMode('smart_match');
                  if (smartMatchResult) setSelectedBarber(smartMatchResult);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  barberSelectionMode === 'smart_match'
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">BarberGo Smart Match</h4>
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Recommended</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {matchingLoading
                          ? 'Evaluating nearest top-rated specialists...'
                          : smartMatchResult
                          ? `Matched: ${smartMatchResult.user.fullName} (${smartMatchResult.profile.rating} ★ • ${smartMatchResult.estimatedArrivalMinutes} min away)`
                          : 'Automatically picks the highest-rated nearby specialist'}
                      </p>
                    </div>
                  </div>
                  {barberSelectionMode === 'smart_match' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {smartMatchResult && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-2.5">
                    {smartMatchResult.matchReasons?.map((reason: string, idx: number) => (
                      <span key={idx} className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        ✓ {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Or Select Specific Barber */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-400 mb-2">Or Choose from Nearby Barbers:</p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {allBarbers.map((b) => {
                    const isSelected = barberSelectionMode === 'manual' && selectedBarber?.user?.id === b.user.id;
                    return (
                      <div
                        key={b.user.id}
                        onClick={() => {
                          setBarberSelectionMode('manual');
                          setSelectedBarber(b);
                          const s = b.services.find((item: Service) =>
                            item.category?.toLowerCase().includes(selectedCategory.toLowerCase())
                          ) || b.services[0];
                          if (s) setSelectedService(s);
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-slate-800/80 bg-slate-950/40 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={b.user.avatarUrl}
                            alt={b.user.fullName}
                            className="h-10 w-10 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{b.user.fullName}</span>
                              {b.profile.idVerified && (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-current" /> {b.profile.rating}
                              </span>
                              <span>•</span>
                              <span>{b.distanceMiles?.toFixed(1)} mi away</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400">
                            ${b.services[0]?.price || 40}+
                          </span>
                          <p className="text-[10px] text-slate-400">{b.profile.completedBookingsCount}+ cuts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SUMMARY */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Step 5: Review & Pricing</h3>
                <p className="text-xs text-slate-400">Transparent pricing with zero hidden fees.</p>
              </div>

              {/* Booking Details Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedBarber?.user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'}
                      alt="Barber"
                      className="h-11 w-11 rounded-xl object-cover border border-amber-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{selectedBarber?.user?.fullName || 'Assigned Master Barber'}</span>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400">
                          {selectedBarber?.profile?.rating || 4.9} ★
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{selectedService?.name || `${selectedCategory} Cut`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-amber-400">${servicePrice}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span>{timingMode === 'asap_now' ? 'Immediate On-Demand (ASAP)' : `${selectedDate} at ${selectedTime}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" />
                    <span className="truncate">{locationType === 'mobile_come_to_me' ? `${addressLine}, ${city}` : 'Barber Studio Chair'}</span>
                  </div>
                </div>
              </div>

              {/* Tip Selection */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Barber Tip (100% directly to your barber)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 20, 25, 0].map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => {
                        setTipPercentage(tip);
                        setCustomTip('');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        tipPercentage === tip && customTip === ''
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tip === 0 ? 'No Tip' : `${tip}% ($${((servicePrice * tip) / 100).toFixed(0)})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Promo code (e.g. WELCOME10)"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-slate-700 border border-amber-500/30"
                >
                  Apply
                </button>
              </div>
              {appliedPromo && (
                <p className="text-xs text-emerald-400 font-semibold">✓ Promo applied: -${discountAmount.toFixed(2)}</p>
              )}
              {promoError && (
                <p className="text-xs text-red-400">{promoError}</p>
              )}

              {/* Itemized Total Breakdown */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Service ({selectedService?.name || selectedCategory})</span>
                  <span className="text-white font-medium">${servicePrice.toFixed(2)}</span>
                </div>
                {locationType === 'mobile_come_to_me' && (
                  <div className="flex justify-between text-slate-400">
                    <span>Mobile Travel Mileage Fee</span>
                    <span className="text-white font-medium">${travelFee.toFixed(2)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Promo Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Platform Service Fee ({settings.platformFeePercent}%)</span>
                  <span className="text-white font-medium">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Tax</span>
                  <span className="text-white font-medium">${estimatedTax.toFixed(2)}</span>
                </div>
                {effectiveTip > 0 && (
                  <div className="flex justify-between text-amber-300 font-medium">
                    <span>Barber Tip</span>
                    <span>${effectiveTip.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-black text-white">
                  <span>Total Amount</span>
                  <span className="text-amber-400 text-base">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('apple_pay')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'apple_pay' ? 'border-amber-400 bg-amber-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Apple Pay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'card' ? 'border-amber-400 bg-amber-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card •••• 4242</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: LIVE TRACKER & CONFIRMATION */}
          {currentStep === 6 && createdBooking && (
            <div className="space-y-5 text-center py-2">
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 mb-3">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-white">Booking Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-0.5">Booking Ref: #{createdBooking.id}</p>
              </div>

              {/* Unified Status progression card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Status Progression</h4>
                
                <div className="space-y-2">
                  {[
                    { label: 'Requested', desc: 'Booking sent to barber', done: true },
                    { label: 'Barber Accepted', desc: 'Barber accepted your appointment', done: true },
                    { label: 'Barber On The Way', desc: 'Live GPS navigation dispatched', done: false },
                    { label: 'Arrived', desc: 'Barber arrived at location', done: false },
                    { label: 'Service Started', desc: 'Grooming in progress', done: false },
                    { label: 'Completed', desc: 'Cut finished, receipt finalized', done: false }
                  ].map((stepItem, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        stepItem.done ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {stepItem.done ? '✓' : idx + 1}
                      </span>
                      <div>
                        <p className={`font-semibold ${stepItem.done ? 'text-white' : 'text-slate-500'}`}>
                          {stepItem.label}
                        </p>
                        <p className="text-[10px] text-slate-500">{stepItem.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center justify-between text-left">
                <div>
                  <p className="text-xs font-bold text-white">{createdBooking.service.name}</p>
                  <p className="text-[11px] text-slate-400">{createdBooking.barberName} • ${createdBooking.pricing.finalTotal}</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                  Confirmed
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
                >
                  Done & View in Bookings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Controls Footer */}
        {currentStep <= 5 && (
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-5 py-3.5">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white px-3 py-2 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400"
                id="next-step-btn"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmAndPay}
                disabled={submittingBooking}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-110 disabled:opacity-50"
                id="confirm-pay-btn"
              >
                {submittingBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Confirm & Pay ${totalAmount.toFixed(2)}</span>
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
