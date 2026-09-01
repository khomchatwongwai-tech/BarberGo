/**
 * Universal File Intake Service — the spider-web orchestrator.
 *
 * One pipeline for every source and format:
 *   validate → store immutable evidence → detect → route → extract (native-first,
 *   no OCR when structured text exists) → classify → normalize → resolve entities
 *   → emit canonical events → gate on human review → (on approval) persist
 *   canonical business data + emit imported/updated events.
 *
 * Tenant identity is always taken from the server-derived {@link TenantContext};
 * caller-supplied org/location in a request body is ignored by construction.
 */

import { randomUUID } from 'node:crypto';

import {
  IngestionError,
  type DocumentCategory,
  type FileIntakeRequest,
  type TenantContext,
  type UniversalDocument,
} from './ingestion/ingestionContracts';
import { detectFileType, FORMAT_TO_FAMILY } from './ingestion/fileTypeDetector';
import { planFor } from './ingestion/documentRouter';
import { validateUpload } from './ingestion/ingestionSecurity';
import { idempotencyKeyForTenant, sha256Hex } from './ingestion/ingestionIdempotency';
import { ingestionTelemetry } from './ingestion/ingestionTelemetry';
import { documentStorage } from './storage/documentStorage';
import { parsePdf } from './parsers/pdfParser';
import { parseCsv } from './parsers/csvParser';
import type { RawExtraction } from './extraction/extractionContracts';
import { classifyDocument, type ClassificationResult } from './classification/documentClassifier';
import { extractEmployeeRoster, type EmployeeCandidate } from './normalization/employeeRosterAdapter';
import { resolveEmployee, AUTO_APPLY_THRESHOLD } from './resolution/employeeResolver';
import type { CanonicalEmployee } from './entities/entityContracts';
import { operationalEventBus } from './events/eventBus';
import {
  intelligenceStore,
  type DocumentDetail,
  type ProcessingRunRecord,
  type RosterRowRecord,
} from './store/intelligenceStore';

const LOW_CONFIDENCE_THRESHOLD = 0.5;
const PARSER_VERSION = '1.0.0';

/** Categories that flow into the canonical employee roster importer. */
const EMPLOYEE_LIKE_CATEGORIES: DocumentCategory[] = ['employee_record', 'onboarding', 'schedule'];

export interface IngestionOutcome {
  document: UniversalDocument;
  deduplicated: boolean;
  idempotencyKey: string;
  classification?: ClassificationResult;
  extraction?: { method: string; confidence: number; rowCount: number; textPreview: string };
  rosterRows: RosterRowRecord[];
  reviewRequired: boolean;
  events: string[];
}

