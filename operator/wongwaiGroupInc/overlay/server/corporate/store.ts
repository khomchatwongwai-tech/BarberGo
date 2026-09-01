import crypto from 'crypto';
import type {
  ClaimRecord,
  CommitteeResponse,
  CorporateAlert,
  CorporateDigitalTwin,
  CorporateEventEnvelope,
  CorporateIncident,
  CorporateProduct,
  EvidenceRecord,
  KpiRecord,
  ProductHealthSnapshot,
  ResearchJob,
  SpiderEdge,
  SpiderNode,
} from './types';

export interface DlqRecord {
  dlqId: string;
  reason: string;
  receivedAt: string;
  event: Partial<CorporateEventEnvelope> | Record<string, unknown>;
}

export interface AuditRecord {
  auditId: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

export interface AutomationRun {
  runId: string;
  actionType: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'PENDING_APPROVAL';
  createdAt: string;
  result: string | null;
}

const eventsById = new Map<string, CorporateEventEnvelope>();
const dlq: DlqRecord[] = [];
const products = new Map<string, CorporateProduct>();
const healthSnapshots: ProductHealthSnapshot[] = [];
const nodes = new Map<string, SpiderNode>();
const edges = new Map<string, SpiderEdge>();
const kpis: KpiRecord[] = [];
const alerts = new Map<string, CorporateAlert>();
const incidents = new Map<string, CorporateIncident>();
const researchJobs = new Map<string, ResearchJob>();
const claims = new Map<string, ClaimRecord>();
const evidence = new Map<string, EvidenceRecord>();
const analyses: CommitteeResponse[] = [];
const automationRuns: AutomationRun[] = [];
const auditLog: AuditRecord[] = [];
const processedIds = new Set<string>();

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function corporateStore() {
  return {
    eventsById,
    dlq,
    products,
    healthSnapshots,
    nodes,
    edges,
    kpis,
    alerts,
    incidents,
    researchJobs,
    claims,
    evidence,
    analyses,
    automationRuns,
    auditLog,
    processedIds,
  };
}

export function resetCorporateStoreForTests() {
  eventsById.clear();
  dlq.length = 0;
  products.clear();
  healthSnapshots.length = 0;
  nodes.clear();
  edges.clear();
  kpis.length = 0;
  alerts.clear();
  incidents.clear();
  researchJobs.clear();
  claims.clear();
  evidence.clear();
  analyses.length = 0;
  automationRuns.length = 0;
  auditLog.length = 0;
  processedIds.clear();
}

export function writeAudit(actor: string, action: string, target: string, details: string) {
  auditLog.unshift({
    auditId: newId('audit'),
    at: new Date().toISOString(),
    actor,
    action,
    target,
    details,
  });
}
