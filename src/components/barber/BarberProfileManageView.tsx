import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Scissors,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Clock,
  Camera,
  Award,
  FileCheck2,
  Loader2
} from 'lucide-react';
import { Service, ServiceAddon } from '../../types';
import { AIBioModal } from '../ai/AIBioModal';

export const BarberProfileManageView: React.FC = () => {
  const {
    user,
    barberProfile,
    barberServices,
    barberDocuments,
    updateBarberProfile,
    refreshAuth
  } = useAuth();

  const [bio, setBio] = useState(barberProfile?.bio || '');
  const [experienceYears, setExperienceYears] = useState(barberProfile?.experienceYears || 8);
  const [licenseNumber, setLicenseNumber] = useState(barberProfile?.licenseNumber || 'CA-BARB-998241');
  const [services, setServices] = useState<Service[]>(barberServices);

  // New service modal / input state
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(65);
  const [newServiceDuration, setNewServiceDuration] = useState(45);
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<'Haircut' | 'Beard' | 'Shave' | 'Combo' | 'Kids'>('Haircut');

  // AI Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const success = await updateBarberProfile({
        bio,
        experienceYears,
        licenseNumber
      });
      if (success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async () => {
    if (!newServiceName.trim() || !user) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/barbers/${user.id}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceName,
          description: newServiceDesc,
          price: newServicePrice,
          durationMinutes: newServiceDuration,
          category: newServiceCategory,
          equipmentProvided: ['Sanitized Cordless Clippers', 'Disinfected Shears', 'Neck Strips'],
          addons: []
        })
      });
      if (res.ok) {
        const data = await res.json();
        setServices([...services, data.service]);
        setShowAddService(false);
        setNewServiceName('');
        setNewServiceDesc('');
        await refreshAuth();
      }
    } catch (err) {
      console.error('Create service error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-12" id="barber-profile-manage-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Barber Profile & Service Catalog</h1>
          <p className="text-xs text-slate-400">Manage client-facing biography, menu pricing, licenses, and portfolio</p>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Changes Saved!' : 'Save Profile Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bio & Experience */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              Public Bio & Persona
            </h3>
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Copywriter</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Years of Mobile Experience</label>
            <input
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">State Barber License #</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Profile Bio (Visible to Clients)</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white"
            />
          </div>
        </div>

        {/* Verification Status Documents */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Compliance & Insurance Clearances
          </h3>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  State Cosmetology / Barber License
                </p>
                <p className="text-[11px] text-slate-400">Verified • Exp: 2027-12-31</p>
              </div>
              <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                APPROVED
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Commercial General Liability Insurance
                </p>
                <p className="text-[11px] text-slate-400">$1,000,000 Aggregate Coverage</p>
              </div>
              <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Mobile Sanitization Protocol Certification
                </p>
                <p className="text-[11px] text-slate-400">Barbicide & UV-C sterilization compliant</p>
              </div>
              <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                CERTIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Services Menu Catalog */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Scissors className="h-4 w-4 text-amber-400" />
              Offered Services & Menu Pricing ({services.length})
            </h3>
            <button
              onClick={() => setShowAddService(!showAddService)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Service</span>
            </button>
          </div>

          {/* Add Service Inline Form */}
          {showAddService && (
            <div className="rounded-2xl border border-amber-500/30 bg-slate-950 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-300 mb-1">Service Title</label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g. Skin Fade & Beard Sculpt"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(parseInt(e.target.value) || 30)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Service Description</label>
                <input
                  type="text"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="e.g. Includes razor edge, hot towel neck treatment, and custom styling."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowAddService(false)}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateService}
                  className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950"
                >
                  Add to Menu
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                    <span className="text-base font-extrabold text-amber-400">${srv.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{srv.description}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {srv.durationMinutes} mins
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{srv.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Bio Modal */}
      {showAIModal && (
        <AIBioModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          barberName={user?.fullName || 'Master Barber'}
          onApplyBio={(newBio) => {
            setBio(newBio);
            handleSaveProfile();
          }}
        />
      )}
    </div>
  );
};
