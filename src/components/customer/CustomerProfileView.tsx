import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { SubscriptionPlansModal } from '../subscription/SubscriptionPlansModal';
import { SubscriptionManagementModal } from '../subscription/SubscriptionManagementModal';
import { SubscriptionCheckoutModal } from '../subscription/SubscriptionCheckoutModal';
import {
  User,
  MapPin,
  Scissors,
  ShieldCheck,
  CheckCircle,
  Plus,
  Trash2,
  Phone,
  Mail,
  CreditCard,
  Sparkles,
  Save,
  Loader2,
  Crown,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Address, AppSubscriptionPlan, BillingInterval } from '../../types';

export const CustomerProfileView: React.FC = () => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const {
    user,
    customerProfile,
    updateCustomerProfile,
    verifyContact,
    refreshAuth
  } = useAuth();

  const { plan, subscription } = useSubscription();
  const [showPlans, setShowPlans] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<AppSubscriptionPlan | null>(null);
  const [checkoutInterval, setCheckoutInterval] = useState<BillingInterval>('year');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [hairType, setHairType] = useState(customerProfile?.haircutPreferences?.hairType || 'Thick & Textured');
  const [preferredStyles, setPreferredStyles] = useState(customerProfile?.haircutPreferences?.preferredStyles?.join(', ') || 'Mid-Skin Taper, Scissor Texture on Top');
  const [notes, setNotes] = useState(customerProfile?.haircutPreferences?.notes || 'Sensitive neck skin, natural lineup');
  const [emergencyName, setEmergencyName] = useState(customerProfile?.emergencyContact?.name || 'Sarah Vance');
  const [emergencyPhone, setEmergencyPhone] = useState(customerProfile?.emergencyContact?.phone || '+1 415-555-0199');
  const [emergencyRelation, setEmergencyRelation] = useState(customerProfile?.emergencyContact?.relationship || 'Spouse');

  // Address modal / input
  const [addresses, setAddresses] = useState<Address[]>(customerProfile?.savedAddresses || []);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('San Francisco');
  const [newState, setNewState] = useState('CA');
  const [newZip, setNewZip] = useState('94105');
  const [newLabel, setNewLabel] = useState('Office / Studio');
  const [newNotes, setNewNotes] = useState('Suite 400, freight elevator available');
  const [showAddAddress, setShowAddAddress] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await updateCustomerProfile({
        fullName,
        phone,
        haircutPreferences: {
          hairType,
          preferredStyles: preferredStyles.split(',').map((s) => s.trim()),
          notes
        },
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRelation
        },
        savedAddresses: addresses
      });
      if (success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = () => {
    if (!newStreet.trim()) return;
    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      street: newStreet,
      city: newCity,
      state: newState,
      zip: newZip,
      label: newLabel,
      notes: newNotes,
      isDefault: addresses.length === 0,
      coordinates: { lat: 37.7903, lng: -122.3995 }
    };
    setAddresses([...addresses, newAddr]);
    setNewStreet('');
    setShowAddAddress(false);
  };

  const handleDeleteAddress = (id?: string) => {
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-12" id="customer-profile-view">
      {/* Header Profile Summary */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
              alt={user?.fullName}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-sky-400"
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user?.fullName}</h2>
              <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                Verified Client
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Email Verified
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Phone Verified
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-colors"
          id="save-customer-profile-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Changes Saved!' : 'Save All Preferences'}</span>
        </button>
      </div>

      {/* Customer Account Status Card (100% Free Model) */}
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Free Customer Account
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black uppercase">
                Active & Unlimited
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              100% Free on-demand mobile barber dispatch. Zero monthly membership fees or hidden subscriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowBilling(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span>Saved Cards & Receipts</span>
          </button>
        </div>
      </div>

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-sky-500" />
            Contact & Identity
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone (For Arrival SMS)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Haircut & Grooming Preferences */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Scissors className="h-4 w-4 text-sky-500" />
            Haircut & Skin Profile (Sent to Barbers)
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hair Texture & Type</label>
            <select
              value={hairType}
              onChange={(e) => setHairType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
            >
              <option value="Thick & Textured">Thick & Textured</option>
              <option value="Fine / Straight">Fine / Straight</option>
              <option value="Wavy (Type 2A/2B)">Wavy (Type 2A/2B)</option>
              <option value="Curly (Type 3A/3B)">Curly (Type 3A/3B)</option>
              <option value="Coily / Afro (Type 4A/4C)">Coily / Afro (Type 4A/4C)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Cut Styles</label>
            <input
              type="text"
              value={preferredStyles}
              onChange={(e) => setPreferredStyles(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sensitive Skin / Guard Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Saved Delivery Addresses */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 md:col-span-2 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-500" />
              Saved Delivery Addresses ({addresses.length})
            </h3>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="flex items-center gap-1 rounded-xl bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Address</span>
            </button>
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    placeholder="e.g. 500 Howard St, Apt 12B"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 mb-1">Location Label</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Downtown Office"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddAddress(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAddress}
                  className="rounded-xl bg-sky-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-400 shadow-xs"
                >
                  Save Address
                </button>
              </div>
            </div>
          )}

          {/* Address Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-start justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{addr.label || 'Saved Location'}</span>
                    {addr.isDefault && (
                      <span className="rounded bg-sky-100 text-sky-700 text-[10px] px-1.5 py-0.5 font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700">{addr.street}</p>
                  <p className="text-[11px] text-slate-500">{addr.city}, {addr.state} {addr.zip}</p>
                  {addr.notes && <p className="text-[11px] text-sky-700 italic">{addr.notes}</p>}
                </div>
                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact & Safety */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 md:col-span-2 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Safety & Emergency Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plans Modal */}
      {showPlans && (
        <SubscriptionPlansModal
          isOpen={showPlans}
          onClose={() => setShowPlans(false)}
          onSelectPlan={(plan, interval) => {
            setShowPlans(false);
            setCheckoutPlan(plan);
            setCheckoutInterval(interval);
          }}
        />
      )}

      {/* Checkout Modal */}
      {checkoutPlan && (
        <SubscriptionCheckoutModal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          plan={checkoutPlan}
          billingInterval={checkoutInterval}
          onSuccess={() => {
            setShowBilling(true);
          }}
        />
      )}

      {/* Billing Management Center Modal */}
      {showBilling && (
        <SubscriptionManagementModal
          isOpen={showBilling}
          onClose={() => setShowBilling(false)}
          onOpenPlans={() => setShowPlans(true)}
        />
      )}
    </div>
  );
};
