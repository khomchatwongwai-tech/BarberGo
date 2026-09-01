/**
 * Automation + analytics wiring (spider-web connection).
 *
 * The automation and analytics layers are pure SUBSCRIBERS of the canonical
 * operational event bus — they never re-parse OCR text or invent their own event
 * format. This module registers the demo subscribers; a production build points
 * the same subscriptions at the existing automation engine + metric registry.
 */

import { operationalEventBus } from '../events/eventBus';
import { ingestionTelemetry } from '../ingestion/ingestionTelemetry';

let registered = false;

export function registerIntelligenceSubscribers(): void {
  if (registered) return;
  registered = true;

  // AUTOMATION: react to newly imported employees (e.g. enqueue onboarding tasks,
  // schedule certification-expiry checks). Kept idempotent + side-effect-light here.
  operationalEventBus.on('employee.imported', (event) => {
    ingestionTelemetry.recordAutomationEvent();
    console.log(
      `[automation] employee.imported org=${event.organizationId} -> enqueue onboarding + compliance tasks (corr=${event.correlationId})`,
    );
  });

  operationalEventBus.on('employee.certification_expiring', (event) => {
    ingestionTelemetry.recordAutomationEvent();
    console.log(`[automation] certification expiring -> alert manager (corr=${event.correlationId})`);
  });

  // ANALYTICS: canonical domain changes refresh metrics (labor, headcount, etc.).
  operationalEventBus.on('employee.imported', (event) => {
    console.log(`[analytics] headcount metric refresh for org=${event.organizationId}`);
  });
}
