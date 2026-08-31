// Workflow Engine (Event-Driven Reactive Automation Runtime)
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { DomainEvent } from "../events/domainEvents.ts";
import { publishDomainEventSafe } from "../events/domainEvents.ts";
import { canonicalEventType } from "../events/operationalEvent.ts";
import { evaluateCondition } from "./conditionEngine.ts";
import { toWorkflowEventEnvelope, factsFromEnvelope } from "./eventEnvelope.ts";
import { executeWorkflowAction, isSafeAction } from "./actionRegistry.ts";
import { evaluateWorkflowActionPolicy } from "./workflowPolicyBridge.ts";
import type {
  WorkflowActionSpec,
  WorkflowCondition,
  WorkflowDefinitionRow,
  WorkflowRunRow,
  WorkflowRunStatus,
  StateTransitionRecord,
} from "./workflowTypes.ts";
import { logInfo, logWarn } from "../ops/logger.ts";
import { isMissingSchemaError } from "../ops/postgresSchemaErrors.ts";
import {
  normalizeWorkflowRunStatus,
  isTerminalWorkflowRunStatus,
} from "./workflowRunStateMachine.ts";
import { formatWorkflowVersionId, getWorkflowDefinitionVersion } from "./workflowVersioning.ts";

export const MAX_WORKFLOW_RUN_ATTEMPTS = 5;

type MinimalSupabase = Pick<SupabaseClient, "from">;

/** Find enabled workflow_definitions in this event's organization whose
 * trigger matches the event type, scoped by location when the definition
 * is location-specific (org-wide definitions - location_id IS NULL - match
 * every location, mirroring the automation_policies scoping convention). */
function matchingTriggerTypes(eventType: string): string[] {
  return Array.from(new Set([eventType, canonicalEventType(eventType)]));
}

async function findMatchingWorkflows(sb: MinimalSupabase, event: DomainEvent): Promise<WorkflowDefinitionRow[]> {
  const { data, error } = await sb
    .from("workflow_definitions")
    .select("*")
    .eq("organization_id", event.organizationId)
    .eq("enabled", true);
  if (error || !data) return [];
  const triggers = matchingTriggerTypes(event.eventType);
  return (data as WorkflowDefinitionRow[]).filter(
    (row) =>
      triggers.includes(row.trigger_event_type) &&
      (!row.location_id || !event.locationId || row.location_id === event.locationId),
  );
}

async function emitWorkflowFailed(
  sb: SupabaseClient,
  workflow: WorkflowDefinitionRow,
  run: WorkflowRunRow,
  event: DomainEvent,
  failureReason: string
): Promise<void> {
  await publishDomainEventSafe(sb, {
    eventType: "workflow.failed",
    organizationId: workflow.organization_id,
    locationId: event.locationId || workflow.location_id || null,
    entityId: run.id,
    idempotencyKey: `workflow.failed:${run.id}`,
    source: "system",
    actorType: "system",
    causationId: event.id,
    correlationId: event.correlationId || event.id,
    payload: {
      workflowId: workflow.id,
      runId: run.id,
      triggerEventId: event.id,
      triggerEventType: event.eventType,
      failureReason,
    },
  });
}

async function findExistingRun(sb: MinimalSupabase, workflowId: string, eventId: string): Promise<WorkflowRunRow | null> {
  const { data } = await sb
    .from("workflow_runs")
    .select("*")
    .eq("workflow_id", workflowId)
    .eq("event_id", eventId)
    .maybeSingle();
  return (data as WorkflowRunRow) || null;
}

/** Process one domain event: find matching enabled workflows for its
 * organization, and run each (idempotently - a workflow already run for
 * this exact event is never run twice). Called from the domain event
 * dispatcher's per-event consumer loop - see domainEventDispatcher.ts's
 * DOMAIN_EVENT_CONSUMERS.workflowEngine wiring. */
export async function processWorkflowEvent(sb: SupabaseClient, event: DomainEvent): Promise<{ runsStarted: number; runsSkipped: number }> {
  const workflows = await findMatchingWorkflows(sb, event);
  let runsStarted = 0;
  let runsSkipped = 0;
  for (const workflow of workflows) {
    const existing = await findExistingRun(sb, workflow.id, event.id);
    if (existing) {
      runsSkipped++;
      const norm = normalizeWorkflowRunStatus(existing.status);
      if (norm === "QUEUED" || norm === "FAILED") {
        await runWorkflow(sb, workflow, existing, event);
      }
      continue;
    }
    const run = await createRun(sb, workflow, event);
    if (!run) continue;
    runsStarted++;
    await runWorkflow(sb, workflow, run, event);
  }
  return { runsStarted, runsSkipped };
}

