import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE } from './dev-cnpg-bootstrap.mjs';
import {
  applyDevTenantMigration,
  DEV_SQL_MIGRATION_LIVE,
} from '../rendering/dev-sql-tenant-grants.mjs';
import { deriveDevSqlTenant } from '../rendering/dev-sql-tenant-contract.mjs';
import { probeLoopbackPortBindableSync } from '../domain/dev-worktree-allocator.mjs';

const LOOPBACK = '127.0.0.1';
const PG_SERVICE = 'service/dev-pg-rw';
const CONNECT_ATTEMPTS = 20;
const CONNECT_INTERVAL_MS = 300;
const FORWARD_READY_MS = 15_000;
const PG_FORWARD_TARGET_PORT = 5432;

function refusal(id, detail) {
  return { ok: false, refusals: [{ id, detail }] };
}

/**
 * @param {string} text
 */
export function redactMigrationFailure(text) {
  return String(text)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-url]')
    .replace(/password[=:]["']?[^\s"',]+/gi, 'password=[redacted]')
    .replace(/\b[A-Za-z0-9+/]{20,}={0,2}\b/g, (token) =>
      token.length >= 24 ? '[redacted]' : token,
    );
}

/**
 * @param {unknown} body
 * @param {ReturnType<typeof deriveDevSqlTenant>} names
 */
export function validateDevMigrationSecret(body, names) {
  if (!body || typeof body !== 'object') return refusal('migration-secret', 'malformed');
  const record = /** @type {{ metadata?: { name?: string, namespace?: string, labels?: Record<string, string> }, data?: Record<string, string> }} */ (body);
  if (record.metadata?.name !== names.migrationSecret) {
    return refusal('migration-secret', 'name');
  }
  if (record.metadata?.namespace !== names.namespace) {
    return refusal('migration-secret', 'namespace');
  }
  const labels = record.metadata?.labels ?? {};
  if (labels['offscreen.dev/owner'] !== 'offscreen-dev') {
    return refusal('migration-secret', 'owner-label');
  }
  if (labels['offscreen.dev/slot'] !== names.slotId) {
    return refusal('migration-secret', 'slot-label');
  }
  const usernameRaw = record.data?.username;
  const passwordRaw = record.data?.password;
  if (!usernameRaw || !passwordRaw) {
    return refusal('migration-secret', 'credentials');
  }
  const username = Buffer.from(usernameRaw, 'base64').toString('utf8');
  if (username !== names.migrationRole) {
    return refusal('migration-secret', 'username');
  }
  const password = Buffer.from(passwordRaw, 'base64').toString('utf8');
  if (!password) {
    return refusal('migration-secret', 'credentials');
  }
  return { ok: true, password, username };
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} port
 * @param {number} timeoutMs
 */
export function waitForPortForwardReady(child, port, timeoutMs = FORWARD_READY_MS) {
  const pattern = new RegExp(`Forwarding from ${LOOPBACK}:${port}(?: ->| )`);
  return new Promise((resolveReady) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveReady(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, id: 'port-forward-timeout', detail: 'port-forward did not become ready' }),
      timeoutMs,
    );
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      if (pattern.test(text)) {
        finish({ ok: true });
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', (code) => {
      finish({
        ok: false,
        id: 'port-forward-exited',
        detail: code === null ? 'port-forward exited' : `port-forward exited (${code})`,
      });
    });
  });
}

/**
 * @param {number} port
 * @param {(port: number) => Promise<import('node:child_process').ChildProcess>} [spawnForward]
 */
