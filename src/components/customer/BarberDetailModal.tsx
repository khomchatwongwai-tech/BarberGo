import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Star,
  ShieldCheck,
  MapPin,
  Clock,
  Scissors,
  CheckCircle2,
  Calendar,
  Sparkles,
  Award,
  FileCheck2,
  Phone,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import { Service, BarberDocument, Review } from '../../types';

interface BarberDetailModalProps {
  barberId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStartBooking: (barberId: string, initialServiceId?: string) => void;
}

export const BarberDetailModal: React.FC<BarberDetailModalProps> = ({
  barberId,
  isOpen,
  onClose,
  onStartBooking
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'services' | 'portfolio' | 'reviews' | 'about'>('services');

  useEffect(() => {
    if (barberId && isOpen) {
      const fetchDetails = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/barbers/${barberId}`);
          if (res.ok) {
            const barberData = await res.json();
            setData(barberData);
          }
        } catch (err) {
          console.error('Failed to load barber details:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [barberId, isOpen]);

  if (!isOpen || !barberId) return null;

  const barber = data?.user;
  const profile = data?.profile;
  const services: Service[] = data?.services || [];
  const reviews: Review[] = data?.reviews || [];
  const documents: BarberDocument[] = data?.documents || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-md" id="barber-detail-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header Cover Banner */}
        <div className="relative h-44 sm:h-52 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 p-6 flex flex-col justify-between border-b border-slate-800">
          <div className="flex items-center justify-between z-10">
            <span className="rounded-full bg-slate-950/80 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-400 backdrop-blur-md">
              Mobile Master Barber
            </span>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-slate-300 hover:text-white backdrop-blur-md"
              id="close-barber-detail-modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-end gap-4 z-10">
            <div className="relative">
              <img
                src={barber?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'}
                alt={barber?.fullName}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-2 border-amber-400 shadow-2xl"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                {barber?.fullName}
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 border border-emerald-500/30">
                  Licensed Pro
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {profile?.rating?.toFixed(2) || '5.00'} ({profile?.reviewCount || 0} reviews)
                </span>
                <span>•</span>
                <span>{profile?.experienceYears || 5}+ Years Exp</span>
                <span>•</span>
                <span>{profile?.completedBookingsCount || 0} Mobile Cuts Delivered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 py-2 gap-2 overflow-x-auto">
          {[
            { id: 'services', label: `Services (${services.length})` },
            { id: 'portfolio', label: 'Portfolio Gallery' },
            { id: 'reviews', label: `Reviews (${reviews.length})` },
            { id: 'about', label: 'Credentials & Policy' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SERVICES MENU */}
          {selectedTab === 'services' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <span>Travel Service: Base fee ${profile?.baseTravelFee?.toFixed(2)} within {profile?.travelRadiusMiles} miles</span>
                </div>
                <span className="font-semibold text-slate-400">Sanitized station included</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-amber-500/40 gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {srv.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{srv.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          {srv.durationMinutes} mins
                        </span>
                        {srv.equipmentProvided?.length > 0 && (
                          <span>• Sanitized {srv.equipmentProvided.join(', ')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                      <span className="text-base font-extrabold text-white">${srv.price.toFixed(2)}</span>
                      <button
                        onClick={() => {
                          onStartBooking(barberId, srv.id);
                        }}
                        className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
                        id={`select-service-btn-${srv.id}`}
                      >
                        Book This
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PORTFOLIO GALLERY */}
          {selectedTab === 'portfolio' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Client Cuts & Fades</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(profile?.portfolioImages || []).map((imgUrl: string, idx: number) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                    <img
                      src={imgUrl}
                      alt={`Cut style ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <span className="text-[11px] font-semibold text-white">Signature Precision Cut #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REVIEWS */}
          {selectedTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">{profile?.rating?.toFixed(2)}</span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Based on {profile?.reviewCount} verified client reviews</p>
                </div>
              </div>

              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={rev.customerAvatar} alt={rev.customerName} className="h-7 w-7 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-white">{rev.customerName}</p>
                          <p className="text-[10px] text-slate-400">{rev.date}</p>
                        </div>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT & CREDENTIALS */}
          {selectedTab === 'about' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Biography</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{profile?.bio}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  BarberPilot Trust & Safety Clearances
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>State Barber License: <strong>{profile?.licenseNumber || 'CA-BARB-998241'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>General Liability Insurance: <strong>Active Policy</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Criminal Background Check: <strong>Cleared & Passed</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Sterilization & Mobile Protocol: <strong>Certified</strong></span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Primary Metro Coverage</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile?.serviceAreaCities || []).map((city: string, i: number) => (
                    <span key={i} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="border-t border-slate-800 bg-slate-950 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Independent Freelancer</span>
            <p className="text-xs text-slate-300 font-semibold">100% Guaranteed Satisfaction</p>
          </div>
          <button
            onClick={() => onStartBooking(barberId)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-all"
            id="barber-detail-book-now-btn"
          >
            <Calendar className="h-4 w-4" />
            <span>Select Date & Book</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
