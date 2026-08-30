/**
 * OCR provider abstraction (contract only in this PR).
 *
 * OCR is the LAST resort in the parsing strategy — native structured extraction
 * and Docling come first (see documentRouter.ts). Providers implement a single
 * {@link OcrProvider.extract} method so Tesseract (local) and Google Document AI
 * (escalation) are interchangeable.
 */

export const OCR_PROVIDERS = ['tesseract', 'google_document_ai', 'none'] as const;
export type OcrProviderName = (typeof OCR_PROVIDERS)[number];

export interface OcrOptions {
  languageHints?: string[];
  /** Correct orientation / deskew before running OCR. */
  autoRotate?: boolean;
  /** Escalate to a paid provider only when local confidence is below this. */
  minConfidence?: number;
  pageRange?: { from: number; to: number };
}

export interface OcrBoundingBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrTextBlock {
  page: number;
  text: string;
  confidence: number;
  boundingBox?: OcrBoundingBox;
}

export interface OcrResult {
  provider: OcrProviderName;
  modelVersion?: string;
  text: string;
  blocks: OcrTextBlock[];
  /** Overall confidence in [0,1]. */
  confidence: number;
  language?: string;
  processingMs: number;
  /** Estimated cost in USD (0 for local providers). */
  costEstimateUsd: number;
  errorCategory?: string;
}

export interface OcrInput {
  bytes: Uint8Array;
  mimeType: string;
}

export interface OcrProvider {
  readonly name: OcrProviderName;
  extract(input: OcrInput, options?: OcrOptions): Promise<OcrResult>;
}
