/**
 * In-memory document-intelligence store for the demo backend.
 *
 * Mirrors the logical tables from the mission (§6): documents,
 * document_processing_runs, document_extractions, document_entities,
 * document_links — plus the canonical `employees` table the HR vertical writes
 * into. Every query is tenant-scoped. In production these are Supabase tables
 * with row-level security; this class is the seam where that swaps in.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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

const STATE_VERSION = 1;
const DEFAULT_STATE_FILE = path.join(process.cwd(), '.workqora-storage', 'state', 'intelligence-state.json');

interface PersistedState {
  version: number;
  documents: [string, DocumentDetail][];
  idempotency: [string, string][];
  employees: [string, CanonicalEmployee][];
}

export class IntelligenceStore {
  private documents = new Map<string, DocumentDetail>();
  /** idempotencyKey -> documentId, for dedupe. */
  private idempotencyIndex = new Map<string, string>();
  private employees = new Map<string, CanonicalEmployee>();

  /**
   * Optional durable write-through persistence. Enabled unless
   * WORKQORA_PERSIST=off (tests set this). This is the seam a Supabase / Firestore
   * implementation replaces; until then, state survives server restarts on disk.
   */
  private persistEnabled: boolean;
  private stateFile: string;

  constructor(options?: { stateFile?: string; persist?: boolean }) {
    this.persistEnabled = options?.persist ?? process.env.WORKQORA_PERSIST !== 'off';
    this.stateFile = options?.stateFile ?? process.env.WORKQORA_STATE_FILE ?? DEFAULT_STATE_FILE;
    if (this.persistEnabled) this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.stateFile)) return;
      const parsed = JSON.parse(readFileSync(this.stateFile, 'utf8')) as PersistedState;
      if (!parsed || parsed.version !== STATE_VERSION) return;
      this.documents = new Map(parsed.documents ?? []);
      this.idempotencyIndex = new Map(parsed.idempotency ?? []);
      this.employees = new Map(parsed.employees ?? []);
    } catch (err) {
      console.error('[intelligence-store] failed to load persisted state:', err);
    }
  }

  private save(): void {
    if (!this.persistEnabled) return;
    try {
      const state: PersistedState = {
        version: STATE_VERSION,
        documents: [...this.documents.entries()],
        idempotency: [...this.idempotencyIndex.entries()],
        employees: [...this.employees.entries()],
      };
      mkdirSync(path.dirname(this.stateFile), { recursive: true });
      writeFileSync(this.stateFile, JSON.stringify(state), 'utf8');
    } catch (err) {
      console.error('[intelligence-store] failed to persist state:', err);
    }
  }

  // -- Documents -----------------------------------------------------------

  putDocument(detail: DocumentDetail): void {
    this.documents.set(detail.document.documentId, detail);
    this.idempotencyIndex.set(detail.idempotencyKey, detail.document.documentId);
    this.save();
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
    this.save();
  }

  // -- Test / reset helpers ------------------------------------------------

  reset(): void {
    // Tests use reset(); disable persistence so they never touch the real state
    // file, and clear in-memory state.
    this.persistEnabled = false;
    this.documents.clear();
    this.idempotencyIndex.clear();
    this.employees.clear();
  }
}

export const intelligenceStore = new IntelligenceStore();
