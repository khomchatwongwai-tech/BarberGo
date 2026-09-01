/**
 * Shared extraction contracts — the common intermediate document model that all
 * parsers (native spreadsheet, CSV, PDF text, Docling, OCR) converge on. This is
 * the "canonical business data" hand-off point before classification and entity
 * resolution.
 */

import type { ParseStep } from '../ingestion/documentRouter';

export interface ExtractedTable {
  /** Best-effort header row (may be empty when undetectable). */
  headers: string[];
  rows: string[][];
  /** 0-based page the table was found on, when known. */
  page?: number;
}

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface RawExtraction {
  method: ParseStep;
  text: string;
  markdown?: string;
  pages: ExtractedPage[];
  tables: ExtractedTable[];
  pageCount: number;
  /** Extraction confidence in [0,1]; drives OCR escalation decisions. */
  confidence: number;
  /** True when the parser thinks OCR is required (e.g. empty text layer). */
  needsOcr: boolean;
}
