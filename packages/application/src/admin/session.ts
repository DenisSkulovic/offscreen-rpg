import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  adminAuditEvent,
  adminCapabilityAssignment,
  adminStaffPrincipal,
  adminStaffSession,
} from '@offscreen/db/admin-schema';
import {
  ADMIN_BOOTSTRAP_PACKAGE_ID,
  ADMIN_BOOTSTRAP_PACKAGE_VERSION,
  type AdminSelfV1,
} from '@offscreen/contracts/admin';
import { mintAdminToken, digestAdminToken } from './token.js';

export const ADMIN_LOGIN_FRESHNESS_MS = 15 * 60 * 1000;
export const ADMIN_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
export const ADMIN_IDLE_TTL_MS = 30 * 60 * 1000;

export type AdminSessionErrorCode =
  | 'unauthenticated'
  | 'staff_session_required'
  | 'not_authorized'
  | 'step_up_required'
  | 'conflict'
  | 'unavailable';

export class AdminSessionError extends Error {
  readonly code: AdminSessionErrorCode;
  constructor(code: AdminSessionErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export type AdminActor = Readonly<{
  staffPrincipalId: string;
  adminSessionId: string;
  authUserId: string;
  authSessionId: string;
  accessEpoch: number;
  status: 'active' | 'suspended';
  sessionExpiresAt: Date;
  idleExpiresAt: Date;
}>;

function toSelf(
  actor: AdminActor,
  status: 'active' | 'suspended',
): AdminSelfV1 {
  return {
    version: 1,
    staffPrincipalId: actor.staffPrincipalId,
    status,
    accessEpoch: actor.accessEpoch,
    sessionExpiresAt: actor.sessionExpiresAt.toISOString(),
    idleExpiresAt: actor.idleExpiresAt.toISOString(),
    workspaceFamilies: [],
  };
}

async function appendAudit(
  database: Database,
  input: {
    kind: string;
    staffPrincipalId?: string | null;
    authUserId?: string | null;
    payload?: unknown;
  },
) {
  await database.db.insert(adminAuditEvent).values({
    kind: input.kind,
    staffPrincipalId: input.staffPrincipalId ?? null,
    authUserId: input.authUserId ?? null,
    payload: input.payload ?? {},
  });
}

export function createAdminSessions(database: Database) {
  return {
    async enter(input: {
      authUserId: string;
      authSessionId: string;
      authSessionCreatedAt: Date;
      now?: Date;
    }): Promise<{ token: string; self: AdminSelfV1 }> {
      const now = input.now ?? new Date();
      if (
        now.getTime() - input.authSessionCreatedAt.getTime() >
        ADMIN_LOGIN_FRESHNESS_MS
      ) {
        await appendAudit(database, {
          kind: 'admin.session.enter_denied',
          authUserId: input.authUserId,
          payload: { reason: 'stale_login' },
        });
        throw new AdminSessionError('step_up_required');
      }

      const [principal] = await database.db
        .select()
        .from(adminStaffPrincipal)
        .where(eq(adminStaffPrincipal.authUserId, input.authUserId))
        .limit(1);

      if (!principal || principal.status !== 'active') {
        await appendAudit(database, {
          kind: 'admin.session.enter_denied',
          authUserId: input.authUserId,
          staffPrincipalId: principal?.id ?? null,
          payload: { reason: principal ? 'inactive' : 'not_staff' },
        });
        throw new AdminSessionError('not_authorized');
      }

      const { token, digest } = mintAdminToken();
      const expiresAt = new Date(now.getTime() + ADMIN_ABSOLUTE_TTL_MS);
      const idleExpiresAt = new Date(now.getTime() + ADMIN_IDLE_TTL_MS);

      const [row] = await database.db
        .insert(adminStaffSession)
        .values({
          staffPrincipalId: principal.id,
          authSessionId: input.authSessionId,
          tokenDigest: digest,
          purpose: 'admin',
          accessEpochAtIssue: principal.accessEpoch,
          expiresAt,
          idleExpiresAt,
          createdAt: now,
          lastSeenAt: now,
        })
        .returning({ id: adminStaffSession.id });

      if (!row) throw new AdminSessionError('unavailable');

      await appendAudit(database, {
        kind: 'admin.session.enter',
        staffPrincipalId: principal.id,
        authUserId: input.authUserId,
        payload: { adminSessionId: row.id },
      });

      return {
        token,
        self: toSelf(
          {
            staffPrincipalId: principal.id,
            adminSessionId: row.id,
            authUserId: input.authUserId,
            authSessionId: input.authSessionId,
            accessEpoch: principal.accessEpoch,
            status: principal.status,
            sessionExpiresAt: expiresAt,
            idleExpiresAt,
          },
          principal.status,
        ),
      };
    },

    async resolve(input: {
      token: string;
      authUserId: string;
      authSessionId: string;
      now?: Date;
      touch?: boolean;
    }): Promise<{ actor: AdminActor; self: AdminSelfV1 }> {
      const now = input.now ?? new Date();
      const digest = digestAdminToken(input.token);
      const [row] = await database.db
        .select({
          session: adminStaffSession,
          principal: adminStaffPrincipal,
        })
        .from(adminStaffSession)
        .innerJoin(
          adminStaffPrincipal,
          eq(adminStaffSession.staffPrincipalId, adminStaffPrincipal.id),
        )
        .where(
          and(
            eq(adminStaffSession.tokenDigest, digest),
            isNull(adminStaffSession.revokedAt),
          ),
        )
        .limit(1);

      if (!row) throw new AdminSessionError('staff_session_required');

      const { session, principal } = row;
      if (
        session.authSessionId !== input.authSessionId ||
        principal.authUserId !== input.authUserId
      ) {
        throw new AdminSessionError('staff_session_required');
      }
      if (principal.status !== 'active') {
        throw new AdminSessionError('not_authorized');
      }
      if (session.accessEpochAtIssue !== principal.accessEpoch) {
        throw new AdminSessionError('staff_session_required');
      }
      if (session.expiresAt.getTime() <= now.getTime()) {
        throw new AdminSessionError('staff_session_required');
      }
      if (session.idleExpiresAt.getTime() <= now.getTime()) {
        throw new AdminSessionError('staff_session_required');
      }

      let idleExpiresAt = session.idleExpiresAt;
      if (input.touch !== false) {
        idleExpiresAt = new Date(now.getTime() + ADMIN_IDLE_TTL_MS);
        const absoluteCap = session.expiresAt;
        if (idleExpiresAt.getTime() > absoluteCap.getTime()) {
          idleExpiresAt = absoluteCap;
        }
        await database.db
          .update(adminStaffSession)
          .set({ lastSeenAt: now, idleExpiresAt })
          .where(eq(adminStaffSession.id, session.id));
      }

      const actor: AdminActor = {
        staffPrincipalId: principal.id,
        adminSessionId: session.id,
        authUserId: principal.authUserId,
        authSessionId: session.authSessionId,
        accessEpoch: principal.accessEpoch,
        status: principal.status,
        sessionExpiresAt: session.expiresAt,
        idleExpiresAt,
      };
      return { actor, self: toSelf(actor, principal.status) };
    },

    async exit(input: {
      token: string | null;
      authUserId: string;
      authSessionId: string | null;
      now?: Date;
    }): Promise<void> {
      const now = input.now ?? new Date();
      if (!input.token) {
        await appendAudit(database, {
          kind: 'admin.session.exit',
          authUserId: input.authUserId,
          payload: { idempotent: true },
        });
        return;
      }
      const digest = digestAdminToken(input.token);
      const [row] = await database.db
        .select()
        .from(adminStaffSession)
        .where(eq(adminStaffSession.tokenDigest, digest))
        .limit(1);

      if (!row || row.revokedAt) {
        await appendAudit(database, {
          kind: 'admin.session.exit',
          authUserId: input.authUserId,
          payload: { idempotent: true },
        });
        return;
      }

      if (
        input.authSessionId &&
        row.authSessionId !== input.authSessionId
      ) {
        throw new AdminSessionError('staff_session_required');
      }

      await database.db
        .update(adminStaffSession)
        .set({ revokedAt: now })
        .where(
          and(
            eq(adminStaffSession.id, row.id),
            isNull(adminStaffSession.revokedAt),
          ),
        );

      await appendAudit(database, {
        kind: 'admin.session.exit',
        staffPrincipalId: row.staffPrincipalId,
        authUserId: input.authUserId,
        payload: { adminSessionId: row.id },
      });
    },
  };
}

export type AdminSessions = ReturnType<typeof createAdminSessions>;

export async function bootstrapAdminStaff(
  database: Database,
  input: {
    authUserId: string;
    environment: 'local' | 'staging' | 'production';
    actorLabel: string;
  },
): Promise<{ staffPrincipalId: string; assignmentId: string; created: boolean }> {
  if (input.environment === 'production') {
    throw new AdminSessionError(
      'not_authorized',
      'Production staff bootstrap is blocked in this CLI',
    );
  }

  const existing = await database.db
    .select()
    .from(adminStaffPrincipal)
    .where(eq(adminStaffPrincipal.authUserId, input.authUserId))
    .limit(1);

  if (existing[0]) {
    await appendAudit(database, {
      kind: 'admin.bootstrap.idempotent',
      staffPrincipalId: existing[0].id,
      authUserId: input.authUserId,
      payload: {
        environment: input.environment,
        actorLabel: input.actorLabel,
      },
    });
    const [assignment] = await database.db
      .select()
      .from(adminCapabilityAssignment)
      .where(eq(adminCapabilityAssignment.staffPrincipalId, existing[0].id))
      .limit(1);
    return {
      staffPrincipalId: existing[0].id,
      assignmentId: assignment?.id ?? '',
      created: false,
    };
  }

  const [principal] = await database.db
    .insert(adminStaffPrincipal)
    .values({
      authUserId: input.authUserId,
      status: 'active',
      accessEpoch: 1,
    })
    .returning();

  if (!principal) throw new AdminSessionError('unavailable');

  const [assignment] = await database.db
    .insert(adminCapabilityAssignment)
    .values({
      staffPrincipalId: principal.id,
      packageId: ADMIN_BOOTSTRAP_PACKAGE_ID,
      packageVersion: ADMIN_BOOTSTRAP_PACKAGE_VERSION,
      status: 'inert',
      scope: { environment: input.environment },
      provenance: {
        kind: 'cli-bootstrap',
        actorLabel: input.actorLabel,
        environment: input.environment,
      },
    })
    .returning({ id: adminCapabilityAssignment.id });

  if (!assignment) throw new AdminSessionError('unavailable');

  await appendAudit(database, {
    kind: 'admin.bootstrap.created',
    staffPrincipalId: principal.id,
    authUserId: input.authUserId,
    payload: {
      environment: input.environment,
      actorLabel: input.actorLabel,
      packageId: ADMIN_BOOTSTRAP_PACKAGE_ID,
      packageVersion: ADMIN_BOOTSTRAP_PACKAGE_VERSION,
      assignmentId: assignment.id,
      assignmentStatus: 'inert',
    },
  });

  return {
    staffPrincipalId: principal.id,
    assignmentId: assignment.id,
    created: true,
  };
}
