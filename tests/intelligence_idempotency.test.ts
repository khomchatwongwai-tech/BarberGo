import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex, idempotencyKey } from '../server/intelligence/ingestion/ingestionIdempotency';

const bytes = new TextEncoder().encode('hello workqora');

test('sha256Hex is deterministic', () => {
  assert.equal(sha256Hex(bytes), sha256Hex(new TextEncoder().encode('hello workqora')));
  assert.notEqual(sha256Hex(bytes), sha256Hex(new TextEncoder().encode('other')));
});

test('idempotency key is stable for same tenant + purpose', () => {
  const sha = sha256Hex(bytes);
  const k1 = idempotencyKey({ sha256: sha, organizationId: 'org_a', locationId: 'loc_1', ingestionPurpose: 'employee_import' });
  const k2 = idempotencyKey({ sha256: sha, organizationId: 'org_a', locationId: 'loc_1', ingestionPurpose: 'employee_import' });
  assert.equal(k1, k2);
});

test('idempotency key varies by tenant, location and purpose', () => {
  const sha = sha256Hex(bytes);
  const base = { sha256: sha, organizationId: 'org_a', locationId: 'loc_1', ingestionPurpose: 'employee_import' };
  assert.notEqual(idempotencyKey(base), idempotencyKey({ ...base, organizationId: 'org_b' }));
  assert.notEqual(idempotencyKey(base), idempotencyKey({ ...base, locationId: 'loc_2' }));
  assert.notEqual(idempotencyKey(base), idempotencyKey({ ...base, ingestionPurpose: 'schedule_import' }));
});
