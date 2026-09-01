/**
 * Canonical entity + resolution contracts.
 *
 * Extracted values ("John Smith", "Downtown Store", "Sysco") are resolved to
 * existing tenant-scoped Workqora records. Resolution is confidence-scored,
 * explainable, tenant-scoped, and non-destructive: low-confidence matches must
 * be confirmed by a human before any mutation.
 */

export const CANONICAL_ENTITY_TYPES = [
  'employee',
  'location',
  'equipment',
  'vendor',
  'product',
  'certification',
  'shift',
  'customer',
] as const;
export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];

export const RESOLUTION_STATUSES = [
  'resolved', // high-confidence unique match
  'ambiguous', // multiple candidates; needs human choice
  'unresolved', // no match; may create new record after review
  'new', // will be created as a new canonical record
] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

/** How a candidate was matched, for explainability in the review gate. */
export interface ResolutionSignal {
  field: 'employee_id' | 'phone' | 'email' | 'name' | 'external_id';
  matchedValue: string;
  weight: number;
}

export interface ResolutionCandidate {
  entityType: CanonicalEntityType;
  canonicalId: string;
  displayName: string;
  confidence: number;
  signals: ResolutionSignal[];
}

export interface EntityResolution {
  entityType: CanonicalEntityType;
  extractedValue: string;
  status: ResolutionStatus;
  /** Best match when status === 'resolved'. */
  canonicalId?: string;
  confidence: number;
  candidates: ResolutionCandidate[];
  /** True when confidence is below the auto-apply threshold. */
  requiresHumanConfirmation: boolean;
}

/**
 * Canonical HR employee record. No pre-existing `employees` table exists in this
 * codebase (only marketplace Users/BarberProfiles), so this is the canonical
 * table the HR/schedule/certification verticals resolve and write into. In a
 * real Workqora deployment this is a Supabase table with tenant RLS.
 */
export interface CanonicalEmployee {
  id: string;
  organizationId: string;
  locationId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  /** External/HR employee id (e.g. "BS7159750"); may be null while "Pending". */
  employeeExternalId?: string;
  position?: string;
  hireDate?: string; // ISO date
  phone?: string;
  email?: string;
  status: 'active' | 'pending' | 'inactive';
  /** Free-form credential flags captured from source docs (NHO/SH/FHC, etc.). */
  credentials?: Record<string, string>;
  sourceDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}