async function createRun(sb: SupabaseClient, workflow: WorkflowDefinitionRow, event: DomainEvent): Promise<WorkflowRunRow | null> {
  const id = `wfrun_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const defVersion = Math.max(1, workflow.version || 1);
  const versionId = formatWorkflowVersionId(workflow.id, defVersion);

  const initialTransition: StateTransitionRecord = {
    fromState: "RECEIVED",
    toState: "QUEUED",
    timestamp: now,
    reason: "Workflow run created from domain event trigger",
    actorId: event.actor?.userId || null,
  };

  const coreRow = {
    id,
    workflow_id: workflow.id,
    organization_id: workflow.organization_id,
    location_id: event.locationId || workflow.location_id || null,
    event_id: event.id,
    event_type: event.eventType,
    status: "pending",
    attempt_count: 0,
    started_at: now,
    updated_at: now,
  };
  const versionFields = {
    definition_version: defVersion,
    workflow_version_id: versionId,
    state_transitions: [initialTransition],
  };
  const correlationFields = {
    correlation_id: event.correlationId || event.id,
    causation_id: event.causationId ?? null,
  };
  // Production may lack AG version columns, correlation columns, or both.
  // #279 only retried without correlation columns, so missing definition_version
  // still created zero runs. Keep trying until a schema-compatible insert succeeds.
  const tiers = [
    { ...coreRow, ...versionFields, ...correlationFields },
    { ...coreRow, ...versionFields },
    { ...coreRow, ...correlationFields },
    coreRow,
  ];

  let lastError: { code?: string; message?: string } | null = null;
  for (const row of tiers) {
    const attempt = await sb.from("workflow_runs").insert(row).select().maybeSingle();
    if (!attempt.error) return attempt.data as WorkflowRunRow;
    lastError = attempt.error;
    if (attempt.error.code === "23505") return null;
    if (!isMissingSchemaError(attempt.error)) break;
  }
  logWarn("workflow.run_creation_failed", {
    organizationId: workflow.organization_id,
    errorCategory: lastError?.code || "unknown",
    metadata: { workflowId: workflow.id, eventId: event.id, eventType: event.eventType, message: lastError?.message },
  });
  return null;
}

const OPTIONAL_RUN_SCHEMA_KEYS = [
  "definition_version",
  "workflow_version_id",
  "state_transitions",
  "correlation_id",
  "causation_id",
] as const;

async function updateRun(sb: SupabaseClient, runId: string, patch: Record<string, unknown>): Promise<void> {
  let next: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  for (;;) {
    const attempt = await sb.from("workflow_runs").update(next).eq("id", runId);
    if (!attempt.error) return;
    if (!isMissingSchemaError(attempt.error)) return;
    let stripped = false;
    const reduced: Record<string, unknown> = { ...next };
    for (const key of OPTIONAL_RUN_SCHEMA_KEYS) {
      if (key in reduced) {
        delete reduced[key];
        stripped = true;
      }
    }
    if (!stripped) return;
    next = reduced;
  }
}

async function recordStep(
  sb: SupabaseClient,
  step: {
    runId: string;
    organizationId: string;
    stepIndex: number;
    stepType: "condition_check" | "action";
    actionName?: string | null;
    status: "running" | "completed" | "failed" | "skipped";
    result?: Record<string, unknown> | null;
    error?: string | null;
    startedAt: string;
  }
): Promise<void> {
  const completedAt = step.status === "running" ? null : new Date().toISOString();
  const id = `wfstep_${step.runId}_${step.stepIndex}_${step.stepType}`;
  await sb.from("workflow_run_steps").upsert(
    {
      id,
      run_id: step.runId,
      organization_id: step.organizationId,
      step_index: step.stepIndex,
      step_type: step.stepType,
      action_name: step.actionName || null,
      status: step.status,
      result: step.result || null,
      error: step.error || null,
      started_at: step.startedAt,
      completed_at: completedAt,
      attempt_count: 1,
    },
    { onConflict: "id" }
  );
}

async function existingSteps(sb: SupabaseClient, runId: string): Promise<Map<number, { status: string; result: any }>> {
  const { data } = await sb
    .from("workflow_run_steps")
    .select("step_index, status, result")
    .eq("run_id", runId);
  const map = new Map<number, { status: string; result: any }>();
  for (const row of data || []) {
    map.set(row.step_index, { status: row.status, result: row.result });
  }
  return map;
}

function logRunOutcome(params: {
  workflow: WorkflowDefinitionRow;
  run: WorkflowRunRow;
  event: DomainEvent;
  startedAt: number;
  attempt: number;
  status: "completed" | "failed" | "skipped";
  conditionsMet: boolean | null;
  actionName?: string | null;
  failureCategory?: string | null;
}): void {
  const msg = params.status === "completed"
    ? "workflow.run.completed"
    : params.status === "skipped"
      ? "workflow.run.skipped"
      : "workflow.run.failed";
  const fn = params.status === "failed" ? logWarn : logInfo;
  fn(msg, {
    organizationId: params.workflow.organization_id,
    errorCategory: params.failureCategory || undefined,
    metadata: {
      correlationId: params.event.correlationId || params.event.id,
      eventId: params.event.id,
      trigger: params.event.eventType,
      workflowId: params.workflow.id,
      workflowRunId: params.run.id,
      locationId: params.run.location_id,
      attempt: params.attempt,
      conditionsMet: params.conditionsMet,
      actionName: params.actionName ?? null,
      durationMs: Date.now() - params.startedAt,
      status: params.status,
    },
  });
}

/** Evaluate conditions and execute a workflow's actions in order, resuming
 * from the first non-completed step on retry so an already-completed,
 * non-idempotent action (e.g. create_task) is never re-run. */
async function runWorkflow(sb: SupabaseClient, workflow: WorkflowDefinitionRow, run: WorkflowRunRow, event: DomainEvent): Promise<void> {
  const runStartedAt = Date.now();
  if ((run.attempt_count || 0) >= MAX_WORKFLOW_RUN_ATTEMPTS) {
    await updateRun(sb, run.id, { status: "failed", failure_reason: "MAX_ATTEMPTS_EXHAUSTED", completed_at: new Date().toISOString() });
    await emitWorkflowFailed(sb, workflow, run, event, "MAX_ATTEMPTS_EXHAUSTED");
    logRunOutcome({ workflow, run, event, startedAt: runStartedAt, attempt: run.attempt_count || 0, status: "failed", conditionsMet: null, failureCategory: "MAX_ATTEMPTS_EXHAUSTED" });
    return;
  }
  const attemptCount = (run.attempt_count || 0) + 1;
  await updateRun(sb, run.id, { status: "running", attempt_count: attemptCount });

  const envelope = toWorkflowEventEnvelope(event);
  const facts = factsFromEnvelope(envelope);
  const completed = await existingSteps(sb, run.id);

  // Step 0 is always the condition check - re-derived every attempt
  const conditionsMet = evaluateCondition((workflow.conditions as WorkflowCondition) || { all: [] }, facts);
  await recordStep(sb, {
    runId: run.id,
    organizationId: workflow.organization_id,
    stepIndex: 0,
    stepType: "condition_check",
    status: conditionsMet ? "completed" : "skipped",
    result: { conditionsMet },
    startedAt: new Date().toISOString(),
  });

  if (!conditionsMet) {
    await updateRun(sb, run.id, { status: "completed", conditions_met: false, completed_at: new Date().toISOString() });
    logRunOutcome({ workflow, run, event, startedAt: runStartedAt, attempt: attemptCount, status: "skipped", conditionsMet: false });
    return;
  }
  await updateRun(sb, run.id, { conditions_met: true });

  const actions = Array.isArray(workflow.actions) ? (workflow.actions as WorkflowActionSpec[]) : [];
  for (let i = 0; i < actions.length; i++) {
    const stepIndex = i + 1;
    const already = completed.get(stepIndex);
    if (already?.status === "completed" || already?.status === "skipped") continue;

    const spec = actions[i];
    const startedAt = new Date().toISOString();
    await recordStep(sb, {
      runId: run.id,
      organizationId: workflow.organization_id,
      stepIndex,
      stepType: "action",
      actionName: spec?.action || null,
      status: "running",
      startedAt,
    });

    // Policy & Approval Bridge evaluation
    const policyEval = await evaluateWorkflowActionPolicy({
      sb: sb as SupabaseClient,
      workflow,
      run,
      stepIndex,
      actionName: spec?.action || "",
      actionParams: spec?.params || {},
      envelope,
      actor: {
        userId: "workflow-engine",
        role: "corporate_admin",
        canViewFinancials: true,
      },
    });

    if (policyEval.decision === "BLOCK") {
      await recordStep(sb, {
        runId: run.id,
        organizationId: workflow.organization_id,
        stepIndex,
        stepType: "action",
        actionName: spec?.action || null,
        status: "failed",
        error: policyEval.reason,
        startedAt,
      });
      await updateRun(sb, run.id, {
        status: "failed",
        failure_reason: policyEval.reason,
        completed_at: new Date().toISOString(),
      });
      await emitWorkflowFailed(sb, workflow, run, event, policyEval.reason);
      logRunOutcome({
        workflow,
        run,
        event,
        startedAt: runStartedAt,
        attempt: attemptCount,
        status: "failed",
        conditionsMet: true,
        actionName: spec?.action || null,
        failureCategory: policyEval.disposition === "unknown_action_blocked" ? "ACTION_NOT_ALLOWLISTED" : (policyEval.disposition || "POLICY_BLOCKED"),
      });
      return;
    }

    if (policyEval.decision === "AWAIT_APPROVAL") {
      await recordStep(sb, {
        runId: run.id,
        organizationId: workflow.organization_id,
        stepIndex,
        stepType: "action",
        actionName: spec?.action || null,
        status: "failed",
        error: `Awaiting human approval: ${policyEval.reason}`,
        startedAt,
      });
      await updateRun(sb, run.id, {
        status: "AWAITING_APPROVAL",
        failure_reason: `Awaiting human approval: ${policyEval.reason}`,
        completed_at: new Date().toISOString(),
      });
      logRunOutcome({
        workflow,
        run,
        event,
        startedAt: runStartedAt,
        attempt: attemptCount,
        status: "skipped",
        conditionsMet: true,
        actionName: spec?.action || null,
      });
      return;
    }

    if (!spec || typeof spec.action !== "string" || !isSafeAction(spec.action)) {
      await recordStep(sb, {
        runId: run.id,
        organizationId: workflow.organization_id,
        stepIndex,
        stepType: "action",
        actionName: spec?.action || null,
        status: "failed",
        error: "Action is not in the allowlisted action registry",
        startedAt,
      });
      await updateRun(sb, run.id, { status: "failed", failure_reason: `Action at index ${i} is not allowlisted`, completed_at: new Date().toISOString() });
      await emitWorkflowFailed(sb, workflow, run, event, `Action at index ${i} is not allowlisted`);
      logRunOutcome({ workflow, run, event, startedAt: runStartedAt, attempt: attemptCount, status: "failed", conditionsMet: true, actionName: spec?.action || null, failureCategory: "ACTION_NOT_ALLOWLISTED" });
      return;
    }

    const outcome = await executeWorkflowAction(spec.action, {
      sb,
      organizationId: workflow.organization_id,
      locationId: run.location_id,
      runId: run.id,
      stepIndex,
      envelope,
    }, spec.params || {});

    if (outcome.status === "error") {
      await recordStep(sb, {
        runId: run.id,
        organizationId: workflow.organization_id,
        stepIndex,
        stepType: "action",
        actionName: spec.action,
        status: "failed",
        error: outcome.error,
        startedAt,
      });
      await updateRun(sb, run.id, { status: "failed", failure_reason: outcome.error, completed_at: new Date().toISOString() });
      await emitWorkflowFailed(sb, workflow, run, event, outcome.error);
      logRunOutcome({ workflow, run, event, startedAt: runStartedAt, attempt: attemptCount, status: "failed", conditionsMet: true, actionName: spec.action, failureCategory: outcome.error });
      return;
    }
    await recordStep(sb, {
      runId: run.id,
      organizationId: workflow.organization_id,
      stepIndex,
      stepType: "action",
      actionName: spec.action,
      status: "completed",
      result: outcome.result || null,
      startedAt,
    });
  }

  await updateRun(sb, run.id, { status: "completed", completed_at: new Date().toISOString() });
  logRunOutcome({ workflow, run, event, startedAt: runStartedAt, attempt: attemptCount, status: "completed", conditionsMet: true });
}

/** Explicit operator cancellation of a workflow run */
export async function cancelWorkflowRun(
  sb: SupabaseClient,
  runId: string,
  cancelledBy: string,
  cancellationReason?: string
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { data: run } = await sb.from("workflow_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return { status: "error", error: "Run not found" };
  const currentNormalized = normalizeWorkflowRunStatus(run.status);
  if (isTerminalWorkflowRunStatus(currentNormalized)) {
    return { status: "error", error: `Cannot cancel run in terminal status ${run.status}` };
  }
  const now = new Date().toISOString();
  const transition: StateTransitionRecord = {
    fromState: currentNormalized,
    toState: "CANCELLED",
    timestamp: now,
    reason: cancellationReason || "CANCELLED_BY_OPERATOR",
    actorId: cancelledBy,
  };
  const existingTransitions = Array.isArray(run.state_transitions) ? run.state_transitions : [];
  await updateRun(sb, runId, {
    status: "CANCELLED",
    failure_reason: null, // Cancelled is distinctly NOT a failure
    completed_at: now,
    cancelled_at: now,
    cancelled_by: cancelledBy,
    cancellation_reason: cancellationReason || "Cancelled by operator",
    state_transitions: [...existingTransitions, transition],
  });
  return { status: "ok" };
}

/** Manual/scheduled retry entry point for a failed run - re-enters
 * runWorkflow, which resumes past already-completed steps. */
export async function retryWorkflowRun(sb: SupabaseClient, runId: string): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { data: run } = await sb.from("workflow_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return { status: "error", error: "Run not found" };
  const normStatus = normalizeWorkflowRunStatus(run.status);
  if (normStatus !== "FAILED" && normStatus !== "DEAD_LETTER") {
    return { status: "error", error: "Only a failed or dead-letter run can be retried" };
  }
  if (run.failure_reason === "MAX_ATTEMPTS_EXHAUSTED" || (run.attempt_count || 0) >= MAX_WORKFLOW_RUN_ATTEMPTS) {
    return { status: "error", error: "This run has exhausted its retry attempts" };
  }

  // Retrieve the EXACT immutable definition version used by the original run
  let workflow: WorkflowDefinitionRow | null = null;
  if (run.definition_version) {
    const versionRow = await getWorkflowDefinitionVersion(sb, run.workflow_id, run.definition_version);
    if (versionRow) {
      workflow = {
        id: versionRow.workflow_id,
        organization_id: versionRow.organization_id,
        location_id: versionRow.location_id,
        name: versionRow.name,
        description: versionRow.description,
        enabled: versionRow.enabled,
        trigger_event_type: versionRow.trigger_event_type,
        conditions: versionRow.conditions as unknown as WorkflowCondition,
        actions: versionRow.actions as unknown as WorkflowActionSpec[],
        template_id: versionRow.template_id,
        version: versionRow.version,
        change_reason: versionRow.change_reason,
        created_at: versionRow.created_at,
        updated_at: versionRow.created_at,
        created_by: versionRow.created_by || "system",
        updated_by: versionRow.created_by || "system",
      };
    }
  }
  if (!workflow) {
    const { data: currentDef } = await sb.from("workflow_definitions").select("*").eq("id", run.workflow_id).maybeSingle();
    workflow = currentDef as WorkflowDefinitionRow;
  }
  if (!workflow) return { status: "error", error: "Workflow definition not found" };

  const { data: eventRow } = await sb.from("domain_events").select("*").eq("id", run.event_id).maybeSingle();
  if (!eventRow) return { status: "error", error: "Triggering event no longer available" };
  const event: DomainEvent = {
    id: eventRow.id, eventType: eventRow.event_type, schemaVersion: 1, organizationId: eventRow.organization_id,
    locationId: eventRow.location_id, entityId: eventRow.entity_id, occurredAt: eventRow.occurred_at,
    actor: eventRow.actor, idempotencyKey: eventRow.idempotency_key, payload: eventRow.payload || {},
    correlationId: eventRow.correlation_id || eventRow.id, causationId: eventRow.causation_id ?? null,
  };
  await runWorkflow(sb, workflow as WorkflowDefinitionRow, run as WorkflowRunRow, event);
  return { status: "ok" };
}