export async function startOwnedPgPortForward(port, spawnForward) {
  const spawn =
    spawnForward ??
    ((localPort) =>
      spawn(
        'kubectl',
        [
          '--context',
          DEV_CNPG_CONTEXT,
          '-n',
          DEV_CNPG_NAMESPACE,
          'port-forward',
          '--address',
          LOOPBACK,
          PG_SERVICE,
          `${localPort}:${PG_FORWARD_TARGET_PORT}`,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ));
  const child = await spawn(port);
  const ready = await waitForPortForwardReady(child, port);
  if (!ready.ok) {
    child.kill('SIGTERM');
    return { ok: false, refusal: { id: ready.id, detail: ready.detail } };
  }
  return {
    ok: true,
    async close() {
      if (child.exitCode !== null) return;
      const exited = new Promise((resolveExit) => {
        child.once('exit', () => resolveExit());
        setTimeout(resolveExit, 2000);
      });
      child.kill('SIGTERM');
      await exited;
    },
  };
}

/**
 * @param {string} worktree
 * @param {{ spawnSync?: typeof spawnSync }} [deps]
 */
export function buildMigrationPackage(worktree, deps = {}) {
  const run = deps.spawnSync ?? spawnSync;
  const built = resolve(worktree, 'packages/db/dist/src/migrate.js');
  const compiled = run('pnpm', ['--filter', '@offscreen/db', 'build'], {
    cwd: worktree,
    encoding: 'utf8',
  });
  if (compiled.status !== 0) {
    return refusal('migrate-build', redactMigrationFailure(compiled.stderr ?? 'packages/db build failed'));
  }
  return { ok: true, built };
}

/**
 * @param {string} worktree
 */
export async function loadCompiledMigrationModules(worktree) {
  const migrationsFolder = resolve(worktree, 'packages/db/migrations');
  const migratePath = resolve(worktree, 'packages/db/dist/src/migrate.js');
  const journalPath = resolve(worktree, 'packages/db/dist/src/migrations/journal.js');
  const { applyMigrations } = await import(pathToFileURL(migratePath).href);
  const { validateMigrationJournal, assertAppliedPrefix } = await import(
    pathToFileURL(journalPath).href
  );
  return {
    migrationsFolder,
    applyMigrations,
    validateMigrationJournal,
    assertAppliedPrefix,
  };
}

/**
 * @param {typeof import('pg').Client} Client
 * @param {string} uri
 * @param {{ attempts?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void> }} [options]
 */
export async function connectPgWithFreshAttempts(Client, uri, options = {}) {
  const attempts = options.attempts ?? CONNECT_ATTEMPTS;
  const intervalMs = options.intervalMs ?? CONNECT_INTERVAL_MS;
  const sleep = options.sleep ?? ((ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms)));
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const client = new Client({
      connectionString: uri,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // Not connected.
      }
      if (attempt === attempts - 1) break;
      await sleep(intervalMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('migration connection failed');
}

/**
 * @param {{ slotId: string, ports?: { spare?: number } }} owner
 * @param {string} worktree
 * @param {{
 *   spawnSync?: typeof spawnSync,
 *   probeSparePortFree?: (port: number) => boolean,
 *   buildPackage?: typeof buildMigrationPackage,
 *   loadModules?: typeof loadCompiledMigrationModules,
 *   startPortForward?: typeof startOwnedPgPortForward,
 *   getMigrationSecret?: (names: ReturnType<typeof deriveDevSqlTenant>) => { ok: boolean, body?: unknown, detail?: string },
 *   createPgClient?: (worktree: string) => typeof import('pg').Client,
 *   connectPg?: typeof connectPgWithFreshAttempts,
 *   sleep?: (ms: number) => Promise<void>,
 * }} [deps]
 */
export async function migrateOwnedDevSlot(owner, worktree, deps = {}) {
  const names = deriveDevSqlTenant(owner.slotId);
  const localPort = owner?.ports?.spare;
  if (!Number.isInteger(localPort) || localPort <= 0 || localPort > 65_535) {
    return refusal('spare-port', 'owner spare port is missing');
  }

  const buildPackage = deps.buildPackage ?? buildMigrationPackage;
  const built = buildPackage(worktree, deps);
  if (!built.ok) return built;

  const probeFree =
    deps.probeSparePortFree ??
    ((port) => probeLoopbackPortBindableSync(port));
  if (!probeFree(localPort)) {
    return refusal('foreign-port', `${LOOPBACK}:${localPort}`);
  }

  const loadModules = deps.loadModules ?? loadCompiledMigrationModules;
  let modules;
  try {
    modules = await loadModules(worktree);
  } catch (error) {
    return refusal(
      'migrate-build',
      redactMigrationFailure(error instanceof Error ? error.message : 'migration modules missing'),
    );
  }

  let verifiedEntries;
  try {
    verifiedEntries = modules.validateMigrationJournal(modules.migrationsFolder);
  } catch (error) {
    return refusal(
      'migration-journal',
      redactMigrationFailure(error instanceof Error ? error.message : 'journal invalid'),
    );
  }
  const expectedMigrations = verifiedEntries.length;

  const startPortForward = deps.startPortForward ?? startOwnedPgPortForward;
  const forward = await startPortForward(localPort, deps.spawnPortForward);
  if (!forward.ok) {
    return refusal(forward.refusal.id, forward.refusal.detail);
  }

  let admin;
  try {
    const getSecret =
      deps.getMigrationSecret ??
      ((tenantNames) => {
        const secretRaw = spawnSync(
          'kubectl',
          [
            '--context',
            DEV_CNPG_CONTEXT,
            '-n',
            DEV_CNPG_NAMESPACE,
            'get',
            'secret',
            tenantNames.migrationSecret,
            '-o',
            'json',
          ],
          { encoding: 'utf8' },
        );
        if (secretRaw.status !== 0) {
          return { ok: false, detail: tenantNames.migrationSecret };
        }
        try {
          return { ok: true, body: JSON.parse(secretRaw.stdout) };
        } catch {
          return { ok: false, detail: 'malformed' };
        }
      });

    const secretResult = getSecret(names);
    if (!secretResult.ok) {
      return refusal('migration-secret', secretResult.detail ?? names.migrationSecret);
    }
    const validated = validateDevMigrationSecret(secretResult.body, names);
    if (!validated.ok) return validated;

    const createPgClient =
      deps.createPgClient ??
      ((root) => {
        const nodeRequire = createRequire(resolve(root, 'packages/db/package.json'));
        return nodeRequire('pg').Client;
      });
    const Client = createPgClient(worktree);
    const password = validated.password;
    const uri = `postgresql://${names.migrationRole}:${encodeURIComponent(password)}@${LOOPBACK}:${localPort}/${names.database}?sslmode=disable`;

    const connectPg = deps.connectPg ?? connectPgWithFreshAttempts;
    admin = await connectPg(Client, uri, deps);

    const identity = await admin.query(
      'SELECT current_user AS role, current_database() AS current_database',
    );
    const role = identity.rows[0]?.role;
    const currentDatabase = identity.rows[0]?.current_database;
    if (role !== names.migrationRole) {
      return refusal('migration-role', redactMigrationFailure(String(role ?? 'missing')));
    }
    if (currentDatabase !== names.database) {
      return refusal('migration-database', redactMigrationFailure(String(currentDatabase ?? 'missing')));
    }

    const runtimeNames = {
      ...names,
      migrationSecret: names.runtimeSecret,
      migrationRole: names.runtimeRole,
    };
    const getRuntimeSecret =
      deps.getRuntimeSecret ??
      ((tenantNames) => {
        const secretRaw = spawnSync(
          'kubectl',
          [
            '--context',
            DEV_CNPG_CONTEXT,
            '-n',
            DEV_CNPG_NAMESPACE,
            'get',
            'secret',
            tenantNames.runtimeSecret,
            '-o',
            'json',
          ],
          { encoding: 'utf8' },
        );
        if (secretRaw.status !== 0) {
          return { ok: false, detail: tenantNames.runtimeSecret };
        }
        try {
          return { ok: true, body: JSON.parse(secretRaw.stdout) };
        } catch {
          return { ok: false, detail: 'malformed' };
        }
      });

    const migrationResult = await applyDevTenantMigration({
      slotId: owner.slotId,
      currentUser: names.migrationRole,
      authorizeLive: DEV_SQL_MIGRATION_LIVE,
      applyMigrations: () =>
        modules.applyMigrations(
          {
            connectionString: uri,
            max: 1,
            connectionTimeoutMillis: 5000,
            statement_timeout: 60_000,
            idle_in_transaction_session_timeout: 60_000,
            idleTimeoutMillis: 30_000,
          },
          modules.migrationsFolder,
        ),
      execSql: (sql) => admin.query(sql),
      verifyRuntimeGate:
        deps.skipRuntimeGateVerify === true
          ? undefined
          : async () => {
        const runtimeSecretResult = getRuntimeSecret(names);
        if (!runtimeSecretResult.ok) {
          return { ok: false, currentUser: null };
        }
        const validatedRuntime = validateDevMigrationSecret(
          runtimeSecretResult.body,
          runtimeNames,
        );
        if (!validatedRuntime.ok) {
          return { ok: false, currentUser: null };
        }
        const runtimeUri = `postgresql://${names.runtimeRole}:${encodeURIComponent(validatedRuntime.password)}@${LOOPBACK}:${localPort}/${names.database}?sslmode=disable&default_transaction_read_only=on`;
        const connectPg = deps.connectPg ?? connectPgWithFreshAttempts;
        let runtimeClient;
        try {
          runtimeClient = await connectPg(Client, runtimeUri, deps);
          const role = await runtimeClient.query('SELECT current_user AS role');
          const gate = await runtimeClient.query(
            'SELECT migrations FROM public.offscreen_dev_schema_gate WHERE slot = $1',
            [names.slotId],
          );
          const migrations = gate.rows[0]?.migrations;
          return {
            ok:
              gate.rows.length === 1 &&
              migrations === expectedMigrations &&
              role.rows[0]?.role === names.runtimeRole,
            currentUser: role.rows[0]?.role,
          };
        } catch {
          return { ok: false, currentUser: null };
        } finally {
          try {
            if (runtimeClient) await runtimeClient.end();
          } catch {
            // Not connected.
          }
        }
      },
      verify: async () => {
        const ledger = await admin.query(
          'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC',
        );
        try {
          modules.assertAppliedPrefix(verifiedEntries, ledger.rows);
        } catch (error) {
          return {
            ok: false,
            appliedMigrations: ledger.rows.length,
            detail: redactMigrationFailure(error instanceof Error ? error.message : 'prefix invalid'),
          };
        }
        if (ledger.rows.length !== expectedMigrations) {
          return { ok: false, appliedMigrations: ledger.rows.length };
        }
        const privileges = await admin.query(
          `SELECT has_schema_privilege($1, 'public', 'CREATE') AS runtime_create,
                  to_regclass('public.account') IS NOT NULL AS account`,
          [names.runtimeRole],
        );
        const appliedMigrations = ledger.rows.length;
        const ready =
          privileges.rows[0]?.runtime_create === false &&
          privileges.rows[0]?.account === true;
        return { ok: ready, appliedMigrations };
      },
    });

    if (migrationResult.ok !== true) {
      return migrationResult;
    }
    return {
      ...migrationResult,
      slotId: owner.slotId,
      expectedMigrations,
      appliedMigrations: migrationResult.appliedMigrations ?? appliedMigrationsFromProof(migrationResult),
    };
  } catch (error) {
    return refusal(
      'migration-failed',
      redactMigrationFailure(error instanceof Error ? error.message : 'migration runner failed'),
    );
  } finally {
    try {
      if (admin) await admin.end();
    } catch {
      // Not connected.
    }
    try {
      await forward.close();
    } catch {
      // Forward already stopped.
    }
  }
}

/**
 * @param {{ appliedMigrations?: number }} result
 */
function appliedMigrationsFromProof(result) {
  return typeof result.appliedMigrations === 'number' ? result.appliedMigrations : 0;
}