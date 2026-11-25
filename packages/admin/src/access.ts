import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { adminCapabilityAssignment } from './persistence/schema.js';
import {
  evaluateAdminAccess,
  workspaceFamiliesFromAssignments,
  type AdminAccessRequest,
  type AdminAccessResult,
  type IntactGrantAssignment,
} from './policy.js';
import type { AdminEnvironment, AdminGrantScope } from './registry.js';
import { AdminSessionError, type AdminActor } from './session.js';

function parseScope(raw: unknown): AdminGrantScope {
  if (!raw || typeof raw !== 'object') {
    return { environments: [] };
  }
  const value = raw as Record<string, unknown>;
  const environments: AdminEnvironment[] = Array.isArray(value.environments)
    ? value.environments.filter(
        (entry): entry is AdminEnvironment =>
          entry === 'local' || entry === 'staging' || entry === 'production',
      )
    : value.environment === 'local' ||
        value.environment === 'staging' ||
        value.environment === 'production'
      ? [value.environment]
      : [];
  return {
    environments,
    ...(Array.isArray(value.playerIds)
      ? { playerIds: value.playerIds.filter((id) => typeof id === 'string') }
      : {}),
    ...(Array.isArray(value.campaignIds)
      ? {
          campaignIds: value.campaignIds.filter((id) => typeof id === 'string'),
        }
      : {}),
    ...(Array.isArray(value.accountIds)
      ? {
          accountIds: value.accountIds.filter((id) => typeof id === 'string'),
        }
      : {}),
    ...(Array.isArray(value.caseIds)
      ? { caseIds: value.caseIds.filter((id) => typeof id === 'string') }
      : {}),
    ...(value.requireAuthorizedCaseAssignment === true
      ? { requireAuthorizedCaseAssignment: true }
      : {}),
  };
}

function parseProvenance(raw: unknown): IntactGrantAssignment['provenance'] {
  if (!raw || typeof raw !== 'object') return { kind: 'unknown' };
  const value = raw as Record<string, unknown>;
  return {
    kind: typeof value.kind === 'string' ? value.kind : 'unknown',
    ...(Array.isArray(value.authorizedCaseIds)
      ? {
          authorizedCaseIds: value.authorizedCaseIds.filter(
            (id) => typeof id === 'string',
          ),
        }
      : {}),
  };
}

export function createAdminAccess(database: Database) {
  return {
    async listAssignments(
      staffPrincipalId: string,
    ): Promise<IntactGrantAssignment[]> {
      const rows = await database.db
        .select()
        .from(adminCapabilityAssignment)
        .where(eq(adminCapabilityAssignment.staffPrincipalId, staffPrincipalId));
      return rows.map((row) => ({
        assignmentId: row.id,
        packageId: row.packageId,
        packageVersion: row.packageVersion,
        status: row.status,
        scope: parseScope(row.scope),
        expiresAt: null,
        provenance: parseProvenance(row.provenance),
      }));
    },

    async workspaceFamilies(staffPrincipalId: string): Promise<string[]> {
      const assignments = await this.listAssignments(staffPrincipalId);
      return workspaceFamiliesFromAssignments(assignments);
    },

    async evaluate(
      actor: AdminActor,
      request: AdminAccessRequest,
    ): Promise<AdminAccessResult> {
      const assignments = await this.listAssignments(actor.staffPrincipalId);
      return evaluateAdminAccess(assignments, request);
    },

    async requireCapability(
      actor: AdminActor,
      request: AdminAccessRequest,
    ): Promise<AdminAccessResult> {
      const result = await this.evaluate(actor, request);
      if (result.decision === 'allow') return result;
      if (result.decision === 'step_up_required') {
        throw new AdminSessionError('step_up_required');
      }
      // Privacy: do not distinguish missing vs forbidden resources to callers.
      throw new AdminSessionError('not_authorized');
    },

    /** Promote inert bootstrap/assignment to active once AD02 registry applies. */
    async activateAssignment(input: {
      assignmentId: string;
      staffPrincipalId: string;
    }): Promise<{ activated: boolean }> {
      const updated = await database.db
        .update(adminCapabilityAssignment)
        .set({ status: 'active' })
        .where(
          and(
            eq(adminCapabilityAssignment.id, input.assignmentId),
            eq(adminCapabilityAssignment.staffPrincipalId, input.staffPrincipalId),
            eq(adminCapabilityAssignment.status, 'inert'),
          ),
        )
        .returning({ id: adminCapabilityAssignment.id });
      return { activated: updated.length > 0 };
    },
  };
}

export type AdminAccess = ReturnType<typeof createAdminAccess>;
