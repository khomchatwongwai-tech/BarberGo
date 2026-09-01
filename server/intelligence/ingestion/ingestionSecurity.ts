/**
 * Pure ingestion security helpers: filename safety, size limits, extension +
 * MIME validation, and a redaction helper for PII-conscious logging. No I/O.
 */

import {
  FORMAT_MIME_TYPES,
  IngestionError,
  SUPPORTED_FORMATS,
  type SupportedFormat,
} from './ingestionContracts';
import { detectFileType, extensionOf } from './fileTypeDetector';

/** 25 MB default cap for a single uploaded document. */
export const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Produce a safe, storage-friendly filename: strip directory components, drop
 * control chars, collapse whitespace, and guard against path traversal.
 */
export function safeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'file';
}

export interface ValidationInput {
  filename: string;
  declaredMime?: string;
  bytes: Uint8Array;
  maxBytes?: number;
}

export interface ValidatedFile {
  format: SupportedFormat;
  mimeType: string;
  sizeBytes: number;
  safeName: string;
  mimeMismatch: boolean;
}

/**
 * Validate an uploaded file. Throws a typed {@link IngestionError} with an
 * explicit code (never a generic message) on rejection.
 */
export function validateUpload(input: ValidationInput): ValidatedFile {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_FILE_BYTES;
  const sizeBytes = input.bytes.byteLength;

  if (sizeBytes === 0) {
    throw new IngestionError('MALFORMED_DOCUMENT', 'Uploaded file is empty.');
  }
  if (sizeBytes > maxBytes) {
    throw new IngestionError(
      'FILE_TOO_LARGE',
      `File is ${sizeBytes} bytes; limit is ${maxBytes} bytes.`,
      { details: { sizeBytes, maxBytes } },
    );
  }

  const ext = extensionOf(input.filename);
  if (!SUPPORTED_FORMATS.includes(ext as SupportedFormat)) {
    throw new IngestionError('UNSUPPORTED_FILE', `Unsupported file extension: "${ext || '(none)'}".`, {
      details: { extension: ext, supported: SUPPORTED_FORMATS },
    });
  }

  const detected = detectFileType({
    filename: input.filename,
    declaredMime: input.declaredMime,
    bytes: input.bytes,
  });
  if (!detected.format) {
    throw new IngestionError('UNSUPPORTED_FILE', 'Could not determine a supported file type.');
  }

  return {
    format: detected.format,
    mimeType: detected.mimeType,
    sizeBytes,
    safeName: safeFilename(input.filename),
    mimeMismatch: detected.mimeMismatch,
  };
}

export function isSupportedMime(mime: string): boolean {
  return Object.values(FORMAT_MIME_TYPES).some((list) => list.includes(mime));
}

/**
 * Redact obvious PII (emails, phone numbers, long digit runs) for safe logging.
 * Never log full sensitive employee documents.
 */
export function redactForLog(text: string, maxLen = 240): string {
  const redacted = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone]')
    .replace(/\b\d{6,}\b/g, '[number]');
  return redacted.length > maxLen ? `${redacted.slice(0, maxLen)}…` : redacted;
}
