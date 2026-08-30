/**
 * Pure parsing-strategy router. Given a detected format family, returns the
 * ordered strategy the pipeline should attempt. Encodes the mission rule:
 * "Never OCR a file when structured extraction is available."
 */

import type { FormatFamily, SupportedFormat } from './ingestionContracts';

export const PARSE_STEPS = [
  'native_spreadsheet',
  'native_csv',
  'native_office',
  'native_pdf_text',
  'docling',
  'image_normalize',
  'ocr_tesseract',
  'ocr_google',
  'text_passthrough',
  'email_parse',
] as const;
export type ParseStep = (typeof PARSE_STEPS)[number];

export interface ParsePlan {
  family: FormatFamily;
  /** Ordered list of strategies to try until one yields sufficient confidence. */
  steps: ParseStep[];
  /** True when OCR may be needed (images / scanned PDFs). */
  mayRequireOcr: boolean;
}

const PLANS: Record<FormatFamily, ParsePlan> = {
  spreadsheet: { family: 'spreadsheet', steps: ['native_spreadsheet', 'docling'], mayRequireOcr: false },
  delimited: { family: 'delimited', steps: ['native_csv'], mayRequireOcr: false },
  word: { family: 'word', steps: ['native_office', 'docling'], mayRequireOcr: false },
  presentation: { family: 'presentation', steps: ['native_office', 'docling'], mayRequireOcr: false },
  pdf: {
    family: 'pdf',
    // Native text first; escalate to Docling/OCR only when text is insufficient.
    steps: ['native_pdf_text', 'docling', 'ocr_tesseract', 'ocr_google'],
    mayRequireOcr: true,
  },
  image: {
    family: 'image',
    steps: ['image_normalize', 'ocr_tesseract', 'ocr_google'],
    mayRequireOcr: true,
  },
  text: { family: 'text', steps: ['text_passthrough'], mayRequireOcr: false },
  email: { family: 'email', steps: ['email_parse', 'text_passthrough'], mayRequireOcr: false },
};

export function planFor(family: FormatFamily): ParsePlan {
  return PLANS[family];
}

/** Whether a format supports fully deterministic (non-OCR) extraction. */
export function hasNativeExtraction(format: SupportedFormat): boolean {
  return ['xlsx', 'xls', 'csv', 'docx', 'doc', 'pptx', 'ppt', 'pdf', 'txt', 'html', 'eml'].includes(
    format,
  );
}
