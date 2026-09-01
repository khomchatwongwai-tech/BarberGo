import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../../lib/api';

type Section =
  | 'overview'
  | 'companies'
  | 'ai'
  | 'spider-web'
  | 'automation'
  | 'analytics'
  | 'research'
  | 'alerts'
  | 'incidents'
  | 'workqora'
  | 'marketmind'
  | 'system';

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'companies', label: 'Companies' },
  { id: 'ai', label: 'AI' },
  { id: 'spider-web', label: 'Spider Web' },
  { id: 'automation', label: 'Automation' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'research', label: 'Research' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'workqora', label: 'Workqora' },
  { id: 'marketmind', label: 'MarketMind' },
  { id: 'system', label: 'System Health' },
];

function colorClass(color: string | undefined) {
  if (color === 'GREEN') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (color === 'YELLOW') return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
  if (color === 'RED') return 'bg-rose-600/20 text-rose-200 border-rose-500/40';
  if (color === 'BLOCKED') return 'bg-fuchsia-600/20 text-fuchsia-200 border-fuchsia-500/40';
  return 'bg-zinc-700/40 text-zinc-300 border-zinc-500/40';
}

function StateBanner({
  state,
  message,
}: {
  state: 'loading' | 'partial' | 'stale' | 'unavailable' | 'denied' | 'error' | 'ready';
  message: string;
}) {
  return (
    <div
      role="status"
      className="rounded-xl border border-[#D4AF37]/25 bg-[#141722] px-3 py-2 text-xs text-[#D8D4C7]"
    >
      <span className="font-mono uppercase tracking-wide text-[#D4AF37]">{state}</span>
      <span className="ml-2">{message}</span>
    </div>
  );
}

