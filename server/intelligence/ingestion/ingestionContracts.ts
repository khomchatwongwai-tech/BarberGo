/**
 * Workqora Universal File Intelligence — Core Ingestion Contracts
 * ---------------------------------------------------------------
 * PR 1 (architecture / inventory / contracts).
 *
 * These are the shared, provider-agnostic contracts that every consumer of the
 * Workqora intelligence backbone must speak. They intentionally contain NO
 * runtime side effects, NO third-party SDKs, and NO business logic beyond a few
 * pure constant tables, so `main` stays deployable while later PRs fill in the
 * services (Docling worker, OCR providers, classifier, entity resolver, etc.).
 *
 * Design rules encoded here (see docs/WORKQORA_UNIVERSAL_INTELLIGENCE_INVENTORY.md):
 *  - Tenant identity is ALWAYS server-derived. The browser never supplies
 *    organization_id / location_id (see {@link TenantContext}).
 *  - Raw evidence is immutable. A document's identity ({@link DocumentIdentity})
 *    is separate from a processing attempt ({@link ProcessingRunRef}) which is
 *    separate from any business mutation it may cause.
 */

// ---------------------------------------------------------------------------
// Tenant + actor context (server-derived only)
// ---------------------------------------------------------------------------

/**
 * Authenticated, server-derived tenant scope. This MUST be constructed from a
 * verified server session — never from request body fields. Every ingestion,
 * extraction, event, and query is authorized against this context.
 */
export interface TenantContext {
  organizationId: string;
  /** Optional: some documents are org-wide (e.g. a company handbook). */
  locationId?: string;
  /** The authenticated user performing the action, if any (system for automation). */
  actorUserId?: string;
  /** How the actor was authenticated, useful for audit + risk scoring. */
  actorKind: ActorKind;
}

export const ACTOR_KINDS = [
  'user',
  'system',
  'automation',
  'integration',
  'service_account',
] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** Where a document entered the spider web. */
export const DOCUMENT_SOURCES = [
  'camera',
  'file_upload',
  'email',
  'api',
  'integration',
  'scanner',
  'mobile',
  'automation',
] as const;
export type DocumentSource = (typeof DOCUMENT_SOURCES)[number];

// ---------------------------------------------------------------------------
// Supported file formats
// ---------------------------------------------------------------------------

/**
 * File formats the ingestion layer accepts. Adding a format should be as simple
 * as extending this table + {@link FORMAT_MIME_TYPES} and teaching the router a
 * strategy for it (see documentRouter.ts).
 */
export const SUPPORTED_FORMATS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'tiff',
  'xlsx',
  'xls',
  'csv',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'txt',
  'html',
  'eml',
] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

