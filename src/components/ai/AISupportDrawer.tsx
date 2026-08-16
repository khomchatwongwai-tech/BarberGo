import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { LifeBuoy, X, Send, Bot, User, Sparkles, Shield, Phone, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AISupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export const AISupportDrawer: React.FC<AISupportDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { settings } = useConfig();
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Hello ${user?.fullName || 'there'}! I am your ${settings.appName} Support Assistant. How can I assist you today with bookings, mobile safety standards, cancellation policies, or payment details?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    const userText = inputQuery.trim();
    setInputQuery('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text: userText, timestamp: now }
    ]);

    try {
      setLoading(true);
      const res = await fetch('/api/ai/support-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: userText,
          userRole: user?.role || 'customer'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: data.result,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error('Support bot error:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What is the cancellation & refund policy?',
    'How does live barber GPS tracking work?',
    'How do freelance barber payouts and tips work?',
    'What safety standards are enforced for in-home services?'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" id="support-drawer">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {settings.appName} Support Copilot
                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </h3>
              <p className="text-[11px] text-slate-400">24/7 AI-assisted marketplace help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            id="close-support-drawer-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Emergency Hotline Alert */}
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <span>Emergency Safety Hotline:</span>
          </div>
          <a
            href={`tel:${settings.emergencyHelpline}`}
            className="font-bold flex items-center gap-1 underline hover:text-white"
          >
            <Phone className="h-3 w-3" />
            {settings.emergencyHelpline}
          </a>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/30 text-blue-400">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
                    isUser
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  <span
                    className={`block mt-1 text-[10px] ${
                      isUser ? 'text-slate-800/80 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              <span>Analyzing policy & formulating answer...</span>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 p-2 overflow-x-auto flex gap-1.5">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputQuery(q);
              }}
              className="shrink-0 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-400 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Form */}
        <form
          onSubmit={handleSend}
          className="border-t border-slate-800 bg-slate-950 p-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about policies, fees, tracking..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            id="support-input"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow hover:bg-amber-400 disabled:opacity-40"
            id="support-send-btn"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
