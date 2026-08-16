import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  User,
  Scissors,
  Loader2
} from 'lucide-react';
import { Dispute } from '../../types';

export const SupportQueueView: React.FC<{ onOpenAICopilot: () => void }> = ({ onOpenAICopilot }) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [agentResponse, setAgentResponse] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/disputes');
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
        if (data.length > 0 && !selectedDispute) {
          setSelectedDispute(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load support queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleDraftAIReply = async () => {
    if (!selectedDispute) return;
    try {
      setAiDrafting(true);
      const res = await fetch('/api/ai/support-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketSummary: selectedDispute.reason,
          userRole: 'customer',
          context: `Booking ID #${selectedDispute.bookingId}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAgentResponse(data.reply || data.resolutionSummary || '');
      }
    } catch (err) {
      console.error('AI draft error:', err);
    } finally {
      setAiDrafting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="support-queue-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Customer Care & Support Agent Desk</h1>
          <p className="text-xs text-slate-400">Live ticket triage, dispute arbitration, and Gemini AI customer resolution copilot</p>
        </div>
        <button
          onClick={onOpenAICopilot}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch AI Copilot Assistant</span>
        </button>
      </div>

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-2">
            Active Priority Queue ({disputes.length})
          </span>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {disputes.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDispute(d)}
                className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
                  selectedDispute?.id === d.id
                    ? 'border-amber-400 bg-slate-800'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white">Ticket #{d.id.slice(-6)}</span>
                  <span className="text-[10px] rounded bg-red-500/20 text-red-300 px-2 py-0.5 font-bold uppercase">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{d.reason}</p>
                <span className="text-[10px] text-slate-500 mt-2 block">
                  Created {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Ticket Detail & Response Center */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
          {selectedDispute ? (
            <>
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Case #{selectedDispute.id}</h3>
                  <p className="text-xs text-slate-400">Associated Booking: #{selectedDispute.bookingId}</p>
                </div>
                <span className="rounded-full bg-amber-500/20 text-amber-300 text-xs px-3 py-1 font-bold">
                  Priority: High
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                <span className="font-bold text-amber-400 block">Reported Incident:</span>
                <p className="text-slate-200">{selectedDispute.reason}</p>
              </div>

              {/* Agent Reply Box with AI Drafting */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300">Mediation & Customer Response</label>
                  <button
                    onClick={handleDraftAIReply}
                    disabled={aiDrafting}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                  >
                    {aiDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>Auto-Draft Resolution (Gemini AI)</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={agentResponse}
                  onChange={(e) => setAgentResponse(e.target.value)}
                  placeholder="Type an official resolution message to client and mobile barber..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-850 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => alert('Resolution logged & dispatched to customer SMS/email.')}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Official Resolution</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <LifeBuoy className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <p className="text-xs">Select a support ticket from the queue to view details and draft replies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
