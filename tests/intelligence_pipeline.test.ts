import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestFile, applyReview } from '../server/intelligence/fileIntakeService';
import { intelligenceStore } from '../server/intelligence/store/intelligenceStore';
import { operationalEventBus } from '../server/intelligence/events/eventBus';
import { IngestionError, type TenantContext } from '../server/intelligence/ingestion/ingestionContracts';

const ROSTER = [
  'Update First Last Employee ID Position Hire Date Phone Number Email',
  'Anthony Means BS7159750 Sushi Prep 8/13/2026 (804)952-2322 meansa353@gmail.com',
  'Bo Harris BS7159746 Dishwasher 8/13/2026 (804)869-7231 bo@gmail.com',
  'Isaiah Ford Pending Dishwasher 8/27/2026 (904) 408-2843 isaiah@gmail.com',
].join('\n');

const tenantA: TenantContext = { organizationId: 'org_a', locationId: 'loc_1', actorUserId: 'admin-a', actorKind: 'user' };
const tenantB: TenantContext = { organizationId: 'org_b', locationId: 'loc_1', actorUserId: 'admin-b', actorKind: 'user' };

function rosterBytes(): Uint8Array {
  return new TextEncoder().encode(ROSTER);
}

test('pipeline: ingest txt roster classifies + extracts candidates', async () => {
  intelligenceStore.reset();
  const outcome = await ingestFile({
    tenant: tenantA,
    source: 'file_upload',
    originalFilename: 'roster.txt',
    declaredMimeType: 'text/plain',
    bytes: rosterBytes(),
    ingestionPurpose: 'employee_import',
  });
  assert.equal(outcome.classification?.category, 'employee_record');
  assert.equal(outcome.rosterRows.length, 3);
  assert.ok(outcome.events.includes('document.uploaded'));
  assert.ok(outcome.events.includes('document.classified'));
  assert.equal(outcome.reviewRequired, true);
  // Nothing persisted to canonical employees before review.
  assert.equal(intelligenceStore.listEmployees(tenantA).length, 0);
});

test('pipeline: duplicate upload is de-duplicated, not re-processed', async () => {
  intelligenceStore.reset();
  const first = await ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'roster.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'employee_import' });
  const second = await ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'roster.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'employee_import' });
  assert.equal(first.deduplicated, false);
  assert.equal(second.deduplicated, true);
  assert.equal(first.document.documentId, second.document.documentId);
});

test('pipeline: approve review creates canonical employees + emits events', async () => {
  intelligenceStore.reset();
  const seen: string[] = [];
  const off = operationalEventBus.on('employee.imported', () => seen.push('imported'));
  const outcome = await ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'roster.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'employee_import' });
  const review = applyReview({ tenant: tenantA, documentId: outcome.document.documentId, decision: 'approve_all_safe' });
  off();
  assert.equal(review.created, 3);
  assert.equal(review.reviewStatus, 'approved');
  assert.equal(intelligenceStore.listEmployees(tenantA).length, 3);
  assert.equal(seen.length, 3);
});

test('pipeline: re-ingest resolves existing employees by external id', async () => {
  intelligenceStore.reset();
  const first = await ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'roster.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'p1' });
  applyReview({ tenant: tenantA, documentId: first.document.documentId, decision: 'approve_all_safe' });

  const second = await ingestFile({ tenant: tenantA, source: 'api', originalFilename: 'roster2.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'p2' });
  const resolved = second.rosterRows.filter((r) => r.resolution.status === 'resolved');
  // The two rows carrying BS external ids resolve; the "Pending" row does not.
  assert.equal(resolved.length, 2);
});

test('security/tenant: ingest of another tenant document is denied on review', async () => {
  intelligenceStore.reset();
  const outcome = await ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'roster.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'employee_import' });
  assert.throws(
    () => applyReview({ tenant: tenantB, documentId: outcome.document.documentId, decision: 'approve_all_safe' }),
    (e: unknown) => e instanceof IngestionError && e.code === 'TENANT_ACCESS_DENIED',
  );
});

test('security/tenant: employees and events never leak across tenants', async () => {
  intelligenceStore.reset();
  const outcome = await ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'roster.txt', declaredMimeType: 'text/plain', bytes: rosterBytes(), ingestionPurpose: 'employee_import' });
  applyReview({ tenant: tenantA, documentId: outcome.document.documentId, decision: 'approve_all_safe' });
  assert.equal(intelligenceStore.listEmployees(tenantB).length, 0);
  assert.equal(operationalEventBus.recent({ organizationId: 'org_b' }).length, 0);
  assert.ok(operationalEventBus.recent({ organizationId: 'org_a' }).length > 0);
});

test('errors: unsupported file throws explicit typed error', async () => {
  intelligenceStore.reset();
  await assert.rejects(
    () =>
      ingestFile({ tenant: tenantA, source: 'file_upload', originalFilename: 'x.exe', declaredMimeType: 'application/octet-stream', bytes: new Uint8Array([1, 2, 3, 4]), ingestionPurpose: 'employee_import' }),
    (e: unknown) => e instanceof IngestionError && e.code === 'UNSUPPORTED_FILE',
  );
});
