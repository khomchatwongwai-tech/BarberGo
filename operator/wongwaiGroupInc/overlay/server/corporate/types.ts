export type ProductId = 'WORKQORA' | 'MARKETMIND_AI' | 'WONGWAI_GROUP' | string;

export type EnvironmentName = 'production' | 'staging' | 'development' | 'unknown';

export type CertificationStatus =
  | 'UNCERTIFIED'
  | 'PARTIAL'
  | 'BLOCKED'
  | 'CERTIFIED';

export type ProductRuntimeStatus =
  | 'LIVE'
  | 'PARTIAL'
  | 'SIMULATED'
  | 'LOCAL_ONLY'
  | 'BROKEN'
  | 'UNIMPLEMENTED'
  | 'UNKNOWN';

export type HealthColor = 'GREEN' | 'YELLOW' | 'RED' | 'BLOCKED' | 'UNKNOWN';

export type DataQuality =
  | 'GOOD'
  | 'PARTIAL'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'INVALID'
  | 'LIVE'
  | 'DELAYED'
  | 'CACHED'
  | 'FALLBACK';

export type DomainCompleteness = 'COMPLETE' | 'PARTIAL' | 'STALE' | 'UNAVAILABLE';

export type AlertPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type ActionClass =
  | 'READ_ONLY'
  | 'NOTIFY'
  | 'DRAFT'
  | 'LOW_RISK_APPROVED'
  | 'HIGH_RISK_APPROVAL_REQUIRED'
  | 'PROHIBITED';

export type CorporateRole = 'OWNER' | 'EXECUTIVE' | 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface ProductCapability {
  id: string;
  sourceOfTruth: boolean;
  notes?: string;
}

export interface CorporateProduct {
  productId: ProductId;
  name: string;
  domain: string | null;
  repository: string | null;
  environment: EnvironmentName;
  productionSha: string | null;
  mainSha: string | null;
  healthUrl: string | null;
  readyUrl: string | null;
  apiBaseUrl: string | null;
  realtimeUrl: string | null;
  status: ProductRuntimeStatus;
  lastSeenAt: string | null;
  capabilities: ProductCapability[];
  dependencies: string[];
  certificationStatus: CertificationStatus;
  classification: ProductRuntimeStatus;
  notes: string[];
}

export interface UpstreamProbe {
  url: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  error: string | null;
  bodyKind: 'json' | 'html' | 'empty' | 'unknown' | 'error';
  parsed: Record<string, unknown> | null;
  checkedAt: string;
}

export interface ProductHealthSnapshot {
  productId: ProductId;
  color: HealthColor;
  availability: DataQuality;
  latencyMs: number | null;
  mainSha: string | null;
  productionSha: string | null;
  databaseStatus: string | null;
  aiStatus: string | null;
  eventPipeline: string | null;
  realtimeFeedStatus: string | null;
  lastSuccessfulHeartbeat: string | null;
  dependencyDegradation: string[];
  classification: ProductRuntimeStatus;
  notes: string[];
  probe: UpstreamProbe | null;
}

export interface CorporateHealthReport {
  generatedAt: string;
  overall: HealthColor;
  neverUnknownAsHealthy: true;
  products: ProductHealthSnapshot[];
  safety: {
    workqoraAutonomousMutation: false | true;
    marketMindLiveTradingEnabled: false | true;
  };
  quality: DataQuality;
}

export interface CorporateEventEnvelope {
  eventId: string;
  eventType: string;
  productId: ProductId;
  sourceSystem: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  organizationId: string | null;
  locationId: string | null;
  correlationId: string;
  traceId: string;
  occurredAt: string;
  receivedAt: string;
  processedAt: string | null;
  severity: AlertPriority;
  quality: DataQuality;
  payload: Record<string, unknown>;
  schemaVersion: string;
  idempotencyKey: string;
}

export type EventOutcome = 'ingested' | 'duplicate' | 'dlq' | 'rejected';

export interface SpiderNode {
  nodeId: string;
  category: string;
  label: string;
  productId?: ProductId;
  status?: HealthColor | DomainCompleteness;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface SpiderEdge {
  edgeId: string;
  fromNode: string;
  toNode: string;
  relationshipType: string;
  confidence: number;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
  source: string;
  validUntil: string | null;
}

export interface KpiRecord {
  metricId: string;
  definition: string;
  source: string;
  queryPeriod: string;
  calculationVersion: string;
  freshness: string | null;
  completeness: DomainCompleteness;
  value: number | string | null;
  quality: DataQuality;
  unit?: string;
}

export interface ClaimRecord {
  claimId: string;
  statement: string;
  confidence: number;
  timestamp: string;
  evidenceIds: string[];
  counterEvidenceIds: string[];
  status: 'SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE';
}

export interface EvidenceRecord {
  evidenceId: string;
  source: string;
  url: string | null;
  retrievedAt: string;
  publishedAt: string | null;
  authorityScore: number;
  freshness: DataQuality;
  claimIds: string[];
  excerpt: string;
}

export interface ResearchJob {
  researchId: string;
  question: string;
  status: 'ACTIVE' | 'COMPLETED' | 'INSUFFICIENT_EVIDENCE' | 'FAILED';
  createdAt: string;
  completedAt: string | null;
  claims: ClaimRecord[];
  sources: EvidenceRecord[];
}

export interface CommitteeResponse {
  summary: string;
  decisionContext: string;
  supportingEvidence: EvidenceRecord[];
  counterEvidence: EvidenceRecord[];
  risks: string[];
  opportunities: string[];
  confidence: number;
  recommendedActions: string[];
  actionsRequiringApproval: string[];
  sources: string[];
  dataFreshness: DataQuality;
  agentsConsulted: string[];
  status: 'ANSWERED' | 'INSUFFICIENT_EVIDENCE';
}

export interface AutomationActionPolicy {
  actionType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED';
  requiredRole: CorporateRole;
  requiresApproval: boolean;
  allowedEnvironment: EnvironmentName[];
  maxImpact: string;
  rollbackAvailable: boolean;
  auditRequired: boolean;
  actionClass: ActionClass;
}

export interface CorporateAlert {
  alertId: string;
  priority: AlertPriority;
  category: string;
  title: string;
  summary: string;
  productId: ProductId | null;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  fingerprint: string;
}

export interface CorporateIncident {
  incidentId: string;
  severity: AlertPriority;
  title: string;
  summary: string;
  productsAffected: ProductId[];
  systemsAffected: string[];
  customersAffected: 'UNKNOWN' | 'NONE' | 'AGGREGATE_ONLY';
  startedAt: string;
  detectedAt: string;
  status: 'OPEN' | 'MITIGATING' | 'RESOLVED';
  rootCause: string | null;
  evidence: string[];
  timeline: Array<{ at: string; note: string }>;
  actions: string[];
  owner: string | null;
  resolution: string | null;
}

export interface DigitalTwinDomain {
  name: string;
  status: DomainCompleteness;
  notes: string[];
  evidenceIds: string[];
}

export interface CorporateDigitalTwin {
  generatedAt: string;
  domains: DigitalTwinDomain[];
}
