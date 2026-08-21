import React from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { motion } from 'motion/react';

interface AIFloatingTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AIFloatingTrigger: React.FC<AIFloatingTriggerProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40"
      id="barbergo-ai-floating-trigger"
    >
      <button
        onClick={onClick}
        className="group relative flex items-center gap-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white pl-3.5 pr-4 py-2.5 shadow-xl hover:shadow-2xl hover:shadow-sky-500/20 border border-slate-700/80 transition-all duration-200 active:scale-95"
        title="Open BarberGo AI Assistant"
      >
        {/* Glow halo */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-sky-500 to-sky-300 opacity-40 blur-xs group-hover:opacity-75 transition-opacity" />

        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-xs">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>

        <div className="relative text-left flex flex-col">
          <span className="text-xs font-bold leading-tight flex items-center gap-1.5">
            BarberGo AI
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          </span>
          <span className="text-[10px] text-slate-300 font-medium leading-none">Stylist & Concierge</span>
        </div>
      </button>
    </motion.div>
  );
};
