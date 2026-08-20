import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Message, Booking } from '../../types';
import { X, Send, Lock, ShieldCheck, PhoneCall, Image as ImageIcon, CheckCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ booking, isOpen, onClose }) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${booking.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, booking.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText.trim();
    if (!textToSend) return;

    if (!customText) setInputText('');

    try {
      setLoading(true);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          text: textToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCustomer = user?.id === booking.customerId;
  const otherPartyName = isCustomer ? booking.barberName : booking.customerName;
  const otherPartyAvatar = isCustomer ? booking.barberAvatar : booking.customerAvatar;

  const quickReplies = isCustomer
    ? ['I am at the front door / call box', 'Visitor parking spot #4 is open', 'Need 5 more minutes, thanks!']
    : ['I am parked out front and unloading kit', 'On my way up the elevator now', 'Equipment sanitized & ready!'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md" id="chat-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={otherPartyAvatar} alt={otherPartyName} className="h-10 w-10 rounded-full object-cover border border-amber-500/40" />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {otherPartyName}
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-amber-400 font-semibold">
                  {isCustomer ? 'Your Barber' : 'Client'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {booking.service.name} • {booking.time}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Privacy & Safety Masking Banner */}
        <div className="border-b border-slate-800/80 bg-slate-950/60 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Lock className="h-3.5 w-3.5" />
            <span>Private Relay Active (Real phone numbers protected)</span>
          </div>
          <span className="text-slate-500">Booking #{booking.id.slice(-6)}</span>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <ShieldCheck className="h-8 w-8 text-amber-500/50 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Secure conversation started</p>
              <p className="text-[11px] max-w-xs mt-1">
                You can coordinate arrival details, parking instructions, and building access here.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow ${
                      isMine
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && <CheckCheck className="h-3 w-3 text-slate-900" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Response Chips */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-3 py-2 overflow-x-auto flex gap-1.5">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(undefined, reply)}
              className="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-400 hover:text-white"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Field */}
        <form onSubmit={handleSend} className="border-t border-slate-800 bg-slate-950 p-3 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to your mobile barber..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            id="chat-message-input"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow hover:bg-amber-400 disabled:opacity-40"
            id="chat-send-btn"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
