import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Activity,
  ShieldCheck,
  Sparkles,
  Network,
} from 'lucide-react';

/**
 * Workqora Universal File Intelligence — drop-to-ingest console.
 * Drop a business document (PDF/CSV/XLSX/photo) and the shared intelligence
 * backbone stores it, extracts + classifies it, resolves entities, and gates
 * unsafe writes behind human review before importing canonical records.
 */

interface ResolutionCandidate {
  canonicalId: string;
  displayName: string;
  confidence: number;
}
interface Resolution {
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'new';
  confidence: number;
  candidates: ResolutionCandidate[];
  requiresHumanConfirmation: boolean;
}
interface Candidate {
  fullName: string;
  employeeExternalId?: string;
  position?: string;
  hireDate?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'pending';
  confidence: number;
  warnings: string[];
}
interface RosterRow {
  candidate: Candidate;
  resolution: Resolution;
}
interface Classification {
  category: string;
  subtype?: string;
  confidence: number;
  signals: string[];
}
interface IngestResponse {
  document: { documentId: string; originalFilename: string; sha256: string; sizeBytes: number; source: string; ingestionStatus: string };
  deduplicated: boolean;
  classification?: Classification;
  extraction?: { method: string; confidence: number; rowCount: number; textPreview: string };
  rosterRows: RosterRow[];
  reviewRequired: boolean;
  events: string[];
}
interface IngestError {
  error: string;
  code: string;
  retryable?: boolean;
}
interface OpEvent {
  eventId: string;
  name: string;
  occurredAt: string;
  payload: Record<string, any>;
}
interface Observability {
  uploads: number;
  succeeded: number;
  failed: number;
  duplicates: number;
  successRate: number;
  automationEventsTriggered: number;
  byCategory: Record<string, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  employee_record: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  schedule: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  certification: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  invoice: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  inventory: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  unknown: 'bg-slate-600/20 text-slate-300 border-slate-500/30',
};

const STATUS_STYLE: Record<string, string> = {
  new: 'text-sky-300',
  resolved: 'text-emerald-300',
  ambiguous: 'text-amber-300',
  unresolved: 'text-rose-300',
};

const ACCEPTED = '.pdf,.csv,.txt,.html,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.webp,.tiff,.heic,.eml';

