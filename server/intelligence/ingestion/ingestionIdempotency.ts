/**
 * Pure idempotency helpers.
 *
 * Idempotency key = SHA-256(bytes) + tenant + ingestion purpose. Uploading the
 * exact same document twice under the same purpose must not create duplicate
 * business records without explicit user intent. Document identity, processing
 * attempt, and business mutation are kept separate (see the mission, §19).
 */

import { createHash } from 'node:crypto';
import type { TenantContext } from './ingestionContracts';

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export interface IdempotencyInput {
  sha256: string;
  organizationId: string;
  locationId?: string;
  /** Logical purpose, e.g. 'employee_import' or 'schedule_import'. */
  ingestionPurpose?: string;
}

/**
 * Derive a stable idempotency key. The same bytes, tenant, and purpose always
 * produce the same key; a different location or purpose produces a different
 * key so the same file can be legitimately imported for two locations.
 */
export function idempotencyKey(input: IdempotencyInput): string {
  const scope = [
    input.organizationId,
    input.locationId ?? '_org',
    input.ingestionPurpose ?? 'default',
    input.sha256,
  ].join(':');
  return createHash('sha256').update(scope).digest('hex');
}

export function idempotencyKeyForTenant(
  tenant: Pick<TenantContext, 'organizationId' | 'locationId'>,
  sha256: string,
  ingestionPurpose?: string,
): string {
  return idempotencyKey({
    sha256,
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    ingestionPurpose,
  });
}
