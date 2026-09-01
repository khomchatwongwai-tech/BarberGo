import crypto from 'crypto';
import { isProductionLike } from './env';
import { stripSensitiveFields } from './pii';
import { corporateStore, newId, writeAudit } from './store';
import type { AlertPriority, CorporateEventEnvelope, DataQuality, EventOutcome, ProductId } from './types';

const SCHEMA_VERSION = '1.0.0';
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export const WORKQORA_EVENT_TYPES = new Set([
  'schedule.published',
  'attendance.late',
  'attendance.no_show',
  'employee.call_out',
  'timeoff.requested',
  'timeoff.approved',
  'shift_swap.requested',
  'shift_swap.approved',
  'certification.expiring',
  'inventory.low',
  'inventory.stockout',
  'waste.threshold_exceeded',
  'equipment.failure',
  'equipment.maintenance_due',
  'crm.followup_due',
  'crm.risk_detected',
  'workflow.failed',
  'automation.failed',
  'scanner.failed',
  'system.degraded',
]);

export const MARKETMIND_EVENT_TYPES = new Set([
  'market.quote',
  'market.trade',
  'market.bar',
  'market.regime',
  'market.movement',
  'market.money_flow',
  'market.options_flow',
  'market.news',
  'market.earnings',
  'market.macro',
  'market.strategy',
  'market.risk',
  'market.alert',
  'market.paper_position',
  'system.provider_degraded',
]);

export function verifyCorporateHmac(secret: string | null, timestamp: string, rawBody: string, signature: string): boolean {
  if (!secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const tsMs = timestamp.length <= 10 ? ts * 1000 : ts;
  if (Math.abs(Date.now() - tsMs) > REPLAY_WINDOW_MS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function signCorporateHmac(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

function toPriority(value: unknown): AlertPriority {
  if (value === 'P0' || value === 'P1' || value === 'P2' || value === 'P3') return value;
  if (value === 'red' || value === 'critical') return 'P0';
  if (value === 'orange' || value === 'high') return 'P1';
  if (value === 'blue' || value === 'medium') return 'P2';
  return 'P3';
}

export function ingestCorporateEvent(input: {
  body: Record<string, unknown>;
  productId: ProductId;
  sourceSystem: string;
  allowedTypes?: Set<string>;
  critical?: boolean;
}): { outcome: EventOutcome; event?: CorporateEventEnvelope; reason?: string } {
  const { eventsById, dlq, processedIds } = corporateStore();
  const receivedAt = new Date().toISOString();
  const eventId = typeof input.body.eventId === 'string' && input.body.eventId ? input.body.eventId : newId('evt');
  const eventType = typeof input.body.eventType === 'string' ? input.body.eventType : '';
  const idempotencyKey = typeof input.body.idempotencyKey === 'string' ? input.body.idempotencyKey : eventId;

  if (!eventType) {
    const reason = 'MISSING_EVENT_TYPE';
    dlq.push({ dlqId: newId('dlq'), reason, receivedAt, event: input.body });
    return { outcome: 'dlq', reason };
  }

  if (input.allowedTypes && !input.allowedTypes.has(eventType)) {
    const reason = 'EVENT_TYPE_NOT_IN_ALLOWLIST';
    if (input.critical) {
      dlq.push({ dlqId: newId('dlq'), reason, receivedAt, event: input.body });
      return { outcome: 'dlq', reason };
    }
    return { outcome: 'rejected', reason };
  }

  if (processedIds.has(idempotencyKey) || eventsById.has(eventId)) {
    return { outcome: 'duplicate', event: eventsById.get(eventId) };
  }

  const sanitized = stripSensitiveFields(input.body.payload ?? input.body) as Record<string, unknown>;
  const envelope: CorporateEventEnvelope = {
    eventId,
    eventType,
    productId: input.productId,
    sourceSystem: input.sourceSystem,
    sourceEntityType: typeof input.body.sourceEntityType === 'string' ? input.body.sourceEntityType : null,
    sourceEntityId: typeof input.body.sourceEntityId === 'string' ? input.body.sourceEntityId : null,
    organizationId: typeof input.body.organizationId === 'string' ? input.body.organizationId : null,
    locationId: typeof input.body.locationId === 'string' ? input.body.locationId : null,
    correlationId: typeof input.body.correlationId === 'string' ? input.body.correlationId : newId('corr'),
    traceId: typeof input.body.traceId === 'string' ? input.body.traceId : newId('trace'),
    occurredAt: typeof input.body.occurredAt === 'string' ? input.body.occurredAt : receivedAt,
    receivedAt,
    processedAt: receivedAt,
    severity: toPriority(input.body.severity),
    quality: (typeof input.body.quality === 'string' ? input.body.quality : 'PARTIAL') as DataQuality,
    payload: sanitized,
    schemaVersion: SCHEMA_VERSION,
    idempotencyKey,
  };

  if (isProductionLike() && envelope.quality === 'LIVE' && !input.body.providerTimestamp && input.productId === 'MARKETMIND_AI') {
    envelope.quality = 'UNAVAILABLE';
  }

  eventsById.set(eventId, envelope);
  processedIds.add(idempotencyKey);
  writeAudit('system', 'EVENT_INGESTED', eventId, `${input.productId} ${eventType}`);
  return { outcome: 'ingested', event: envelope };
}

export function listEvents(): CorporateEventEnvelope[] {
  return Array.from(corporateStore().eventsById.values()).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function getEvent(eventId: string): CorporateEventEnvelope | null {
  return corporateStore().eventsById.get(eventId) || null;
}

export function listDlq(): ReturnType<typeof corporateStore>['dlq'] {
  return corporateStore().dlq;
}

export function getTrace(traceId: string) {
  const events = listEvents().filter((event) => event.traceId === traceId || event.correlationId === traceId || event.eventId === traceId);
  return {
    traceId,
    events,
    dlq: listDlq().filter((item) => JSON.stringify(item.event).includes(traceId)),
  };
}
