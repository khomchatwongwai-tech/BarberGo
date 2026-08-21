import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Sparkles,
  ShieldCheck,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarberCalendarDay, BarberCalendarSlot, Service } from '../../types';

interface BarberCalendarModalProps {
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  barberRating?: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectSlotAndBook: (barberId: string, date: string, time: string) => void;
}

export const BarberCalendarModal: React.FC<BarberCalendarModalProps> = ({
  barberId,
  barberName,
  barberAvatar,
  barberRating = 4.95,
  isOpen,
  onClose,
  onSelectSlotAndBook
}) => {
  const [calendarDays, setCalendarDays] = useState<BarberCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<BarberCalendarSlot | null>(null);

  useEffect(() => {
    if (isOpen && barberId) {
      const fetchCalendar = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/barbers/${barberId}/calendar?days=14`);
          if (res.ok) {
            const data = await res.json();
            setCalendarDays(data.calendar || []);
            setSelectedDayIndex(0);
            setSelectedSlot(null);
          }
        } catch (err) {
          console.error('Failed to load barber calendar:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchCalendar();
    }
  }, [isOpen, barberId]);

  if (!isOpen) return null;

  const currentDay = calendarDays[selectedDayIndex];
  const availableSlotsCount = currentDay?.slots.filter((s) => s.isAvailable).length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      id="barber-calendar-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-sky-50/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={barberAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'}
                alt={barberName}
                className="h-11 w-11 rounded-2xl object-cover border-2 border-sky-300 shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                <ShieldCheck className="h-2.5 w-2.5" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{barberName}'s Live Schedule</h3>
                <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  <Star className="h-3 w-3 fill-current" />
                  {barberRating}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Select a date & open time slot for mobile appointment</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Date Selector Carousel */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-sky-600" />
              Next 14 Days Availability
            </span>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
              Tap day to view slots
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {loading ? (
              <div className="flex gap-2 w-full py-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-18 w-16 rounded-2xl bg-slate-200 animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              calendarDays.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                const isToday = idx === 0;
                const availableCount = day.slots.filter((s) => s.isAvailable).length;

                return (
                  <button
                    key={day.date}
                    onClick={() => {
                      setSelectedDayIndex(idx);
                      setSelectedSlot(null);
                    }}
                    className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[76px] py-2.5 px-2 rounded-2xl border transition-all text-center shrink-0 ${
                      isSelected
                        ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-200'
                        : day.isBlocked || !day.isWorkingDay
                        ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50/40'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                      {isToday ? 'Today' : day.dayName.substring(0, 3)}
                    </span>
                    <span className={`text-base font-black leading-tight my-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {day.date.split('-')[2]}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : day.isBlocked || !day.isWorkingDay
                          ? 'bg-slate-200 text-slate-500'
                          : availableCount > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {day.isBlocked || !day.isWorkingDay ? 'Off' : `${availableCount} open`}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Time Slots Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-2.5 py-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : !currentDay || currentDay.isBlocked || !currentDay.isWorkingDay ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Barber Not Available On This Date</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                {barberName} is not taking bookings on {currentDay?.dayName || 'this day'}. Please select another date above.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    Available Time Slots for {currentDay.dayName}, {currentDay.date}
                  </h4>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {availableSlotsCount} slots open
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {currentDay.slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;

                  if (!slot.isAvailable) {
                    return (
                      <div
                        key={slot.id}
                        className="flex flex-col justify-center rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-slate-400 text-xs opacity-60 cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{slot.time}</span>
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            {slot.isBooked ? 'Booked' : slot.isBreak ? 'Break' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex flex-col justify-center rounded-2xl border p-3 text-xs transition-all text-left ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-200'
                          : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/30 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{slot.time}</span>
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                        Mobile appointment ready
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3">
          <div>
            {selectedSlot ? (
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Selected Slot</span>
                <span className="text-xs font-bold text-sky-900">
                  {currentDay?.dayName}, {currentDay?.date} @ {selectedSlot.time}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Select an open time slot above to proceed</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedSlot && currentDay) {
                  onSelectSlotAndBook(barberId, currentDay.date, selectedSlot.time);
                  onClose();
                }
              }}
              disabled={!selectedSlot}
              className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-sky-500/20 transition-all active:scale-95"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Book This Slot</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