export const ExecutiveOsView: React.FC = () => {
  const [section, setSection] = useState<Section>('overview');
  const [health, setHealth] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [twin, setTwin] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);
  const [impact, setImpact] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [brief, setBrief] = useState<any>(null);
  const [focus, setFocus] = useState<any>(null);
  const [committee, setCommittee] = useState<any>(null);
  const [question, setQuestion] = useState('What is the biggest risk today?');
  const [loadState, setLoadState] = useState<'loading' | 'partial' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [analyticsOut, setAnalyticsOut] = useState<any>(null);

  const load = useCallback(async () => {
    setLoadState('loading');
    setError(null);
    try {
      const [h, p, k, t, g, a, i, r, pol, research, b, f] = await Promise.all([
        fetchApi<any>('/api/corporate/health').catch(() => null),
        fetchApi<any>('/api/corporate/products').catch(() => null),
        fetchApi<any>('/api/corporate/kpis').catch(() => null),
        fetchApi<any>('/api/corporate/twin').catch(() => null),
        fetchApi<any>('/api/corporate/spider-web').catch(() => null),
        fetchApi<any>('/api/corporate/alerts').catch(() => null),
        fetchApi<any>('/api/corporate/incidents').catch(() => null),
        fetchApi<any>('/api/corporate/automation/runs').catch(() => null),
        fetchApi<any>('/api/corporate/automation/policy').catch(() => null),
        fetchApi<any>('/api/corporate/research').catch(() => null),
        fetchApi<any>('/api/corporate/brief/morning').catch(() => null),
        fetchApi<any>('/api/corporate/focus').catch(() => null),
      ]);
      setHealth(h);
      setProducts(p?.products || []);
      setKpis(k?.kpis || []);
      setTwin(t);
      setGraph(g);
      setAlerts(a?.alerts || []);
      setIncidents(i?.incidents || []);
      setRuns(r?.runs || []);
      setPolicies(pol?.policies || []);
      setJobs(research?.jobs || []);
      setBrief(b);
      setFocus(f);
      const missing = [h, p, k, t, g].filter((x) => !x).length;
      setLoadState(missing ? 'partial' : 'ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workqora = products.find((p) => p.productId === 'WORKQORA');
  const marketmind = products.find((p) => p.productId === 'MARKETMIND_AI');
  const workqoraHealth = health?.products?.find((p: any) => p.productId === 'WORKQORA');
  const marketmindHealth = health?.products?.find((p: any) => p.productId === 'MARKETMIND_AI');

  const kpiCards = useMemo(() => kpis.slice(0, 18), [kpis]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-['Cinzel',serif] text-2xl text-[#F3E5AB]">Corporate Command Center</h1>
          <p className="text-xs text-[#A6A08D]">
            Honest statuses only. Missing values stay UNAVAILABLE. Mutation gates remain closed.
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-mono ${colorClass(health?.overall)}`}>
          overall {health?.overall || 'UNKNOWN'}
        </div>
      </header>

      {loadState === 'loading' && <StateBanner state="loading" message="Loading corporate telemetry." />}
      {loadState === 'partial' && <StateBanner state="partial" message="Some corporate APIs did not respond. Showing available evidence only." />}
      {loadState === 'error' && <StateBanner state="error" message={error || 'Corporate OS request failed.'} />}
      {error?.toLowerCase().includes('unauthorized') && (
        <StateBanner state="denied" message="Owner authentication is required." />
      )}

      <nav aria-label="Corporate sections" className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              section === item.id
                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0C10]'
                : 'border-[#D4AF37]/30 text-[#D8D4C7] hover:border-[#D4AF37]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {(section === 'overview' || section === 'system') && (
        <section className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
            <h2 className="text-sm font-semibold text-[#F3E5AB]">CEO Focus</h2>
            <ul className="mt-2 space-y-2 text-xs">
              {(focus?.doNow || []).map((item: any, idx: number) => (
                <li key={`now-${idx}`}>DO NOW — {item.title}: {item.reason}</li>
              ))}
              {(focus?.watch || []).map((item: any, idx: number) => (
                <li key={`watch-${idx}`}>WATCH — {item.title}</li>
              ))}
              {(focus?.research || []).map((item: any, idx: number) => (
                <li key={`res-${idx}`}>RESEARCH — {item.title}</li>
              ))}
              {!focus && <li className="text-[#8A8472]">Focus UNAVAILABLE.</li>}
            </ul>
          </article>
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
            <h2 className="text-sm font-semibold text-[#F3E5AB]">Morning brief</h2>
            <p className="mt-2 text-xs text-[#A6A08D]">Quality: {brief?.quality || 'UNAVAILABLE'}</p>
            <p className="mt-1 text-xs">Overnight event types: {(brief?.overnightChanges || []).join(', ') || 'none recorded'}</p>
            <p className="mt-1 text-xs">Unavailable KPIs: {(brief?.unavailableKpis || []).join(', ') || 'n/a'}</p>
          </article>
        </section>
      )}

      {(section === 'companies' || section === 'workqora' || section === 'marketmind' || section === 'overview') && (
        <section className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4" aria-labelledby="workqora-card">
            <div className="flex items-center justify-between">
              <h2 id="workqora-card" className="text-sm font-semibold text-[#F3E5AB]">Workqora</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${colorClass(workqoraHealth?.color)}`}>
                {workqoraHealth?.color || 'UNKNOWN'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#D8D4C7]">
              <dt>Production SHA</dt>
              <dd className="font-mono">{workqoraHealth?.productionSha || workqora?.productionSha || 'UNAVAILABLE'}</dd>
              <dt>Database</dt>
              <dd>{workqoraHealth?.databaseStatus || 'UNAVAILABLE'}</dd>
              <dt>Classification</dt>
              <dd>{workqoraHealth?.classification || workqora?.classification || 'UNKNOWN'}</dd>
              <dt>Degradation</dt>
              <dd>{(workqoraHealth?.dependencyDegradation || []).join(', ') || 'none observed'}</dd>
            </dl>
            <p className="mt-2 text-[11px] text-[#8A8472]">No fake percentages. Tenant records are not shown.</p>
          </article>
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4" aria-labelledby="mm-card">
            <div className="flex items-center justify-between">
              <h2 id="mm-card" className="text-sm font-semibold text-[#F3E5AB]">MarketMind AI</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${colorClass(marketmindHealth?.color)}`}>
                {marketmindHealth?.color || 'UNKNOWN'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#D8D4C7]">
              <dt>Health URL</dt>
              <dd className="truncate">{marketmind?.healthUrl || 'UNAVAILABLE'}</dd>
              <dt>Feed</dt>
              <dd>{marketmindHealth?.realtimeFeedStatus || 'UNAVAILABLE'}</dd>
              <dt>Probe</dt>
              <dd>{marketmindHealth?.probe?.error || marketmindHealth?.probe?.bodyKind || 'UNAVAILABLE'}</dd>
              <dt>Live trading</dt>
              <dd>false</dd>
            </dl>
          </article>
        </section>
      )}

      {section === 'ai' && (
        <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F3E5AB]">Corporate AI committee</h2>
          <label className="block text-xs text-[#A6A08D]">
            Question
            <textarea
              className="mt-1 w-full rounded-xl border border-[#D4AF37]/20 bg-[#090A0F] p-2 text-sm text-[#E8E6DF]"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#0B0C10]"
            onClick={async () => {
              const response = await fetchApi<any>('/api/corporate/ai/committee', {
                method: 'POST',
                body: JSON.stringify({ question }),
              });
              setCommittee(response);
            }}
          >
            Ask committee
          </button>
          {committee && (
            <div className="space-y-2 text-xs">
              <p>Status: {committee.status} · confidence {committee.confidence}</p>
              <p>{committee.summary}</p>
              <p>Agents: {(committee.agentsConsulted || []).join(', ')}</p>
              <p>Evidence: {(committee.supportingEvidence || []).length}</p>
            </div>
          )}
        </section>
      )}

      {section === 'spider-web' && (
        <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F3E5AB]">Corporate Spider Web</h2>
          <p className="text-xs text-[#A6A08D]">High-confidence edges require evidence. Product-specific graphs stay in Workqora / MarketMind.</p>
          <button
            type="button"
            className="rounded-xl border border-[#D4AF37]/40 px-3 py-1.5 text-xs"
            onClick={async () => setImpact(await fetchApi('/api/corporate/spider-web/impact/product:WORKQORA'))}
          >
            Impact if Workqora fails
          </button>
          <pre className="max-h-80 overflow-auto rounded-xl bg-black/40 p-3 text-[10px] text-[#D8D4C7]">
            {JSON.stringify(impact || graph, null, 2)}
          </pre>
        </section>
      )}

      {section === 'automation' && (
        <section className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
            <h2 className="text-sm font-semibold text-[#F3E5AB]">Policy</h2>
            <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-[11px]">
              {policies.map((p: any) => (
                <li key={p.actionType}>{p.actionType} · {p.actionClass}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
            <h2 className="text-sm font-semibold text-[#F3E5AB]">Runs</h2>
            <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-[11px]">
              {runs.length === 0 && <li>No runs yet.</li>}
              {runs.map((r: any) => (
                <li key={r.runId}>{r.status} {r.actionType} — {r.result}</li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {section === 'analytics' && (
        <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F3E5AB]">Deterministic analytics</h2>
          <p className="text-xs text-[#A6A08D]">AI may explain charts. Calculations stay deterministic.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kpiCards.map((kpi: any) => (
              <div key={kpi.metricId} className="rounded-xl border border-[#D4AF37]/15 p-3 text-[11px]">
                <div className="font-mono text-[#D4AF37]">{kpi.metricId}</div>
                <div className="mt-1">{kpi.value === null ? 'UNAVAILABLE' : String(kpi.value)}</div>
                <div className="text-[#8A8472]">{kpi.quality}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="rounded-xl border border-[#D4AF37]/40 px-3 py-1.5 text-xs"
            onClick={async () => {
              const points = [
                { t: 't1', v: 1 },
                { t: 't2', v: 2 },
                { t: 't3', v: 2 },
                { t: 't4', v: 3 },
                { t: 't5', v: 8 },
                { t: 't6', v: 3 },
                { t: 't7', v: 4 },
                { t: 't8', v: 4 },
              ];
              setAnalyticsOut(await fetchApi('/api/corporate/analytics/compute', {
                method: 'POST',
                body: JSON.stringify({ metricId: 'demo_series', definition: 'Operator-supplied series', source: 'manual', points }),
              }));
            }}
          >
            Compute sample series
          </button>
          {analyticsOut && <pre className="max-h-64 overflow-auto text-[10px]">{JSON.stringify(analyticsOut, null, 2)}</pre>}
        </section>
      )}

      {section === 'research' && (
        <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
          <h2 className="text-sm font-semibold text-[#F3E5AB]">Research center</h2>
          <p className="text-xs text-[#A6A08D]">Jobs without retrieval stay INSUFFICIENT_EVIDENCE.</p>
          <ul className="mt-2 space-y-2 text-xs">
            {jobs.length === 0 && <li>No research jobs stored.</li>}
            {jobs.map((job: any) => (
              <li key={job.researchId}>{job.status}: {job.question}</li>
            ))}
          </ul>
        </section>
      )}

      {(section === 'alerts' || section === 'incidents') && (
        <section className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
            <h2 className="text-sm font-semibold text-[#F3E5AB]">Alerts</h2>
            <ul className="mt-2 max-h-72 space-y-2 overflow-auto text-xs">
              {alerts.length === 0 && <li>No corporate alerts.</li>}
              {alerts.map((alert: any) => (
                <li key={alert.alertId}>{alert.priority} {alert.status} — {alert.title}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
            <h2 className="text-sm font-semibold text-[#F3E5AB]">Incidents</h2>
            <ul className="mt-2 max-h-72 space-y-2 overflow-auto text-xs">
              {incidents.length === 0 && <li>No incidents opened from alerts.</li>}
              {incidents.map((inc: any) => (
                <li key={inc.incidentId}>{inc.severity} {inc.status} — {inc.title}</li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {section === 'system' && twin && (
        <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#0F1117] p-4">
          <h2 className="text-sm font-semibold text-[#F3E5AB]">Digital twin domains</h2>
          <ul className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
            {twin.domains?.map((d: any) => (
              <li key={d.name} className="rounded-xl border border-[#D4AF37]/15 p-2">
                <span className="font-mono text-[#D4AF37]">{d.status}</span> {d.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
