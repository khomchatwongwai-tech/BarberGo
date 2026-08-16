import React, { useState } from 'react';
import { Sparkles, X, Wand2, Check, Copy, Loader2, Scissors } from 'lucide-react';
import { motion } from 'motion/react';

interface AIBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  barberName: string;
  onApplyBio: (bio: string) => void;
}

export const AIBioModal: React.FC<AIBioModalProps> = ({
  isOpen,
  onClose,
  barberName,
  onApplyBio
}) => {
  const [yearsExp, setYearsExp] = useState(10);
  const [city, setCity] = useState('San Francisco, CA');
  const [specialties, setSpecialties] = useState('Skin Fades, Hot Towel Shaves, Executive Beard Sculpting');
  const [vibe, setVibe] = useState('Luxury, punctual, discreet master craftsman');
  const [loading, setLoading] = useState(false);
  const [generatedBio, setGeneratedBio] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/barber-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberName,
          experienceYears: yearsExp,
          city,
          specialties: specialties.split(',').map((s) => s.trim()),
          vibe
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedBio(data.result);
      }
    } catch (err) {
      console.error('Failed to generate bio:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" id="ai-bio-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">AI Barber Bio Copywriter</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Years of Experience</label>
              <input
                type="number"
                value={yearsExp}
                onChange={(e) => setYearsExp(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Metro Area</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Specialties & Signature Services</label>
            <input
              type="text"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Persona & Tone</label>
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            <span>Generate High-Converting Profile Bio</span>
          </button>

          {generatedBio && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-slate-300 space-y-2">
              <p className="whitespace-pre-wrap leading-relaxed">{generatedBio}</p>
              <button
                onClick={() => {
                  onApplyBio(generatedBio);
                  onClose();
                }}
                className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500 text-xs"
              >
                Apply to My Barber Profile
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
