import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Scissors,
  CheckCircle,
  ChevronRight,
  HelpCircle,
  FileText,
  UserCheck,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface AskBarberGoAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectServiceAndBook?: (category: string, notes?: string) => void;
}

export const AskBarberGoAIModal: React.FC<AskBarberGoAIModalProps> = ({
  isOpen,
  onClose,
  onSelectServiceAndBook
}) => {
  const { customerProfile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<
    { sender: 'user' | 'ai'; text: string; recommendedCategory?: string; notesToBarber?: string }[]
  >([
    {
      sender: 'ai',
      text: "Hello! I'm your BarberGo AI Stylist. Ask me anything about haircut styles, tapers vs fades, face shape recommendations, or which service you should book today."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const quickQuestions = [
    'What is the difference between a taper and a fade?',
    'What cut suits thick wavy hair and a square face?',
    'How do I maintain my beard line between appointments?',
    'Recommend a modern low-maintenance style for work.'
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || prompt).trim();
    if (!q || loading) return;

    const newMsgs = [...messages, { sender: 'user' as const, text: q }];
    setMessages(newMsgs);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/haircut-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q,
          hairType: customerProfile?.hairType || 'Normal',
          faceShape: 'Oval/Structured'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.result || '';

        // Extract recommended category or parse recommendations
        let recommendedCategory = 'Fade';
        if (q.toLowerCase().includes('beard') || raw.toLowerCase().includes('beard')) {
          recommendedCategory = 'Beard';
        } else if (q.toLowerCase().includes('kid') || raw.toLowerCase().includes('kid')) {
          recommendedCategory = 'Kids Cut';
        } else if (q.toLowerCase().includes('combo') || q.toLowerCase().includes('full service')) {
          recommendedCategory = 'Hair + Beard';
        } else if (q.toLowerCase().includes('scissor') || q.toLowerCase().includes('classic')) {
          recommendedCategory = 'Haircut';
        }

        const notes = `Consultation notes: ${q.slice(0, 60)}... Desired look based on AI stylist advice.`;

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: typeof raw === 'string' ? raw : (raw.recommendation || JSON.stringify(raw)),
            recommendedCategory,
            notesToBarber: notes
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: "For a versatile and sharp look, a mid-skin taper fade paired with scissor work on top is universally flattering. Book a 'Fade' service and let your master barber customize the clipper guards to your head shape.",
            recommendedCategory: 'Fade',
            notesToBarber: 'Mid skin taper with natural hairline blend'
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: "A clean low fade or classic textured scissor crop works wonderfully. Master barbers on BarberGo carry specialized clippers and foil shavers to customize your silhouette.",
          recommendedCategory: 'Haircut',
          notesToBarber: 'Textured crop with natural neck taper'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNotes = (notes: string, index: number) => {
    navigator.clipboard.writeText(notes);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" id="ask-barbergo-ai-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-slate-900 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Ask BarberGo AI</h3>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Stylist Assistant</span>
              </div>
              <p className="text-[11px] text-slate-400">Style guidance, service matching & barber notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat / Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-amber-500 text-slate-950 font-medium'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                }`}
              >
                {m.text}
              </div>

              {/* If AI gave recommendation & notes */}
              {m.sender === 'ai' && m.recommendedCategory && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {onSelectServiceAndBook && (
                    <button
                      onClick={() => {
                        onSelectServiceAndBook(m.recommendedCategory!, m.notesToBarber);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/30"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>Book {m.recommendedCategory} Service</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}

                  {m.notesToBarber && (
                    <button
                      onClick={() => handleCopyNotes(m.notesToBarber!, idx)}
                      className="flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white"
                    >
                      {copiedIndex === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedIndex === idx ? 'Copied Notes' : 'Copy Notes for Barber'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-amber-400 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing styling techniques & hair profiles...</span>
            </div>
          )}
        </div>

          {/* Quick Prompts */}
          <div className="border-t border-slate-800/80 bg-slate-950/40 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Common Questions</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

        {/* Input Footer */}
        <div className="border-t border-slate-800 bg-slate-950/80 p-3 flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about a haircut, fade, beard style, or notes..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!prompt.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
