import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeFilename,
  validateUpload,
  redactForLog,
  DEFAULT_MAX_FILE_BYTES,
} from '../server/intelligence/ingestion/ingestionSecurity';
import { IngestionError } from '../server/intelligence/ingestion/ingestionContracts';

test('safeFilename strips path traversal and unsafe chars', () => {
  assert.equal(safeFilename('../../etc/passwd'), 'passwd');
  assert.equal(safeFilename('My Report (final).pdf'), 'My_Report_final_.pdf');
  assert.equal(safeFilename('..\\..\\win.ini'), 'win.ini');
});

test('validateUpload rejects unsupported extension with explicit code', () => {
  try {
    validateUpload({ filename: 'malware.exe', bytes: new Uint8Array([1, 2, 3, 4]) });
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof IngestionError);
    assert.equal((err as IngestionError).code, 'UNSUPPORTED_FILE');
  }
});

test('validateUpload rejects empty and oversized files', () => {
  assert.throws(
    () => validateUpload({ filename: 'a.pdf', bytes: new Uint8Array([]) }),
    (e: unknown) => e instanceof IngestionError && e.code === 'MALFORMED_DOCUMENT',
  );
  assert.throws(
    () => validateUpload({ filename: 'a.txt', bytes: new Uint8Array(DEFAULT_MAX_FILE_BYTES + 1) }),
    (e: unknown) => e instanceof IngestionError && e.code === 'FILE_TOO_LARGE',
  );
});

test('validateUpload accepts a real PDF', () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  const v = validateUpload({ filename: 'roster.pdf', declaredMime: 'application/pdf', bytes: pdf });
  assert.equal(v.format, 'pdf');
  assert.equal(v.mimeType, 'application/pdf');
});

test('redactForLog masks emails, phones and long numbers', () => {
  const out = redactForLog('John a@b.com (804) 952-2322 BS7159750');
  assert.ok(!out.includes('a@b.com'));
  assert.ok(out.includes('[email]'));
  assert.ok(out.includes('[phone]'));
});
