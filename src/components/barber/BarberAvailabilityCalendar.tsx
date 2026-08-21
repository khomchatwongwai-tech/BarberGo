import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  Ban,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Coffee,
  Save,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Scissors,
  User,
  MapPin,
  Shield,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import { BarberAvailability, BarberCalendarDay, DaySchedule } from '../../types';

interface BarberAvailabilityCalendarProps {
  barberId?: string;
  onAvailabilityUpdated?: (availability: BarberAvailability) => void;
  isCompact?: boolean;
}

interface BlockedDateEntry {
  date: string;
  reason?: string;
  createdAt?: string;
}

const PRESET_TEMPLATES = [
  {
    id: 'full_time',
    name: 'Full-Time Mobile Pro',
    desc: 'Mon–Sat: 8:30 AM – 6:30 PM (Sun Off)',
    schedule: {
      monday: { enabled: true, start: '08:30', end: '18:30' },
      tuesday: { enabled: true, start: '08:30', end: '18:30' },
      wednesday: { enabled: true, start: '08:30', end: '18:30' },
      thursday: { enabled: true, start: '08:30', end: '18:30' },
      friday: { enabled: true, start: '08:00', end: '19:30' },
      saturday: { enabled: true, start: '08:00', end: '20:00' },
      sunday: { enabled: false, start: '10:00', end: '16:00' }
    }
  },
  {
    id: 'standard_9_5',
    name: 'Standard Weekday 9-to-5',
    desc: 'Mon–Fri: 9:00 AM – 5:00 PM (Weekends Off)',
    schedule: {
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' }
    }
  },
  {
    id: 'weekend_evening',
    name: 'Evening & Weekend Peak',
    desc: 'Thu–Sun: 12:00 PM – 9:00 PM',
    schedule: {
      monday: { enabled: false, start: '12:00', end: '21:00' },
      tuesday: { enabled: false, start: '12:00', end: '21:00' },
      wednesday: { enabled: false, start: '12:00', end: '21:00' },
      thursday: { enabled: true, start: '12:00', end: '21:00' },
      friday: { enabled: true, start: '11:00', end: '21:30' },
      saturday: { enabled: true, start: '09:00', end: '21:00' },
      sunday: { enabled: true, start: '10:00', end: '18:00' }
    }
  }
];

const REASON_PRESETS = [
  'Personal Vacation',
  'Van & Equipment Maintenance',
  'Barber Expo / Masterclass',
  'Holiday / Family Event',
  'Health & Recovery',
  'Personal Off-Duty Day'
];