function preview(text: string, n = 600): string {
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

async function extract(family: string, bytes: Uint8Array, mimeType: string): Promise<RawExtraction> {
  const plan = planFor(family as any);
  const first = plan.steps[0];
  switch (first) {
    case 'native_pdf_text':
      return parsePdf(bytes);
    case 'native_csv':
      return parseCsv(bytes);
    case 'text_passthrough': {
      const text = new TextDecoder('utf-8').decode(bytes);
      return {
        method: 'text_passthrough',
        text,
        pages: [{ page: 1, text }],
        tables: [],
        pageCount: 1,
        confidence: 1,
        needsOcr: false,
      };
    }
    default:
      // Spreadsheet/office/image native parsers + OCR arrive in later PRs.
      throw new IngestionError(
        'NOT_IMPLEMENTED',
        `Native extraction for "${family}" (${mimeType}) is not implemented yet in this build.`,
        { details: { family, plannedSteps: plan.steps } },
      );
  }
}

/**
 * Ingest a single document end-to-end (up to the human-review gate). No canonical
 * business records are written here — that happens on {@link applyReview}.
 */
export async function ingestFile(req: FileIntakeRequest): Promise<IngestionOutcome> {
  const startedMs = Date.now();
  ingestionTelemetry.recordUpload();

  const tenant = req.tenant;
  const correlationId = req.correlationId ?? `corr_${randomUUID()}`;
  const events: string[] = [];
  const emit = (name: Parameters<typeof operationalEventBus.emit>[0]['name'], documentId: string | undefined, payload: Record<string, unknown>) => {
    operationalEventBus.emit({ name, tenant, documentId, correlationId, payload });
    events.push(name);
  };

  // 1. Security validation (explicit error codes).
  let validated;
  try {
    validated = validateUpload({
      filename: req.originalFilename,
      declaredMime: req.declaredMimeType,
      bytes: req.bytes,
    });
  } catch (err) {
    const code = err instanceof IngestionError ? err.code : 'MALFORMED_DOCUMENT';
    ingestionTelemetry.recordFailure(code);
    throw err;
  }

  // 2. Idempotency (sha256 + tenant + purpose).
  const sha256 = sha256Hex(req.bytes);
  const idKey = idempotencyKeyForTenant(tenant, sha256, req.ingestionPurpose);
  const existing = intelligenceStore.findByIdempotencyKey(idKey);
  if (existing) {
    ingestionTelemetry.recordDuplicate();
    emit('document.duplicate', existing.document.documentId, { sha256, idempotencyKey: idKey });
    return {
      document: existing.document,
      deduplicated: true,
      idempotencyKey: idKey,
      classification: existing.classification,
      extraction: existing.extraction
        ? {
            method: existing.extraction.method,
            confidence: existing.extraction.confidence,
            rowCount: existing.extraction.rowCount,
            textPreview: preview(existing.extraction.rawText),
          }
        : undefined,
      rosterRows: existing.rosterRows,
      reviewRequired: existing.reviewStatus === 'pending',
      events,
    };
  }

  // 3. Identity + immutable evidence storage.
  const documentId = `doc_${randomUUID()}`;
  const storagePath = documentStorage.buildPath({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    documentId,
    filename: validated.safeName,
  });
  await documentStorage.put(storagePath, req.bytes);

  const detected = detectFileType({
    filename: req.originalFilename,
    declaredMime: req.declaredMimeType,
    bytes: req.bytes,
  });
  const family = detected.family ?? FORMAT_TO_FAMILY[validated.format];

  const document: UniversalDocument = {
    documentId,
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    sha256,
    sizeBytes: validated.sizeBytes,
    mimeType: validated.mimeType,
    originalFilename: validated.safeName,
    storagePath,
    source: req.source,
    uploadedBy: tenant.actorUserId,
    createdAt: new Date().toISOString(),
    ingestionStatus: 'stored',
    correlationId,
  };
  emit('document.uploaded', documentId, {
    source: req.source,
    mimeType: validated.mimeType,
    sizeBytes: validated.sizeBytes,
    format: validated.format,
  });

  // 4. Processing run.
  const run: ProcessingRunRecord = {
    id: `run_${randomUUID()}`,
    documentId,
    parser: planFor(family as any).steps[0],
    parserVersion: PARSER_VERSION,
    startedAt: new Date().toISOString(),
    status: 'running',
    correlationId,
  };
  emit('document.processing_started', documentId, { parser: run.parser });

  let extraction: RawExtraction;
  try {
    extraction = await extract(family, req.bytes, validated.mimeType);
  } catch (err) {
    const code = err instanceof IngestionError ? err.code : 'PARSER_FAILED';
    run.status = 'failed';
    run.errorCode = code;
    run.completedAt = new Date().toISOString();
    ingestionTelemetry.recordFailure(code);
    document.ingestionStatus = 'failed';
    intelligenceStore.putDocument({
      document,
      idempotencyKey: idKey,
      processingRuns: [run],
      rosterRows: [],
      reviewStatus: 'rejected',
      links: [],
    });
    emit('document.failed', documentId, { errorCode: code });
    throw err;
  }

  // Native extraction yielded too little text → OCR would be required (future PR).
  if (extraction.needsOcr) {
    run.status = 'failed';
    run.errorCode = 'OCR_FAILED';
    run.completedAt = new Date().toISOString();
    document.ingestionStatus = 'failed';
    document.parserUsed = extraction.method;
    ingestionTelemetry.recordFailure('OCR_FAILED');
    intelligenceStore.putDocument({
      document,
      idempotencyKey: idKey,
      processingRuns: [run],
      rosterRows: [],
      reviewStatus: 'rejected',
      links: [],
    });
    emit('document.failed', documentId, {
      errorCode: 'OCR_FAILED',
      reason: 'No usable text layer; OCR provider not available in this build.',
    });
    throw new IngestionError(
      'OCR_FAILED',
      'This file has no extractable text layer and requires OCR, which is not enabled in this build.',
    );
  }

  run.status = 'succeeded';
  run.completedAt = new Date().toISOString();
  document.parserUsed = extraction.method;
  document.ingestionStatus = 'extracted';
  emit('document.extracted', documentId, {
    method: extraction.method,
    pageCount: extraction.pageCount,
    textLength: extraction.text.length,
  });

  // 5. Classification.
  const classification = classifyDocument(extraction.text);
  document.documentType = classification.category;
  document.documentSubtype = classification.subtype;
  document.confidence = classification.confidence;
  document.ingestionStatus = 'classified';
  emit('document.classified', documentId, {
    category: classification.category,
    confidence: classification.confidence,
  });
  if (classification.confidence < LOW_CONFIDENCE_THRESHOLD) {
    emit('document.low_confidence', documentId, { confidence: classification.confidence });
  }

  // 6. Normalization + entity resolution (employee-like documents).
  const rosterRows: RosterRowRecord[] = [];
  if (EMPLOYEE_LIKE_CATEGORIES.includes(classification.category)) {
    const roster = extractEmployeeRoster(extraction.text);
    const existingEmployees = intelligenceStore.listEmployees(tenant);
    for (const candidate of roster.candidates) {
      const resolution = resolveEmployee(candidate, existingEmployees);
      rosterRows.push({ candidate, resolution });
    }
  }

  const reviewRequired = rosterRows.some((r) => r.resolution.requiresHumanConfirmation) || rosterRows.length > 0;
  if (reviewRequired) {
    document.ingestionStatus = 'awaiting_review';
    emit('employee.review_required', documentId, {
      candidateCount: rosterRows.length,
      needsConfirmation: rosterRows.filter((r) => r.resolution.requiresHumanConfirmation).length,
    });
  } else {
    document.ingestionStatus = 'completed';
  }
  document.processedAt = new Date().toISOString();

  const detail: DocumentDetail = {
    document,
    idempotencyKey: idKey,
    processingRuns: [run],
    extraction: {
      documentId,
      rawText: extraction.text,
      confidence: extraction.confidence,
      method: extraction.method,
      rowCount: rosterRows.length,
    },
    classification,
    rosterRows,
    reviewStatus: reviewRequired ? 'pending' : 'approved',
    links: [],
  };
  intelligenceStore.putDocument(detail);

  ingestionTelemetry.recordSuccess({
    category: classification.category,
    processingMs: Date.now() - startedMs,
    lowConfidence: classification.confidence < LOW_CONFIDENCE_THRESHOLD,
  });

  return {
    document,
    deduplicated: false,
    idempotencyKey: idKey,
    classification,
    extraction: {
      method: extraction.method,
      confidence: extraction.confidence,
      rowCount: rosterRows.length,
      textPreview: preview(extraction.text),
    },
    rosterRows,
    reviewRequired,
    events,
  };
}

export type ReviewDecision = 'approve_all_safe' | 'approve_selected' | 'reject';

export interface ReviewRequest {
  tenant: TenantContext;
  documentId: string;
  decision: ReviewDecision;
  /** Row indexes to approve when decision === 'approve_selected'. */
  selectedRowIndexes?: number[];
}

export interface ReviewResult {
  documentId: string;
  reviewStatus: DocumentDetail['reviewStatus'];
  created: number;
  updated: number;
  events: string[];
}

function candidateToEmployee(
  candidate: EmployeeCandidate,
  tenant: TenantContext,
  documentId: string,
  existingId?: string,
): CanonicalEmployee {
  const now = new Date().toISOString();
  return {
    id: existingId ?? `emp_${randomUUID()}`,
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    fullName: candidate.fullName,
    employeeExternalId: candidate.employeeExternalId,
    position: candidate.position,
    hireDate: candidate.hireDate,
    phone: candidate.phone,
    email: candidate.email,
    status: candidate.status === 'pending' ? 'pending' : 'active',
    credentials: candidate.credentials,
    sourceDocumentId: documentId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Apply a human review decision. This is the ONLY place canonical employee
 * records are written, satisfying the "no unsafe mutation without confirmation"
 * gate. Idempotent per row via entity resolution.
 */
export function applyReview(req: ReviewRequest): ReviewResult {
  const detail = intelligenceStore.getDocument(req.documentId);
  if (!detail) throw new IngestionError('MALFORMED_DOCUMENT', 'Document not found.');
  if (detail.document.organizationId !== req.tenant.organizationId) {
    throw new IngestionError('TENANT_ACCESS_DENIED', 'Document belongs to another tenant.');
  }

  const events: string[] = [];
  const emit = (name: Parameters<typeof operationalEventBus.emit>[0]['name'], payload: Record<string, unknown>) => {
    operationalEventBus.emit({
      name,
      tenant: req.tenant,
      documentId: req.documentId,
      correlationId: detail.document.correlationId,
      payload,
    });
    events.push(name);
  };

  if (req.decision === 'reject') {
    detail.reviewStatus = 'rejected';
    detail.reviewedBy = req.tenant.actorUserId;
    detail.reviewedAt = new Date().toISOString();
    intelligenceStore.putDocument(detail);
    return { documentId: req.documentId, reviewStatus: 'rejected', created: 0, updated: 0, events };
  }

  const approveAll = req.decision === 'approve_all_safe';
  const selected = new Set(req.selectedRowIndexes ?? []);
  let created = 0;
  let updated = 0;

  detail.rosterRows.forEach((row, index) => {
    const shouldApply = approveAll ? true : selected.has(index);
    if (!shouldApply) return;

    const resolution = row.resolution;
    const isUpdate = resolution.status === 'resolved' && resolution.canonicalId;
    const employee = candidateToEmployee(
      row.candidate,
      req.tenant,
      req.documentId,
      isUpdate ? resolution.canonicalId : undefined,
    );

    if (isUpdate) {
      const prev = intelligenceStore.getEmployee(resolution.canonicalId!);
      if (prev) {
        employee.createdAt = prev.createdAt;
      }
    }
    intelligenceStore.upsertEmployee(employee);

    // Mark the row resolved and link the document to the entity.
    row.resolution = {
      ...resolution,
      status: 'resolved',
      canonicalId: employee.id,
      requiresHumanConfirmation: false,
    };
    detail.links.push({
      documentId: req.documentId,
      entityType: 'employee',
      entityId: employee.id,
      relationship: isUpdate ? 'updated_by' : 'created_from',
    });

    if (isUpdate) {
      updated++;
      emit('employee.updated', { employeeId: employee.id, name: employee.fullName });
    } else {
      created++;
      emit('employee.imported', { employeeId: employee.id, name: employee.fullName, position: employee.position });
    }
  });

  const totalApplied = created + updated;
  const totalRows = detail.rosterRows.length;
  detail.reviewStatus = totalApplied >= totalRows ? 'approved' : totalApplied > 0 ? 'partially_approved' : detail.reviewStatus;
  detail.reviewedBy = req.tenant.actorUserId;
  detail.reviewedAt = new Date().toISOString();
  detail.document.ingestionStatus = 'completed';
  intelligenceStore.putDocument(detail);
  ingestionTelemetry.recordAutomationEvent(totalApplied);

  return { documentId: req.documentId, reviewStatus: detail.reviewStatus, created, updated, events };
}
