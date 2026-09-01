import { SAFETY } from './env';
import { listEvents } from './eventBus';
import { getLastHealth } from './healthEngine';
import { corporateStore, newId, writeAudit } from './store';
import type { ActionClass, AutomationActionPolicy, CorporateRole } from './types';

const POLICIES: AutomationActionPolicy[] = [
  { actionType: 'refresh_kpi_snapshots', riskLevel: 'LOW', requiredRole: 'ANALYST', requiresApproval: false, allowedEnvironment: ['production', 'staging', 'development'], maxImpact: 'in-memory snapshots', rollbackAvailable: true, auditRequired: true, actionClass: 'READ_ONLY' },
  { actionType: 'run_research', riskLevel: 'LOW', requiredRole: 'ANALYST', requiresApproval: false, allowedEnvironment: ['production', 'staging', 'development'], maxImpact: 'research store', rollbackAvailable: true, auditRequired: true, actionClass: 'READ_ONLY' },
  { actionType: 'create_alert', riskLevel: 'LOW', requiredRole: 'EXECUTIVE', requiresApproval: false, allowedEnvironment: ['production', 'staging', 'development'], maxImpact: 'alert inbox', rollbackAvailable: true, auditRequired: true, actionClass: 'NOTIFY' },
  { actionType: 'generate_executive_brief', riskLevel: 'LOW', requiredRole: 'EXECUTIVE', requiresApproval: false, allowedEnvironment: ['production', 'staging', 'development'], maxImpact: 'brief document', rollbackAvailable: true, auditRequired: true, actionClass: 'DRAFT' },
  { actionType: 'customer_communication', riskLevel: 'HIGH', requiredRole: 'OWNER', requiresApproval: true, allowedEnvironment: ['production'], maxImpact: 'customers', rollbackAvailable: false, auditRequired: true, actionClass: 'HIGH_RISK_APPROVAL_REQUIRED' },
  { actionType: 'workqora_operational_mutation', riskLevel: 'PROHIBITED', requiredRole: 'OWNER', requiresApproval: true, allowedEnvironment: [], maxImpact: 'workqora production data', rollbackAvailable: false, auditRequired: true, actionClass: 'PROHIBITED' },
  { actionType: 'broker_trade', riskLevel: 'PROHIBITED', requiredRole: 'OWNER', requiresApproval: true, allowedEnvironment: [], maxImpact: 'real money', rollbackAvailable: false, auditRequired: true, actionClass: 'PROHIBITED' },
  { actionType: 'payroll_change', riskLevel: 'PROHIBITED', requiredRole: 'OWNER', requiresApproval: true, allowedEnvironment: [], maxImpact: 'employee pay', rollbackAvailable: false, auditRequired: true, actionClass: 'PROHIBITED' },
  { actionType: 'dns_change', riskLevel: 'PROHIBITED', requiredRole: 'OWNER', requiresApproval: true, allowedEnvironment: [], maxImpact: 'production dns', rollbackAvailable: false, auditRequired: true, actionClass: 'PROHIBITED' },
  { actionType: 'security_control_disable', riskLevel: 'PROHIBITED', requiredRole: 'OWNER', requiresApproval: true, allowedEnvironment: [], maxImpact: 'security', rollbackAvailable: false, auditRequired: true, actionClass: 'PROHIBITED' },
];

export function listPolicies(): AutomationActionPolicy[] {
  return POLICIES;
}

export function classifyAction(actionType: string): AutomationActionPolicy | null {
  return POLICIES.find((item) => item.actionType === actionType) || null;
}

export function canExecute(actionType: string, role: CorporateRole): { allowed: boolean; reason: string; actionClass: ActionClass } {
  const policy = classifyAction(actionType);
  if (!policy) {
    return { allowed: false, reason: 'UNKNOWN_ACTION', actionClass: 'PROHIBITED' };
  }
  if (policy.actionClass === 'PROHIBITED') {
    return { allowed: false, reason: 'POLICY_PROHIBITED', actionClass: 'PROHIBITED' };
  }
  if (actionType.includes('workqora') && !SAFETY.workqoraAutonomousMutation) {
    return { allowed: false, reason: 'WORKQORA_AUTONOMOUS_MUTATION=false', actionClass: 'PROHIBITED' };
  }
  if (actionType.includes('broker') && !SAFETY.marketMindLiveTradingEnabled) {
    return { allowed: false, reason: 'MARKETMIND_LIVE_TRADING_ENABLED=false', actionClass: 'PROHIBITED' };
  }
  if (policy.requiresApproval) {
    return { allowed: false, reason: 'APPROVAL_REQUIRED', actionClass: policy.actionClass };
  }
  const roleRank: Record<CorporateRole, number> = { VIEWER: 1, ANALYST: 2, ADMIN: 3, EXECUTIVE: 4, OWNER: 5 };
  if (roleRank[role] < roleRank[policy.requiredRole]) {
    return { allowed: false, reason: 'INSUFFICIENT_ROLE', actionClass: policy.actionClass };
  }
  return { allowed: true, reason: 'ALLOWED', actionClass: policy.actionClass };
}

export function runSafeAction(actionType: string, role: CorporateRole): { status: string; runId: string; result: string } {
  const gate = canExecute(actionType, role);
  const runId = `run_${Date.now()}`;
  if (!gate.allowed) {
    corporateStore().automationRuns.unshift({
      runId,
      actionType,
      status: gate.actionClass === 'HIGH_RISK_APPROVAL_REQUIRED' ? 'PENDING_APPROVAL' : 'BLOCKED',
      createdAt: new Date().toISOString(),
      result: gate.reason,
    });
    writeAudit(role, 'AUTOMATION_BLOCKED', actionType, gate.reason);
    return { status: 'BLOCKED', runId, result: gate.reason };
  }
  let result = 'ok';
  if (actionType === 'refresh_kpi_snapshots') result = `events=${listEvents().length}`;
  if (actionType === 'generate_executive_brief') result = `health=${getLastHealth()?.overall || 'UNKNOWN'}`;
  corporateStore().automationRuns.unshift({
    runId,
    actionType,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    result,
  });
  writeAudit(role, 'AUTOMATION_COMPLETED', actionType, result);
  return { status: 'COMPLETED', runId, result };
}
