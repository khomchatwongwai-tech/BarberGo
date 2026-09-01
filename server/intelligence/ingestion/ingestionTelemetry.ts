/**
 * Ingestion telemetry + observability counters (§21).
 *
 * Captures uploads, success rate, latency, OCR usage/escalation, classification
 * distribution, low-confidence + duplicate rates, and cost/document. PII is not
 * recorded here — only structural metrics and error codes.
 */

import type { DocumentCategory, IngestionErrorCode } from './ingestionContracts';

export interface IngestionMetrics {
  uploads: number;
  succeeded: number;
  failed: number;
  duplicates: number;
  lowConfidence: number;
  ocrUsed: number;
  googleOcrEscalations: number;
  tesseractSuccesses: number;
  doclingSuccesses: number;
  humanCorrections: number;
  automationEventsTriggered: number;
  aiActionsCreated: number;
  totalProcessingMs: number;
  totalCostUsd: number;
  byCategory: Record<string, number>;
  byErrorCode: Record<string, number>;
}

function emptyMetrics(): IngestionMetrics {
  return {
    uploads: 0,
    succeeded: 0,
    failed: 0,
    duplicates: 0,
    lowConfidence: 0,
    ocrUsed: 0,
    googleOcrEscalations: 0,
    tesseractSuccesses: 0,
    doclingSuccesses: 0,
    humanCorrections: 0,
    automationEventsTriggered: 0,
    aiActionsCreated: 0,
    totalProcessingMs: 0,
    totalCostUsd: 0,
    byCategory: {},
    byErrorCode: {},
  };
}

export class IngestionTelemetry {
  private metrics = emptyMetrics();

  recordUpload(): void {
    this.metrics.uploads += 1;
  }

  recordSuccess(args: { category: DocumentCategory; processingMs: number; costUsd?: number; lowConfidence?: boolean }): void {
    this.metrics.succeeded += 1;
    this.metrics.totalProcessingMs += args.processingMs;
    this.metrics.totalCostUsd += args.costUsd ?? 0;
    this.metrics.byCategory[args.category] = (this.metrics.byCategory[args.category] ?? 0) + 1;
    if (args.lowConfidence) this.metrics.lowConfidence += 1;
  }

  recordFailure(code: IngestionErrorCode): void {
    this.metrics.failed += 1;
    this.metrics.byErrorCode[code] = (this.metrics.byErrorCode[code] ?? 0) + 1;
  }

  recordDuplicate(): void {
    this.metrics.duplicates += 1;
  }

  recordOcr(args: { provider: 'tesseract' | 'google_document_ai'; costUsd?: number; success: boolean }): void {
    this.metrics.ocrUsed += 1;
    this.metrics.totalCostUsd += args.costUsd ?? 0;
    if (args.provider === 'google_document_ai') this.metrics.googleOcrEscalations += 1;
    if (args.provider === 'tesseract' && args.success) this.metrics.tesseractSuccesses += 1;
  }

  recordAutomationEvent(count = 1): void {
    this.metrics.automationEventsTriggered += count;
  }

  snapshot(): IngestionMetrics & { successRate: number; avgProcessingMs: number; avgCostUsd: number } {
    const m = this.metrics;
    const processed = m.succeeded + m.failed;
    return {
      ...m,
      byCategory: { ...m.byCategory },
      byErrorCode: { ...m.byErrorCode },
      successRate: processed ? m.succeeded / processed : 0,
      avgProcessingMs: m.succeeded ? m.totalProcessingMs / m.succeeded : 0,
      avgCostUsd: m.succeeded ? m.totalCostUsd / m.succeeded : 0,
    };
  }
}

export const ingestionTelemetry = new IngestionTelemetry();
