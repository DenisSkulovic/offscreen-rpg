import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { quoteSqlIdent } from '../adapters/dev-sql-tenant-reconciler.mjs';

const GATE = 'offscreen_dev_schema_gate';
export const DEV_SQL_MIGRATION_LIVE = 'kind-offscreen-dev-sql-migration-live';

function refusal(id, detail) {
  return { ok: false, mutated: false, refusals: [{ id, detail }] };
}

export function devTenantMigrationPrep(slotId) {
  const mig = quoteSqlIdent(deriveDevSqlTenant(slotId).migrationRole);
  return [
    `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
    `GRANT USAGE, CREATE ON SCHEMA public TO ${mig}`,
  ];
}

export function devTenantRuntimeGrants(slotId) {
  const names = deriveDevSqlTenant(slotId);
  const mig = quoteSqlIdent(names.migrationRole);
  const run = quoteSqlIdent(names.runtimeRole);
  return [
    `GRANT USAGE ON SCHEMA public TO ${run}`,
    `REVOKE CREATE ON SCHEMA public FROM ${run}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${mig} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${run}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${mig} IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${run}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${run}`,
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${run}`,
  ];
}

export function planDevTenantGrants(slotId) {
  return { slotId, readOnly: true, migrationPrep: devTenantMigrationPrep(slotId), runtimeGrants: devTenantRuntimeGrants(slotId) };
}

export function assertDevRuntimeReady({ slotId, currentUser, gatePresent, schemaCreate, appliedMigrations, expectedMigrations }) {
  const names = deriveDevSqlTenant(slotId);
  if (currentUser !== names.runtimeRole) return refusal('runtime-role', currentUser ?? 'missing');
  if (schemaCreate === true) return refusal('runtime-can-create', names.runtimeRole);
  if (appliedMigrations !== expectedMigrations) return refusal('migrations-incomplete', `${appliedMigrations ?? 0}/${expectedMigrations ?? 0}`);
  if (gatePresent !== true) return refusal('migration-not-ready', names.database);
  return { ok: true, refusals: [] };
}

export async function applyDevTenantMigration({ slotId, currentUser, authorizeLive, applyMigrations, execSql, verify, verifyRuntimeGate }) {
  if (authorizeLive !== DEV_SQL_MIGRATION_LIVE && authorizeLive !== 'dev-1-migration-live') {
    return refusal('migration-not-authorized', 'live tenant migration remains held');
  }
  const names = deriveDevSqlTenant(slotId);
  if (currentUser !== names.migrationRole) return refusal('migration-role', currentUser ?? 'missing');
  for (const sql of devTenantMigrationPrep(slotId)) await execSql(sql);
  await applyMigrations({ role: names.migrationRole, searchPath: 'public', lock: 683291351 });
  for (const sql of devTenantRuntimeGrants(slotId)) await execSql(sql);
  const proof = (await verify?.()) ?? { ok: false };
  if (proof.ok !== true) return { ok: false, mutated: true, refusals: [{ id: 'schema-not-verified', detail: names.database }] };
  const gate = quoteSqlIdent(GATE);
  const run = quoteSqlIdent(names.runtimeRole);
  const record = `INSERT INTO public.${gate} (slot, migrations) VALUES ('${names.slotId}', ${proof.appliedMigrations}) ON CONFLICT (slot) DO UPDATE SET migrations = EXCLUDED.migrations`;
  const gateStatements = [
    `CREATE TABLE IF NOT EXISTS public.${gate} (slot text PRIMARY KEY, migrations integer NOT NULL)`,
    record,
    `GRANT SELECT ON public.${gate} TO ${run}`,
    `REVOKE INSERT, UPDATE, DELETE ON public.${gate} FROM ${run}`,
  ];
  for (const sql of gateStatements) {
    await execSql(sql);
  }
  const privileges = await execSql(
    `SELECT current_user AS writer,
            has_table_privilege('${names.runtimeRole}', 'public.${GATE}', 'INSERT') AS runtime_insert,
            has_table_privilege('${names.runtimeRole}', 'public.${GATE}', 'SELECT') AS runtime_select`,
  );
  const row = privileges?.rows?.[0];
  if (row) {
    if (row.writer !== names.migrationRole) {
      return {
        ok: false,
        mutated: true,
        refusals: [{ id: 'gate-writer', detail: names.database }],
      };
    }
    if (row.runtime_insert === true || row.runtime_select !== true) {
      return {
        ok: false,
        mutated: true,
        refusals: [{ id: 'gate-privileges', detail: names.database }],
      };
    }
  }
  if (verifyRuntimeGate) {
    const runtimeGate = await verifyRuntimeGate();
    if (runtimeGate?.ok !== true) {
      return {
        ok: false,
        mutated: true,
        refusals: [{ id: 'gate-runtime-read', detail: names.database }],
      };
    }
    if (runtimeGate.currentUser !== names.runtimeRole) {
      return {
        ok: false,
        mutated: true,
        refusals: [{ id: 'gate-runtime-role', detail: names.runtimeRole }],
      };
    }
  }
  return { ok: true, mutated: true, refusals: [], owner: names.migrationRole, appliedMigrations: proof.appliedMigrations };
}
