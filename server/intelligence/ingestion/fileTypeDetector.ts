/**
 * Pure file-type detection. Combines filename extension, declared MIME type, and
 * magic-byte sniffing to decide the canonical {@link SupportedFormat}. No I/O.
 */

import {
  FORMAT_MIME_TYPES,
  SUPPORTED_FORMATS,
  type FormatFamily,
  type SupportedFormat,
} from './ingestionContracts';

const EXTENSION_TO_FORMAT: Record<string, SupportedFormat> = Object.fromEntries(
  SUPPORTED_FORMATS.map((f) => [f, f]),
) as Record<string, SupportedFormat>;

const FORMAT_TO_FAMILY: Record<SupportedFormat, FormatFamily> = {
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  csv: 'delimited',
  docx: 'word',
  doc: 'word',
  pptx: 'presentation',
  ppt: 'presentation',
  pdf: 'pdf',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  heic: 'image',
  tiff: 'image',
  txt: 'text',
  html: 'text',
  eml: 'email',
};

export interface DetectedFileType {
  format: SupportedFormat | null;
  family: FormatFamily | null;
  /** Canonical MIME type we trust after sniffing. */
  mimeType: string;
  /** True when the declared MIME type disagrees with sniffed content. */
  mimeMismatch: boolean;
  confidence: number;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

/**
 * Sniff the leading bytes to identify common formats. Returns a format when a
 * signature is recognized, else null. Intentionally conservative.
 */
export function sniffMagicBytes(bytes: Uint8Array): SupportedFormat | 'zip-office' | null {
  const b = bytes;
  const startsWith = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return 'pdf'; // %PDF
  if (startsWith(0xff, 0xd8, 0xff)) return 'jpg'; // JPEG
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'png'; // PNG
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return null; // GIF (unsupported)
  if (startsWith(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45) return 'webp'; // RIFF....WEBP
  if (startsWith(0x49, 0x49, 0x2a, 0x00) || startsWith(0x4d, 0x4d, 0x00, 0x2a)) return 'tiff';
  if (startsWith(0x50, 0x4b, 0x03, 0x04)) return 'zip-office'; // ZIP: xlsx/docx/pptx — resolve by extension
  return null;
}

/**
 * Determine the file type from all available signals. `declaredMime` and the
 * filename are untrusted hints; sniffed bytes win when they disagree.
 */
export function detectFileType(args: {
  filename: string;
  declaredMime?: string;
  bytes?: Uint8Array;
}): DetectedFileType {
  const ext = extensionOf(args.filename);
  const byExt = EXTENSION_TO_FORMAT[ext] ?? null;

  let sniffed: SupportedFormat | null = null;
  if (args.bytes && args.bytes.length >= 4) {
    const s = sniffMagicBytes(args.bytes);
    // ZIP-based office files share a signature; disambiguate via extension.
    sniffed = s === 'zip-office' ? byExt : s;
  }

  // Prefer sniffed content, fall back to extension.
  const format = sniffed ?? byExt;
  const family = format ? FORMAT_TO_FAMILY[format] : null;
  const mimeType = format ? FORMAT_MIME_TYPES[format][0] : args.declaredMime ?? 'application/octet-stream';

  const declared = (args.declaredMime ?? '').toLowerCase();
  const mimeMismatch = Boolean(
    format && declared && !FORMAT_MIME_TYPES[format].some((m) => m === declared),
  );

  let confidence = 0;
  if (sniffed && byExt && sniffed === byExt) confidence = 1;
  else if (sniffed) confidence = 0.9;
  else if (byExt) confidence = 0.6;

  return { format, family, mimeType, mimeMismatch, confidence };
}

export { FORMAT_TO_FAMILY };