export const UniversalFileIntelligenceView: React.FC = () => {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<IngestError | null>(null);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [events, setEvents] = useState<OpEvent[]>([]);
  const [obs, setObs] = useState<Observability | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshTelemetry = useCallback(async () => {
    try {
      const [evRes, obsRes, empRes] = await Promise.all([
        fetch('/api/intelligence/events?limit=40'),
        fetch('/api/intelligence/observability'),
        fetch('/api/intelligence/employees'),
      ]);
      if (evRes.ok) setEvents(await evRes.json());
      if (obsRes.ok) setObs(await obsRes.json());
      if (empRes.ok) setEmployeeCount((await empRes.json()).length);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    refreshTelemetry();
  }, [refreshTelemetry]);

  const readAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setReviewMsg(null);
      setResult(null);
      try {
        const dataBase64 = await readAsBase64(file);
        const res = await fetch('/api/intelligence/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            source: 'file_upload',
            purpose: 'employee_import',
            dataBase64,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data as IngestError);
        } else {
          setResult(data as IngestResponse);
        }
      } catch (err: any) {
        setError({ error: err?.message || 'Upload failed', code: 'PARSER_FAILED' });
      } finally {
        setBusy(false);
        refreshTelemetry();
      }
    },
    [refreshTelemetry],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const runReview = async (decision: 'approve_all_safe' | 'reject') => {
    if (!result) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/intelligence/documents/${result.document.documentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewMsg(
          decision === 'reject'
            ? 'Import rejected. Evidence retained; no records written.'
            : `Imported ${data.created} employee(s), updated ${data.updated}. Canonical records saved.`,
        );
        if (data.detail) setResult({ ...result, rosterRows: data.detail.rosterRows, reviewRequired: false });
      } else {
        setError(data as IngestError);
      }
    } finally {
      setBusy(false);
      refreshTelemetry();
    }
  };

  const needsConfirm = result?.rosterRows.filter((r) => r.resolution.requiresHumanConfirmation).length ?? 0;

  return (
    <div className="space-y-6 pb-24 md:pb-12" id="file-intelligence-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Universal File Intelligence</h1>
            <p className="text-xs text-slate-400">
              Drop any business document — one pipeline extracts, classifies, resolves entities, and imports into Workqora.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-bold">Spider-web backbone online</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-4 w-4 text-emerald-400" />} label="Canonical Employees" value={employeeCount} />
        <Kpi icon={<FileText className="h-4 w-4 text-sky-400" />} label="Docs Ingested" value={obs?.uploads ?? 0} />
        <Kpi icon={<Activity className="h-4 w-4 text-amber-400" />} label="Automations Fired" value={obs?.automationEventsTriggered ?? 0} />
        <Kpi
          icon={<ShieldCheck className="h-4 w-4 text-purple-400" />}
          label="Success Rate"
          value={`${Math.round((obs?.successRate ?? 0) * 100)}%`}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
          dragging ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
        }`}
        id="file-intelligence-dropzone"
      >
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        {busy ? (
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
            <p className="font-semibold">Running universal ingestion pipeline…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-sky-400">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-base font-bold text-white">Drop a file to add it to Workqora automatically</p>
            <p className="text-xs text-slate-400 max-w-md">
              PDF, Excel (XLSX/XLS), CSV, Word, images & more. Structured extraction runs first — no paid OCR unless a
              scan truly needs it.
            </p>
            <span className="mt-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-400">
              Original evidence stored immutably • SHA-256 de-duplicated • tenant-scoped
            </span>
          </div>
        )}
      </div>

      {/* Explicit error (never a generic "AI unavailable") */}
      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3" id="file-intelligence-error">
          <XCircle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-200">
              {error.code} {error.retryable ? '(retryable)' : ''}
            </p>
            <p className="text-xs text-rose-200/80">{error.error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-5" id="file-intelligence-result">
          {/* Summary card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-sky-400" />
                <span className="font-bold text-white">{result.document.originalFilename}</span>
                {result.deduplicated && (
                  <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold">
                    Duplicate — already ingested
                  </span>
                )}
              </div>
              {result.classification && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    CATEGORY_COLORS[result.classification.category] || CATEGORY_COLORS.unknown
                  }`}
                >
                  {result.classification.category} · {Math.round(result.classification.confidence * 100)}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Meta label="Parser" value={result.extraction?.method ?? '—'} />
              <Meta label="Rows detected" value={String(result.extraction?.rowCount ?? 0)} />
              <Meta label="Status" value={result.document.ingestionStatus} />
              <Meta label="SHA-256" value={result.document.sha256.slice(0, 12) + '…'} />
            </div>
            {/* Event chain */}
            <div className="flex flex-wrap gap-2">
              {result.events.map((e, i) => (
                <span key={i} className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-300">
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Review gate */}
          {result.rosterRows.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Human Review Gate — {result.rosterRows.length} employee rows
                  </h3>
                  {needsConfirm > 0 && (
                    <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px]">
                      {needsConfirm} need confirmation
                    </span>
                  )}
                </div>
                {result.reviewRequired && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => runReview('approve_all_safe')}
                      disabled={busy}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 text-sm font-bold text-slate-950 transition-colors"
                      id="approve-all-btn"
                    >
                      Approve All Safe
                    </button>
                    <button
                      onClick={() => runReview('reject')}
                      disabled={busy}
                      className="rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 px-4 py-2 text-sm font-bold transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {reviewMsg && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> {reviewMsg}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Employee</th>
                      <th className="px-4 py-2 font-semibold">External ID</th>
                      <th className="px-4 py-2 font-semibold">Position</th>
                      <th className="px-4 py-2 font-semibold">Hire</th>
                      <th className="px-4 py-2 font-semibold">Contact</th>
                      <th className="px-4 py-2 font-semibold">Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rosterRows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-800/70 hover:bg-slate-800/30">
                        <td className="px-4 py-2">
                          <div className="font-semibold text-white">{row.candidate.fullName}</div>
                          {row.candidate.warnings.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-400/80">
                              <AlertTriangle className="h-3 w-3" /> {row.candidate.warnings[0]}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-300">
                          {row.candidate.employeeExternalId || (
                            <span className="text-amber-400/80">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-300">{row.candidate.position || '—'}</td>
                        <td className="px-4 py-2 text-slate-400">{row.candidate.hireDate || '—'}</td>
                        <td className="px-4 py-2 text-slate-400">
                          <div>{row.candidate.email || '—'}</div>
                          <div className="text-slate-500">{row.candidate.phone || ''}</div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`font-bold ${STATUS_STYLE[row.resolution.status] || 'text-slate-300'}`}>
                            {row.resolution.status}
                          </span>
                          <span className="text-slate-500"> · {Math.round(row.resolution.confidence * 100)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spider-web event feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" /> Operational Event Graph
          </h3>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {events.length === 0 && <p className="text-xs text-slate-500">No events yet. Drop a file to begin.</p>}
            {events.map((ev) => (
              <div key={ev.eventId} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-sky-300 w-56 shrink-0">{ev.name}</span>
                <span className="text-slate-400 truncate">
                  {ev.payload?.name || ev.payload?.category || ev.payload?.errorCode || ''}
                </span>
                <span className="ml-auto text-slate-600">{new Date(ev.occurredAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Documents by Category</h3>
          <div className="space-y-2">
            {obs && Object.keys(obs.byCategory).length > 0 ? (
              Object.entries(obs.byCategory).map(([cat, n]) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span
                    className={`rounded-full border px-2 py-0.5 ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown}`}
                  >
                    {cat}
                  </span>
                  <span className="font-bold text-white">{n}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No documents classified yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-1">
    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">{icon}{label}</span>
    <p className="text-2xl font-black text-white">{value}</p>
  </div>
);

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-950/50 p-2.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="font-mono text-slate-200 truncate">{value}</p>
  </div>
);
