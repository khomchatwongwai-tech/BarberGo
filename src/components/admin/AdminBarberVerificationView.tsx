import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  Check,
  X,
  Clock,
  User,
  ExternalLink,
  AlertCircle,
  Scissors
} from 'lucide-react';
import { BarberDocument } from '../../types';

export const AdminBarberVerificationView: React.FC = () => {
  const [documents, setDocuments] = useState<BarberDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/verifications');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleReview = async (docId: string, status: 'approved' | 'rejected') => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/verifications/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchDocs();
      }
    } catch (err) {
      console.error('Review doc error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="admin-verification-view">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Barber Credential Audit & Licensing</h1>
          <p className="text-xs text-slate-400">
            Verify state cosmetology licenses, general liability insurance, and identity checks before activation
          </p>
        </div>
        <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold">
          {documents.length} Records in Queue
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          <FileCheck2 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">Verification Queue Clear</h3>
          <p className="text-xs mt-1 text-slate-400">All mobile barber documents have been audited.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              id={`verification-doc-${doc.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                      {doc.type.replace('_', ' ')}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        doc.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : doc.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Barber ID: <span className="font-mono text-amber-300">{doc.barberId}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Submitted: {new Date(doc.uploadedAt).toLocaleDateString()} • Exp Date: {doc.expiryDate || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Inspect Document</span>
                </a>

                <button
                  onClick={() => handleReview(doc.id, 'rejected')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleReview(doc.id, 'approved')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:bg-emerald-400"
                >
                  <Check className="h-4 w-4" />
                  <span>Approve & Verify</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