/** Canonical MIME type for each supported format (used for MIME sniffing checks). */
export const FORMAT_MIME_TYPES: Record<SupportedFormat, readonly string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  heic: ['image/heic', 'image/heif'],
  tiff: ['image/tiff'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  csv: ['text/csv', 'application/csv'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  doc: ['application/msword'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ppt: ['application/vnd.ms-powerpoint'],
  txt: ['text/plain'],
  html: ['text/html'],
  eml: ['message/rfc822'],
} as const;

/** Broad handling family a format belongs to; drives the parsing strategy. */
export const FORMAT_FAMILIES = [
  'spreadsheet',
  'delimited',
  'word',
  'presentation',
  'pdf',
  'image',
  'text',
  'email',
] as const;
export type FormatFamily = (typeof FORMAT_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Ingestion lifecycle status
// ---------------------------------------------------------------------------

export const INGESTION_STATUSES = [
  'received',
  'stored',
  'queued',
  'processing',
  'extracted',
  'classified',
  'resolved',
  'awaiting_review',
  'completed',
  'failed',
  'duplicate',
] as const;
export type IngestionStatus = (typeof INGESTION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Document identity + metadata
// ---------------------------------------------------------------------------

/**
 * Immutable identity of a stored document. This is the "evidence node" in the
 * knowledge graph. It never changes and its original bytes are never
 * overwritten. Processing attempts and business mutations reference it.
 */
export interface DocumentIdentity {
  documentId: string;
  organizationId: string;
  locationId?: string;
  /** SHA-256 of the original bytes; the backbone of idempotency. */
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  originalFilename: string;
  /** Immutable Supabase Storage path of the original upload. */
  storagePath: string;
  source: DocumentSource;
  uploadedBy?: string;
  createdAt: string;
}

/**
 * The full universal document metadata record. Mirrors the `documents` table
 * (see section 6 of the mission) plus the runtime processing fields.
 */
export interface UniversalDocument extends DocumentIdentity {
  ingestionStatus: IngestionStatus;
  documentType?: DocumentCategory;
  documentSubtype?: string;
  parserUsed?: string;
  parserVersion?: string;
  ocrProvider?: string;
  confidence?: number;
  processedAt?: string;
  /** Trace id linking every event/run/mutation for this document. */
  correlationId: string;
}

// ---------------------------------------------------------------------------
// Document categories (universal classifier vocabulary)
// ---------------------------------------------------------------------------

/**
 * Universal, cross-vertical document taxonomy. Deliberately NOT restaurant- or
 * barber-specific. `unknown` is a first-class, valid category — unknown
 * documents are retained, never deleted.
 */
export const DOCUMENT_CATEGORIES = [
  'schedule',
  'employee_record',
  'resume',
  'onboarding',
  'training',
  'certification',
  'time_off',
  'attendance',
  'payroll',
  'invoice',
  'purchase_order',
  'inventory',
  'waste',
  'equipment',
  'maintenance',
  'repair',
  'inspection',
  'safety',
  'policy',
  'handbook',
  'customer',
  'crm',
  'contract',
  'sales',
  'receipt',
  'financial',
  'unknown',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// A normalized intake request handed to the ingestion service
// ---------------------------------------------------------------------------

/**
 * Everything the file-intake service needs to accept one document. Note the
 * absence of organizationId / locationId as caller-supplied fields — those come
 * exclusively from {@link TenantContext}.
 */
export interface FileIntakeRequest {
  tenant: TenantContext;
  source: DocumentSource;
  originalFilename: string;
  /** MIME type as declared by the client; the service still sniffs the bytes. */
  declaredMimeType?: string;
  /** Raw file bytes. Kept out of logs; only the sha256/size are logged. */
  bytes: Uint8Array;
  /** Optional purpose used to scope idempotency (see ingestionIdempotency.ts). */
  ingestionPurpose?: string;
  /** Optional caller-provided correlation id; one is generated when absent. */
  correlationId?: string;
}

/** Result of accepting (or deduplicating) a document at the intake boundary. */
export interface FileIntakeResult {
  document: UniversalDocument;
  /** True when an identical (sha256 + tenant + purpose) document already existed. */
  deduplicated: boolean;
  idempotencyKey: string;
}

// ---------------------------------------------------------------------------
// Human review gate
// ---------------------------------------------------------------------------

/** Risk classes gate which mutations may proceed without explicit confirmation. */
export const RISK_CLASSES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export const REVIEW_ACTIONS = [
  'approve_all_safe',
  'approve_selected',
  'edit',
  'reject',
  'retry_extraction',
] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

// ---------------------------------------------------------------------------
// Explicit error taxonomy (section 20)
// ---------------------------------------------------------------------------

/**
 * Explicit, non-generic ingestion error categories. Parsing/extraction problems
 * must never be surfaced as a vague "AI unavailable".
 */
export const INGESTION_ERROR_CODES = [
  'UNSUPPORTED_FILE',
  'FILE_TOO_LARGE',
  'MALFORMED_DOCUMENT',
  'OCR_FAILED',
  'LOW_CONFIDENCE',
  'PARSER_FAILED',
  'ENTITY_RESOLUTION_REQUIRED',
  'TENANT_ACCESS_DENIED',
  'DUPLICATE_DOCUMENT',
  'MUTATION_REQUIRES_CONFIRMATION',
  'PROVIDER_UNAVAILABLE',
  'NOT_IMPLEMENTED',
] as const;
export type IngestionErrorCode = (typeof INGESTION_ERROR_CODES)[number];

/**
 * Structured error carrying an explicit {@link IngestionErrorCode}. Consumers
 * branch on `.code` rather than parsing messages.
 */
export class IngestionError extends Error {
  readonly code: IngestionErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: IngestionErrorCode,
    message: string,
    options?: { retryable?: boolean; details?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'IngestionError';
    this.code = code;
    this.retryable = options?.retryable ?? DEFAULT_RETRYABLE_CODES.has(code);
    this.details = options?.details;
  }
}

const DEFAULT_RETRYABLE_CODES = new Set<IngestionErrorCode>([
  'OCR_FAILED',
  'PARSER_FAILED',
  'PROVIDER_UNAVAILABLE',
]);
