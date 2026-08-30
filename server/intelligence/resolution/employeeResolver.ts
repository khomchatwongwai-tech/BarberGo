/**
 * Tenant-scoped, explainable employee entity resolution. Matches extracted
 * roster candidates against existing canonical employees by external id, email,
 * phone, then name — never across tenants. Low-confidence matches are flagged
 * for human confirmation and no mutation happens here (non-destructive).
 */

import type { CanonicalEmployee, EntityResolution, ResolutionCandidate } from '../entities/entityContracts';
import type { EmployeeCandidate } from '../normalization/employeeRosterAdapter';

/** Below this confidence, a human must confirm before any write. */
export const AUTO_APPLY_THRESHOLD = 0.9;

function digits(s?: string): string {
  return (s ?? '').replace(/\D/g, '');
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function resolveEmployee(
  candidate: EmployeeCandidate,
  existing: CanonicalEmployee[],
): EntityResolution {
  const matches: ResolutionCandidate[] = [];

  for (const emp of existing) {
    const signals: ResolutionCandidate['signals'] = [];

    if (
      candidate.employeeExternalId &&
      emp.employeeExternalId &&
      candidate.employeeExternalId.toUpperCase() === emp.employeeExternalId.toUpperCase()
    ) {
      signals.push({ field: 'employee_id', matchedValue: emp.employeeExternalId, weight: 0.6 });
    }
    if (candidate.email && emp.email && candidate.email.toLowerCase() === emp.email.toLowerCase()) {
      signals.push({ field: 'email', matchedValue: emp.email, weight: 0.3 });
    }
    if (candidate.phone && emp.phone && digits(candidate.phone) === digits(emp.phone) && digits(emp.phone)) {
      signals.push({ field: 'phone', matchedValue: emp.phone, weight: 0.2 });
    }
    if (normalizeName(candidate.fullName) && normalizeName(candidate.fullName) === normalizeName(emp.fullName)) {
      signals.push({ field: 'name', matchedValue: emp.fullName, weight: 0.15 });
    }

    if (signals.length) {
      const confidence = Math.min(1, signals.reduce((s, sig) => s + sig.weight, 0));
      matches.push({
        entityType: 'employee',
        canonicalId: emp.id,
        displayName: emp.fullName,
        confidence,
        signals,
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);

  if (matches.length === 0) {
    return {
      entityType: 'employee',
      extractedValue: candidate.fullName,
      status: 'new',
      confidence: candidate.confidence,
      candidates: [],
      requiresHumanConfirmation: candidate.confidence < AUTO_APPLY_THRESHOLD,
    };
  }

  const top = matches[0];
  const second = matches[1];
  const ambiguous = Boolean(second && top.confidence - second.confidence < 0.15);

  if (ambiguous) {
    return {
      entityType: 'employee',
      extractedValue: candidate.fullName,
      status: 'ambiguous',
      confidence: top.confidence,
      candidates: matches.slice(0, 5),
      requiresHumanConfirmation: true,
    };
  }

  return {
    entityType: 'employee',
    extractedValue: candidate.fullName,
    status: top.confidence >= AUTO_APPLY_THRESHOLD ? 'resolved' : 'unresolved',
    canonicalId: top.confidence >= AUTO_APPLY_THRESHOLD ? top.canonicalId : undefined,
    confidence: top.confidence,
    candidates: matches.slice(0, 5),
    requiresHumanConfirmation: top.confidence < AUTO_APPLY_THRESHOLD,
  };
}
