import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  Search,
  Send,
  Calendar,
  Clock,
  MapPin,
  CheckCheck,
  User,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../../types';

export const MessagesInboxView: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !activeBookingId && window.innerWidth >= 768) {
          setActiveBookingId(data[0].bookingId);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/messages/${bookingId}`);
      if (res.ok) {
        const msgs = await res.json();
        setActiveThread(msgs);
      }
    } catch (err) {
      console.error('Failed to load thread messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeBookingId) {
      fetchThread(activeBookingId);
      const interval = setInterval(() => fetchThread(activeBookingId), 3000);
      return () => clearInterval(interval);
    }
  }, [activeBookingId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || messageInput).trim();
    if (!text || !activeBookingId || sending) return;

    try {
      setSending(true);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: activeBookingId,
          text
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveThread((prev) => [...prev, data.message]);
        setMessageInput('');
        fetchConversations();
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.bookingId === activeBookingId);

  const quickReplies = user?.role === 'barber'
    ? ["I've arrived outside!", "Finding parking now, will be up in 3 mins.", "Setting up the portable station.", "Thank you for booking!"]
    : ["Buzz code is #404, take elevator to 4th floor.", "I'm ready at the front desk.", "Street parking is available in front.", "Thank you!"];

  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.otherUser?.name?.toLowerCase().includes(q) ||
      c.serviceName?.toLowerCase().includes(q) ||
      c.lastMessage?.text?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20" id="messages-inbox-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Direct Messages</h2>
          <p className="text-xs text-slate-400">Coordinated arrivals, style notes & appointment updates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[560px] rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl">
        {/* Left column: Conversations list */}
        <div className={`md:col-span-5 border-r border-slate-800 flex flex-col ${
          activeBookingId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search inbox */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search messages or names..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading && conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                Loading message threads...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">No message threads found</p>
                <p className="text-[11px] text-slate-500 mt-1">Bookings automatically create a direct communication channel.</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.bookingId === activeBookingId;
                return (
                  <div
                    key={c.bookingId}
                    onClick={() => setActiveBookingId(c.bookingId)}
                    className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-4 border-amber-400'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <img
                      src={c.otherUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'}
                      alt={c.otherUser?.name}
                      className="h-11 w-11 rounded-2xl object-cover border border-slate-700 shrink-0 mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{c.otherUser?.name}</h4>
                        <span className="text-[10px] text-slate-500">{c.bookingTime}</span>
                      </div>

                      <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-400 mt-0.5 mb-1">
                        {c.serviceName}
                      </span>

                      <p className="text-xs text-slate-400 truncate">{c.lastMessage?.text || 'Appointment scheduled'}</p>
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950 shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Active Chat thread */}
        <div className={`md:col-span-7 flex flex-col bg-slate-950/40 ${
          activeBookingId ? 'flex' : 'hidden md:flex'
        }`}>
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 p-3.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveBookingId(null)}
                    className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <img
                    src={activeConv.otherUser?.avatar}
                    alt={activeConv.otherUser?.name}
                    className="h-9 w-9 rounded-xl object-cover border border-slate-700"
                  />

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-white">{activeConv.otherUser?.name}</h3>
                      {activeConv.otherUser?.rating && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                          <Star className="h-3 w-3 fill-current" /> {activeConv.otherUser.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {activeConv.serviceName} • {activeConv.bookingDate} at {activeConv.bookingTime}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-300">
                  {activeConv.bookingStatus?.replace('_', ' ')}
                </span>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center text-xs text-slate-400">
                  <span className="text-amber-400 font-bold">🔒 BarberGo Encrypted Channel</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Messages are protected. Use this channel to share arrival gate codes, parking instructions, or haircut photos.
                  </p>
                </div>

                {activeThread.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isMe
                            ? 'bg-amber-500 text-slate-950 font-medium'
                            : 'bg-slate-800 text-white border border-slate-700/60'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Quick Reply Chips */}
              <div className="border-t border-slate-800/80 bg-slate-950/60 p-2 overflow-x-auto flex gap-1.5 no-scrollbar">
                {quickReplies.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(r)}
                    className="whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-500/50 hover:text-amber-300"
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Message Input Bar */}
              <div className="border-t border-slate-800 bg-slate-950/90 p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message or arrival instructions..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!messageInput.trim() || sending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-sm font-bold text-slate-400">Select a conversation</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Choose an appointment from the left to coordinate directly with your barber or customer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
