import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDocument } from '../server/intelligence/classification/documentClassifier';
import { extractEmployeeRoster } from '../server/intelligence/normalization/employeeRosterAdapter';

const ROSTER_TEXT = [
  'Update First Last Employee ID Position Hire Date Phone Number Email Payroll',
  'Anthony Means BS7159750 Sushi Prep 8/13/2026 x x x Yes (804)952-2322 meansa353@gmail.com Yes',
  'Isaiah Ford Pending Dishwasher 8/27/2026 x x x Yes (904) 408-2843 isaiah60nlt@gmail.com',
  'Zaria "Alex" spohn BS7159917 Sushi Prep 8/21/2026 x x x Yes (703) 309-4022 spohnzaria@gmail.com',
].join('\n');

test('classifier detects employee_record from roster headers', () => {
  const r = classifyDocument(ROSTER_TEXT);
  assert.equal(r.category, 'employee_record');
  assert.ok(r.confidence >= 0.5);
});

test('classifier detects invoice and unknown', () => {
  assert.equal(
    classifyDocument('INVOICE #123 Bill To: Acme Subtotal $10 Amount Due $12 Vendor: Sysco').category,
    'invoice',
  );
  assert.equal(classifyDocument('the quick brown fox jumps').category, 'unknown');
});

test('roster adapter extracts canonical employee fields', () => {
  const { candidates } = extractEmployeeRoster(ROSTER_TEXT);
  assert.equal(candidates.length, 3);

  const anthony = candidates[0];
  assert.equal(anthony.fullName, 'Anthony Means');
  assert.equal(anthony.employeeExternalId, 'BS7159750');
  assert.equal(anthony.position, 'Sushi Prep');
  assert.equal(anthony.hireDate, '2026-08-13');
  assert.equal(anthony.email, 'meansa353@gmail.com');
  assert.equal(anthony.status, 'active');
  assert.match(anthony.phone ?? '', /804/);

  const isaiah = candidates[1];
  assert.equal(isaiah.status, 'pending');
  assert.equal(isaiah.employeeExternalId, undefined);
  assert.equal(isaiah.fullName, 'Isaiah Ford');
});

test('roster adapter strips quoted nicknames from names', () => {
  const { candidates } = extractEmployeeRoster(ROSTER_TEXT);
  const zaria = candidates[2];
  assert.equal(zaria.employeeExternalId, 'BS7159917');
  assert.equal(zaria.fullName, 'Zaria spohn');
});
