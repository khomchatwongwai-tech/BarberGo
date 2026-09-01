import { listEvents } from './eventBus';
import { getLastHealth } from './healthEngine';
import { snapshotKpis } from './kpis';
import { corporateStore, newId, writeAudit } from './store';
import type { CommitteeResponse, CorporateAlert, CorporateDigitalTwin, CorporateIncident, ResearchJob } from './types';

export function buildDigitalTwin(): CorporateDigitalTwin {
  const health = getLastHealth();
  const kpis = snapshotKpis();
  const unavailable = (name: string, notes: string[]): CorporateDigitalTwin['domains'][number] => ({
    name,
    status: 'UNAVAILABLE',
    notes,
    evidenceIds: [],
  });
  const domains = [
    {
      name: 'product_health',
      status: health ? (health.quality === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'PARTIAL') : 'UNAVAILABLE',
      notes: health ? [`overall=${health.overall}`] : ['No health snapshot yet.'],
      evidenceIds: health ? ['corporate_health'] : [],
    },
    {
      name: 'active_incidents',
      status: 'PARTIAL',
      notes: [`open=${Array.from(corporateStore().incidents.values()).filter((i) => i.status !== 'RESOLVED').length}`],
      evidenceIds: ['corporate_incidents'],
    },
    unavailable('customer_health', ['Requires authorized Workqora aggregates.']),
    unavailable('operational_health', ['Requires Workqora operational connector.']),
    {
      name: 'automation_health',
      status: 'PARTIAL',
      notes: [`runs=${corporateStore().automationRuns.length}`],
      evidenceIds: ['corporate_automations'],
    },
    unavailable('market_environment', ['MarketMind realtime URL is not certified on this host.']),
    {
      name: 'technology_health',
      status: health?.products.some((p) => p.color === 'RED' || p.color === 'YELLOW') ? 'PARTIAL' : 'UNAVAILABLE',
      notes: health?.products.map((p) => `${p.productId}:${p.color}`) || [],
      evidenceIds: health ? ['corporate_health'] : [],
    },
    {
      name: 'ai_health',
      status: process.env.GEMINI_API_KEY ? 'PARTIAL' : 'UNAVAILABLE',
      notes: [process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY is configured (key not logged).' : 'GEMINI_API_KEY is not set.'],
      evidenceIds: ['env:GEMINI_API_KEY_present'],
    },
    unavailable('security_health', ['No independent security scan attached to this snapshot.']),
    {
      name: 'data_quality',
      status: 'PARTIAL',
      notes: kpis.filter((k) => k.quality === 'UNAVAILABLE').map((k) => k.metricId),
      evidenceIds: ['corporate_kpis'],
    },
    unavailable('financial_context', ['Legacy overview metrics are SIMULATED and are not copied here.']),
    unavailable('strategic_initiatives', ['No certified initiative feed.']),
  ] as CorporateDigitalTwin['domains'];

  return { generatedAt: new Date().toISOString(), domains };
}

export function morningBrief() {
  const health = getLastHealth();
  const events = listEvents();
  return {
    generatedAt: new Date().toISOString(),
    overnightChanges: events.filter((event) => Date.now() - Date.parse(event.receivedAt) < 12 * 60 * 60 * 1000).map((e) => e.eventType),
    productHealth: health,
    criticalIncidents: Array.from(corporateStore().incidents.values()).filter((i) => i.severity === 'P0' && i.status !== 'RESOLVED'),
    businessKpis: snapshotKpis().filter((k) => k.quality !== 'UNAVAILABLE'),
    unavailableKpis: snapshotKpis().filter((k) => k.quality === 'UNAVAILABLE').map((k) => k.metricId),
    workqoraSignals: events.filter((e) => e.productId === 'WORKQORA').slice(0, 20),
    marketMindRegime: events.find((e) => e.eventType === 'market.regime') || { quality: 'UNAVAILABLE', value: null },
    aiProviderHealth: process.env.GEMINI_API_KEY ? 'configured' : 'unavailable',
    automationFailures: corporateStore().automationRuns.filter((r) => r.status === 'FAILED'),
    securityWarnings: [],
    researchUpdates: Array.from(corporateStore().researchJobs.values()).slice(0, 10),
    priorityDecisions: ceoFocus().doNow,
    quality: health?.quality || 'UNAVAILABLE',
  };
}

export function ceoFocus() {
  const health = getLastHealth();
  const items = [];
  if (health?.overall === 'RED' || health?.overall === 'BLOCKED') {
    items.push({ rank: 'DO NOW', title: 'Restore product health', reason: `overall=${health.overall}`, confidence: 0.7 });
  }
  const workqora = health?.products.find((p) => p.productId === 'WORKQORA');
  if (workqora?.dependencyDegradation.length) {
    items.push({ rank: 'DO NOW', title: 'Workqora degradation', reason: workqora.dependencyDegradation.join(', '), confidence: 0.65 });
  }
  const mm = health?.products.find((p) => p.productId === 'MARKETMIND_AI');
  if (!mm?.probe?.ok) {
    items.push({ rank: 'RESEARCH', title: 'Certify MarketMind health URL', reason: 'No JSON health probe', confidence: 0.5 });
  }
  items.push({ rank: 'WATCH', title: 'Keep mutation gates closed', reason: 'WORKQORA_AUTONOMOUS_MUTATION and MARKETMIND_LIVE_TRADING_ENABLED remain false', confidence: 1 });
  if (items.length === 1) {
    items.unshift({ rank: 'RESEARCH', title: 'Connect live product health', reason: 'Insufficient evidence for a ranked operating picture', confidence: 0.2 });
  }
  return {
    doNow: items.filter((i) => i.rank === 'DO NOW'),
    watch: items.filter((i) => i.rank === 'WATCH'),
    delegate: items.filter((i) => i.rank === 'DELEGATE'),
    research: items.filter((i) => i.rank === 'RESEARCH'),
    ignore: items.filter((i) => i.rank === 'IGNORE'),
  };
}

export function upsertAlert(input: Omit<CorporateAlert, 'alertId' | 'createdAt'> & { alertId?: string }): CorporateAlert {
  const existing = Array.from(corporateStore().alerts.values()).find((a) => a.fingerprint === input.fingerprint && a.status !== 'RESOLVED');
  if (existing) return existing;
  const alert: CorporateAlert = {
    ...input,
    alertId: input.alertId || newId('alert'),
    createdAt: new Date().toISOString(),
  };
  corporateStore().alerts.set(alert.alertId, alert);
  writeAudit('system', 'ALERT_CREATED', alert.alertId, alert.title);
  return alert;
}

export function alertsToIncidents(): CorporateIncident[] {
  const open = Array.from(corporateStore().alerts.values()).filter((a) => a.status === 'OPEN' && (a.priority === 'P0' || a.priority === 'P1'));
  if (open.length === 0) return Array.from(corporateStore().incidents.values());
  const incident: CorporateIncident = {
    incidentId: newId('inc'),
    severity: open.some((a) => a.priority === 'P0') ? 'P0' : 'P1',
    title: `Related alerts (${open.length})`,
    summary: open.map((a) => a.title).join('; '),
    productsAffected: [...new Set(open.map((a) => a.productId).filter(Boolean))] as string[],
    systemsAffected: open.map((a) => a.category),
    customersAffected: 'UNKNOWN',
    startedAt: open[open.length - 1].createdAt,
    detectedAt: new Date().toISOString(),
    status: 'OPEN',
    rootCause: null,
    evidence: open.map((a) => a.alertId),
    timeline: open.map((a) => ({ at: a.createdAt, note: a.title })),
    actions: [],
    owner: null,
    resolution: null,
  };
  corporateStore().incidents.set(incident.incidentId, incident);
  return Array.from(corporateStore().incidents.values());
}

export function createResearchJob(question: string): ResearchJob {
  const job: ResearchJob = {
    researchId: newId('research'),
    question,
    status: 'INSUFFICIENT_EVIDENCE',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    claims: [{
      claimId: newId('claim'),
      statement: 'No trusted retrieval was executed for this question in this runtime.',
      confidence: 0,
      timestamp: new Date().toISOString(),
      evidenceIds: [],
      counterEvidenceIds: [],
      status: 'INSUFFICIENT_EVIDENCE',
    }],
    sources: [],
  };
  corporateStore().researchJobs.set(job.researchId, job);
  return job;
}

export function runCommittee(question: string): CommitteeResponse {
  const health = getLastHealth();
  const events = listEvents();
  const q = question.toLowerCase();
  const agents: string[] = ['Verification Agent'];
  if (q.includes('workqora') || q.includes('workforce') || q.includes('schedule') || q.includes('customer')) agents.push('Operations Agent', 'Workforce Agent', 'Customer Agent');
  if (q.includes('market') || q.includes('spy') || q.includes('marketmind')) agents.push('Market Intelligence Agent');
  if (q.includes('risk')) agents.push('Risk Agent');
  if (q.includes('research') || q.includes('competitor')) agents.push('Research Agent');
  if (q.includes('automat')) agents.push('Automation Agent');
  if (agents.length === 1) agents.push('CEO Agent', 'Product Agent', 'Technology Agent');

  const evidence = health
    ? [{
        evidenceId: 'health-latest',
        source: 'corporate_health_engine',
        url: null,
        retrievedAt: health.generatedAt,
        publishedAt: health.generatedAt,
        authorityScore: 0.7,
        freshness: health.quality,
        claimIds: [],
        excerpt: `overall=${health.overall}; products=${health.products.map((p) => `${p.productId}:${p.color}`).join(',')}`,
      }]
    : [];

  const insufficient = evidence.length === 0 && events.length === 0;
  const response: CommitteeResponse = {
    summary: insufficient
      ? 'Insufficient evidence. Connect product health and event bridges before an executive conclusion.'
      : `Observed corporate health is ${health?.overall || 'UNKNOWN'} from ${evidence.length} health snapshot(s) and ${events.length} ingested event(s).`,
    decisionContext: question,
    supportingEvidence: evidence,
    counterEvidence: [],
    risks: health?.products.filter((p) => p.color !== 'GREEN').map((p) => `${p.productId} is ${p.color}`) || ['Health is unknown.'],
    opportunities: [],
    confidence: insufficient ? 0 : Math.min(0.6, 0.2 + evidence.length * 0.2),
    recommendedActions: insufficient ? ['Refresh /api/corporate/health', 'Configure MARKETMIND_HEALTH_URL if MarketMind JSON health exists'] : ['Review degraded products', 'Keep mutation gates closed'],
    actionsRequiringApproval: ['customer_communication', 'workqora_operational_mutation', 'broker_trade'],
    sources: evidence.map((e) => e.source),
    dataFreshness: health?.quality || 'UNAVAILABLE',
    agentsConsulted: agents,
    status: insufficient ? 'INSUFFICIENT_EVIDENCE' : 'ANSWERED',
  };
  corporateStore().analyses.unshift(response);
  return response;
}

export function unifiedSearch(query: string) {
  const q = query.toLowerCase();
  const products = Array.from(corporateStore().products.values()).filter((p) => p.name.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
  const incidents = Array.from(corporateStore().incidents.values()).filter((i) => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q));
  const alerts = Array.from(corporateStore().alerts.values()).filter((a) => a.title.toLowerCase().includes(q));
  const research = Array.from(corporateStore().researchJobs.values()).filter((r) => r.question.toLowerCase().includes(q));
  const nodes = Array.from(corporateStore().nodes.values()).filter((n) => n.label.toLowerCase().includes(q) || n.nodeId.toLowerCase().includes(q));
  return { query, products, incidents, alerts, research, nodes, kpis: snapshotKpis().filter((k) => k.metricId.includes(q.replace(/\s+/g, '_'))) };
}
