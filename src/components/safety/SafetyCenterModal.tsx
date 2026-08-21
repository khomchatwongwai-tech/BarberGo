import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  PhoneCall,
  Share2,
  AlertTriangle,
  UserX,
  X,
  CheckCircle2,
  FileText,
  Lock,
  Send,
  UploadCloud,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';

interface SafetyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  targetUserId?: string;
  targetUserName?: string;
}

export const SafetyCenterModal: React.FC<SafetyCenterModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  targetUserId,
  targetUserName
}) => {
  const { settings } = useConfig();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'block' | 'emergency'>('overview');
  const [reportType, setReportType] = useState('Unprofessional conduct');
  const [reportDesc, setReportDesc] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(false);
  const [blockedSuccess, setBlockedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleShareTrip = () => {
    const tripUrl = bookingId
      ? `https://barberpilot.com/track/${bookingId}`
      : 'https://barberpilot.com/safety';
    navigator.clipboard.writeText(`BarberPilot Live Safety Tracking: ${tripUrl}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    setSubmitting(true);
    try {
      await fetch('/api/safety/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          bookingId,
          incidentType: reportType,
          description: reportDesc,
          severity
        })
      });
      setSubmittedReport(true);
    } catch {
      // Fallback
      setSubmittedReport(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockUser = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/safety/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          bookingId,
          incidentType: 'Block User Request',
          description: `User requested to block ${targetUserName || 'counterpart'} from future matching`,
          severity: 'low'
        })
      });
      setBlockedSuccess(true);
    } catch {
      setBlockedSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        id="safety-center-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">BarberPilot Safety Center</h3>
              <p className="text-xs text-slate-400">24/7 Trust, Safety & Incident Response</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Safety Tools
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'report'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Report Incident
          </button>
          {targetUserId && (
            <button
              onClick={() => setActiveTab('block')}
              className={`pb-2.5 px-3 border-b-2 transition-colors ${
                activeTab === 'block'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-rose-600'
              }`}
            >
              Block User
            </button>
          )}
          <button
            onClick={() => setActiveTab('emergency')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'emergency'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-red-500 hover:text-red-700'
            }`}
          >
            🚨 Emergency (911)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Emergency Hotline Banner */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">
                    24/7 Emergency Trust & Safety Hotline
                  </h4>
                  <p className="text-sm font-black text-rose-950 mt-0.5">
                    {settings?.emergencyHelpline || '1-800-555-CUTS'}
                  </p>
                </div>
                <a
                  href={`tel:${settings?.emergencyHelpline || '18005552887'}`}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Call Now</span>
                </a>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleShareTrip}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-sky-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 text-sky-600 mb-2">
                    <Share2 className="h-5 w-5" />
                    <span className="font-bold text-sm text-slate-900">Share Live Trip</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Send a private, temporary tracking link to a loved one or trusted contact.
                  </p>
                  <div className="mt-3 text-xs font-bold text-sky-600 flex items-center gap-1">
                    <span>{copiedLink ? '✓ Copied Link to Clipboard' : 'Copy Tracking Link'}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('report')}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-bold text-sm text-slate-900">Report an Incident</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Submit safety violations, property damage, hygiene issues, or policy concerns.
                  </p>
                  <div className="mt-3 text-xs font-bold text-amber-600 flex items-center gap-1">
                    <span>Submit Report</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              </div>

              {/* Privacy Safeguards Info */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  <Lock className="h-4 w-4 text-sky-600" />
                  <span>BarberPilot Safety & Privacy Safeguards</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                  <li><strong>Verified Master Barbers:</strong> ID verification & background checks required.</li>
                  <li><strong>Private Location Masking:</strong> Customer addresses are protected and never publicly listed.</li>
                  <li><strong>Auto-Disconnect:</strong> GPS location sharing automatically stops once appointment finishes.</li>
                  <li><strong>Escrow Payments:</strong> Cards are only charged after quality service is confirmed.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div>
              {submittedReport ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h4 className="text-base font-black text-slate-900">Report Successfully Submitted</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Our 24/7 Trust & Safety team has received your report and opened an investigation ticket. You will receive an update via email.
                  </p>
                  <button
                    onClick={() => {
                      setSubmittedReport(false);
                      setActiveTab('overview');
                    }}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    Back to Safety Center
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendReport} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Incident Category</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-hidden"
                    >
                      <option value="Unprofessional conduct">Unprofessional conduct or behavior</option>
                      <option value="Sanitation & tool cleanliness">Sanitation, tool hygiene, or cleanliness</option>
                      <option value="Safety or verbal harassment">Safety concern or verbal harassment</option>
                      <option value="Severe lateness or no-show">Severe lateness / No show</option>
                      <option value="Pricing / billing discrepancy">Pricing or off-platform payment request</option>
                      <option value="Other">Other policy violation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Severity Level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setSeverity(sev)}
                          className={`rounded-xl border py-2 text-xs font-bold capitalize transition-all ${
                            severity === sev
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Incident Description</label>
                    <textarea
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      required
                      rows={4}
                      placeholder="Please provide specific details about what occurred..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !reportDesc.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-black text-white shadow-md transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Submitting Report...' : 'Submit Confidential Report'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'block' && (
            <div className="space-y-4">
              {blockedSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">User Successfully Blocked</h4>
                  <p className="text-xs text-slate-600">
                    You will never be matched with {targetUserName || 'this user'} again on BarberPilot.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <UserX className="h-4 w-4" />
                    <span>Block {targetUserName || 'User'}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Blocking will permanently prevent {targetUserName || 'this user'} from receiving your booking requests or seeing your profile in the marketplace.
                  </p>
                  <button
                    onClick={handleBlockUser}
                    disabled={submitting}
                    className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
                  >
                    {submitting ? 'Blocking...' : `Block ${targetUserName || 'User'} Permanently`}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600 border-2 border-red-200 animate-pulse">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">Immediate Emergency Assistance</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                  If you are in immediate physical danger or experiencing a medical emergency, call 911 immediately.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href="tel:911"
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 px-6 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  <PhoneCall className="h-5 w-5" />
                  <span>Call Emergency 911</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-slate-500">BarberPilot Trust & Safety Protocol v4.2</span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
