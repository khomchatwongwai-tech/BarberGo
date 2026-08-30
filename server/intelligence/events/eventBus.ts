/**
 * In-memory implementation of the Workqora operational event bus.
 *
 * This demo backend uses an in-process bus + a bounded recorded-event log so
 * the spider web is observable end-to-end. In production this same contract is
 * satisfied by a durable broker (e.g. Supabase realtime / a queue). Subscribers
 * (analytics, automation, autonomy) attach with {@link OperationalEventBus.on}.
 */

import { randomUUID } from 'node:crypto';
import type {
  OperationalEvent,
  OperationalEventInput,
  OperationalEventName,
} from './eventContracts';

type Handler = (event: OperationalEvent) => void;

export class OperationalEventBus {
  private handlers = new Map<OperationalEventName | '*', Set<Handler>>();
  private readonly log: OperationalEvent[] = [];
  private readonly maxLog: number;

  constructor(options?: { maxLog?: number }) {
    this.maxLog = options?.maxLog ?? 2000;
  }

  /** Subscribe to a specific event, or '*' for all events. */
  on(name: OperationalEventName | '*', handler: Handler): () => void {
    const set = this.handlers.get(name) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(name, set);
    return () => set.delete(handler);
  }

  /** Publish an event. Assigns id + timestamp and fans out to subscribers. */
  emit(input: OperationalEventInput): OperationalEvent {
    const event: OperationalEvent = {
      eventId: `evt_${randomUUID()}`,
      name: input.name,
      organizationId: input.tenant.organizationId,
      locationId: input.tenant.locationId,
      actorUserId: input.tenant.actorUserId,
      documentId: input.documentId,
      correlationId: input.correlationId,
      occurredAt: new Date().toISOString(),
      payload: input.payload,
    };

    this.log.push(event);
    if (this.log.length > this.maxLog) this.log.splice(0, this.log.length - this.maxLog);

    for (const handler of this.handlers.get(event.name) ?? []) safeInvoke(handler, event);
    for (const handler of this.handlers.get('*') ?? []) safeInvoke(handler, event);
    return event;
  }

  /** Read recorded events, newest first, scoped to a tenant (never cross-tenant). */
  recent(filter: {
    organizationId: string;
    locationId?: string;
    documentId?: string;
    limit?: number;
  }): OperationalEvent[] {
    const out = this.log
      .filter((e) => e.organizationId === filter.organizationId)
      .filter((e) => (filter.locationId ? e.locationId === filter.locationId : true))
      .filter((e) => (filter.documentId ? e.documentId === filter.documentId : true))
      .reverse();
    return out.slice(0, filter.limit ?? 100);
  }
}

function safeInvoke(handler: Handler, event: OperationalEvent): void {
  try {
    handler(event);
  } catch (err) {
    // A misbehaving subscriber must never break emission for others.
    console.error(`[event-bus] subscriber for ${event.name} threw:`, err);
  }
}

/** Process-wide singleton bus for the demo backend. */
export const operationalEventBus = new OperationalEventBus();
