import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Phone,
  AlertTriangle,
  MapPin,
  X,
  CheckCircle,
  Share2,
  Lock,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useConfig();
  const { user, customerProfile } = useAuth();

  const [incidentType, setIncidentType] = useState('safety_concern');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !user) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/support/safety-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentType,
          description,
          reporterId: user.id,
          reporterName: user.fullName,
          reporterRole: user.role
        })
      });
      if (res.ok) {
        setSubmittedSuccess(true);
        setTimeout(() => {
          setSubmittedSuccess(false);
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Safety report error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" id="safety-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg rounded-3xl border border-red-500/40 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-red-950/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">BarberGo Trust & Safety Shield</h3>
              <p className="text-xs text-red-300">24/7 Real-Time Incident Protection & Emergency Helpline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Call Emergency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`tel:${settings.emergencyHelpline}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-red-500/25 hover:brightness-110"
              id="call-emergency-hotline"
            >
              <Phone className="h-4 w-4 fill-current" />
              <span>Call 24/7 Helpline ({settings.emergencyHelpline})</span>
            </a>

            <a
              href="tel:911"
              className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300 hover:bg-red-500/20"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Call 911 (Immediate Threat)</span>
            </a>
          </div>

          {/* Emergency Contact Broadcast */}
          {customerProfile?.emergencyContact && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Emergency Contact</span>
                <p className="text-xs font-bold text-white">{customerProfile.emergencyContact.name} ({customerProfile.emergencyContact.relationship})</p>
                <p className="text-xs text-slate-400">{customerProfile.emergencyContact.phone}</p>
              </div>
              <a
                href={`sms:${customerProfile.emergencyContact.phone}?body=BarberGo%20Safety%20Notice:%20I%20am%20at%20my%20appointment%20location.`}
                className="flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-slate-700"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Notify SMS</span>
              </a>
            </div>
          )}

          {/* Incident Report Form */}
          <form onSubmit={handleSubmitReport} className="space-y-3 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              File a Discretionary Incident Report
            </h4>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Issue Category</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
              >
                <option value="safety_concern">Safety / Comfort Concern</option>
                <option value="unlicensed_activity">Unsanitized Tools / License Issue</option>
                <option value="harassment">Inappropriate Conduct or Language</option>
                <option value="property_damage">Property Damage</option>
                <option value="fraud">Payment / Pricing Discrepancy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Detailed Explanation</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred. Our safety trust team will immediately review and take action..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-500 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{submittedSuccess ? 'Report Dispatched!' : 'Submit Confidential Report'}</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
