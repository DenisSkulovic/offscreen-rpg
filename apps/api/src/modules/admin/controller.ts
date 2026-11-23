import type { Database } from '@offscreen/db';
import {
  createAdminAccess,
  createAdminAuditReads,
  createAdminCaseStore,
  createAdminDiagnosticsReads,
  createAdminPlayerReads,
  createAdminSituationReads,
  createAdminUsageReads,
  type AdminAccess,
  type AdminAuditReads,
  type AdminCaseStore,
  type AdminDiagnosticsReads,
  type AdminPlayerReads,
  type AdminSituationReads,
  type AdminUsageReads,
} from '@offscreen/admin';

export {
  ADMIN_ACCESS,
  ADMIN_AUDIT,
  ADMIN_CASES,
  ADMIN_DIAGNOSTICS,
  ADMIN_ENVIRONMENT,
  ADMIN_ORIGIN,
  ADMIN_PLAYER_READS,
  ADMIN_SESSIONS,
  ADMIN_SITUATION,
  ADMIN_USAGE,
  AdminActorService,
} from './admin-actor-service.js';

export { ADMIN_HTTP_CONTROLLERS } from './controllers/registry.js';

export function createAdminAccessProvider(database: Database): AdminAccess {
  return createAdminAccess(database);
}

export function createAdminPlayerReadsProvider(
  database: Database,
): AdminPlayerReads {
  return createAdminPlayerReads(database);
}

export function createAdminDiagnosticsReadsProvider(
  database: Database,
): AdminDiagnosticsReads {
  return createAdminDiagnosticsReads(database);
}

export function createAdminUsageReadsProvider(
  database: Database,
): AdminUsageReads {
  return createAdminUsageReads(database);
}

export function createAdminAuditReadsProvider(
  database: Database,
): AdminAuditReads {
  return createAdminAuditReads(database);
}

export function createAdminSituationReadsProvider(
  database: Database,
): AdminSituationReads {
  return createAdminSituationReads(database);
}

export function createAdminCaseStoreProvider(
  database: Database,
): AdminCaseStore {
  return createAdminCaseStore(database);
}
