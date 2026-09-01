/**
 * Workqora Spider-Web Operational Event Graph — canonical event envelope.
 *
 * There is exactly ONE event contract in Workqora. Every meaningful ingestion
 * and downstream outcome is published as an {@link OperationalEvent} through the
 * shared bus (see eventBus.ts). Analytics, automation, and autonomy are all
 * subscribers — none of them re-derives its own event format.
 */

import type { TenantContext } from '../ingestion/ingestionContracts';

/** Canonical, dot-namespaced event names. Extend as verticals come online. */
export const OPERATIONAL_EVENT_NAMES = [
  // Document lifecycle
  'document.uploaded',
  'document.processing_started',
  'document.extracted',
  'document.classified',
  'document.low_confidence',
  'document.failed',
  'document.duplicate',
  'document.awaiting_review',
  // Schedule vertical
  'schedule.imported',
  'schedule.conflict_detected',
  'schedule.published',
  // Employee / HR vertical
  'employee.imported',
  'employee.updated',
  'employee.review_required',
  'employee.certification_expiring',
  // Inventory vertical
  'inventory.count_imported',
  'inventory.low',
  'inventory.waste_detected',
  // Invoice / equipment verticals
  'invoice.imported',
  'equipment.issue_detected',
  'equipment.service_due',
] as const;
export type OperationalEventName = (typeof OPERATIONAL_EVENT_NAMES)[number];

/**
 * The canonical event envelope. `correlationId` ties every event produced while
 * processing a single document together, forming a traceable change-chain in
 * the knowledge graph.
 */
export interface OperationalEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  name: OperationalEventName;
  organizationId: string;
  locationId?: string;
  actorUserId?: string;
  /** The document (evidence node) this change originated from, when applicable. */
  documentId?: string;
  correlationId: string;
  occurredAt: string;
  payload: TPayload;
}

/** Convenience shape for emitting an event before ids/timestamps are assigned. */
export interface OperationalEventInput<TPayload = Record<string, unknown>> {
  name: OperationalEventName;
  tenant: Pick<TenantContext, 'organizationId' | 'locationId' | 'actorUserId'>;
  documentId?: string;
  correlationId: string;
  payload: TPayload;
}
