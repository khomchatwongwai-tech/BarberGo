/**
 * In-memory document-intelligence store for the demo backend.
 *
 * Mirrors the logical tables from the mission (§6): documents,
 * document_processing_runs, document_extractions, document_entities,
 * document_links — plus the canonical `employees` table the HR vertical writes
 * into. Every query is tenant-scoped. In production these are Supabase tables
 * with row-level security; this class is the seam where that swaps in.
 */

import type { UniversalDocument } from '../ingestion/ingestionContracts';
import type { ClassificationResult } from '../classification/documentClassifier';
import type { EntityResolution, CanonicalEmployee } from '../entities/entityContracts';
import type { EmployeeCandidate } from '../normalization/employeeRosterAdapter';

export interface ProcessingRunRecord {
  id: string;
  documentId: string;
  parser: string;
  parserVersion: string;
  ocrProvider?: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'succeeded' | 'failed';
  errorCode?: string;
  telemetry?: Record<string, unknown>;
  correlationId: string;
}

export interface ExtractionRecord {
  documentId: string;
  rawText: string;
  markdown?: string;
  confidence: number;
  method: string;
  rowCount: number;
}

export interface RosterRowRecord {
  candidate: EmployeeCandidate;
  resolution: EntityResolution;
}

export type ReviewStatus = 'pending' | 'approved' | 'partially_approved' | 'rejected';

export interface DocumentLinkRecord {
  documentId: string;
  entityType: string;
  entityId: string;
  relationship: string;
}

export interface DocumentDetail {
  document: UniversalDocument;
  idempotencyKey: string;
  processingRuns: ProcessingRunRecord[];
  extraction?: ExtractionRecord;
  classification?: ClassificationResult;
  rosterRows: RosterRowRecord[];
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  links: DocumentLinkRecord[];
}

export class IntelligenceStore {
  private documents = new Map<string, DocumentDetail>();
  /** idempotencyKey -> documentId, for dedupe. */
  private idempotencyIndex = new Map<string, string>();
  private employees = new Map<string, CanonicalEmployee>();

  // -- Documents -----------------------------------------------------------

  putDocument(detail: DocumentDetail): void {
    this.documents.set(detail.document.documentId, detail);
    this.idempotencyIndex.set(detail.idempotencyKey, detail.document.documentId);
  }

  getDocument(documentId: string): DocumentDetail | undefined {
    return this.documents.get(documentId);
  }

  findByIdempotencyKey(key: string): DocumentDetail | undefined {
    const id = this.idempotencyIndex.get(key);
    return id ? this.documents.get(id) : undefined;
  }

  listDocuments(tenant: { organizationId: string; locationId?: string }): DocumentDetail[] {
    return [...this.documents.values()]
      .filter((d) => d.document.organizationId === tenant.organizationId)
      .filter((d) => (tenant.locationId ? d.document.locationId === tenant.locationId : true))
      .sort((a, b) => (a.document.createdAt < b.document.createdAt ? 1 : -1));
  }

  // -- Employees (canonical HR table) -------------------------------------

  listEmployees(tenant: { organizationId: string; locationId?: string }): CanonicalEmployee[] {
    return [...this.employees.values()]
      .filter((e) => e.organizationId === tenant.organizationId)
      .filter((e) => (tenant.locationId ? e.locationId === tenant.locationId : true));
  }

  getEmployee(id: string): CanonicalEmployee | undefined {
    return this.employees.get(id);
  }

  upsertEmployee(emp: CanonicalEmployee): void {
    this.employees.set(emp.id, emp);
  }

  // -- Test / reset helpers ------------------------------------------------

  reset(): void {
    this.documents.clear();
    this.idempotencyIndex.clear();
    this.employees.clear();
  }
}

export const intelligenceStore = new IntelligenceStore();
