import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { quoteSqlIdent } from './dev-sql-tenant-reconciler.mjs';

const GATE = 'offscreen_dev_schema_gate';

function refusal(id, detail) {
  return { ok: false, mutated: false, refusals: [{ id, detail }] };
}

export function devTenantGrantStatements(slotId) {
  const names = deriveDevSqlTenant(slotId);
  const mig = quoteSqlIdent(names.migrationRole);
  const run = quoteSqlIdent(names.runtimeRole);
  const gate = quoteSqlIdent(GATE);
  return [
    `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
    `GRANT USAGE, CREATE ON SCHEMA public TO ${mig}`,
    `GRANT USAGE ON SCHEMA public TO ${run}`,
    `REVOKE CREATE ON SCHEMA public FROM ${run}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${mig} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${run}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${mig} IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${run}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${run}`,
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${run}`,
    `CREATE TABLE IF NOT EXISTS public.${gate} (slot text PRIMARY KEY)`,
    `INSERT INTO public.${gate} (slot) VALUES ('${names.slotId}') ON CONFLICT (slot) DO NOTHING`,
    `GRANT SELECT ON public.${gate} TO ${run}`,
  ];
}

export function planDevTenantGrants(slotId) {
  return { slotId, readOnly: true, statements: devTenantGrantStatements(slotId) };
}

export function assertDevRuntimeReady({ slotId, currentUser, gatePresent, schemaCreate }) {
  const names = deriveDevSqlTenant(slotId);
  if (currentUser !== names.runtimeRole) return refusal('runtime-role', currentUser ?? 'missing');
  if (schemaCreate === true) return refusal('runtime-can-create', names.runtimeRole);
  if (gatePresent !== true) return refusal('migration-not-ready', names.database);
  return { ok: true, refusals: [] };
}

export function applyDevTenantMigration({ slotId, currentUser, authorizeLive, applyMigrations, execSql }) {
  if (authorizeLive !== 'dev-1-migration-live') return refusal('migration-not-authorized', 'live tenant migration remains held');
  if (slotId !== 'dev-1') return refusal('slot-not-in-scope', slotId ?? 'missing');
  const names = deriveDevSqlTenant(slotId);
  if (currentUser !== names.migrationRole) return refusal('migration-role', currentUser ?? 'missing');
  applyMigrations({ role: names.migrationRole, searchPath: 'public', lock: 683291351 });
  const statements = devTenantGrantStatements(slotId);
  for (const sql of statements) execSql(sql);
  return { ok: true, mutated: true, refusals: [], statements: statements.length, owner: names.migrationRole };
}
