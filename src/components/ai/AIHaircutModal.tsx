import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { Sparkles, X, Scissors, Copy, Check, Wand2, Lightbulb, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIHaircutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNotes?: (notes: string) => void;
}

export const AIHaircutModal: React.FC<AIHaircutModalProps> = ({
  isOpen,
  onClose,
  onApplyNotes
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [hairType, setHairType] = useState('Thick & Textured');
  const [faceShape, setFaceShape] = useState('Oval');
  const [desiredLook, setDesiredLook] = useState('Modern Skin Taper Fade with Scissor Texture');
  const [customNotes, setCustomNotes] = useState('Sensitive skin around neckline');
  const [vibe, setVibe] = useState('Sharp Executive');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/haircut-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hairType,
          faceShape,
          desiredLook,
          haircutNotes: customNotes,
          vibe
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
      }
    } catch (err) {
      console.error('Failed to get consultation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" id="ai-haircut-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Haircut & Style Consultant</h3>
              <p className="text-xs text-amber-300/80">Get tailored clipper guard specs and notes for your mobile barber</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            id="close-ai-modal-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hair Type & Texture
              </label>
              <select
                value={hairType}
                onChange={(e) => setHairType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="Thick & Textured">Thick & Textured</option>
                <option value="Fine / Straight">Fine / Straight</option>
                <option value="Wavy (Type 2A/2B)">Wavy (Type 2A/2B)</option>
                <option value="Curly (Type 3A/3B)">Curly (Type 3A/3B)</option>
                <option value="Coily / Afro-textured (Type 4A/4C)">Coily / Afro-textured (Type 4A/4C)</option>
                <option value="Receding / Thinning Crown">Receding / Thinning Crown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Face Shape
              </label>
              <select
                value={faceShape}
                onChange={(e) => setFaceShape(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="Oval">Oval (Balanced)</option>
                <option value="Square / Strong Jaw">Square / Strong Jaw</option>
                <option value="Round">Round</option>
                <option value="Oblong / Long">Oblong / Long</option>
                <option value="Diamond / High Cheekbones">Diamond / High Cheekbones</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Desired Cut Archetype
              </label>
              <input
                type="text"
                value={desiredLook}
                onChange={(e) => setDesiredLook(e.target.value)}
                placeholder="e.g. Mid-skin taper, textured crop, buzz with lineup"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Occasion / Vibe
              </label>
              <select
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="Sharp Executive">Sharp Executive / Boardroom</option>
                <option value="Modern Low-Maintenance">Modern Low-Maintenance</option>
                <option value="Wedding / Black Tie Gala">Wedding / Black Tie Gala</option>
                <option value="Edgy Street Style">Edgy Street Style</option>
                <option value="Gentleman Classic">Gentleman Classic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Specific Sensitivities / Barber Instructions
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Sensitive neck skin, prefer clipper #2 on sides, leave length for parting"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 disabled:opacity-50"
            id="generate-consultation-btn"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Consulting Gemini Master Stylist...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Generate Tailored Style Consultation</span>
              </>
            )}
          </button>

          {/* Generated Result Output */}
          {result && (
            <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-4 text-xs text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5" />
                  Stylist Recommendation
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  {onApplyNotes && (
                    <button
                      onClick={() => {
                        onApplyNotes(result);
                        onClose();
                      }}
                      className="rounded-md bg-amber-500/20 px-2 py-0.5 text-amber-300 hover:bg-amber-500/30 font-semibold"
                    >
                      Use in Booking Notes
                    </button>
                  )}
                </div>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed space-y-2 font-sans">
                {result}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
