import {
  getAdminPackage,
  isAdminCapability,
  isAdminResourceKind,
  type AdminCapability,
  type AdminEnvironment,
  type AdminGrantScope,
  type AdminResourceKind,
} from './registry.js';

export type AdminAccessDecision =
  | 'allow'
  | 'deny'
  | 'approval_required'
  | 'step_up_required'
  | 'unavailable';

export type AdminAccessReason =
  | 'allowed'
  | 'unknown_capability'
  | 'unknown_resource_kind'
  | 'no_active_assignment'
  | 'package_missing'
  | 'capability_not_in_package'
  | 'resource_kind_mismatch'
  | 'environment_mismatch'
  | 'resource_out_of_scope'
  | 'case_assignment_required'
  | 'case_assignment_unproven'
  | 'assignment_expired'
  | 'assignment_inert'
  | 'assignment_revoked'
  | 'hard_prohibition';

export type IntactGrantAssignment = Readonly<{
  assignmentId: string;
  packageId: string;
  packageVersion: number;
  status: 'inert' | 'active' | 'revoked';
  scope: AdminGrantScope;
  /** Optional absolute expiry on the assignment row. */
  expiresAt?: Date | null;
  provenance: Readonly<{
    kind: string;
    /** Authorized case IDs that may satisfy requireAuthorizedCaseAssignment. */
    authorizedCaseIds?: readonly string[];
  }>;
}>;

export type AdminAccessRequest = Readonly<{
  capability: string;
  resourceKind: string;
  resourceId?: string | null;
  environment: AdminEnvironment;
  /** Case claimed for this request; never self-authorizing without provenance. */
  caseId?: string | null;
  now?: Date;
}>;

export type AdminAccessResult = Readonly<{
  decision: AdminAccessDecision;
  reason: AdminAccessReason;
  /** Opaque for audit; never echo private titles. */
  decisionId: string;
  matchedAssignmentId?: string;
  matchedPackageId?: string;
}>;

function scopeAllowsResource(
  scope: AdminGrantScope,
  resourceKind: AdminResourceKind,
  resourceId: string | null | undefined,
): boolean {
  if (resourceKind === 'player' && scope.playerIds && scope.playerIds.length > 0) {
    if (!resourceId) return false;
    return scope.playerIds.includes(resourceId);
  }
  if (
    resourceKind === 'campaign' &&
    scope.campaignIds &&
    scope.campaignIds.length > 0
  ) {
    if (!resourceId) return false;
    return scope.campaignIds.includes(resourceId);
  }
  if (resourceKind === 'case' && scope.caseIds && scope.caseIds.length > 0) {
    if (!resourceId) return false;
    return scope.caseIds.includes(resourceId);
  }
  return true;
}

function evaluateOneGrant(
  assignment: IntactGrantAssignment,
  request: AdminAccessRequest,
  capability: AdminCapability,
  resourceKind: AdminResourceKind,
  now: Date,
): AdminAccessResult | null {
  if (assignment.status === 'inert') {
    return {
      decision: 'deny',
      reason: 'assignment_inert',
      decisionId: `deny:${assignment.assignmentId}:inert`,
    };
  }
  if (assignment.status === 'revoked') {
    return {
      decision: 'deny',
      reason: 'assignment_revoked',
      decisionId: `deny:${assignment.assignmentId}:revoked`,
    };
  }
  if (assignment.expiresAt && assignment.expiresAt.getTime() <= now.getTime()) {
    return {
      decision: 'deny',
      reason: 'assignment_expired',
      decisionId: `deny:${assignment.assignmentId}:expired`,
    };
  }

  const pkg = getAdminPackage(assignment.packageId, assignment.packageVersion);
  if (!pkg) {
    return {
      decision: 'deny',
      reason: 'package_missing',
      decisionId: `deny:${assignment.assignmentId}:package`,
    };
  }

  const grant = pkg.grants.find((entry) => entry.capability === capability);
  if (!grant) return null;
  if (!grant.resourceKinds.includes(resourceKind)) {
    return {
      decision: 'deny',
      reason: 'resource_kind_mismatch',
      decisionId: `deny:${assignment.assignmentId}:kind`,
    };
  }

  if (!assignment.scope.environments.includes(request.environment)) {
    return {
      decision: 'deny',
      reason: 'environment_mismatch',
      decisionId: `deny:${assignment.assignmentId}:env`,
    };
  }

  if (!scopeAllowsResource(assignment.scope, resourceKind, request.resourceId)) {
    return {
      decision: 'deny',
      reason: 'resource_out_of_scope',
      decisionId: `deny:${assignment.assignmentId}:scope`,
    };
  }

  if (assignment.scope.requireAuthorizedCaseAssignment) {
    const caseId = request.caseId;
    if (!caseId) {
      return {
        decision: 'deny',
        reason: 'case_assignment_required',
        decisionId: `deny:${assignment.assignmentId}:case-required`,
      };
    }
    const authorized = assignment.provenance.authorizedCaseIds ?? [];
    // Self-supplied caseId alone is never enough; provenance must list it.
    if (!authorized.includes(caseId)) {
      return {
        decision: 'deny',
        reason: 'case_assignment_unproven',
        decisionId: `deny:${assignment.assignmentId}:case-unproven`,
      };
    }
  }

  return {
    decision: 'allow',
    reason: 'allowed',
    decisionId: `allow:${assignment.assignmentId}`,
    matchedAssignmentId: assignment.assignmentId,
    matchedPackageId: pkg.id,
  };
}

/**
 * Pure complete-grant evaluator: union of intact grants, never Cartesian product.
 * First allow wins; otherwise a safe deny reason from the strongest nearby miss.
 */
export function evaluateAdminAccess(
  assignments: readonly IntactGrantAssignment[],
  request: AdminAccessRequest,
): AdminAccessResult {
  const now = request.now ?? new Date();
  if (!isAdminCapability(request.capability)) {
    return {
      decision: 'deny',
      reason: 'unknown_capability',
      decisionId: 'deny:unknown-capability',
    };
  }
  if (!isAdminResourceKind(request.resourceKind)) {
    return {
      decision: 'deny',
      reason: 'unknown_resource_kind',
      decisionId: 'deny:unknown-kind',
    };
  }

  const capability = request.capability;
  const resourceKind = request.resourceKind;
  let nearestDeny: AdminAccessResult | null = null;

  for (const assignment of assignments) {
    const result = evaluateOneGrant(
      assignment,
      request,
      capability,
      resourceKind,
      now,
    );
    if (!result) continue;
    if (result.decision === 'allow') return result;
    nearestDeny ??= result;
  }

  if (nearestDeny) return nearestDeny;
  return {
    decision: 'deny',
    reason: assignments.length === 0 ? 'no_active_assignment' : 'capability_not_in_package',
    decisionId: 'deny:no-match',
  };
}

export function workspaceFamiliesFromAssignments(
  assignments: readonly IntactGrantAssignment[],
): string[] {
  const families = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.status !== 'active') continue;
    const pkg = getAdminPackage(assignment.packageId, assignment.packageVersion);
    if (!pkg) continue;
    for (const grant of pkg.grants) {
      families.add(grant.workspaceFamily);
    }
  }
  return [...families].sort();
}
