/**
 * Workqora Universal File Intelligence — public entry point.
 *
 * See docs/WORKQORA_UNIVERSAL_INTELLIGENCE_INVENTORY.md for the architecture and
 * PR roadmap. This barrel exposes the contracts + the working ingestion vertical
 * (upload → extract → classify → resolve → review → persist → events).
 */

export * from './ingestion/ingestionContracts';
export * from './ingestion/fileTypeDetector';
export * from './ingestion/documentRouter';
export * from './ingestion/ingestionIdempotency';
export * from './ingestion/ingestionSecurity';
export * from './ingestion/ingestionTelemetry';
export * from './extraction/extractionContracts';
export * from './events/eventContracts';
export * from './events/eventBus';
export * from './ocr/ocrContracts';
export * from './classification/documentClassifier';
export * from './entities/entityContracts';
export * from './normalization/employeeRosterAdapter';
export * from './resolution/employeeResolver';
export * from './storage/documentStorage';
export * from './store/intelligenceStore';
export * from './fileIntakeService';
export { registerIntelligenceSubscribers } from './automation/automationSubscribers';
