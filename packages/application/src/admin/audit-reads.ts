import { and, desc, eq, lt } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { adminAuditEvent } from '@offscreen/db/admin-schema';
import type {
  AdminAuditEventV1,
  AdminAuditPageV1,
  AdminGrantScopeSummaryV1,
  AdminStaffAccessV1,
} from '@offscreen/contracts/admin';
import { getAdminPackage, type AdminGrantScope } from './registry.js';
import type { IntactGrantAssignment } from './policy.js';

const PAGE_SIZE = 20;

/** Closed allowlist — unknown kinds are omitted, not echoed with raw payload. */
const SAFE_AUDIT_KINDS = new Set([
  'admin.session.enter',
  'admin.session.enter_denied',
  'admin.session.exit',
  'admin.bootstrap.created',
  'admin.bootstrap.idempotent',
  'admin.access.denied',
  'admin.access.checked',
]);

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function summarizeGrantScope(
  scope: AdminGrantScope,
): AdminGrantScopeSummaryV1 {
  return {
    environments: [...scope.environments],
    playerScope:
      scope.playerIds && scope.playerIds.length > 0 ? 'named' : 'any',
    campaignScope:
      scope.campaignIds && scope.campaignIds.length > 0 ? 'named' : 'any',
    accountScope:
      scope.accountIds && scope.accountIds.length > 0 ? 'named' : 'any',
  };
}

export function projectStaffAccess(
  staffPrincipalId: string,
  assignments: readonly IntactGrantAssignment[],
): AdminStaffAccessV1 {
  return {
    version: 1,
    staffPrincipalId,
    packages: assignments.map((assignment) => {
      const pkg = getAdminPackage(
        assignment.packageId,
        assignment.packageVersion,
      );
      const workspaceFamilies = pkg
        ? [...new Set(pkg.grants.map((grant) => grant.workspaceFamily))].sort()
        : [];
      return {
        packageId: assignment.packageId,
        packageVersion: assignment.packageVersion,
        status: assignment.status,
        workspaceFamilies,
        scope: summarizeGrantScope(assignment.scope),
        provenanceKind: assignment.provenance.kind.slice(0, 64) || 'unknown',
      };
    }),
  };
}

export function projectAuditEvent(input: {
  id: string;
  kind: string;
  createdAt: Date | string;
  staffPrincipalId: string | null;
  payload: unknown;
}): AdminAuditEventV1 | null {
  if (!SAFE_AUDIT_KINDS.has(input.kind)) return null;
  let reasonCode: string | undefined;
  if (
    input.payload &&
    typeof input.payload === 'object' &&
    'reason' in input.payload &&
    typeof (input.payload as { reason?: unknown }).reason === 'string'
  ) {
    const reason = (input.payload as { reason: string }).reason.slice(0, 64);
    if (/^[a-z0-9._-]+$/i.test(reason)) reasonCode = reason;
  }
  return {
    id: input.id,
    kind: input.kind,
    createdAt: toIso(input.createdAt),
    staffPrincipalId: input.staffPrincipalId,
    ...(reasonCode ? { reasonCode } : {}),
  };
}

export function createAdminAuditReads(database: Database) {
  return {
    async listAuditEvents(input: {
      cursor?: string | null;
      staffPrincipalId?: string | null;
    }): Promise<AdminAuditPageV1> {
      const filters = [];
      if (input.cursor) {
        filters.push(lt(adminAuditEvent.createdAt, new Date(input.cursor)));
      }
      if (input.staffPrincipalId) {
        filters.push(
          eq(adminAuditEvent.staffPrincipalId, input.staffPrincipalId),
        );
      }

      const rows = await database.db
        .select({
          id: adminAuditEvent.id,
          kind: adminAuditEvent.kind,
          createdAt: adminAuditEvent.createdAt,
          staffPrincipalId: adminAuditEvent.staffPrincipalId,
          payload: adminAuditEvent.payload,
        })
        .from(adminAuditEvent)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(adminAuditEvent.createdAt))
        .limit(PAGE_SIZE * 3);

      const items: AdminAuditEventV1[] = [];
      for (const row of rows) {
        const projected = projectAuditEvent(row);
        if (!projected) continue;
        items.push(projected);
        if (items.length >= PAGE_SIZE) break;
      }

      const next =
        rows.length > PAGE_SIZE && items.length > 0
          ? items[items.length - 1]!.createdAt
          : null;

      return {
        version: 1,
        items,
        nextCursor: next,
        coverage: 'since-enabled',
      };
    },
  };
}

export type AdminAuditReads = ReturnType<typeof createAdminAuditReads>;
