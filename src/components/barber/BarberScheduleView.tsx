import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, MapPin, Save, Shield, Calendar, AlertCircle, Check } from 'lucide-react';
import { BarberAvailability } from '../../types';

export const BarberScheduleView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { barberProfile, barberAvailability, updateBarberProfile } = useAuth();

  const [travelRadius, setTravelRadius] = useState(barberProfile?.travelRadiusMiles || 20);
  const [baseTravelFee, setBaseTravelFee] = useState(barberProfile?.baseTravelFee || 15);
  const [feePerMile, setFeePerMile] = useState(barberProfile?.travelFeePerMile || 1.5);
  const [bufferMinutes, setBufferMinutes] = useState(barberAvailability?.bufferMinutesBetweenAppointments || 30);
  const [minNoticeHours, setMinNoticeHours] = useState(barberAvailability?.minimumAdvanceNoticeHours || 2);

  const [weeklySchedule, setWeeklySchedule] = useState(
    barberAvailability?.weeklySchedule || {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '19:00' },
      saturday: { enabled: true, start: '08:00', end: '20:00' },
      sunday: { enabled: false, start: '10:00', end: '16:00' }
    }
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await updateBarberProfile({
        travelRadiusMiles: travelRadius,
        baseTravelFee,
        travelFeePerMile: feePerMile
      });
      if (success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-12" id="barber-schedule-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Schedule & Service Zones</h1>
          <p className="text-xs text-slate-400">Configure weekly hours, drive-time buffers, and travel radius</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{savedSuccess ? 'Changes Saved!' : 'Save Schedule & Zones'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Travel Zone & Fees */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            Travel Radius & Mobile Surcharges
          </h3>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Mobile Travel Radius</span>
              <span className="text-amber-400 font-bold">{travelRadius} Miles</span>
            </div>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={travelRadius}
              onChange={(e) => setTravelRadius(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              You will only appear in search results for customers within {travelRadius} miles of your home base.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Base Travel Fee ($)</label>
              <input
                type="number"
                value={baseTravelFee}
                onChange={(e) => setBaseTravelFee(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Per-Mile Surcharge ($)</label>
              <input
                type="number"
                step="0.25"
                value={feePerMile}
                onChange={(e) => setFeePerMile(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Buffers & Advance Notice */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Drive-Time & Break Buffers
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Drive-Time Buffer Between Mobile Appointments
            </label>
            <select
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={45}>45 Minutes (High traffic metro)</option>
              <option value={60}>60 Minutes</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Automatically reserves drive-time and equipment sterilization windows between client appointments.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Minimum Advance Booking Notice
            </label>
            <select
              value={minNoticeHours}
              onChange={(e) => setMinNoticeHours(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            >
              <option value={1}>1 Hour (On-demand ready)</option>
              <option value={2}>2 Hours</option>
              <option value={4}>4 Hours</option>
              <option value={24}>24 Hours (Next-day only)</option>
            </select>
          </div>
        </div>

        {/* Weekly Hours Matrix */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Weekly Operating Hours
          </h3>

          <div className="divide-y divide-slate-800/80">
            {days.map((day) => {
              const sched = (weeklySchedule as any)[day] || { enabled: true, start: '09:00', end: '18:00' };
              return (
                <div key={day} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-36">
                    <input
                      type="checkbox"
                      checked={sched.enabled}
                      onChange={(e) => {
                        setWeeklySchedule({
                          ...weeklySchedule,
                          [day]: { ...sched, enabled: e.target.checked }
                        });
                      }}
                      className="h-4 w-4 accent-amber-500 rounded"
                    />
                    <span className="text-xs font-bold text-white capitalize">{day}</span>
                  </div>

                  {sched.enabled ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span>From:</span>
                      <input
                        type="time"
                        value={sched.start}
                        onChange={(e) => {
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [day]: { ...sched, start: e.target.value }
                          });
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-white"
                      />
                      <span>To:</span>
                      <input
                        type="time"
                        value={sched.end}
                        onChange={(e) => {
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [day]: { ...sched, end: e.target.value }
                          });
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-white"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Day Off / Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