export const BarberAvailabilityCalendar: React.FC<BarberAvailabilityCalendarProps> = ({
  barberId,
  onAvailabilityUpdated,
  isCompact = false
}) => {
  const { user } = useAuth();
  const effectiveBarberId = barberId || (user?.id?.startsWith('barber') ? user.id : 'barber-1');

  const [activeSubTab, setActiveSubTab] = useState<'weekly' | 'unavailable_dates' | 'preview'>('weekly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Weekly Schedule State
  const [weeklySchedule, setWeeklySchedule] = useState<{
    [key: string]: { enabled: boolean; start: string; end: string };
  }>({
    monday: { enabled: true, start: '08:30', end: '18:30' },
    tuesday: { enabled: true, start: '08:30', end: '18:30' },
    wednesday: { enabled: true, start: '08:30', end: '18:30' },
    thursday: { enabled: true, start: '08:30', end: '18:30' },
    friday: { enabled: true, start: '08:00', end: '19:30' },
    saturday: { enabled: true, start: '08:00', end: '20:00' },
    sunday: { enabled: false, start: '10:00', end: '16:00' }
  });

  const [bufferMinutes, setBufferMinutes] = useState(25);
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [breaks, setBreaks] = useState<{ start: string; end: string; label: string }[]>([
    { start: '12:30', end: '13:30', label: 'Lunch Break & Sanitation' }
  ]);

  // Unavailable / Blocked Dates State
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [blockedDetails, setBlockedDetails] = useState<BlockedDateEntry[]>([]);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('Personal Vacation');
  const [customReasonInput, setCustomReasonInput] = useState('');

  // Monthly Calendar Navigation for Visual Picker
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // 14-Day Live Preview Calendar Data
  const [calendarDays, setCalendarDays] = useState<BarberCalendarDay[]>([]);
  const [selectedPreviewDayIdx, setSelectedPreviewDayIdx] = useState(0);

  // Load Availability & Calendar Data
  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const url = barberId
        ? `/api/barbers/${barberId}/calendar?days=14`
        : `/api/barbers/my/availability`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const avail: BarberAvailability = data.availability;

        if (avail) {
          if (avail.weeklySchedule) {
            const formatted: any = {};
            const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            dayKeys.forEach((k) => {
              const d = (avail.weeklySchedule as any)[k];
              if (d) {
                formatted[k] = {
                  enabled: d.enabled ?? true,
                  start: d.slots?.[0]?.start || d.start || '09:00',
                  end: d.slots?.[d.slots.length - 1]?.end || d.end || '18:00'
                };
              }
            });
            setWeeklySchedule(formatted);
          }

          if (avail.unavailableDates) {
            setUnavailableDates(avail.unavailableDates);
          }
          if (avail.blockedDateDetails) {
            setBlockedDetails(avail.blockedDateDetails);
          } else if (avail.unavailableDates) {
            setBlockedDetails(
              avail.unavailableDates.map((d) => ({
                date: d,
                reason: 'Unavailable / Off-Duty'
              }))
            );
          }

          if (avail.bufferMinutesBetweenAppointments !== undefined) {
            setBufferMinutes(avail.bufferMinutesBetweenAppointments);
          }
          if (avail.minimumNoticeHours !== undefined) {
            setMinNoticeHours(avail.minimumNoticeHours);
          }
          if (avail.breaks && avail.breaks.length > 0) {
            setBreaks(avail.breaks);
          }
        }

        if (data.calendar) {
          setCalendarDays(data.calendar);
        }
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [effectiveBarberId]);

  // Save changes to backend
  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      const slotsPayload: any = {};
      Object.keys(weeklySchedule).forEach((day) => {
        slotsPayload[day] = {
          enabled: weeklySchedule[day].enabled,
          start: weeklySchedule[day].start,
          end: weeklySchedule[day].end,
          slots: weeklySchedule[day].enabled
            ? [{ start: weeklySchedule[day].start, end: weeklySchedule[day].end }]
            : []
        };
      });

      const payload = {
        weeklySchedule: slotsPayload,
        unavailableDates,
        blockedDateDetails: blockedDetails,
        breaks,
        bufferMinutesBetweenAppointments: bufferMinutes,
        minimumNoticeHours: minNoticeHours
      };

      const res = await fetch('/api/barbers/my/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        if (onAvailabilityUpdated && data.availability) {
          onAvailabilityUpdated(data.availability);
        }
        await fetchAvailability();
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Error saving availability:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add specific unavailable date
  const handleAddBlockedDate = () => {
    if (!newBlockDate) return;
    if (unavailableDates.includes(newBlockDate)) return;

    const reason = newBlockReason === 'Custom...' ? customReasonInput || 'Blocked' : newBlockReason;
    const updatedDates = [...unavailableDates, newBlockDate].sort();
    const updatedDetails = [
      ...blockedDetails.filter((b) => b.date !== newBlockDate),
      { date: newBlockDate, reason, createdAt: new Date().toISOString() }
    ].sort((a, b) => a.date.localeCompare(b.date));

    setUnavailableDates(updatedDates);
    setBlockedDetails(updatedDetails);
    setNewBlockDate('');
    setCustomReasonInput('');
  };

  // Remove specific unavailable date
  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setUnavailableDates(unavailableDates.filter((d) => d !== dateToRemove));
    setBlockedDetails(blockedDetails.filter((b) => b.date !== dateToRemove));
  };

  // Toggle date directly on the month calendar picker
  const handleToggleMonthDate = (dateStr: string) => {
    if (unavailableDates.includes(dateStr)) {
      handleRemoveBlockedDate(dateStr);
    } else {
      const updatedDates = [...unavailableDates, dateStr].sort();
      const updatedDetails = [
        ...blockedDetails,
        { date: dateStr, reason: 'Off-Duty', createdAt: new Date().toISOString() }
      ];
      setUnavailableDates(updatedDates);
      setBlockedDetails(updatedDetails);
    }
  };

  // Apply template
  const handleApplyTemplate = (templateSchedule: any) => {
    setWeeklySchedule(templateSchedule);
  };

  const daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  // Month Calendar Matrix Generation
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentCalendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const monthCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    monthCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    monthCells.push({ day, dateStr });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const currentPreviewDay = calendarDays[selectedPreviewDayIdx];

  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden ${
        isCompact ? 'p-4' : 'p-6 space-y-6'
      }`}
      id="barber-availability-calendar-component"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <CalendarIcon className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-serif">
              Availability & Calendar Manager
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure your recurring weekly service hours, block off vacation dates, and safeguard customer booking windows.
          </p>
        </div>

        <button
          onClick={handleSaveAvailability}
          disabled={saving || loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:shadow transition-all disabled:opacity-50 active:scale-95 shrink-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saveSuccess ? 'Availability Saved!' : 'Save Schedule Changes'}</span>
        </button>
      </div>

      {/* Sub Tab Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('weekly')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
            activeSubTab === 'weekly'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>1. Weekly Recurring Hours</span>
        </button>

        <button
          onClick={() => setActiveSubTab('unavailable_dates')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
            activeSubTab === 'unavailable_dates'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Ban className="h-3.5 w-3.5" />
          <span>2. Unavailable Dates ({unavailableDates.length})</span>
          {unavailableDates.length > 0 && (
            <span className="ml-1 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[10px] font-bold">
              {unavailableDates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('preview')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
            activeSubTab === 'preview'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>3. Live 14-Day Calendar Preview</span>
        </button>
      </div>

      {/* TAB 1: WEEKLY RECURRING SCHEDULE */}
      {activeSubTab === 'weekly' && (
        <div className="space-y-6 pt-2">
          {/* Preset templates bar */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-sky-600" />
                Quick Schedule Presets
              </span>
              <span className="text-[11px] text-sky-700">Click a template to load standard hours</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl.schedule)}
                  className="rounded-xl border border-sky-200 bg-white hover:border-sky-400 hover:bg-sky-50/80 p-2.5 text-left transition-all shadow-2xs group"
                >
                  <p className="text-xs font-bold text-slate-900 group-hover:text-sky-600">{tmpl.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{tmpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Days list grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 px-2">
              <span>Day of the Week</span>
              <span>Working Hours Window</span>
            </div>

            {daysList.map((day) => {
              const config = weeklySchedule[day] || { enabled: false, start: '09:00', end: '18:00' };

              return (
                <div
                  key={day}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border p-3.5 transition-all gap-3 ${
                    config.enabled
                      ? 'border-slate-200 bg-white shadow-2xs hover:border-sky-200'
                      : 'border-slate-100 bg-slate-50/70 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) =>
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [day]: { ...config, enabled: e.target.checked }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
                    </label>

                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        {day}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {config.enabled ? 'Available for mobile bookings' : 'Marked as Day Off'}
                      </p>
                    </div>
                  </div>

                  {config.enabled ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <Sun className="h-3 w-3 text-amber-500" />
                        <input
                          type="time"
                          value={config.start}
                          onChange={(e) =>
                            setWeeklySchedule({
                              ...weeklySchedule,
                              [day]: { ...config, start: e.target.value }
                            })
                          }
                          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-semibold">to</span>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <Moon className="h-3 w-3 text-indigo-500" />
                        <input
                          type="time"
                          value={config.end}
                          onChange={(e) =>
                            setWeeklySchedule({
                              ...weeklySchedule,
                              [day]: { ...config, end: e.target.value }
                            })
                          }
                          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 italic bg-slate-100 px-3 py-1 rounded-lg">
                      Off Duty (Rest Day)
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Buffer & Notice Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
                Buffer Time Between Appointments
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="5"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(parseInt(e.target.value) || 0)}
                  className="w-24 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none text-center"
                />
                <span className="text-xs font-semibold text-slate-600">Minutes</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Protects drive time, city traffic, and tool sterilization between client locations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-sky-600" />
                Minimum Advance Notice
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="48"
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(parseInt(e.target.value) || 0)}
                  className="w-24 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none text-center"
                />
                <span className="text-xs font-semibold text-slate-600">Hours</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Prevents sudden surprise bookings without adequate prep time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SPECIFIC UNAVAILABLE / BLOCKED DATES */}
      {activeSubTab === 'unavailable_dates' && (
        <div className="space-y-6 pt-2">
          {/* Quick Add Blocked Date Form */}
          <div className="rounded-2xl border border-rose-200/90 bg-rose-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5 text-rose-600" />
                Block Off Specific Unavailable Date
              </span>
              <span className="text-[11px] text-rose-700">Clients will not be able to book on blocked dates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Date to Block</label>
                <input
                  type="date"
                  min={todayStr}
                  value={newBlockDate}
                  onChange={(e) => setNewBlockDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reason / Tag</label>
                <select
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-rose-400 focus:outline-none"
                >
                  {REASON_PRESETS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="Custom...">Custom Reason...</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddBlockedDate}
                  disabled={!newBlockDate}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold px-4 py-2 text-xs shadow-xs transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Blocked Date</span>
                </button>
              </div>
            </div>

            {newBlockReason === 'Custom...' && (
              <div>
                <input
                  type="text"
                  placeholder="Enter custom reason note (e.g. Barber convention in Vegas)..."
                  value={customReasonInput}
                  onChange={(e) => setCustomReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                />
              </div>
            )}
          </div>

          {/* Visual Interactive Month Grid for Rapid Blocking */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Visual Calendar Matrix ({monthName})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentCalendarMonth(
                      new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1)
                    )
                  }
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentCalendarMonth(
                      new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1)
                    )
                  }
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Click on any date box below to instantly toggle it as <span className="text-rose-600 font-bold">Blocked (Off)</span> or Available.
            </p>

            {/* Days header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-12 rounded-xl bg-slate-50/40" />;
                }

                const isBlocked = unavailableDates.includes(cell.dateStr);
                const isPast = cell.dateStr < todayStr;
                const isToday = cell.dateStr === todayStr;

                return (
                  <button
                    key={cell.dateStr}
                    disabled={isPast}
                    onClick={() => handleToggleMonthDate(cell.dateStr)}
                    className={`h-12 rounded-xl border flex flex-col items-center justify-center p-1 transition-all text-center relative ${
                      isPast
                        ? 'opacity-30 bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                        : isBlocked
                        ? 'bg-rose-500 border-rose-500 text-white shadow-xs font-bold'
                        : isToday
                        ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold'
                        : 'bg-white border-slate-200 hover:border-sky-300 text-slate-700 hover:bg-sky-50/30'
                    }`}
                  >
                    <span className="text-xs">{cell.day}</span>
                    {isBlocked && (
                      <span className="text-[9px] uppercase font-bold text-rose-100">
                        Blocked
                      </span>
                    )}
                    {isToday && !isBlocked && (
                      <span className="text-[8px] uppercase font-bold text-sky-600">
                        Today
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of currently blocked dates */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Currently Blocked Dates ({unavailableDates.length})
            </h4>

            {unavailableDates.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">No dates are currently blocked off.</p>
                <p className="text-[11px] text-slate-400">
                  Your regular weekly schedule applies across all calendar days.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {unavailableDates.map((dateStr) => {
                  const detail = blockedDetails.find((b) => b.date === dateStr);
                  const reason = detail?.reason || 'Unavailable';

                  return (
                    <div
                      key={dateStr}
                      className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                          <Ban className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{dateStr}</p>
                          <p className="text-[11px] font-medium text-rose-700">{reason}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveBlockedDate(dateStr)}
                        className="rounded-xl border border-rose-200 bg-white hover:bg-rose-100 p-2 text-rose-700 hover:text-rose-900 transition-colors"
                        title="Unblock this date"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE 14-DAY CALENDAR PREVIEW */}
      {activeSubTab === 'preview' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Next 14 Days Real Client Slots
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Click a day to view booked appointments vs open customer slots
            </span>
          </div>

          {/* Date carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedPreviewDayIdx === idx;
              const bookedCount = day.slots.filter((s) => s.isBooked).length;
              const availableCount = day.slots.filter((s) => s.isAvailable).length;

              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedPreviewDayIdx(idx)}
                  className={`flex flex-col items-center justify-center min-w-[78px] py-2.5 px-2 rounded-2xl border transition-all text-center shrink-0 ${
                    isSelected
                      ? 'bg-sky-500 border-sky-500 text-white shadow-xs'
                      : day.isBlocked || !day.isWorkingDay
                      ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-50/40'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                    {idx === 0 ? 'Today' : day.dayName.substring(0, 3)}
                  </span>
                  <span className={`text-base font-black leading-tight my-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {day.date.split('-')[2]}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : day.isBlocked
                        ? 'bg-rose-100 text-rose-700'
                        : !day.isWorkingDay
                        ? 'bg-slate-200 text-slate-600'
                        : bookedCount > 0
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {day.isBlocked
                      ? 'Blocked'
                      : !day.isWorkingDay
                      ? 'Off'
                      : bookedCount > 0
                      ? `${bookedCount} booked`
                      : `${availableCount} open`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Day Slots */}
          {currentPreviewDay && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">
                  Slots for {currentPreviewDay.dayName}, {currentPreviewDay.date}
                </h4>
                {currentPreviewDay.isBlocked && (
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
                    Day is Blocked / Off
                  </span>
                )}
              </div>

              {currentPreviewDay.isBlocked ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
                  <Ban className="h-5 w-5 mx-auto mb-1 text-rose-500" />
                  This date is blocked. Customers will not see any open appointment slots on this date.
                </div>
              ) : !currentPreviewDay.isWorkingDay ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
                  <Coffee className="h-5 w-5 mx-auto mb-1 text-slate-400" />
                  Designated weekly day off in your operating hours settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {currentPreviewDay.slots.map((slot) => {
                    if (slot.isBooked) {
                      return (
                        <div
                          key={slot.id}
                          className="rounded-xl border border-sky-300 bg-sky-50 p-3 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sky-900">{slot.time}</span>
                            <span className="bg-sky-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                              Booked
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <User className="h-3 w-3 text-sky-600" />
                            {slot.customerName || 'Client Booking'}
                          </p>
                          {slot.serviceName && (
                            <p className="text-[10px] text-slate-600 flex items-center gap-1">
                              <Scissors className="h-3 w-3 text-slate-400" />
                              {slot.serviceName}
                            </p>
                          )}
                        </div>
                      );
                    }

                    if (slot.isBreak) {
                      return (
                        <div
                          key={slot.id}
                          className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-amber-900">{slot.time}</span>
                          <span className="text-[10px] text-amber-700 flex items-center gap-1 font-semibold">
                            <Coffee className="h-3 w-3" /> Break
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={slot.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{slot.time}</span>
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Available
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
