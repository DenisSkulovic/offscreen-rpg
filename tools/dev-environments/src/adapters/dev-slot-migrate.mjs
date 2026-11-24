import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyDevTenantMigration, DEV_SQL_MIGRATION_LIVE } from '../rendering/dev-sql-tenant-grants.mjs';
import { deriveDevSqlTenant } from '../rendering/dev-sql-tenant-contract.mjs';

/**
 * Run Drizzle as the slot migration role through a short-lived port-forward.
 * The password stays in the client config and is not written to the result.
 *
 * @param {{ slotId: string }} owner
 * @param {string} worktree
 */
export async function migrateOwnedDevSlot(owner, worktree) {
  const names = deriveDevSqlTenant(owner.slotId);
  const built = resolve(worktree, 'packages/db/dist/src/migrate.js');
  if (!existsSync(built)) {
    const compiled = spawnSync('pnpm', ['--filter', '@offscreen/db', 'build'], { cwd: worktree, encoding: 'utf8' });
    if (compiled.status !== 0 || !existsSync(built)) {
      return { ok: false, refusals: [{ id: 'migrate-build', detail: 'packages/db build is missing' }] };
    }
  }
  const localPort = 16000 + Number(names.digits);
  const forward = spawn('kubectl', [
    '--context', 'kind-offscreen-dev', '-n', 'offscreen-dev-postgres',
    'port-forward', 'pod/dev-pg-1', `${localPort}:5432`,
  ], { stdio: 'ignore' });
  const secretRaw = spawnSync('kubectl', [
    '--context', 'kind-offscreen-dev', '-n', 'offscreen-dev-postgres',
    'get', 'secret', names.migrationSecret, '-o', 'json',
  ], { encoding: 'utf8' });
  if (secretRaw.status !== 0) {
    forward.kill('SIGTERM');
    return { ok: false, refusals: [{ id: 'migration-secret', detail: names.migrationSecret }] };
  }
  const password = Buffer.from(JSON.parse(secretRaw.stdout).data.password, 'base64').toString();
  const uri = `postgresql://${names.migrationRole}:${encodeURIComponent(password)}@127.0.0.1:${localPort}/${names.database}?sslmode=disable`;
  const nodeRequire = createRequire(resolve(worktree, 'packages/db/package.json'));
  const { Client } = nodeRequire('pg');
  const { applyMigrations } = await import(pathToFileURL(built).href);
  const admin = new Client({ connectionString: uri, connectionTimeoutMillis: 5000 });
  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await admin.connect();
        break;
      } catch (error) {
        if (attempt === 19) throw error;
        await new Promise((resolveWait) => setTimeout(resolveWait, 300));
      }
    }
    return await applyDevTenantMigration({
      slotId: owner.slotId,
      currentUser: names.migrationRole,
      authorizeLive: DEV_SQL_MIGRATION_LIVE,
      applyMigrations: () => applyMigrations({
        connectionString: uri,
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 60000,
        idleTimeoutMillis: 30000,
      }, resolve(worktree, 'packages/db/migrations')),
      execSql: (sql) => admin.query(sql),
      verify: async () => {
        const count = await admin.query('SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations');
        const privileges = await admin.query(
          `SELECT has_schema_privilege($1, 'public', 'CREATE') AS runtime_create, to_regclass('public.account') IS NOT NULL AS account`,
          [names.runtimeRole],
        );
        const appliedMigrations = count.rows[0].count;
        const ready = appliedMigrations === 25
          && privileges.rows[0].runtime_create === false
          && privileges.rows[0].account === true;
        return { ok: ready, appliedMigrations };
      },
    });
  } catch {
    return { ok: false, refusals: [{ id: 'migration-failed', detail: 'migration runner failed' }] };
  } finally {
    try { await admin.end(); } catch { /* not connected */ }
    forward.kill('SIGTERM');
  }
}
